import { Link, useNavigate } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { AppNavigation } from '../../../components/dashboard/AppNavigation'
import { SessionProvider, useSession } from '../../../components/dashboard/useSession'
import { LiveHeatmap } from '../../../components/dashboard/LiveHeatmap'
import '../../../components/dashboard/dashboard.css'
import '../../../components/swipe/swipe.css'
import '../../../components/skillshare/skillshare.css'
import '../../../components/projects/projects.css'

/** Standalone Campus Activity page: the anonymous live heatmap at full size. */
export default function CampusPage() { return <SessionProvider><CampusContent /></SessionProvider> }
function CampusContent() {
  const { isLoaded, isSignedIn, signIn } = useSession()
  const navigate = useNavigate()
  return <><title>Campus Activity — Flockwork</title><AppNavigation activities={[]} onFind={() => navigate('/skillshare')} onEditProfile={() => navigate('/profile')} />
    {isLoaded && <main className="dashboard-content discovery-content">{isSignedIn ? <div className="campus-page">
      <header>
        <p className="projects-eyebrow"><MapPin size={15} aria-hidden="true" /> Campus Activity</p>
        <h1>Where students are studying right now</h1>
        <p>See busy spots on campus without anyone’s name attached, and share your own spot when you want company.</p>
      </header>
      <section className="dashboard-card campus-card" aria-label="Live campus map"><LiveHeatmap /></section>
      <p className="campus-privacy">Locations are grouped into campus areas before anyone sees them, and you can stop sharing at any time.</p>
    </div> : <section className="dashboard-card buddies-signed-out" aria-labelledby="campus-signed-out-title">
      <h1 id="campus-signed-out-title">See campus activity</h1>
      <p>Sign in with your UBC email to see where students are studying right now.</p>
      <button type="button" className="button button--primary" onClick={() => void signIn()}>Sign in</button>
    </section>}</main>}
    {!isLoaded && <main className="dashboard-content discovery-content" aria-busy="true"><p className="discovery-loading-session">Loading the campus map…</p></main>}
    {isSignedIn && <Link className="sr-only" to="/home">Back to dashboard</Link>}</>
}
