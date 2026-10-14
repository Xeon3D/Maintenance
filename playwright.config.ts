import { defineConfig, devices } from "@playwright/test";

// End-to-end smoke tests against the seeded demo company (npm run db:seed). By default Playwright starts
// the production server (`npm run start`, after `npm run build`); set E2E_BASE_URL to test a server that
// is already running instead (e.g. `next dev` on http://localhost:3000).
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3100";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // the tests share one demo database
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  timeout: 60_000,
  use: { baseURL, trace: "retain-on-failure", locale: "en-GB" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "npx next start -p 3100", url: `${baseURL}/login`, reuseExistingServer: !process.env.CI, timeout: 120_000 },
});
