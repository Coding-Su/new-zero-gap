import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Building2, LogIn, AlertCircle } from 'lucide-react';
import './LoginPage.css';

const LoginPage = () => {
  // 상태 관리
  const [userName, setUserName] = useState('');
  const [department, setDepartment] = useState('');
  const [isLoading, setIsLoading] = useState(false); // 로딩 상태
  const [error, setError] = useState(''); // 에러 메시지
  const navigate = useNavigate();


  // 로그인 처리 핸들러 
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); // 기존 에러 초기화

    // 유효성 검사
    if (!userName.trim() || !department.trim()) {
      setError("이름과 부서를 모두 입력해 주세요.");
      return;
    }

    setIsLoading(true);

    try {
      // 로딩 시뮬레이션 (실제 환경에서는 API 호출로 대체)
      await new Promise(resolve => setTimeout(resolve, 800));

      // 사용자 정보를 세션 스토리지에 저장
      const userInfo = {
        name: userName,
        dept: department,
        loggedInAt: new Date().toLocaleString()
      };
      
      sessionStorage.setItem('zg_user', JSON.stringify(userInfo));
      
      // 로그인 성공 후 대시보드로 이동
      navigate('/');
    } catch (err) {
      setError("로그인 중 오류가 발생했습니다.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-root">
      <div className="login-card">
        {/* 헤더: 로고 및 서브타이틀 */}
        <header className="login-header">
          <h1 className="logo">
            ZERO-GAP<span className="dot">.</span>
          </h1>
          <p className="login-subtitle">기획의 맥락을 기록하는 첫 단계</p>
        </header>

        {/* 로그인 폼 */}
        <form onSubmit={handleLogin} className="login-form">
          {/* 이름 입력 */}
          <div className="input-group">
            <label>
              <User size={18} /> 이름
            </label>
            <input 
              type="text" 
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="이름을 입력해주세요" 
              required
              disabled={isLoading}
            />
          </div>

          {/* 부서 입력 */}
          <div className="input-group">
            <label>
              <Building2 size={18} /> 부서/조직
            </label>
            <input 
              type="text" 
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="예: 기획팀 / IT서비스파트" 
              required
              disabled={isLoading}
            />
          </div>

          {/* 에러 메시지 표시 */}
          {error && (
            <div className="error-message">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* 로그인 버튼 */}
          <button 
            type="submit" 
            className={`login-submit-btn ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {!isLoading && <LogIn size={20} />}
            <span>{isLoading ? '로그인 중...' : '기획 분석 시작하기'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
