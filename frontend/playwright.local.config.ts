import { defineConfig } from '@playwright/test'
import { existsSync } from 'node:fs'

const braveExecutable = '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'

// Public, browser-only checks. Prefer an existing local Brave installation;
// otherwise Playwright uses its own Chromium (npx playwright install chromium).
const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH ??
  (existsSync(braveExecutable) ? braveExecutable : undefined)

export default defineConfig({
  testDir: './tests',
  testMatch: 'landing-layout.spec.ts',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    browserName: 'chromium',
    headless: true,
    launchOptions: { executablePath },
  },
})
