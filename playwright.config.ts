import { defineConfig, devices } from '@playwright/test'

const PORT = 4173
const BASE_URL = `http://localhost:${PORT}/Florarithm/`

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  // `list` for the log you actually read while it runs, and the HTML report
  // for the failure you have to read afterwards: it is the thing CI uploads as
  // an artifact, and without this reporter that directory is never written and
  // the upload has nothing to take.
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
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
  //
  // CI builds in its own job and hands `dist` over, so previewing it here tests
  // the bytes that would be deployed rather than a second build of the same
  // source. There is no such job on a laptop, so there the build happens here.
  webServer: {
    command: process.env.CI
      ? `npx vite preview --port ${PORT} --strictPort`
      : `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
