import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AuthGate, AuthOverlay } from 'deepspace'
import { Button } from '../../components/ui'
import { AppNavigation } from '../../components/dashboard/AppNavigation'
import { DashboardView } from '../../components/dashboard'
import { WorkspaceProvider, useWorkspace } from '../../components/dashboard/useWorkspaceData'

export default function HomePage() {
  return <WorkspaceProvider><HomeContent /></WorkspaceProvider>
}
function HomeContent() {
  const { snapshot, setEditProfileOpen } = useWorkspace()
  return <>
    <title>Your Dashboard — UBC Ver.</title>
    <AppNavigation activities={snapshot.activities} onFind={() => document.getElementById('skills-matches')?.scrollIntoView({ behavior: 'smooth' })} onEditProfile={() => setEditProfileOpen(true)} />
    <AuthGate fallback={<WelcomePreview />}><DashboardView /></AuthGate>
  </>
}
function WelcomePreview() {
  const [showAuth, setShowAuth] = useState(false)
  return <div className="preview-signin"><h1>A student workspace, around your pace.</h1><p>Sign in to see your private UBC Ver. workspace. Your workspace will connect to live community data after the shared service is integrated.</p><Button onClick={() => setShowAuth(true)}>Sign in to your workspace</Button><Link to="/">Explore the public page</Link>{showAuth && <AuthOverlay onClose={() => setShowAuth(false)} />}</div>
}
