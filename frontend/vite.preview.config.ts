// Frontend-only local preview. Production builds and DeepSpace registration
// continue to use vite.config.ts; this config must never be deployed.
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import generouted from '@generouted/react-router/plugin'

export default defineConfig({
  plugins: [react(), generouted()],
  define: {
    __DEEPSPACE_APP_ID__: JSON.stringify('frontend-preview-not-registered'),
    __DEEPSPACE_SITE_ORIGIN__: JSON.stringify('http://localhost:5173'),
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
})
