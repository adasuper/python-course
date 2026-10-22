import { defineConfig, devices } from '@playwright/test';

// The CI/CD pipeline tests the same build it deploys, which may live under a sub-path
// (CODEWEALD_BASE, e.g. /python-course/ on GitHub Pages). Tests use relative URLs ('./').
// CODEWEALD_PORT lets several checkouts run their E2E tests at the same time.
const port = Number(process.env.CODEWEALD_PORT ?? 4173);
const baseURL = `http://localhost:${port}${process.env.CODEWEALD_BASE ?? '/'}`;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    actionTimeout: 20_000,
    screenshot: 'only-on-failure',
    viewport: { width: 1366, height: 768 },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } } },
  ],
  webServer: {
    command: `npx vite preview --port ${port} --strictPort`,
    // Test hooks for tests/e2e/offline.spec.ts (see vite.config.ts).
    env: { CODEWEALD_TEST_SERVER: '1' },
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
