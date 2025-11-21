import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  // Load .env file from project root (parent directory)
  envDir: path.resolve(__dirname, '..'),
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
        target: process.env.VITE_API_URL || (process.env.NODE_ENV === 'production' ? 'http://api:3001' : 'http://localhost:3001'),
        changeOrigin: true,
        secure: false,
        // Cookie handling - remove domain restriction to allow cookies to work across localhost ports
        cookieDomainRewrite: '', // Remove domain attribute (empty string removes it)
        cookiePathRewrite: '/',
        // Explicitly preserve credentials and headers
        xfwd: true,
        ws: true, // Enable websocket proxying
        configure: (proxy: any) => {
          proxy.on('proxyRes', (proxyRes: any) => {
            // Ensure Set-Cookie headers are properly forwarded and rewritten
            const setCookieHeaders = proxyRes.headers['set-cookie'];
            if (setCookieHeaders) {
              // Rewrite cookies to remove domain and ensure they work on localhost:5173
              proxyRes.headers['set-cookie'] = setCookieHeaders.map((cookie: string) => {
                // Remove Domain attribute (allows cookie to work on any localhost port)
                let rewritten = cookie.replace(/;\s*[Dd]omain=[^;]*/gi, '');
                // Ensure Path is /
                rewritten = rewritten.replace(/;\s*[Pp]ath=[^;]*/gi, '');
                rewritten += '; Path=/';
                // Ensure SameSite is Lax for development
                const isDev = import.meta.env?.MODE === 'development' || process.env.NODE_ENV !== 'production';
                if (isDev) {
                  rewritten = rewritten.replace(/;\s*[Ss]ame[Ss]ite=[^;]*/gi, '');
                  rewritten += '; SameSite=Lax';
                }
                return rewritten;
              });
            }
          });
        },
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
