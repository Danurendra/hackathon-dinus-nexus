import { defineConfig } from '@playwright/test';

// Point at an isolated frontend/backend pair; never use production/demo data.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.DEMO_FRONTEND_URL ?? 'http://127.0.0.1:3001',
    channel: process.env.PLAYWRIGHT_CHANNEL ?? 'msedge',
    headless: true,
  },
});
