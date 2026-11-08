/** Login + Auth0 callback only. Sends visitors to Auth0, then on to their profile.
 * The landing page's "Log In / Sign Up" buttons link here. */
import { Navigate } from 'react-router-dom'
import { AuthShell } from '../components/AuthShell'

export default function AuthPage() {
  return (
    <AuthShell title="Log in · UBC Ver.">
      <Navigate to="/account" replace />
    </AuthShell>
  )
}
