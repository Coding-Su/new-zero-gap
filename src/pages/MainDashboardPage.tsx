import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LogOut, User, Search, Menu, X, 
  Clock, FileText, ChevronRight, CheckCircle2, Wand2 
} from 'lucide-react';

// 컴포넌트 임포트
import IntegratedInput from '../components/dashboard/IntegratedInput';
import FeatureCard from '../components/dashboard/FeatureCard';
import Sidebar from '../components/dashboard/Sidebar';
import LoadingOverlay from '../components/dashboard/LoadingOverlay';

// 서비스 및 API 임포트
import { 
  fetchFeaturesByProjectId,
  saveFeatureToDB, 
  deleteFeatureFromDB,
  fetchProjectsFromDB,
  saveProjectToDB,
  deleteProjectFromDB,
  saveMeetingLogToDB,
  fetchMeetingLogsByProjectId
} from '../services/firebaseService';
import { refineMeetingMinutes, analyzeMeetingMinutes } from '../api/aiService'; // [Step 1, 2 함수]

// 타입 임포트
import type { Feature, HistoryItem, Project, MeetingLog, AnalysisResult } from '../types';
import './MainDashboardPage.css';

const MainDashboardPage = () => {
  // --- [1. 기본 상태 관리] ---
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [meetingLogs, setMeetingLogs] = useState<MeetingLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'features' | 'history'>('features');
  const [selectedLog, setSelectedLog] = useState<MeetingLog | null>(null);

  // --- [2. 신규: 스테이징 및 검수 상태 관리] ---
  // 단계를 구분합니다: 'idle' | 'review_minutes' (정제본 검수) | 'review_features' (카드 검수)
  const [stagingStep, setStagingStep] = useState<'idle' | 'review_minutes' | 'review_features'>('idle');
  const [stagedMinutes, setStagedMinutes] = useState(''); // 사용자가 검수 중인 정제된 회의록
  const [stagedFeatures, setStagedFeatures] = useState<AnalysisResult[]>([]); // 사용자가 검수 중인 추출 카드들

  const navigate = useNavigate();
  const rawUser = sessionStorage.getItem('zg_user');
  const currentUser = rawUser ? JSON.parse(rawUser) : { name: '익명', dept: '미소속' };

  // --- [3. 데이터 로드 로직] ---

  useEffect(() => {
    const initProjects = async () => {
      const data = await fetchProjectsFromDB();
      setProjects(data);
      if (data.length > 0 && !selectedProjectId) {
        setSelectedProjectId(data[0].id);
      }
    };
    initProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      const loadDashboardData = async () => {
        setIsLoading(true);
        try {
          const [fData, lData] = await Promise.all([
            fetchFeaturesByProjectId(selectedProjectId),
            fetchMeetingLogsByProjectId(selectedProjectId)
          ]);
          setFeatures(fData.sort((a, b) => (b.histories[0]?.timestamp || "").localeCompare(a.histories[0]?.timestamp || "")));
          setMeetingLogs(lData.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        } finally {
          setIsLoading(false);
        }
      };
      loadDashboardData();
    } else {
      // ⭐ [핵심 추가] 선택된 프로젝트가 없으면(삭제 포함) 화면의 데이터를 비워줍니다.
      setFeatures([]);
      setMeetingLogs([]);
    }
  }, [selectedProjectId]);

  // --- [4. 핸들러 로직] ---

  // [Step 1] 회의록 입력 후 '정제' 단계 진입
  const handleAnalyzeStart = async (minutes: string) => {
    if (!selectedProjectId) return alert("프로젝트를 선택해주세요.");
    setIsLoading(true);
    try {
      const refined = await refineMeetingMinutes(minutes);
      setStagedMinutes(refined); // AI가 다듬은 내용을 스테이징 상태에 저장
      setStagingStep('review_minutes'); // 1차 검수 모달 오픈
    } catch (error) {
      alert("회의록 정제 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // [Step 2] 사용자가 정제본 확인 후 '기능 추출' 단계 진입
  const handleRequestAnalysis = async () => {
    setIsLoading(true);
    try {
      // 사용자가 직접 수정한 stagedMinutes를 바탕으로 분석 실행
      const results = await analyzeMeetingMinutes(stagedMinutes, features);

      // 🔥 [수정] AI 결과에 안전장치 추가
      const safeResults = results.map(res => ({
        matchId: res.matchId || 'new',
        title: res.title || '',
        policy: res.policy || '',
        reason: res.reason || '회의 요약 참조' // reason이 없으면 기본 문구 삽입
      }));

      setStagedFeatures(safeResults)
      
      setStagedFeatures(results);
      setStagingStep('review_features'); // 2차 검수 모달(카드 검수)로 이동
    } catch (error) {
      alert("기획 요소 추출 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // [Step 3] 사용자가 최종 승인한 데이터를 DB에 저장 (최종 관문)
  const handleFinalSubmit = async () => {
  if (!window.confirm("검수하신 내용을 바탕으로 기획서를 업데이트하시겠습니까?")) return;
  setIsLoading(true);

  try {
    let updatedFeatures: Feature[] = [...features];
    const affectedIds: string[] = [];

    stagedFeatures.forEach(res => {
      // 1. AI가 준 ID가 실제 우리 리스트에 있는지 확인 (매우 중요)
      const targetIndex = updatedFeatures.findIndex(f => f.id === res.matchId);
      
      // 2. 존재하는 기능이면 해당 ID 유지, 없거나 'new'면 새로 생성
      const isExisting = targetIndex !== -1;
      const featureId = isExisting ? (res.matchId as string) : crypto.randomUUID();
      affectedIds.push(featureId);

      const newHist: HistoryItem = {
        id: crypto.randomUUID(),
        timestamp: new Date().toLocaleString(),
        policyChange: res.policy || "",
        context: res.reason || "회의 내용 참조",
        author: currentUser.name || "익명",
        dept: currentUser.dept || "미소속"
      };

      if (!isExisting) {
        // [A] 신규 기능으로 추가 (AI가 'new'라고 했거나, 엉뚱한 ID를 줬을 때)
        updatedFeatures.unshift({
          id: featureId,
          projectId: selectedProjectId!,
          title: res.title || "제목 없음",
          description: `${res.title || "신규 기능"} 분석 결과`,
          currentPolicy: res.policy || "",
          histories: [newHist]
        });
      } else {
        // [B] 기존 기능 업데이트
        const targetFeature = { 
          ...updatedFeatures[targetIndex], 
          currentPolicy: res.policy || "", 
          histories: [newHist, ...updatedFeatures[targetIndex].histories] 
        };
        updatedFeatures.splice(targetIndex, 1);
        updatedFeatures.unshift(targetFeature); // 최신 업데이트 항목을 맨 위로
      }
    });

    // 3. DB 저장 로직 (MeetingLog 포함)
    const finalMeetingLog: MeetingLog = {
      id: crypto.randomUUID(),
      projectId: selectedProjectId!,
      rawContent: stagedMinutes || "",
      author: currentUser.name || "익명",
      createdAt: new Date().toLocaleString(),
      derivedFeatureIds: affectedIds
    };

    await Promise.all([
      ...updatedFeatures.map(f => saveFeatureToDB(f)),
      saveMeetingLogToDB(finalMeetingLog)
    ]);

    // 4. 로컬 상태 즉시 반영 (이게 호출되어야 화면이 바뀝니다)
    setFeatures([...updatedFeatures]); // 새 배열로 교체하여 리렌더링 유발
    
    // 회의록 목록도 최신화
    const updatedLogs = await fetchMeetingLogsByProjectId(selectedProjectId!);
    setMeetingLogs(updatedLogs.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));

    setStagingStep('idle');
    alert("기획서 카드가 성공적으로 생성/업데이트되었습니다!");

  } catch (error) {
    console.error("저장 실패:", error);
    alert("저장 중 문제가 발생했습니다.");
  } finally {
    setIsLoading(false);
  }
};

  // --- [기타 유틸리티 핸들러] ---
  const handleAddProject = async () => {
    const name = window.prompt("새 프로젝트 이름을 입력하세요:");
    if (!name?.trim()) return;
    const newProject: Project = {
      id: crypto.randomUUID(),
      name: name,
      createdAt: new Date().toLocaleString(),
      ownerName: currentUser.name
    };
    await saveProjectToDB(newProject);
    setProjects([...projects, newProject]);
    setSelectedProjectId(newProject.id);
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!window.confirm("프로젝트를 삭제하시겠습니까? 모든 데이터가 삭제됩니다.")) return;
    setIsLoading(true);
    await deleteProjectFromDB(projectId);
    setProjects(prev => prev.filter(p => p.id !== projectId));
    setIsLoading(false);
  };

  const handleDeleteFeature = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("이 카드를 삭제하시겠습니까?")) return;
    await deleteFeatureFromDB(id);
    setFeatures(prev => prev.filter(f => f.id !== id));
  };

  const filteredFeatures = features.filter(f => 
    f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.currentPolicy.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="dashboard-layout">
      <Sidebar 
        isOpen={isSidebarOpen}
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={(id) => { setSelectedProjectId(id); setIsSidebarOpen(false); }}
        onAddProject={handleAddProject}
        onDeleteProject={handleDeleteProject}
      />

      <div className="dashboard-root">
        {isLoading && <LoadingOverlay />}
        <div className="dashboard-inner">
          <header className="dashboard-header">
            <div className="header-left">
              <button className="sidebar-toggle-btn" onClick={() => setIsSidebarOpen(true)}><Menu size={24} /></button>
              <h1 className="dashboard-title">{projects.find(p => p.id === selectedProjectId)?.name || "Project"}<span className="dot">.</span></h1>
            </div>
            <div className="header-right">
              <div className="user-greeting"><User size={16} /><span><strong>{currentUser.name}</strong> {currentUser.dept}</span></div>
              <button onClick={() => { sessionStorage.removeItem('zg_user'); navigate('/login'); }} className="logout-button"><LogOut size={18} /></button>
            </div>
          </header>

          <section className="input-section-card">
            {/* handleAnalyze 대신 handleAnalyzeStart 호출 */}
            <IntegratedInput onAnalyze={handleAnalyzeStart} isLoading={isLoading} />
          </section>

          <section className="features-section">
            <div className="zg-tabs">
              <button className={`zg-tab-item ${activeTab === 'features' ? 'active' : ''}`} onClick={() => setActiveTab('features')}>기획서 카드</button>
              <button className={`zg-tab-item ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
                <FileText size={16} style={{ marginRight: '6px' }} /> 회의 히스토리
              </button>
            </div>

            {activeTab === 'features' ? (
              <>
                <div className="section-header">
                  <h2 className="features-title">Features <span className="count">{filteredFeatures.length}</span></h2>
                  <div className="search-bar-container">
                    <Search className="search-icon" size={18} />
                    <input className="search-input" placeholder="검색..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  </div>
                </div>
                <div className="zg-feature-grid">
                  {filteredFeatures.map(f => (
                    <div key={f.id} onClick={() => navigate(`/detail/${f.id}`, { state: { feature: f } })} className="card-hover-wrapper">
                      <FeatureCard feature={f} />
                      <button className="feature-delete-btn" onClick={(e) => handleDeleteFeature(e, f.id)}>×</button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="zg-history-list">
                {meetingLogs.map(log => (
                  <div key={log.id} className="history-card" onClick={() => setSelectedLog(log)}>
                    <div className="history-card-left">
                      <div className="log-date"><Clock size={14} /> {log.createdAt}</div>
                      <p className="log-preview">{log.rawContent}</p>
                    </div>
                    <ChevronRight size={18} />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* --- [검수 위저드 모달 1단계: 정제본 검수] --- */}
      {stagingStep === 'review_minutes' && (
        <div className="zg-modal-overlay">
          <div className="zg-modal-content large">
            <div className="zg-modal-header">
              <h3><Wand2 size={20} /> AI 회의록 정제 결과 검수</h3>
              <button onClick={() => setStagingStep('idle')}><X size={20}/></button>
            </div>
            <div className="zg-modal-body">
              <p className="modal-guide">AI가 다듬은 내용입니다. 사실과 다른 부분이 있다면 직접 수정해주세요.</p>
              <textarea 
                className="staged-textarea"
                value={stagedMinutes}
                onChange={(e) => setStagedMinutes(e.target.value)}
              />
            </div>
            <div className="zg-modal-footer">
              <button className="secondary-btn" onClick={() => setStagingStep('idle')}>취소</button>
              <button className="primary-btn" onClick={handleRequestAnalysis}>기능 카드 추출 시작</button>
            </div>
          </div>
        </div>
      )}

      {/* --- [검수 위저드 모달 2단계: 카드 검수] --- */}
      {stagingStep === 'review_features' && (
        <div className="zg-modal-overlay">
          <div className="zg-modal-content large">
            <div className="zg-modal-header">
              <h3><CheckCircle2 size={20} /> 기획 요소 추출 결과 검수</h3>
              <button onClick={() => setStagingStep('idle')}><X size={20}/></button>
            </div>
            <div className="zg-modal-body">
              <div className="staged-features-list">
                {stagedFeatures.map((sf, idx) => (
                  <div key={idx} className="staged-feature-item">
                    <div className="sf-header">
                      <input 
                        value={sf.title} 
                        placeholder="기능 제목을 입력하세요 (예: 검색 필터 고도화)"
                        onChange={(e) => {
                          const newFeatures = [...stagedFeatures];
                          newFeatures[idx].title = e.target.value;
                          setStagedFeatures(newFeatures);
                        }}
                      />
                      <button onClick={() => setStagedFeatures(prev => prev.filter((_, i) => i !== idx))}>삭제</button>
                    </div>
                    <textarea 
                      value={sf.policy}
                      onChange={(e) => {
                        const newFeatures = [...stagedFeatures];
                        newFeatures[idx].policy = e.target.value;
                        setStagedFeatures(newFeatures);
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="zg-modal-footer">
              <button className="secondary-btn" onClick={() => setStagingStep('review_minutes')}>이전으로</button>
              <button className="primary-btn" onClick={handleFinalSubmit}>최종 승인 및 DB 저장</button>
            </div>
          </div>
        </div>
      )}

      {/* 회의록 히스토리 상세 모달 (기존 유지) */}
      {selectedLog && (
        <div className="zg-modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="zg-modal-content" onClick={e => e.stopPropagation()}>
            <div className="zg-modal-header"><h3>회의록 원문 아카이브</h3><button onClick={() => setSelectedLog(null)}><X size={20}/></button></div>
            <div className="zg-modal-body">
              <div className="log-meta"><span>📅 {selectedLog.createdAt}</span><span>👤 {selectedLog.author}</span></div>
              <div className="raw-content-box">{selectedLog.rawContent}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainDashboardPage;