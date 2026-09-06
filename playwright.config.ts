import { defineConfig, devices } from "@playwright/test";
import { readFileSync } from "node:fs";

const localEnv: Record<string, string> = {};
try {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    localEnv[key] = value;
    process.env[key] = value;
  }
} catch {
  // .env.local is optional for public-route tests
}

process.env.E2E_EMAIL ??= "synapse.e2e@gmail.com";
process.env.E2E_PASSWORD ??= "SynapseE2e!234";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 180_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "npx next dev --hostname 127.0.0.1 --port 3000",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: Object.fromEntries(
      Object.entries({ ...process.env, ...localEnv }).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    ),
  },
});
