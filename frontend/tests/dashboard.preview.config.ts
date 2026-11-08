import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import generouted from '@generouted/react-router/plugin'
import { fileURLToPath } from 'node:url'
const root = (path: string) => fileURLToPath(new URL(`../${path}`, import.meta.url))
export default defineConfig({
  plugins: [react(), generouted()],
  resolve: { alias: [{ find: '@auth0/auth0-react', replacement: root('tests/auth0-mock.tsx') }, { find: '@', replacement: root('src') }] },
  env: { VITE_API_URL: 'http://localhost:8010' },
  define: { __DEEPSPACE_APP_ID__: JSON.stringify('preview-ui-test'), __DEEPSPACE_SITE_ORIGIN__: JSON.stringify('http://localhost:5177') },
})
