/** Auth0 session for the dashboard (replaces DeepSpace's sign-in on /home).
 * Login always goes through `${origin}/auth` (the Auth0 app's Allowed Callback URL) and comes back to /home. */
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react'
import { dropStaleAuth0Cookies } from '../AuthShell'

export type SessionUser = { name: string; email: string; imageUrl?: string }

export function SessionProvider({ children }: { children: ReactNode }) {
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
    >
      {children}
    </Auth0Provider>
  )
}

export function useSession() {
  const { isLoading, isAuthenticated, user, loginWithRedirect, logout } = useAuth0()
  const signIn = useCallback(
    () => loginWithRedirect({ authorizationParams: { connection: 'email' }, appState: { returnTo: '/home' } }),
    [loginWithRedirect],
  )
  const signOut = useCallback(() => logout({ logoutParams: { returnTo: window.location.origin } }), [logout])
  const sessionUser = useMemo<SessionUser | null>(() => {
    if (!user?.email) return null
    // Passwordless login has no display name; Auth0 fills `name` with the email, so use its first part.
    const name = user.name && user.name !== user.email ? user.name : user.email.split('@')[0]
    return { name, email: user.email, imageUrl: user.picture }
  }, [user])
  return { isLoaded: !isLoading, isSignedIn: isAuthenticated, user: sessionUser, userLoading: false, signIn, signOut }
}
