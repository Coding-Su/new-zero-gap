// src/api/aiService.ts (시연용 Mock 버전)
// import type { Feature, AnalysisResult } from '../types';

// export const analyzeMeetingMinutes = async (
//   _minutes: string,
//   existingFeatures: Feature[]
// ): Promise<AnalysisResult[]> => {
  
//   console.log("📑 공식 회의록 구조화 분석 가동 중...");
  
//   // 시연의 현장감을 위해 1.5초 대기
//   await new Promise(resolve => setTimeout(resolve, 1500));

//   return [
//     {
//       // 기존 기능 중 '검색'이 포함된 카드가 있다면 업데이트로 처리
//       matchId: existingFeatures.find(f => f.title.includes('검색'))?.id || 'search-id-001',
//       title: "검색 필터 고도화",
//       policy: "기존 키워드 검색에 '작성자' 및 '날짜 범위' 필터링 옵션 추가",
//       reason: "데이터 누적에 따른 정보 탐색 효율성 제고 및 사용자 맞춤형 검색 환경 구축"
//     },
//     {
//       matchId: 'new',
//       title: "실시간 의사결정 투표",
//       policy: "안건별 찬반 투표 모듈 구현 및 의사결정 이력 자동 아카이빙",
//       reason: "의사결정 지연 방지 및 정책 결정 근거의 데이터 자산화"
//     },
//     {
//       matchId: 'new',
//       title: "Slack 자동 공유 연동",
//       policy: "분석 완료 데이터의 지정 슬랙 채널 자동 푸시 알림 기능",
//       reason: "수동 공유 리소스 절감 및 팀 내 정보 동기화 프로세스 자동화"
//     }
//   ];
// };

// 기존코드
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
  
  /**
   * 토큰 다이어트 (Token Defense)
   * 기존 기능을 모두 보내지 않고 최신 10개만 보냅니다.
   */
  const featureContext = existingFeatures.length > 0 
    ? existingFeatures
        .slice(0, 10) 
        .map(f => `- ID: ${f.id}, 제목: ${f.title}`)
        .join('\n')
    : "현재 등록된 기존 기능 없음";

  /**
   * 2.시스템 프롬프트 (System Prompt)
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
    
    // 5. JSON 정제 및 파싱
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