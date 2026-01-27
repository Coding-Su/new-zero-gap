// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainDashboardPage from './pages/MainDashboardPage';
import DetailPage from './pages/DetailPage'; // 3단계에서 만들 예정

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 메인 대시보드 주소 */}
        <Route path="/" element={<MainDashboardPage />} />
        {/* 기능 상세 페이지 주소 (ID를 변수로 받음) */}
        <Route path="/detail/:id" element={<DetailPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;