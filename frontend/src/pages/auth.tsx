/** Login + Auth0 callback only. Sends visitors to Auth0, then on to the dashboard (/home).
 * The landing page's "Log In / Sign Up" buttons link here. */
import { Navigate } from 'react-router-dom'
import { AuthShell } from '../components/AuthShell'
import { ClientRuntimeProvider } from '../client-runtime'

export default function AuthPage() {
  return (
    <ClientRuntimeProvider>
      <AuthShell title="Log in · Flockwork">
        <Navigate to="/home" replace />
      </AuthShell>
    </ClientRuntimeProvider>
  )
}
