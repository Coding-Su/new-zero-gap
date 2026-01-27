import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import IntegratedInput from '../components/dashboard/IntegratedInput';
import FeatureCard from '../components/dashboard/FeatureCard';
import type { Feature, HistoryItem } from '../types';
import { analyzeMeetingMinutes } from '../api/aiService';
import LoadingOverlay from '../components/dashboard/LoadingOverlay';
import './MainDashboardPage.css';

const MainDashboardPage = () => {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleAnalyze = async (minutes: string) => {
    setIsLoading(true);
    try {
      const results = await analyzeMeetingMinutes(minutes, features);
      
      setFeatures(prev => {
        let updated = [...prev];
        results.forEach(res => {
          const newHist: HistoryItem = {
            id: crypto.randomUUID(),
            timestamp: new Date().toLocaleString(),
            policyChange: res.policy,
            context: res.reason
          };
          
          if (res.matchId === 'new') {
            updated.push({
              id: crypto.randomUUID(),
              title: res.title,
              description: `${res.title} 분석 결과`,
              currentPolicy: res.policy,
              histories: [newHist]
            });
          } else {
            updated = updated.map(f => 
              f.id === res.matchId ? { ...f, currentPolicy: res.policy, histories: [newHist, ...f.histories] } : f
            );
          }
        });
        return updated;
      });
    } catch (error) {
      console.error("분석 실패:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dashboard-root">
      {/* 분석 중일 때 전체 화면을 덮는 로딩 레이어 */}
      {isLoading && <LoadingOverlay />}
      
      <div className="dashboard-inner">
        <header className="dashboard-header">
          <h1 className="dashboard-title">
            ZERO-GAP<span className="dot">.</span>
          </h1>
          <p className="dashboard-subtitle">
            AI가 읽어내는 기획의 맥락, 빈틈없는 결과.
          </p>
        </header>

        <section className="input-section-card">
          <IntegratedInput onAnalyze={handleAnalyze} isLoading={isLoading} />
        </section>

        <section className="features-section">
          <div className="section-header">
            <h2 className="features-title">
              Analyzed Features
              {features.length > 0 && (
                <span className="features-count-badge">{features.length}</span>
              )}
            </h2>
            <p className="helper-text hidden sm:block">
              카드를 클릭하여 상세 정책과 논의 배경(Why)을 확인하세요.
            </p>
          </div>

          {features.length === 0 ? (
            <div className="empty-state-box">
              <p className="text-2xl font-bold text-white mb-2">분석된 데이터가 없습니다.</p>
              <p className="text-gray-500">회의록을 입력하여 실시간 기획 분석을 경험해 보세요.</p>
            </div>
          ) : (
            <div className="zg-feature-grid">
              {features.map(f => (
                <div 
                  key={f.id} 
                  onClick={() => navigate(`/detail/${f.id}`, { state: { feature: f } })}
                  className="card-hover-wrapper"
                >
                  <FeatureCard feature={f} />
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