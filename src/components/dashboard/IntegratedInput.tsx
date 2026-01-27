import React, { useState } from 'react';
import { Send, Loader2 } from 'lucide-react'; // 아이콘 라이브러리 (npm install lucide-react 필수)
import './IntegratedInput.css';

interface Props {
  onAnalyze: (minutes: string) => Promise<void>;
  isLoading: boolean;
}

const IntegratedInput: React.FC<Props> = ({ onAnalyze, isLoading }) => {
  const [minutes, setMinutes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!minutes.trim() || isLoading) return;
    
    await onAnalyze(minutes);
    setMinutes(''); // 분석 후 입력창 비우기
  };

  return (
    <div className="integrated-input-container">
      <form onSubmit={handleSubmit} className="integrated-input-form">
        <div className="input-header">
          <h2 className="input-title">회의록 통합 분석</h2>
          <span className="input-subtitle">전체 내용을 붙으면 AI가 기능을 자동으로 분류합니다.</span>
        </div>
        
        <textarea
          className="minutes-textarea"
          placeholder="오늘 진행된 회의록 전문을 여기에 붙여넣으세요...&#10;&#10;예시:&#10;- 로그인 기능 개선 논의&#10;- 사용자 프로필 페이지 UI 변경&#10;- 알림 시스템 추가 검토"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          disabled={isLoading}
        />

        <div className="button-container">
          <button
            type="submit"
            disabled={isLoading || !minutes.trim()}
            className={`analyze-button ${
              isLoading || !minutes.trim()
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="button-icon spinning" />
                AI가 회의록 분석 및 기능 업데이트 중...
              </>
            ) : (
              <>
                <Send className="button-icon" />
                분석 시작하기
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default IntegratedInput;