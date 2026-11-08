/** Real Auth0 passwordless login (client-only, not prerendered).
 * Wraps the legacy FastAPI/Gemini app (src/App.jsx) in Auth0Provider.
 * The landing page's "Log In" buttons link here. Add `${origin}/auth` to the
 * Auth0 application's Allowed Callback URLs. See AUTH_TRANSITION.md.
 */
import { useState } from 'react'
import { Auth0Provider } from '@auth0/auth0-react'
// @ts-expect-error legacy JSX integration reference has no type declarations
import App from '../App.jsx'

/** A leftover "is authenticated" cookie with no cached session makes Auth0 try a silent
 * login through a hidden iframe, which hangs ("Loading…") when the browser blocks
 * third-party cookies. Drop the stale cookie so the login button shows right away. */
function dropStaleAuth0Cookies(clientId: string) {
  if (typeof window === 'undefined') return
  if (Object.keys(window.localStorage).some((k) => k.startsWith('@@auth0spajs@@'))) return
  for (const name of [`auth0.${clientId}.is.authenticated`, 'auth0.is.authenticated']) {
    for (const prefix of ['', '_legacy_']) {
      document.cookie = `${prefix}${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
    }
  }
}

export default function AuthPage() {
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
      onRedirectCallback={() => window.history.replaceState({}, '', '/auth')}
    >
      <title>Log in · UBC Ver.</title>
      <meta name="robots" content="noindex" />
      <App />
    </Auth0Provider>
  )
}
