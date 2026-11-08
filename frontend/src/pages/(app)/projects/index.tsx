import { Link, useNavigate } from 'react-router-dom'
import { AppNavigation } from '../../../components/dashboard/AppNavigation'
import { SessionProvider, useSession } from '../../../components/dashboard/useSession'
import { ProjectsView } from '../../../components/projects/ProjectsView'
import '../../../components/dashboard/dashboard.css'
import '../../../components/swipe/swipe.css'
import '../../../components/skillshare/skillshare.css'

/** Standalone Projects page: describe a project, find students who can teach the skills it needs. */
export default function ProjectsPage() { return <SessionProvider><ProjectsContent /></SessionProvider> }
function ProjectsContent() {
  const { isLoaded, isSignedIn, signIn } = useSession()
  const navigate = useNavigate()
  return <><title>Projects — UBC Ver.</title><AppNavigation activities={[]} onFind={() => document.getElementById('project-title')?.focus()} onEditProfile={() => navigate('/profile')} />
    {isLoaded && <main className="dashboard-content discovery-content">{isSignedIn ? <ProjectsView /> : <section className="dashboard-card buddies-signed-out" aria-labelledby="projects-signed-out-title">
      <h1 id="projects-signed-out-title">Find teammates for your project</h1>
      <p>Sign in with your UBC email to find students who can help build what you’re making.</p>
      <button type="button" className="button button--primary" onClick={() => void signIn()}>Sign in</button>
    </section>}</main>}
    {!isLoaded && <main className="dashboard-content discovery-content" aria-busy="true"><p className="discovery-loading-session">Loading Projects…</p></main>}
    {isSignedIn && <Link className="sr-only" to="/home">Back to dashboard</Link>}</>
}
