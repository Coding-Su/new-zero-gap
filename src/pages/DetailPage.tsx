import { useState } from 'react'; // React 삭제 (밑줄 1번 해결)
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, MessageSquarePlus, ShieldCheck } from 'lucide-react';
import type { Feature, HistoryItem } from '../types';
import './DetailPage.css';

const DetailPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [feature, setFeature] = useState<Feature | null>(location.state?.feature || null);
  const [opinionInput, setOpinionInput] = useState<{ [key: string]: string }>({});

  if (!feature) return <div className="empty-state">데이터가 없습니다.</div>;

  // 특정 버전을 확정 상태로 변경
  const toggleFinalize = (historyId: string) => {
    const updatedHistories = feature.histories.map(h => ({
      ...h,
      isFinalized: h.id === historyId ? !h.isFinalized : false 
    }));
    setFeature({ ...feature, histories: updatedHistories });
  };

  // 의견 추가 (밑줄 3번 해결: 아래 버튼과 연결)
  const addOpinion = (historyId: string) => {
    const text = opinionInput[historyId];
    if (!text?.trim()) return;

    const updatedHistories = feature.histories.map(h => 
      h.id === historyId 
        ? { ...h, opinions: [...(h.opinions || []), text] } 
        : h
    );

    setFeature({ ...feature, histories: updatedHistories });
    setOpinionInput({ ...opinionInput, [historyId]: '' });
  };

  return (
    <div className="detail-page-root">
      <header className="detail-header">
        <button onClick={() => navigate('/')} className="back-button">
          <ArrowLeft className="back-button-icon" />
          <span>대시보드 돌아가기</span>
        </button>
      </header>

      <main className="detail-main">
        <div className="title-section">
          <h1 className="feature-title">{feature.title}</h1>
          <p className="feature-description">{feature.description}</p>
        </div>

        <div className="history-timeline">
          {feature.histories.map((history: HistoryItem) => (
            <div 
              key={history.id} 
              className={`history-card ${history.isFinalized ? 'finalized' : ''}`}
            >
              <div className="card-header">
                <span className="timestamp">{history.timestamp}</span>
                <button 
                  onClick={() => toggleFinalize(history.id)}
                  className={`finalize-button ${history.isFinalized ? 'active' : 'inactive'}`}
                >
                  <CheckCircle className="finalize-icon" />
                  {history.isFinalized ? 'POLICY FINALIZED' : 'SET AS FINAL'}
                </button>
              </div>

              <div className="what-why-grid">
                <div className="what-section">
                  <p className="what-label">Policy (What)</p>
                  <p className="what-content">{history.policyChange}</p>
                </div>
                <div className="why-section">
                  <p className="why-label">
                    <ShieldCheck className="why-icon" /> Context (Why)
                  </p>
                  <p className="why-content">{history.context}</p>
                </div>
              </div>

              {/* 하단 의견 및 피드백 영역 */}
              <div className="opinions-section">
                <div className="opinions-list">
                  {history.opinions?.map((op, i) => (
                    <div key={i} className="opinion-item">
                      <div className="opinion-avatar">ME</div>
                      <p className="opinion-text">{op}</p>
                    </div>
                  ))}
                </div>
                
                <div className="opinion-input-container">
                  <input 
                    type="text"
                    value={opinionInput[history.id] || ''}
                    onChange={(e) => setOpinionInput({ ...opinionInput, [history.id]: e.target.value })}
                    placeholder="팀원들과 기획 의도를 나눠보세요..."
                    className="opinion-input"
                  />
                  {/* 밑줄 2번 해결: MessageSquarePlus 아이콘 사용 */}
                  <button 
                    onClick={() => addOpinion(history.id)}
                    className="opinion-submit-button"
                  >
                    <MessageSquarePlus className="opinion-submit-icon" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default DetailPage;