import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

// CODEWEALD_BASE lets the game live under a sub-path, e.g. /python-course/ on GitHub Pages.
const base = process.env.CODEWEALD_BASE ?? '/';

export default defineConfig({
  base,
  plugins: [preact()],
  worker: { format: 'es' },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2000,
  },
  server: { port: 5173 },
  preview: { port: 4173 },
});
