/** Signed-in area: profile setup/editing and listings (legacy FastAPI app in src/App.jsx).
 * Visitors who are not logged in are sent to Auth0 first. */
import { AuthShell } from '../components/AuthShell'
// @ts-expect-error legacy JSX integration reference has no type declarations
import App from '../App.jsx'

export default function ProfilePage() {
  return (
    <AuthShell title="Your profile · UBC Ver.">
      <App />
    </AuthShell>
  )
}
