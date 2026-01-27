// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        // 1. 목표: 포텐스닷 API 서버
        target: 'https://ai.potens.ai', 
        changeOrigin: true,
        secure: false,
        // 2. [수정] 사용하지 않는 매개변수에 _를 붙여 빌드 에러를 방지합니다.
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('❌ 프록시 에러:', err);
          });
          // [수정 포인트] proxyReq -> _proxyReq 로 변경하여 미사용 변수임을 명시
          proxy.on('proxyReq', (_proxyReq, req, _res) => {
            console.log('📡 요청 보냄:', req.method, req.url, '=>', 'https://ai.potens.ai' + req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('📩 응답 받음:', proxyRes.statusCode, req.url);
          });
        },
      }
    }
  }
})