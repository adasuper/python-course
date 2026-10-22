import { defineConfig, devices } from '@playwright/test';

// The CI/CD pipeline tests the same build it deploys, which may live under a sub-path
// (CODEWEALD_BASE, e.g. /python-course/ on GitHub Pages). Tests use relative URLs ('./').
const baseURL = `http://localhost:4173${process.env.CODEWEALD_BASE ?? '/'}`;

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
    command: 'npx vite preview --port 4173 --strictPort',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
