import { Link } from 'react-router-dom'
import { Button } from '../../components/ui'
import { AppNavigation } from '../../components/dashboard/AppNavigation'
import { DashboardView } from '../../components/dashboard'
import { WorkspaceProvider, useWorkspace } from '../../components/dashboard/useWorkspaceData'
import { SessionProvider, useSession } from '../../components/dashboard/useSession'

export default function HomePage() {
  return <SessionProvider><WorkspaceProvider><HomeContent /></WorkspaceProvider></SessionProvider>
}
function HomeContent() {
  const { snapshot, setEditProfileOpen } = useWorkspace()
  const { isLoaded, isSignedIn } = useSession()
  return <>
    <title>Your Dashboard — UBC Ver.</title>
    <AppNavigation activities={snapshot.activities} onFind={() => document.getElementById('skills-matches')?.scrollIntoView({ behavior: 'smooth' })} onEditProfile={() => setEditProfileOpen(true)} />
    {isLoaded && (isSignedIn ? <DashboardView /> : <WelcomePreview />)}
  </>
}
function WelcomePreview() {
  const { signIn } = useSession()
  return <div className="preview-signin"><h1>A student workspace, around your pace.</h1><p>Sign in to see your private UBC Ver. workspace. Your workspace will connect to live community data after the shared service is integrated.</p><Button onClick={() => void signIn()}>Sign in to your workspace</Button><Link to="/">Explore the public page</Link></div>
}
