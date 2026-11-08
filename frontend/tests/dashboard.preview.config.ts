import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import generouted from '@generouted/react-router/plugin'
import { fileURLToPath } from 'node:url'
const root = (path: string) => fileURLToPath(new URL(`../${path}`, import.meta.url))
const testSessionId = 'virtual:session-preview'
const testSession: Plugin = {
  name: 'session-preview',
  resolveId(source) { if (source.endsWith('/useSession.tsx') || source.endsWith('/useSession')) return testSessionId },
  load(id) {
    if (id !== testSessionId) return
    return `export function SessionProvider({ children }) { return children }
export function useSession() { return { isLoaded: true, isSignedIn: true, user: { name: 'Dashboard Reviewer', email: 'dashboard-demo@deepspace.test' }, userLoading: false, signIn: () => {}, signOut: () => {} } }`
  },
}
export default defineConfig({
  plugins: [testSession, react(), generouted()],
  resolve: { alias: [{ find: '@auth0/auth0-react', replacement: root('tests/auth0-mock.tsx') }, { find: '@', replacement: root('src') }] },
  env: { VITE_API_URL: 'http://localhost:8010' },
  define: { __DEEPSPACE_APP_ID__: JSON.stringify('preview-ui-test'), __DEEPSPACE_SITE_ORIGIN__: JSON.stringify('http://localhost:5177') },
})
