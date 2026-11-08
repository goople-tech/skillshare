import type { ReactNode } from 'react'

// Local visual-test identity only; this module is never in the real bundle.
export function SessionProvider({ children }: { children: ReactNode }) { return children }
export function useSession() {
  return { isLoaded: true, isSignedIn: true, user: { name: 'Dashboard Reviewer', email: 'dashboard-demo@deepspace.test' }, userLoading: false, signIn: () => {}, signOut: () => {} }
}
