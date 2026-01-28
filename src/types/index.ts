
// 프로젝트 정의
export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  ownerName: string; // 프로젝트 생성자
}

// 새로운 Opinion 인터페이스 정의
export interface Opinion {
  author: string;
  dept: string;
  text: string;
  timestamp: string;
}

// 1. 회의록 분석 후 각 기능에 쌓일 히스토리 (Why 중심)
export interface HistoryItem {
  id: string;
  timestamp: string;
  policyChange: string; // What
  context: string;      // Why
  isFinalized?: boolean; // 해당 버전의 확정 여부
  author?: string;
  dept?: string;
  meetingLogId?: string; // [추가] 해당 히스토리가 생성된 회의록 ID 역추적용
  opinions?: (string | Opinion)[];  // 사용자의 추가 의견
}

// 2. 메인 화면에 보일 개별 기능(Chip) 정보
export interface Feature {
  id: string;             // 기능 고유 ID
  projectId: string;      // 이 기능이 어떤 프로젝트 소속인지 연결하는 고리 (Foreign Key)
  title: string;          // 기능명 (예: 검색, 필터링)
  description: string;    // 기능에 대한 간략한 설명
  currentPolicy: string;  // 현재 확정된 최종 정책 (가장 최신의 What)
  histories: HistoryItem[]; // 지금까지의 모든 논의 과정(Why) 모음
}

// 3. AI 분석 결과가 나올 때의 데이터 포맷 (중앙 집중형 분석용)
export interface AnalysisResult {
  matchId: string | 'new'; // 기존 기능 ID 혹은 신규 생성 여부
  title: string;           // 기능명
  policy: string;          // 추출된 정책 (What)
  reason: string;          // 추출된 배경 (Why)
}

// MeetingLog 타입 추가
export interface MeetingLog {
  id: string;
  projectId: string;      // 어떤 프로젝트의 회의인지
  rawContent: string;     // 사용자가 입력한 날것의 회의록
  author?: string;        // 작성자
  createdAt: string;      // 회의 일시
  derivedFeatureIds: string[]; // 이 회의를 통해 만들어진 기능 카드들의 ID 리스트 (연결 고리)
}
