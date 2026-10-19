import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/python/**/*.test.ts', 'tests/content/**/*.test.ts'],
    environment: 'node',
    testTimeout: 60_000,
    hookTimeout: 120_000,
    // Pyodide is heavy: one copy per worker thread, a few threads.
    pool: 'threads',
    maxWorkers: 4,
  },
});
