import { defineConfig } from 'vite';

// 先期验证版：base 用相对路径，便于静态托管到任意子目录 / Linux 服务器
export default defineConfig({
  base: './',
  server: {
    host: true,
    port: 5173
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1500
  }
});
