import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react'
import { setTokenGetter } from './api'
import { configureApiUrl } from './apiConfig'

export type ClientRuntimeConfig = { apiUrl: string; auth0Domain: string; auth0ClientId: string; auth0Audience?: string }
const ClientRuntime = createContext<ClientRuntimeConfig | null>(null)

export function ClientRuntimeProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ClientRuntimeConfig | undefined>(undefined)
  const [error, setError] = useState<string>()
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/client-config', { signal: controller.signal, cache: 'no-store' })
      .then(async response => { if (!response.ok) throw new Error('Client configuration is unavailable.'); return await response.json() as ClientRuntimeConfig })
      .then((data: ClientRuntimeConfig) => {
        configureApiUrl(data.apiUrl)
        setConfig(data)
      })
      .catch(reason => { if (!controller.signal.aborted) setError(reason.message) })
    return () => controller.abort()
  }, [])
  if (error) return <div role="alert"><h1>Cannot connect to workspace</h1><p>{error}</p><button onClick={() => location.reload()}>Retry</button></div>
  if (!config) return <p role="status">Loading workspace…</p>
  return <Auth0Provider
    domain={config.auth0Domain} clientId={config.auth0ClientId}
    authorizationParams={{ redirect_uri: `${window.location.origin}/auth`, audience: config.auth0Audience, scope: 'openid profile email' }}
    cacheLocation="localstorage"
    onRedirectCallback={(appState) => {
      const back = appState?.returnTo
      if (typeof back === 'string' && back.startsWith('/') && back !== '/auth') window.location.replace(back)
      else window.history.replaceState({}, '', '/auth')
    }}>
    <ClientRuntime.Provider value={config}><TokenBridge>{children}</TokenBridge></ClientRuntime.Provider>
  </Auth0Provider>
}
function TokenBridge({ children }: { children: ReactNode }) {
  const { getAccessTokenSilently } = useAuth0()
  useEffect(() => { setTokenGetter(async () => (await getAccessTokenSilently()) ?? null) }, [getAccessTokenSilently])
  return children
}
export function useClientRuntime() {
  const context = useContext(ClientRuntime)
  if (!context) throw new Error('ClientRuntimeProvider missing')
  return context
}
