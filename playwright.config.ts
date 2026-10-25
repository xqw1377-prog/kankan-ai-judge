import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.SMOKE_BASE_URL || "https://www.kankanai.cc";

export default defineConfig({
  testDir: "e2e",
  timeout: 45_000,
  expect: { timeout: 20_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL,
    ...devices["Pixel 5"],
    trace: "off",
    screenshot: "off",
    video: "off",
  },
});
