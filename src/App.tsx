import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import MainDashboardPage from './pages/MainDashboardPage';
import DetailPage from './pages/DetailPage';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const user = sessionStorage.getItem('zg_user');
  if (!user) {
    // 세션에 유저 정보가 없으면 로그인 페이지로 강제 이동
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 1. 로그인 페이지 주소 */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* 2. 메인 대시보드: 보호된 경로로 설정 */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <MainDashboardPage />
            </ProtectedRoute>
          } 
        />

        {/* 3. 기능 상세 페이지: 보호된 경로로 설정 */}
        <Route 
          path="/detail/:id" 
          element={
            <ProtectedRoute>
              <DetailPage />
            </ProtectedRoute>
          } 
        />

        {/* 잘못된 주소 접근 시 로그인으로 리다이렉트 */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;