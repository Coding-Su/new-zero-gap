import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Search, Menu, X } from 'lucide-react';
import IntegratedInput from '../components/dashboard/IntegratedInput';
import FeatureCard from '../components/dashboard/FeatureCard';
import Sidebar from '../components/dashboard/Sidebar'; // [추가] 사이드바 컴포넌트
import LoadingOverlay from '../components/dashboard/LoadingOverlay';
import { 
  fetchFeaturesByProjectId,  // 프로젝트별 기능 호출
  saveFeatureToDB, 
  deleteFeatureFromDB,
  fetchProjectsFromDB,       // 프로젝트 목록 호출
  saveProjectToDB,           // 프로젝트 저장
  deleteProjectFromDB
} from '../services/firebaseService';
import { analyzeMeetingMinutes } from '../api/aiService';
import type { Feature, HistoryItem, Project } from '../types';
import './MainDashboardPage.css';

const MainDashboardPage = () => {
  // --- [1. 상태 관리] ---
  const [projects, setProjects] = useState<Project[]>([]); // 프로젝트 목록
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null); // 선택된 프로젝트 ID
  const [features, setFeatures] = useState<Feature[]>([]); // 선택된 프로젝트의 기능들
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // 사이드바 열림/닫힘 상태 (모바일 대응용)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navigate = useNavigate();

  // 사용자 정보 (세션)
  const rawUser = sessionStorage.getItem('zg_user');
  const currentUser = rawUser ? JSON.parse(rawUser) : { name: '익명', dept: '미소속' };

  // --- [2. 데이터 로드 로직] ---

  // A. 앱 실행 시 프로젝트 목록부터 가져오기
  useEffect(() => {
    const initProjects = async () => {
      const data = await fetchProjectsFromDB();
      setProjects(data);
      // 프로젝트가 있다면 첫 번째 프로젝트를 자동으로 선택
      if (data.length > 0 && !selectedProjectId) {
        setSelectedProjectId(data[0].id);
      }
    };
    initProjects();
  }, []);

  // B. 선택된 프로젝트가 바뀔 때마다 해당 프로젝트의 기능(Feature)들만 다시 가져오기
  useEffect(() => {
    if (selectedProjectId) {
      const loadProjectFeatures = async () => {
        const data = await fetchFeaturesByProjectId(selectedProjectId);
        // 최신 업데이트 순으로 정렬하여 상태 저장
        setFeatures(data.sort((a, b) => b.histories[0].timestamp.localeCompare(a.histories[0].timestamp)));
      };
      loadProjectFeatures();
    } else {
      setFeatures([]); // 선택된 프로젝트가 없으면 목록 비움
    }
  }, [selectedProjectId]);

  // 사이드바 열렸을 때 body 스크롤 방지
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isSidebarOpen]);

  // 프로젝트 추가 핸들러
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
    setSelectedProjectId(newProject.id); // 생성 후 바로 해당 프로젝트로 이동
  };

  // 로그아웃
  const handleLogout = () => {
    if (window.confirm("로그아웃 하시겠습니까?")) {
      sessionStorage.removeItem('zg_user');
      navigate('/login');
    }
  };

  // 기능 삭제
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("이 분석 결과 카드를 정말 삭제하시겠습니까?")) return;
    try {
      await deleteFeatureFromDB(id);
      setFeatures(prev => prev.filter(f => f.id !== id));
    } catch (error) {
      console.error("삭제 실패:", error);
    }
  };

  // 2. 프로젝트 삭제 핸들러
  const handleDeleteProject = async (projectId: string) => {
    const targetProject = projects.find(p => p.id === projectId);
    
    // 기획적 안전장치: 사용자에게 재확인
    if (!window.confirm(`'${targetProject?.name}' 프로젝트를 삭제하시겠습니까?\n내부에 작성된 모든 기획서가 영구 삭제됩니다.`)) {
      return;
    }

    try {
      // setIsLoading(true);
      // DB에서 연쇄 삭제 실행 (FirebaseService에 작성한 로직)
      await deleteProjectFromDB(projectId);

      // 로컬 상태(목록) 업데이트
      const updatedProjects = projects.filter(p => p.id !== projectId);
      setProjects(updatedProjects);

      // 현재 보고 있던 프로젝트를 지웠다면 다른 프로젝트로 자동 전환
      if (selectedProjectId === projectId) {
        if (updatedProjects.length > 0) {
          setSelectedProjectId(updatedProjects[0].id);
        } else {
          setSelectedProjectId(null);
        }
      }
      alert("프로젝트가 성공적으로 삭제되었습니다.");
    } catch (error) {
      console.error("삭제 실패:", error);
      alert("프로젝트 삭제 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 회의록 분석 및 업데이트 (프로젝트 귀속 로직 추가)
  const handleAnalyze = async (minutes: string) => {
    if (!selectedProjectId) {
      alert("회의록을 분석할 프로젝트를 먼저 선택하거나 생성해주세요.");
      return;
    }

    setIsLoading(true);
    try {
      // 분석 시 현재 프로젝트의 기능들만 참고하도록 전달
      const results = await analyzeMeetingMinutes(minutes, features);
      let updatedFeatures: Feature[] = [...features];

      results.forEach(res => {
        const newHist: HistoryItem = {
          id: crypto.randomUUID(),
          timestamp: new Date().toLocaleString(),
          policyChange: res.policy,
          context: res.reason,
          author: currentUser.name,
          dept: currentUser.dept
        };
          
        if (res.matchId === 'new') {
          updatedFeatures.unshift({
            id: crypto.randomUUID(),
            projectId: selectedProjectId, // [핵심] 현재 선택된 프로젝트 ID 부여
            title: res.title,
            description: `${res.title} 분석 결과`,
            currentPolicy: res.policy,
            histories: [newHist]
          });
        } else {
          const targetIndex = updatedFeatures.findIndex(f => f.id === res.matchId);
          if (targetIndex !== -1) {
            const targetFeature = { 
              ...updatedFeatures[targetIndex], 
              currentPolicy: res.policy, 
              histories: [newHist, ...updatedFeatures[targetIndex].histories] 
            };
            updatedFeatures.splice(targetIndex, 1);
            updatedFeatures.unshift(targetFeature); // 업데이트된 항목 맨 위로
          }
        }
      });
      
      for (const feature of updatedFeatures) {
        await saveFeatureToDB(feature);
      }
      setFeatures(updatedFeatures);
    } catch (error) {
      console.error("분석 실패:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 실시간 검색 필터링
  const filteredFeatures = features.filter(f => 
    f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.currentPolicy.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="dashboard-layout">
      {/* ⭐ 햄버거 메뉴 버튼 */}
      <button 
        className={`sidebar-toggle-btn ${isSidebarOpen ? 'active' : ''}`}
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        aria-label="메뉴"
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* ⭐ 오버레이 */}
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* 왼쪽 사이드바 영역 */}
      <Sidebar 
        isOpen={isSidebarOpen}
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={(id) => {
          setSelectedProjectId(id);
          setIsSidebarOpen(false); // 프로젝트 선택 시 사이드바 닫기
        }}
        onAddProject={handleAddProject}
        onDeleteProject={handleDeleteProject}
      />

      <div className="dashboard-root">
        {isLoading && <LoadingOverlay />}
        
        <div className="dashboard-inner">
          <header className="dashboard-header">
            <div className="header-left">
              
              {/* 현재 어떤 프로젝트를 보고 있는지 표시 */}
              <h1 className="dashboard-title">
                {projects.find(p => p.id === selectedProjectId)?.name || "Project"}
                <span className="dot">.</span>
              </h1>
            </div>
            
            <div className="header-right">
              <div className="user-greeting">
                <User size={16} className="user-icon" />
                <span className="user-text">
                  <strong>{currentUser.name}</strong> {currentUser.dept}
                </span>
              </div>
              <button onClick={handleLogout} className="logout-button" title="로그아웃">
                <LogOut size={18} />
              </button>
            </div>
          </header>

          <section className="input-section-card">
            <IntegratedInput onAnalyze={handleAnalyze} isLoading={isLoading} />
          </section>

          <section className="features-section">
            <div className="section-header">
              <h2 className="features-title">
                Features
                {filteredFeatures.length > 0 && (
                  <span className="features-count-badge">{filteredFeatures.length}</span>
                )}
              </h2>

              <div className="search-bar-container">
                <Search className="search-icon" size={18} />
                <input 
                  type="text" 
                  className="search-input"
                  placeholder="기능명 또는 정책 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {filteredFeatures.length === 0 ? (
              <div className="empty-state-box">
                <p className="empty-state-title">
                  {searchQuery ? `'${searchQuery}' 결과 없음` : "분석된 기획서가 없습니다."}
                </p>
              </div>
            ) : (
              <div className="zg-feature-grid">
                {filteredFeatures.map(f => (
                  <div 
                    key={f.id} 
                    onClick={() => navigate(`/detail/${f.id}`, { state: { feature: f } })}
                    className="card-hover-wrapper"
                  >
                    <FeatureCard feature={f} />
                    <button 
                      className="feature-delete-btn"
                      onClick={(e) => handleDelete(e, f.id)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default MainDashboardPage;