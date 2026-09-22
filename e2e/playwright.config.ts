import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;

// Opt-in escape hatch for machines where a *headed* Chromium using the GPU
// misbehaves (seen on WSL2 with GPU passthrough on hybrid-GPU laptops).
// Headless runs are unaffected either way.
const chromiumArgs = process.env.PW_DISABLE_GPU ? ["--disable-gpu"] : [];

export default defineConfig({
  testDir: "./tests",

  // The API keeps one shared in-memory store and every test resets it,
  // so tests must run one at a time. Real projects isolate test data
  // (per-test records or a backend per worker) and run fully parallel.
  fullyParallel: false,
  workers: 1,

  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], launchOptions: { args: chromiumArgs } },
    },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],

  // Boots both apps before the run (or reuses `npm run dev` if it's already up).
  webServer: [
    {
      command: "npm run start -w api",
      cwd: "..",
      url: "http://127.0.0.1:8000/api/health",
      reuseExistingServer: !isCI,
    },
    {
      command: "npm run dev -w web",
      cwd: "..",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: !isCI,
    },
  ],
});
