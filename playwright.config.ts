import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

const chromeInstalled = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  `${process.env.LOCALAPPDATA ?? ''}/Google/Chrome/Application/chrome.exe`,
].some((file) => existsSync(file));

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:8100',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(chromeInstalled ? { channel: 'chrome' } : {}),
      },
    },
  ],
  webServer: {
    command: 'npm start -- --host 127.0.0.1 --port 8100',
    url: 'http://127.0.0.1:8100',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
