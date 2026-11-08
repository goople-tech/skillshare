// Pure messaging tests: no registered app identity, Auth0 account or live service.
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { include: ['src/components/messaging/**/*.test.{ts,tsx}'], environment: 'happy-dom' },
})
