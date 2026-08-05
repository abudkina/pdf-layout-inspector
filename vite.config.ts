import { defineConfig } from 'vite';
import { resolve } from 'path';

/** Выделенный порт — не пересекается с другими локальными Vite-проектами */
const PORT = 18765;

export default defineConfig({
  root: '.',
  publicDir: 'public',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  worker: {
    format: 'es',
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          pdfjs: ['pdfjs-dist'],
        },
      },
    },
  },
  server: {
    port: PORT,
    strictPort: true,
    open: false,
  },
  preview: {
    port: PORT + 1000,
    strictPort: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/unit/**/*.{test,spec}.ts'],
  },
});
