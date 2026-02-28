import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: 1,
  reporter: process.env['CI']
    ? 'github'
    : [['list'], ['html', { open: 'never', outputFolder: './playwright-report' }]],
  timeout: 30000,
  use: {
    baseURL: process.env['FRONTEND_URL'] ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'on',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: process.env['CI']
    ? undefined
    : {
        command: 'npm run dev',
        cwd: '..',
        port: 3000,
        reuseExistingServer: true,
        timeout: 120000,
      },
});
