// src/types/index.ts

// 1. 회의록 분석 후 각 기능에 쌓일 히스토리 (Why 중심)
export interface HistoryItem {
  id: string;
  timestamp: string;
  policyChange: string; // What
  context: string;      // Why
  isFinalized?: boolean; // 해당 버전의 확정 여부
  author?: string;
  dept?: string;
  opinions?: (string | Opinion)[];  // 사용자의 추가 의견
}

// 2. 메인 화면에 보일 개별 기능(Chip) 정보
export interface Feature {
  id: string;             // 기능 고유 ID
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

// 새로운 Opinion 인터페이스 정의
export interface Opinion {
  author: string;
  dept: string;
  text: string;
  timestamp: string;
}