import { Link, useNavigate } from 'react-router-dom'
import { AppNavigation } from '../../../components/dashboard/AppNavigation'
import { SessionProvider, useSession } from '../../../components/dashboard/useSession'
import { SwipeLauncher } from '../../../components/swipe/SwipeLauncher'
import '../../../components/dashboard/dashboard.css'

/** Standalone Buddies page: Speed Matching phones beside filters and match tiles. */
export default function BuddiesPage() { return <SessionProvider><BuddiesContent /></SessionProvider> }
function BuddiesContent() {
  const { isLoaded, isSignedIn, signIn } = useSession()
  const navigate = useNavigate()
  return <><title>Buddies — Flockwork</title><AppNavigation onFind={() => document.getElementById('swipe-decks')?.focus()} onEditProfile={() => navigate('/profile')} />
    {isLoaded && <main className="dashboard-content discovery-content">{isSignedIn ? <SwipeLauncher /> : <section className="dashboard-card buddies-signed-out" aria-labelledby="buddies-signed-out-title">
      <h1 id="buddies-signed-out-title">Find your study buddies</h1>
      <p>Sign in with your UBC email to see students who share your courses and interests.</p>
      <button type="button" className="button button--primary" onClick={() => void signIn()}>Sign in</button>
    </section>}</main>}
    {!isLoaded && <main className="dashboard-content discovery-content" aria-busy="true"><p className="discovery-loading-session">Loading your Buddies workspace…</p></main>}
    {isSignedIn && <Link className="sr-only" to="/home">Back to dashboard</Link>}</>
}
