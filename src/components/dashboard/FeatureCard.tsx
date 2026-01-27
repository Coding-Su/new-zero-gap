import React from 'react';
import type { Feature } from '../../types';
import { Calendar, MessageSquare } from 'lucide-react';
import './FeatureCard.css';

interface Props {
  feature: Feature;
}

const FeatureCard: React.FC<Props> = ({ feature }) => {
  const latestHistory = feature.histories[0];

  return (
    <div className="feature-card">
      <div className="feature-card-header">
        <h3 className="feature-card-title">{feature.title}</h3>
        <span className="feature-card-badge">
          v{feature.histories.length}
        </span>
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
            <span>{feature.histories.length} 개의 맥락 쌓임</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeatureCard;