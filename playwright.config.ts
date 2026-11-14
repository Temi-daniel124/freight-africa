import { defineConfig } from "@playwright/test";

// Browsers live in node_modules so nothing is installed outside this project (CLAUDE.md section 5A).
process.env.PLAYWRIGHT_BROWSERS_PATH ??= "0";

const PORT = 3100; // a port of our own, so other work on this laptop is never disturbed

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.001, animations: "disabled" } },
  use: { baseURL: `http://localhost:${PORT}`, browserName: "chromium", locale: "en-NG", timezoneId: "Africa/Lagos" },
  webServer: {
    command: `npm run dev -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
