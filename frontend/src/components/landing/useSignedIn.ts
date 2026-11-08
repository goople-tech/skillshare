import { useEffect, useState } from 'react'

/** True when this browser already holds an Auth0 session (the SPA SDK caches tokens in localStorage).
 * Read after mount so the prerendered page and first client render match. UI hint only: /home and the
 * backend still verify the session. The landing page deliberately does not load the Auth0 SDK. */
export function useSignedIn() {
  const [signedIn, setSignedIn] = useState(false)
  useEffect(() => {
    const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID
    const check = () => {
      try {
        const prefix = `@@auth0spajs@@::${clientId}::`
        setSignedIn(Object.keys(window.localStorage).some((key) => key.startsWith(prefix)))
      } catch { setSignedIn(false) }
    }
    check()
    window.addEventListener('storage', check)
    return () => window.removeEventListener('storage', check)
  }, [])
  return signedIn
}
