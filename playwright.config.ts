import { defineConfig, devices } from '@playwright/test';

const externalBaseUrl = process.env.BASE_URL;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  // The demo bundle loads the Midnight WASM/runtime graph. Parallel browser
  // workers can starve the Vite server and make otherwise stable journeys
  // time out, so the acceptance command is intentionally deterministic.
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: externalBaseUrl ?? 'http://localhost:4173',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    ...[
      { name: 'mobile-chrome', device: 'Pixel 7' },
      { name: 'mobile-safari', device: 'iPhone 13' },
    ].map(({ name, device }) => ({
      name,
      use: { ...devices[device] },
      testMatch: [
        '**/passport-journey.spec.ts',
        '**/feedback.spec.ts',
        '**/connection-status.spec.ts',
        '**/mobile-refinements.spec.ts',
      ],
      grep: /completes the civic pulse|completes Passport onboarding, then creates|feedback route|connection status|mobile refinements/,
    })),
  ],
  webServer: externalBaseUrl
    ? undefined
    : {
        // Test the shipped bundle. A cold Vite dev server transforms the lazy
        // WASM/runtime graph after the first click and can exhaust the assertion
        // deadline before onboarding mounts (PR #29's 320px failure).
        command:
          'npm run build --workspace midnight-referendum-ui -- --mode demo && npm run preview --workspace midnight-referendum-ui -- --host localhost --port 4173 --strictPort',
        url: 'http://localhost:4173',
        reuseExistingServer: false,
        timeout: 180_000,
        env: {
          VITE_APP_MODE: 'demo',
          VITE_PASSPORT_ORIGIN: 'https://midnightpassport.com',
          VITE_RELAYER_URL: 'http://127.0.0.1:9',
          VITE_MIDNIGHT_PROOF_SERVER_URL: 'http://127.0.0.1:10',
          VITE_PASSPORT_V2_API_URL: 'http://127.0.0.1:11',
        },
      },
});
