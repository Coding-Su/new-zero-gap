import React from 'react';
import type { Feature } from '../../types';
import { Calendar, MessageSquare, CheckCircle } from 'lucide-react';
import './FeatureCard.css';

interface Props {
  feature: Feature;
}

const FeatureCard: React.FC<Props> = ({ feature }) => {
  const latestHistory = feature.histories[0];
  const totalVersions = feature.histories.length;
  
  // Finalized 버전이 있는지 확인
  const hasFinalizedVersion = feature.histories.some(h => h.isFinalized);
  
  // 전체 의견 개수 계산
  const totalOpinions = feature.histories.reduce((sum, h) => sum + (h.opinions?.length || 0), 0);

  return (
    <div className={`feature-card ${hasFinalizedVersion ? 'has-finalized' : ''}`}>
      <div className="feature-card-header">
        <h3 className="feature-card-title">{feature.title}</h3>
        <div className="badge-group">
          {/* 최신 버전 배지 */}
          <span className="feature-card-badge version">
            v1.{totalVersions - 1}
          </span>
          {/* Finalized 배지 (있을 경우만 표시) */}
          {hasFinalizedVersion && (
            <span className="feature-card-badge finalized">
              <CheckCircle className="badge-icon" />
              Final
            </span>
          )}
        </div>
      </div>
      
      <div className="feature-card-body">
        <div className="policy-section">
          <span className="policy-label">Current Policy (What)</span>
          <p className="policy-text">{feature.currentPolicy}</p>
        </div>

        <div className="feature-card-footer">
          <div className="footer-item">
            <Calendar className="footer-icon" />
            <span>{latestHistory?.timestamp.split(', ')[0]}</span>
          </div>
          <div className="footer-item">
            <MessageSquare className="footer-icon" />
            <span>{totalVersions}개 버전</span>
          </div>
          {/* 의견이 있을 경우만 표시 */}
          {totalOpinions > 0 && (
            <div className="footer-item opinions">
              <span className="opinion-count">{totalOpinions}</span>
              <span>의견</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeatureCard;
