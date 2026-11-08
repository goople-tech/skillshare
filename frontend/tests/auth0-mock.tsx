import { createContext } from 'react'
import type { Auth0ContextInterface } from '@auth0/auth0-react'
import type { ReactNode } from 'react'

// Explicit component-test identity, not a student verification or API token.
export const Auth0Context = createContext<Auth0ContextInterface>({} as Auth0ContextInterface)
export const useAuth0 = (): Auth0ContextInterface => ({ isLoading: false, isAuthenticated: true, user: { name: 'Dashboard Reviewer', email: 'dashboard-demo@deepspace.test' }, loginWithRedirect: async () => {}, logout: async () => {}, getAccessTokenSilently: async () => 'preview-access-token' } as Auth0ContextInterface)
export const Auth0Provider = ({ children }: { children: ReactNode }) => children
