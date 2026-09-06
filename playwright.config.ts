import { defineConfig, devices } from '@playwright/test'

const PORT = 4173
const BASE_URL = `http://localhost:${PORT}/Florarithm/`

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: { baseURL: BASE_URL, trace: 'retain-on-failure' },
  projects: [
    { name: 'logic', testMatch: /logic\.spec\.ts/ },
    { name: 'merge', testMatch: /merge\.spec\.ts/ },
    {
      name: 'app',
      testMatch: /app\.spec\.ts/,
      use: { ...devices['iPhone 14'] },
    },
    {
      name: 'desktop',
      testMatch: /app\.spec\.ts/,
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'offline',
      testMatch: /offline\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'sync',
      testMatch: /sync\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Tested against the production build, so the service worker is real.
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
