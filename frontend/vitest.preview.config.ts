// Isolated pure frontend unit tests; keep DeepSpace's registered-ID build
// checks in vite.config.ts and vitest.config.ts unchanged.
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { include: ['src/components/landing/**/*.test.ts'], environment: 'node' },
})
