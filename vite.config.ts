import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Relative base: the built site works from any GitHub Pages path, whatever the repo is called.
export default defineConfig({
  base: './',
  plugins: [react()],
  // three.js alone is about 700 kB minified: one chunk of this size is expected for a 3D page.
  build: { chunkSizeWarningLimit: 1400 },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
