import { defineConfig } from '@playwright/test'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
const brave = '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'
const port = Number(process.env.MESSAGING_TEST_PORT ?? 5176)
export default defineConfig({
  testDir: '.', testMatch: 'messaging.spec.ts', timeout: 30_000, workers: 1,
  outputDir: '../.deepspace/messaging-test-results',
  use: { baseURL: `http://127.0.0.1:${port}`, launchOptions: { executablePath: process.env.MESSAGING_TEST_BROWSER_EXECUTABLE_PATH ?? (existsSync(brave) ? brave : undefined) } },
  webServer: { command: `npx vite --config tests/messaging.preview.config.ts --host 127.0.0.1 --port ${port} --strictPort`, cwd: '..', url: `http://127.0.0.1:${port}`, reuseExistingServer: !process.env.CI },
})
