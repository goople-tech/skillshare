/** Shared Auth0 wrapper (client-only pages): passwordless email login via Auth0, session kept in
 * localStorage. Auth0 always returns to `${origin}/auth`, which must be in the Auth0 application's
 * Allowed Callback URLs. See AUTH_TRANSITION.md. */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react'

/** A leftover "is authenticated" cookie with no cached session makes Auth0 try a silent
 * login through a hidden iframe, which hangs ("Loading…") when the browser blocks
 * third-party cookies. Drop the stale cookie so the login button shows right away. */
export function dropStaleAuth0Cookies(clientId: string) {
  if (typeof window === 'undefined') return
  if (Object.keys(window.localStorage).some((k) => k.startsWith('@@auth0spajs@@'))) return
  for (const name of [`auth0.${clientId}.is.authenticated`, 'auth0.is.authenticated']) {
    for (const prefix of ['', '_legacy_']) {
      document.cookie = `${prefix}${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
    }
  }
}

/** Sends visitors straight to Auth0's passwordless login; shows the app once logged in. */
function LoginGate({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated, error, loginWithRedirect } = useAuth0()
  const started = useRef(false)
  const login = () => loginWithRedirect({ authorizationParams: { connection: 'email' } })
  // Coming back from Auth0 (with a code or an error) must not trigger another redirect.
  const params = new URLSearchParams(window.location.search)
  const returning = params.has('code') || params.has('error')

  useEffect(() => {
    if (isLoading || isAuthenticated || error || returning || started.current) return
    started.current = true
    void login()
  })

  if (isAuthenticated) return <>{children}</>
  if (error || params.has('error')) {
    return (
      <div style={{ maxWidth: 420, margin: '60px auto', fontFamily: 'sans-serif' }}>
        <p>Login failed: {error?.message ?? params.get('error_description') ?? 'unknown error'}</p>
        <button onClick={() => { window.history.replaceState({}, '', '/auth'); void login() }}>Try again</button>
      </div>
    )
  }
  return <p style={{ fontFamily: 'sans-serif', padding: 16 }}>Redirecting to login…</p>
}

export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  useState(() => { dropStaleAuth0Cookies(import.meta.env.VITE_AUTH0_CLIENT_ID) })
  return (
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: `${window.location.origin}/auth`,
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        scope: 'openid profile email',
      }}
      cacheLocation="localstorage"
      onRedirectCallback={(appState) => {
        // Logins started elsewhere (e.g. /home) ask to be sent back there.
        const back = appState?.returnTo
        if (typeof back === 'string' && back.startsWith('/') && back !== '/auth') window.location.replace(back)
        else window.history.replaceState({}, '', '/auth')
      }}
    >
      <title>{title}</title>
      <meta name="robots" content="noindex" />
      <LoginGate>{children}</LoginGate>
    </Auth0Provider>
  )
}
