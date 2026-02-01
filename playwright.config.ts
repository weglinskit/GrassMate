import { defineConfig, devices } from "@playwright/test";


/**
 * Konfiguracja E2E – tylko Chromium/Desktop Chrome (zgodnie z .cursor/rules/playwright-e2e-testing.mdc).
 * Uruchom serwer: npm run dev (port 3000) lub npm run preview po buildzie.
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: process.env.CI ? "npm run build && npm run preview" : "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
  },
});
