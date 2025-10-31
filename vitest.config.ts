import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    transformMode: { web: [/\.ts$/] },
    setupFiles: ['./tests/setup.ts'],
    include: ['./tests/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'tests/setup.ts'],
    },
  },
});