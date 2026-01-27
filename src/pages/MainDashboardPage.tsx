import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Search } from 'lucide-react';
import IntegratedInput from '../components/dashboard/IntegratedInput';
import FeatureCard from '../components/dashboard/FeatureCard';
import type { Feature, HistoryItem } from '../types';
import { analyzeMeetingMinutes } from '../api/aiService';
import LoadingOverlay from '../components/dashboard/LoadingOverlay';
import { fetchFeaturesFromDB, saveFeatureToDB, deleteFeatureFromDB } from '../services/firebaseService';
import './MainDashboardPage.css';

const MainDashboardPage = () => {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  // [추가] 세션 스토리지에서 사용자 정보 가져오기
  const rawUser = sessionStorage.getItem('zg_user');
  const currentUser = rawUser ? JSON.parse(rawUser) : { name: '익명', dept: '미소속' };

  // 앱 접속 시 DB에서 데이터 불러오기
  useEffect(() => {
    const initData = async () => {
      const data = await fetchFeaturesFromDB();
      if (data.length > 0) setFeatures(data);
    };
    initData();
  }, []);

  // 검색 로직: 제목이나 상세 정책에 검색어가 포함된 것만 필터링
  const filteredFeatures = features.filter(f => 
    f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.currentPolicy.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 로그아웃 처리 함수
  const handleLogout = () => {
    if (window.confirm("로그아웃 하시겠습니까?")) {
      sessionStorage.removeItem('zg_user'); // 세션 삭제
      navigate('/login'); // 로그인 페이지로 이동
    }
  };

  // 삭제 핸들러
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    
    if (!window.confirm("이 분석 결과 카드를 정말 삭제하시겠습니까?")) return;

    try {
      // 1. 삭제 애니메이션 시작
      const cardElement = (e.target as HTMLElement).closest('.card-hover-wrapper');
      if (cardElement) {
        cardElement.classList.add('deleting');
      }

      // 2. 애니메이션 완료 대기 (300ms)
      await new Promise(resolve => setTimeout(resolve, 300));

      // 3. DB에서 삭제
      await deleteFeatureFromDB(id);

      // 4. 화면(State)에서 제거
      setFeatures(prev => prev.filter(f => f.id !== id));
    } catch (error) {
      console.error("삭제 실패:", error);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const handleAnalyze = async (minutes: string) => {
    setIsLoading(true);
    try {
      const results = await analyzeMeetingMinutes(minutes, features);
      
      // 1. 새로운 상태(updated)를 계산
      let updatedFeatures: Feature[] = [...features];

      results.forEach(res => {
        const newHist: HistoryItem = {
          id: crypto.randomUUID(),
          timestamp: new Date().toLocaleString(),
          policyChange: res.policy,
          context: res.reason,
          // 분석 시에도 현재 로그인한 작성자 정보를 기록
          author: currentUser.name,
          dept: currentUser.dept
        };
          
          if (res.matchId === 'new') {
          updatedFeatures.unshift({   // 최신글이 위로 오도록 unshift
            id: crypto.randomUUID(),
            title: res.title,
            description: `${res.title} 분석 결과`,
            currentPolicy: res.policy,
            histories: [newHist]
          });
        } else {
          // [수정] 업데이트된 카드를 찾아 맨 앞으로 이동시킵니다.
        const targetIndex = updatedFeatures.findIndex(f => f.id === res.matchId);
        if (targetIndex !== -1) {
          const targetFeature = { 
            ...updatedFeatures[targetIndex], 
            currentPolicy: res.policy, 
            histories: [newHist, ...updatedFeatures[targetIndex].histories] 
          };
          
          // 기존 위치에서 제거하고 맨 앞에 추가
          updatedFeatures.splice(targetIndex, 1);
          updatedFeatures.unshift(targetFeature);   // 업데이트된 항목을 맨 위로
        }
      }
  });
      
      // 2. 계산된 결과를 Firebase DB에 하나씩 저장
      for (const feature of updatedFeatures) {
        await saveFeatureToDB(feature);
      }
      // 3. 화면(State)을 업데이트
      setFeatures(updatedFeatures);

    } catch (error) {
      console.error("분석 실패:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dashboard-root">
      {isLoading && <LoadingOverlay />}
      
      <div className="dashboard-inner">
        {/* 헤더 부분에 사용자 정보와 로그아웃 버튼 배치 */}
        <header className="dashboard-header">
          <div className="header-left">
            <h1 className="dashboard-title">
              ZERO-GAP<span className="dot">.</span>
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
              <span>나가기</span>
            </button>
          </div>
        </header>

        <section className="input-section-card">
          <IntegratedInput onAnalyze={handleAnalyze} isLoading={isLoading} />
        </section>

        <section className="features-section">
          <div className="section-header">
            <h2 className="features-title">
              Analyzed Features
              {/* {features.length > 0 && (
                <span className="features-count-badge">{features.length}</span>
              )} */}
            </h2>
            
            {/* [신규] 실시간 검색바 UI */}
            <div className="search-bar-container">
              <Search className="search-icon" size={18} />
              <input 
                type="text" 
                className="search-input"
                placeholder="기능 명칭 또는 정책 내용 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {features.length === 0 ? (
            <div className="empty-state-box">
              <p className="empty-state-title">분석된 데이터가 없습니다.</p>
            </div>
          ) : (
            <div className="zg-feature-grid">
              {filteredFeatures.map(f => (
                <div 
                  key={f.id} 
                  onClick={() => navigate(`/detail/${f.id}`, { state: { feature: f } })}
                  className="card-hover-wrapper"
                  style={{ position: 'relative' }} // 버튼 위치를 위해 추가
                >
                  <FeatureCard feature={f} />
                  
                  {/* 삭제 버튼 */}
                  <button 
                    className="feature-delete-btn"
                    onClick={(e) => handleDelete(e, f.id)}
                    title="카드 삭제"
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
  );
};

export default MainDashboardPage;