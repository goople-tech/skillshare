import { Link } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { AppNavigation } from '../../../components/dashboard/AppNavigation'
import { SessionProvider, useSession } from '../../../components/dashboard/useSession'
import { SignedOutSkillShare, SkillShareDiscovery } from '../../../components/skillshare/SkillShareDiscovery'
import '../../../components/dashboard/dashboard.css'

export default function SkillSharePage() { return <SessionProvider><SkillShareContent /></SessionProvider> }
function SkillShareContent() {
  const { isLoaded, isSignedIn, signIn } = useSession()
  const navigate = useNavigate()
  return <><title>SkillShare discovery — UBC Ver.</title><AppNavigation activities={[]} onFind={() => document.getElementById('skill-category')?.focus()} onEditProfile={() => navigate('/profile')} />
    {isLoaded && <main className="dashboard-content discovery-content">{isSignedIn ? <SkillShareDiscovery /> : <SignedOutSkillShare onSignIn={() => void signIn()} />}</main>}
    {!isLoaded && <main className="dashboard-content discovery-content" aria-busy="true"><p className="discovery-loading-session">Loading your SkillShare workspace…</p></main>}
    {isSignedIn && <Link className="sr-only" to="/home">Back to dashboard</Link>}</>
}
