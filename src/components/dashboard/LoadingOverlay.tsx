import React from 'react';
import './LoadingOverlay.css';

const LoadingOverlay: React.FC = () => {
  return (
    <div className="loading-overlay">
      <div className="loader-content">
        {/* 프리미엄 로딩 스피너 */}
        <div className="premium-spinner">
          <div className="inner-ring"></div>
          <div className="glow-effect"></div>
        </div>
        
        {/* 실시간 상태 메시지 */}
        <div className="loading-text-group">
          <h2 className="loading-main-text">Analyzing Context...</h2>
          <p className="loading-sub-text">AI가 회의록에서 정책(What)과 맥락(Why)을 추출하고 있습니다.</p>
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;