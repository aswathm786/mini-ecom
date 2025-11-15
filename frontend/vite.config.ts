import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173, // Vite default port
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || (process.env.NODE_ENV === 'production' ? 'http://api:3000' : 'http://localhost:3000'),
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    testMatch: ['**/test/**/*.test.{ts,tsx}'],
  },
});
