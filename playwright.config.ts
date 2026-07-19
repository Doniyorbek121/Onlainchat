import { defineConfig } from "@playwright/test";
import fs from "node:fs";

const PORT = Number(process.env.E2E_PORT || 3300);
const BASE = `http://localhost:${PORT}`;

// Prefer a pre-installed Chromium if present (as in this dev container); fall
// back to Playwright's own managed browser (e.g. `playwright install` in CI).
const PINNED = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM ||
  (fs.existsSync(PINNED) ? PINNED : undefined);

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE,
    headless: true,
    launchOptions: executablePath ? { executablePath } : undefined,
    trace: "off",
  },
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: BASE,
    timeout: 60_000,
    reuseExistingServer: !process.env.CI,
    env: {
      DATABASE_PATH: process.env.E2E_DB || "/tmp/e2e-onlainchat.db",
      NODE_ENV: "production",
    },
  },
});
