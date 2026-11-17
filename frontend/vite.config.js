import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true,
    // Dev tanpa VITE_API_URL: proxy /api ke token server lokal.
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // Proxy WebSocket LiveKit supaya dev memakai origin sama seperti production.
      '/rtc': {
        target: 'ws://localhost:7880',
        ws: true,
        rewriteWsOrigin: true,
      },
    },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
  },
});