import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "webkit-mobile", use: { browserName: "webkit", isMobile: true, hasTouch: true } },
  ],
  use: {
    baseURL: "http://127.0.0.1:3002",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 3002 --strictPort",
    url: "http://127.0.0.1:3002",
    reuseExistingServer: !process.env.CI,
  },
});
