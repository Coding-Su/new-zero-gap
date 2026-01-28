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
  Check,
  FileText,
  MessageCircle
} from 'lucide-react';

import {
  fetchFeatureById,
  saveFeatureToDB,

  fetchMeetingLogById,
  fetchMeetingLogsListByFeatureId // [추가]
} from '../services/firebaseService';
import { formatDate } from '../utils'; // [수정] utils 임포트 추가
import type { Feature, HistoryItem, MeetingLog } from '../types';
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

  const [sourceLog, setSourceLog] = useState<MeetingLog | null>(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

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

  const handleShowSourceLog = async (historyLogId?: string, historyTimestamp?: string) => {
    if (!feature?.id) return;
    setIsLoading(true);
    try {
      let log: MeetingLog | null = null;

      if (historyLogId) {
        // [A] 히스토리에 연결된 특정 회의록이 있으면 그것을 가져옴
        log = await fetchMeetingLogById(historyLogId);
      }

      if (!log) {
        // [B] 없으면(구버전 데이터) 레거시 로직 개선
        // 모든 관련 로그를 가져와서, 타임스탬프가 일치하거나 가장 가까운 과거의 로그를 찾음
        const logs = await fetchMeetingLogsListByFeatureId(feature.id);

        if (logs.length > 0) {
          if (historyTimestamp) {
            // 1. 정확히 일치하는 것 시도 (서버 생성 시간과 로컬 시간이 동일 포맷 string으로 저장되므로 가능성 높음)
            const exactMatch = logs.find(l => l.createdAt === historyTimestamp);
            if (exactMatch) {
              log = exactMatch;
            } else {
              // 2. 정확 일치가 안되면, historyTimestamp보다 이전에 생성된 것 중 가장 최신
              // localeString 비교는 위험하므로, Date 객체로 변환하여 비교
              const historyTime = new Date(historyTimestamp).getTime();

              // 유효한 날짜인 경우에만 필터링
              if (!isNaN(historyTime)) {
                log = logs
                  .filter(l => {
                    const logTime = new Date(l.createdAt).getTime();
                    return !isNaN(logTime) && logTime <= historyTime + 1000; // 1초 정도의 오차 허용 (history가 AI처리 후 생성되므로 log보다 늦을 수 있음)
                  })
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
              }
            }
          }

          // 3. 여전히 없으면 그냥 전체 중 최신 (기존 동작 fallback)
          if (!log) {
            log = logs.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
          }
        }
      }

      if (log) {
        setSourceLog(log);
        setIsLogModalOpen(true);
      } else {
        alert("이 기획서와 연결된 회의록 원문을 찾을 수 없습니다.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFinalize = async (historyId: string) => {
    if (!feature) return;
    const updatedHistories = feature.histories.map(h => ({
      ...h,
      isFinalized: h.id === historyId ? !h.isFinalized : false
    }));
    const finalizedItem = updatedHistories.find(h => h.isFinalized);
    const updatedFeature = {
      ...feature,
      histories: updatedHistories,
      currentPolicy: finalizedItem ? finalizedItem.policyChange : feature.currentPolicy
    };
    setFeature(updatedFeature);
    await saveFeatureToDB(updatedFeature);
  };

  const addOpinion = async (historyId: string) => {
    if (!feature) return;
    const text = opinionInput[historyId];
    if (!text?.trim()) return;
    const newOpinion = {
      author: currentUser.name,
      dept: currentUser.dept,
      text: text,
      timestamp: new Date().toLocaleString() // 저장 시에는 표준 포맷 유지 (필요 시 변경 가능)
    };
    const updatedHistories = feature.histories.map(h =>
      h.id === historyId ? { ...h, opinions: [...(h.opinions || []) as any[], newOpinion] } : h
    );
    const updatedFeature = { ...feature, histories: updatedHistories };
    setFeature(updatedFeature);
    setOpinionInput({ ...opinionInput, [historyId]: '' });
    await saveFeatureToDB(updatedFeature);
  };

  const deleteOpinion = async (historyId: string, index: number) => {
    if (!feature || !window.confirm("이 기획 의도를 삭제하시겠습니까?")) return;
    const updatedHistories = feature.histories.map(h =>
      h.id === historyId ? { ...h, opinions: h.opinions?.filter((_, i) => i !== index) } : h
    );
    const updatedFeature = { ...feature, histories: updatedHistories };
    setFeature(updatedFeature);
    await saveFeatureToDB(updatedFeature);
  };

  const startEdit = (historyId: string, index: number, currentOp: any) => {
    setEditingInfo({ historyId, index });
    setEditValue(typeof currentOp === 'string' ? currentOp : currentOp.text);
  };

  const saveEdit = async () => {
    if (!feature || !editingInfo) return;
    const updatedHistories = feature.histories.map(h =>
      h.id === editingInfo.historyId ? {
        ...h,
        opinions: h.opinions?.map((op, i) =>
          i === editingInfo.index ? (typeof op === 'string' ? editValue : { ...op, text: editValue }) : op
        )
      } : h
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
          <span>대시보드</span>
        </button>
        {/* Backtrace button moved to history card */}
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
                    <span className="timestamp">{formatDate(history.timestamp)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button onClick={() => handleShowSourceLog(history.meetingLogId, history.timestamp)} className="backtrace-button" style={{ fontSize: '0.8rem', padding: '0.5rem 0.8rem' }}>
                      <FileText size={14} />
                      <span>도출 근거</span>
                    </button>
                    <button onClick={() => toggleFinalize(history.id)} className={`finalize-button ${history.isFinalized ? 'active' : 'inactive'}`}>
                      <CheckCircle className="finalize-icon" />
                      {history.isFinalized ? 'POLICY FINALIZED' : 'SET AS FINAL'}
                    </button>
                  </div>
                </div>

                {/* ⭐ Policy & Context 그리드 */}
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

                {/* ⭐ 의견(Opinions) 섹션 */}
                <div className="opinions-section">
                  <div className="opinions-header">
                    <MessageCircle className="opinions-icon" />
                    <h3 className="opinions-title">기획 의도</h3>
                  </div>

                  <div className="opinions-list">
                    {history.opinions?.map((op: any, i: number) => (
                      <div key={i} className="opinion-item">
                        <div className="opinion-avatar">{typeof op === 'string' ? 'ME' : op.author?.[0] || '익'}</div>
                        <div className="opinion-content-wrapper">
                          <div className="opinion-info-row">
                            <span className="opinion-author">{typeof op === 'string' ? '이전 기록' : op.author}</span>
                            <span className="opinion-dept">{typeof op === 'string' ? '' : `(${op.dept})`}</span>
                          </div>
                          {editingInfo?.historyId === history.id && editingInfo?.index === i ? (
                            <div className="edit-container">
                              <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="opinion-edit-input" autoFocus />
                              <button onClick={saveEdit} className="icon-btn save"><Check size={14} /></button>
                              <button onClick={() => setEditingInfo(null)} className="icon-btn cancel"><X size={14} /></button>
                            </div>
                          ) : (
                            <div className="opinion-text-container">
                              <p className="opinion-text">{typeof op === 'string' ? op : op.text}</p>
                              <div className="opinion-actions">
                                <button onClick={() => startEdit(history.id, i, op)} className="icon-btn edit"><Edit2 size={12} /></button>
                                <button onClick={() => deleteOpinion(history.id, i)} className="icon-btn delete"><Trash2 size={12} /></button>
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

      {isLogModalOpen && sourceLog && (
        <div className="zg-modal-overlay" onClick={() => setIsLogModalOpen(false)}>
          <div className="zg-modal-content detail-modal" onClick={e => e.stopPropagation()}>
            <div className="zg-modal-header">
              <h3>📄 기획 도출 근거 (회의록 원문)</h3>
              <button onClick={() => setIsLogModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="zg-modal-body">
              <div className="log-meta"><span><strong>일시:</strong> {formatDate(sourceLog.createdAt)}</span><span><strong>작성자:</strong> {sourceLog.author}</span></div>
              <div className="raw-content-box">{sourceLog.rawContent}</div>
            </div>
            <div className="zg-modal-footer"><button className="primary-btn" onClick={() => setIsLogModalOpen(false)}>닫기</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailPage;