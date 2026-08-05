import { defineConfig, devices } from '@playwright/test';

const PORT = 18765;
const BASE = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  timeout: 60_000,
  use: {
    baseURL: BASE,
    trace: 'on-first-retry',
    locale: 'ru-RU',
  },
  webServer: {
    command: `npx vite --host 127.0.0.1 --port ${PORT}`,
    url: BASE,
    // Если порт занят предыдущим прогоном этого же проекта — переиспользуем
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: {
        ...devices['Pixel 5'],
      },
    },
  ],
});
