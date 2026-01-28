import type { Feature, AnalysisResult } from '../types';

const API_CONFIG = {
  API_URL: "/api/chat", // vite.config.ts 프록시 설정 경로
  API_KEY: import.meta.env.VITE_AI_API_KEY,
  MODEL: "claude-4.5-sonnet"
};

/**
 * [Step 1] 회의록 정제 (Refinement)
 * 사용자의 날것의 메모를 오타 교정 및 논리적으로 재구성합니다.
 */
export const refineMeetingMinutes = async (rawMinutes: string): Promise<string> => {
  const SYSTEM_PROMPT = `
당신은 수석 서비스 기획자의 전문 편집 비서입니다. 
입력된 비정형 회의록을 분석이 용이하도록 정제하십시오.

[정제 규칙]
1. 오타 교정: 문맥상 어색한 오타나 비문을 기획 용어에 맞게 수정하세요.
2. 노이즈 제거: 불필요한 감탄사, 중복된 표현, 의미 없는 대화 파편을 걷어내세요.
3. 논리적 구조화: 논점별로 문단을 나누고 구어체를 깔끔한 문어체로 바꾸세요.
4. 원문 유지: 기획자의 의도를 왜곡하지 말고 오직 '가독성'과 '논리성'만 개선하세요.

최종적으로 정제된 텍스트만 출력하세요. 다른 설명은 생략하십시오.
`;

  try {
    const response = await fetch(API_CONFIG.API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_CONFIG.API_KEY}`
      },
      body: JSON.stringify({
        model: API_CONFIG.MODEL,
        prompt: `${SYSTEM_PROMPT}\n\n[사용자 회의록 원문]\n${rawMinutes}`,
        temperature: 0.3 // 정밀도를 위해 낮은 온도 설정
      })
    });

    if (!response.ok) throw new Error(`Refine API Error: ${response.status}`);

    const data = await response.json();
    return data.message || rawMinutes; // 실패 시 원문이라도 반환하여 흐름 유지

  } catch (error) {
    console.error("❌ 회의록 정제 중 오류:", error);
    return rawMinutes;
  }
};

/**
 * [Step 2] 기획 요소 추출 (Analysis)
 * 정제된 텍스트를 바탕으로 실제 기능 카드(Policy, Reason)를 도출합니다.
 */
export const analyzeMeetingMinutes = async (
  minutes: string, // 이제 여기엔 '정제된' 텍스트가 들어오게 됩니다.
  existingFeatures: Feature[]
): Promise<AnalysisResult[]> => {
  
  const featureContext = existingFeatures.length > 0 
    ? existingFeatures
        .slice(0, 10) 
        .map(f => `- ID: ${f.id}, 제목: ${f.title}`)
        .join('\n')
    : "현재 등록된 기존 기능 없음";

  const SYSTEM_PROMPT = `
당신은 10년 차 수석 IT 서비스 기획자입니다. 정제된 회의록을 분석하여 개발 정책을 도출하세요.

[분석 가이드라인]
1. 독립성 유지: 각 기능은 개별 객체로 분리하여 JSON 배열에 담으세요.
2. What (policy): 무엇을 개발해야 하는지 명확한 정책을 작성하세요.
3. Why (reason): 결정 배경과 근거를 구체적으로 기술하세요.
4. Feature Matching: 기존 기능을 참고하여 업데이트(ID) 또는 신규('new')를 지정하세요.

[기존 기능 리스트]
${featureContext}

반드시 JSON 배열 형식으로만 응답하세요.
`;

  const finalPrompt = `${SYSTEM_PROMPT}\n\n[정제된 회의록]\n${minutes}`;

  try {
    const response = await fetch(API_CONFIG.API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_CONFIG.API_KEY}`
      },
      body: JSON.stringify({
        model: API_CONFIG.MODEL,
        prompt: finalPrompt,
        temperature: 0.7
      })
    });

    if (!response.ok) throw new Error(`Analysis API Error: ${response.status}`);

    const data = await response.json();
    const content = data.message || "";
    
    const cleanedContent = content.replace(/```json/g, "").replace(/```/g, "").trim();
    const jsonStartIndex = cleanedContent.indexOf('[');
    const jsonEndIndex = cleanedContent.lastIndexOf(']') + 1;

    if (jsonStartIndex === -1) return [];
    
    const finalJson = cleanedContent.substring(jsonStartIndex, jsonEndIndex);
    return JSON.parse(finalJson) as AnalysisResult[];

  } catch (error) {
    console.error("❌ 분석 중 오류 발생:", error);
    return [];
  }
};