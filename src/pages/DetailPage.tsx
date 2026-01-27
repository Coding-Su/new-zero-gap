import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, MessageSquarePlus, ShieldCheck } from 'lucide-react';
// Firebase 서비스 함수 임포트
import { fetchFeatureById, saveFeatureToDB } from '../services/firebaseService';
import type { Feature, HistoryItem } from '../types';
import './DetailPage.css';

const DetailPage = () => {
  const { id } = useParams<{ id: string }>(); 
  const location = useLocation();
  const navigate = useNavigate();
  
  // 데이터 복구용 상태 관리
  const [feature, setFeature] = useState<Feature | null>(location.state?.feature || null);
  const [isLoading, setIsLoading] = useState(!feature); 
  const [opinionInput, setOpinionInput] = useState<{ [key: string]: string }>({});

  /**
   * 새로고침 대응 로직
   */
  useEffect(() => {
    const loadInitialData = async () => {
      if (!feature && id) {
        const data = await fetchFeatureById(id);
        setFeature(data);
      }
      setIsLoading(false);
    };
    loadInitialData();
  }, [id, feature]);

  /**
   * 특정 버전 '최종안' 확정 기능
   */
  const toggleFinalize = async (historyId: string) => {
    if (!feature) return;

    // 1. 선택한 히스토리만 finalized 처리 (나머지는 false로 초기화)
    const updatedHistories = feature.histories.map(h => ({
      ...h,
      isFinalized: h.id === historyId ? !h.isFinalized : false 
    }));
    
    // 2. 확정된 항목이 있다면 해당 정책을 전체 기능의 '현재 정책'으로 승격
    const finalizedItem = updatedHistories.find(h => h.isFinalized);
    const updatedFeature = { 
      ...feature, 
      histories: updatedHistories,
      // 확정 해제 시에는 기존 정책 유지, 확정 시에는 해당 정책으로 갱신
      currentPolicy: finalizedItem ? finalizedItem.policyChange : feature.currentPolicy
    };
    
    // 3. 로컬 상태 업데이트 및 Firebase DB 실시간 저장
    setFeature(updatedFeature);
    await saveFeatureToDB(updatedFeature);
  };

  /**
   * 의견 추가 로직
   */
  const addOpinion = async (historyId: string) => {
    if (!feature) return;
    const text = opinionInput[historyId];
    if (!text?.trim()) return;

    const updatedHistories = feature.histories.map(h => 
      h.id === historyId 
        ? { ...h, opinions: [...(h.opinions || []), text] } 
        : h
    );

    const updatedFeature = { ...feature, histories: updatedHistories };
    setFeature(updatedFeature);
    setOpinionInput({ ...opinionInput, [historyId]: '' });
    await saveFeatureToDB(updatedFeature);
  };

  if (isLoading) return <div className="loading-state">데이터를 불러오는 중...</div>;
  if (!feature) return <div className="empty-state">데이터를 찾을 수 없습니다.</div>;

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
          {feature.histories.map((history: HistoryItem, index: number) => (
            <div 
              key={history.id} 
              className={`history-card ${history.isFinalized ? 'finalized' : ''}`}
            >
              <div className="card-header">
                <div className="version-info">
                   {/* 버전 표기: 정수 형태 (v1, v2...) */}
                   <span className="version-tag">
                     v1.{feature.histories.length - 1 - index}
                   </span>
                   <span className="timestamp">{history.timestamp}</span>
                </div>
                
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