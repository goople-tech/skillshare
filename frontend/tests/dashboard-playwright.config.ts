import { defineConfig } from '@playwright/test'
const PORT = Number(process.env.DEEPSPACE_PORT ?? 5175)
export default defineConfig({
  workers: 1,
  testDir: '.', testMatch: '{dashboard-views,location-sharing,skillshare-discovery}.spec.ts', timeout: 60_000,
  use: { baseURL: `http://127.0.0.1:${PORT}`, launchOptions: { executablePath: process.env.DEEPSPACE_TEST_BROWSER_EXECUTABLE_PATH } },
  webServer: { command: `npx vite --config ${fileURLToPath(new URL('./dashboard.preview.config.ts', import.meta.url))} --host 127.0.0.1 --port ${PORT} --strictPort`, cwd: '..', url: `http://127.0.0.1:${PORT}`, reuseExistingServer: !process.env.CI },
})
import { fileURLToPath } from 'node:url'
