import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  CheckCircle, 
  MessageSquarePlus, 
  ShieldCheck, 
  Edit2, 
  Trash2, 
  X, 
  Check
} from 'lucide-react';
import { fetchFeatureById, saveFeatureToDB } from '../services/firebaseService';
import type { Feature, HistoryItem } from '../types';
import './DetailPage.css';

const DetailPage = () => {
  const { id } = useParams<{ id: string }>(); 
  const location = useLocation();
  const navigate = useNavigate();
  
  const [feature, setFeature] = useState<Feature | null>(location.state?.feature || null);
  const [isLoading, setIsLoading] = useState(!feature); 
  const [opinionInput, setOpinionInput] = useState<{ [key: string]: string }>({});

  const [editingInfo, setEditingInfo] = useState<{ historyId: string; index: number } | null>(null);
  const [editValue, setEditValue] = useState("");

  const rawUser = sessionStorage.getItem('zg_user');
  const currentUser = rawUser ? JSON.parse(rawUser) : { name: '익명', dept: '미소속' };

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
   * [수정 완료] 특정 버전 '최종안' 확정 기능
   * 에러 원인: addOpinion의 코드가 잘못 섞여 있었습니다. 
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
      currentPolicy: finalizedItem ? finalizedItem.policyChange : feature.currentPolicy
    };
    
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

    const newOpinion = {
      author: currentUser.name,
      dept: currentUser.dept,
      text: text,
      timestamp: new Date().toLocaleString()
    };

    const updatedHistories = feature.histories.map(h => 
      h.id === historyId 
        ? { ...h, opinions: [...(h.opinions || []) as any[], newOpinion] } 
        : h
    );

    const updatedFeature = { ...feature, histories: updatedHistories };
    setFeature(updatedFeature);
    setOpinionInput({ ...opinionInput, [historyId]: '' });
    await saveFeatureToDB(updatedFeature);
  };

  /**
   * 의견 삭제 로직
   */
  const deleteOpinion = async (historyId: string, index: number) => {
    if (!feature || !window.confirm("이 기획 의도를 삭제하시겠습니까?")) return;

    const updatedHistories = feature.histories.map(h => 
      h.id === historyId 
        ? { ...h, opinions: h.opinions?.filter((_, i) => i !== index) } 
        : h
    );

    const updatedFeature = { ...feature, histories: updatedHistories };
    setFeature(updatedFeature);
    await saveFeatureToDB(updatedFeature);
  };

  /**
   * [수정 완료] 의견 수정 모드 진입
   * 에러 원인: 매개변수 이름(currentOp)이 로직과 일치하지 않았습니다.
   */
  const startEdit = (historyId: string, index: number, currentOp: any) => {
    setEditingInfo({ historyId, index });
    // op가 객체면 .text를, 문자열이면 그대로 값을 가져옵니다.
    setEditValue(typeof currentOp === 'string' ? currentOp : currentOp.text);
  };

  /**
   * 의견 수정 저장
   */
  const saveEdit = async () => {
    if (!feature || !editingInfo) return;

    const updatedHistories = feature.histories.map(h => 
      h.id === editingInfo.historyId 
        ? { 
            ...h, 
            opinions: h.opinions?.map((op, i) => 
              i === editingInfo.index 
                ? (typeof op === 'string' ? editValue : { ...op, text: editValue }) 
                : op
            ) 
          } 
        : h
    );

    const updatedFeature = { ...feature, histories: updatedHistories };
    setFeature(updatedFeature);
    setEditingInfo(null);
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
          {feature.histories
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .map((history: HistoryItem, index: number) => (
            <div key={history.id} className={`history-card ${history.isFinalized ? 'finalized' : ''}`}>
              <div className="card-header">
                <div className="version-info">
                   <span className="version-tag">v1.{feature.histories.length - 1 - index}</span>
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
                  <p className="why-label"><ShieldCheck className="why-icon" /> Context (Why)</p>
                  <p className="why-content">{history.context}</p>
                </div>
              </div>

              <div className="opinions-section">
                <div className="opinions-list">
                  {history.opinions?.map((op: any, i: number) => (
                    <div key={i} className="opinion-item">
                      <div className="opinion-avatar">
                        {typeof op === 'string' ? 'ME' : op.author?.[0] || '익'}
                      </div>

                      <div className="opinion-content-wrapper">
                        <div className="opinion-info-row">
                          <span className="opinion-author">
                            {typeof op === 'string' ? '이전 기록' : op.author}
                          </span>
                          <span className="opinion-dept">
                            {typeof op === 'string' ? '' : `(${op.dept})`}
                          </span>
                        </div>

                        {editingInfo?.historyId === history.id && editingInfo?.index === i ? (
                          <div className="edit-container">
                            <input 
                              type="text" 
                              value={editValue} 
                              onChange={(e) => setEditValue(e.target.value)}
                              className="opinion-edit-input"
                              autoFocus
                            />
                            <button onClick={saveEdit} className="icon-btn save"><Check size={14}/></button>
                            <button onClick={() => setEditingInfo(null)} className="icon-btn cancel"><X size={14}/></button>
                          </div>
                        ) : (
                          <div className="opinion-text-container">
                            <p className="opinion-text">
                              {typeof op === 'string' ? op : op.text}
                            </p>
                            <div className="opinion-actions">
                              <button onClick={() => startEdit(history.id, i, op)} className="icon-btn edit">
                                <Edit2 size={12}/>
                              </button>
                              <button onClick={() => deleteOpinion(history.id, i)} className="icon-btn delete">
                                <Trash2 size={12}/>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="opinion-input-container">
                  <input 
                    type="text"
                    value={opinionInput[history.id] || ''}
                    onChange={(e) => setOpinionInput({ ...opinionInput, [history.id]: e.target.value })}
                    placeholder={`${currentUser.name}님, 기획 의도를 남겨주세요...`}
                    className="opinion-input"
                  />
                  <button onClick={() => addOpinion(history.id)} className="opinion-submit-button">
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