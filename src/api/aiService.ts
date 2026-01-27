// src/api/aiService.ts
import type { Feature, AnalysisResult } from '../types';

const API_CONFIG = {
  API_URL: "/api/chat", // vite.config.ts 프록시 설정 경로
  API_KEY: import.meta.env.VITE_AI_API_KEY,
  MODEL: "claude-4.5-sonnet"
};

export const analyzeMeetingMinutes = async (
  minutes: string,
  existingFeatures: Feature[]
): Promise<AnalysisResult[]> => {
  
  // 1. 기존 기능 리스트를 텍스트로 변환하여 AI에게 '맥락'으로 제공합니다.
  const featureContext = existingFeatures.length > 0 
    ? existingFeatures.map(f => `- ID: ${f.id}, 제목: ${f.title}`).join('\n')
    : "현재 등록된 기존 기능 없음";
    
  /**
   * 2. [핵심] 멘토님 피드백을 반영한 시스템 프롬프트 (System Prompt)
   */
  const SYSTEM_PROMPT = `
당신은 10년 차 수석 IT 서비스 기획자입니다. 사용자가 입력한 회의록을 분석하여 개발팀이 즉시 참고할 수 있는 [정책]을 도출하세요.

[분석 가이드라인]
1. 독립성 유지: 회의록에서 논의된 각 기능(A, B, C 등)은 반드시 서로 다른 '개별 객체'로 분리하여 JSON 배열에 담으세요.
2. What (policy): 결정된 사항을 무엇을 개발해야 하는가의 관점에서 간결하게 작성하세요.
3. Why (reason): 이 정책이 왜 결정되었는지 논의 배경과 근거를 구체적으로 기술하세요 (멘토님 강조 포인트).
4. Feature Matching: 아래의 [기존 기능 리스트]를 참고하여 업데이트라면 해당 ID를, 신규 기능이라면 'new'를 matchId에 넣으세요.

[기존 기능 리스트]
${featureContext}

반드시 JSON 배열 형식으로만 응답하세요. 여러 기능이 감지되면 객체를 그만큼 늘리세요.
응답 예시: [
  {"matchId": "id1", "title": "기능A", "policy": "정책A", "reason": "이유A"},
  {"matchId": "new", "title": "기능B", "policy": "정책B", "reason": "이유B"}
]
`;

  // 3. 포텐스닷 성공 방식: prompt 필드로 합치기
  const finalPrompt = `${SYSTEM_PROMPT}\n\n[사용자 회의록]\n${minutes}`;

  try {
    const response = await fetch(API_CONFIG.API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_CONFIG.API_KEY}` // 성공했던 인증 방식
      },
      body: JSON.stringify({
        model: API_CONFIG.MODEL,
        prompt: finalPrompt, // 'messages'가 아닌 'prompt' 사용
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    
    // 4. 성공 로직: data.message에서 추출
    const content = data.message || "";
    
    // 5. JSON 정제 및 파싱 (용수님의 성공 정규식)
    const cleanedContent = content.replace(/```json/g, "").replace(/```/g, "").trim();
    const jsonStartIndex = cleanedContent.indexOf('[');
    const jsonEndIndex = cleanedContent.lastIndexOf(']') + 1;
    
    const finalJson = cleanedContent.substring(jsonStartIndex, jsonEndIndex);
    return JSON.parse(finalJson) as AnalysisResult[];

  } catch (error) {
    console.error("❌ 분석 중 오류 발생:", error);
    return [];
  }
};