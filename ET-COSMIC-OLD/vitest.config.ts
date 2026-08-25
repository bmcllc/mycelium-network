import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { b2bPanelLoadersPlugin } from './scripts/vite-b2b-loaders';

export default defineConfig({
  plugins: [react(), b2bPanelLoadersPlugin(null)],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
    },
  },
  define: {
    __B2B_SKUS__: JSON.stringify([]),
    __B2B_SLIM_SHELL__: JSON.stringify(false),
    __B2B_SINGLE_ENTRY__: JSON.stringify(''),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'src/**/*.stress.test.ts',
      'server/**/*.test.js',
    ],
    setupFiles: ['src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/crypto/**/*.ts', 'src/utils/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.d.ts'],
    },
  },
});
