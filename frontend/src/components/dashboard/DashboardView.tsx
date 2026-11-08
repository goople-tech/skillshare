import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { useSession } from './useSession'
import { useWorkspace } from './useWorkspaceData'
import { WelcomeActions } from './WelcomeActions'
import { RequestsPanel } from './RequestsPanel'
import { YourWeek } from './YourWeek'
import { ActivityPanel } from './ActivityPanel'
import { PeopleMatches } from './PeopleMatches'
import { CampusPreview } from './CampusPreview'
import { ProfileSummary, type ProfileEditorHandle } from './ProfileSummary'
import { GettingStarted } from './GettingStarted'
import { ProfileDetailsDialog } from './ProfileDetailsDialog'
import { TaskDialog } from './RequestOfferDialogs'
import { ErrorPanel, LoadingRows, WorkspaceNotice, useWorkspaceNotice } from './DashboardFeedback'
import type { Person, ProfileDetails, RequestStatus } from './types'

export default function DashboardView() {
  const { user } = useSession()
  const workspace = useWorkspace()
  const { snapshot, retry, status, acceptRequest, declineRequest, markAllRead, setDemoMode, connect, sendExchange } = workspace
  const [mode, setMode] = useState<'sample' | 'empty'>('sample')
  const [profile, setProfile] = useState<ProfileDetails>(() => ({ ...snapshot.profile, imageUrl: user?.imageUrl, verified: false }))
  const [drafts, setDrafts] = useState<{ skill: string[]; project: string[] }>({ skill: [], project: [] })
  const [recoverableError, setRecoverableError] = useState(false)
  const [dialog, setDialog] = useState<'buddy' | 'skill' | 'project' | null>(null)
  const [profilePerson, setProfilePerson] = useState<Person | null>(null)
  const editorRef = useRef<ProfileEditorHandle>(null)
  const profileName = user?.name ?? user?.email?.split('@')[0] ?? 'Student'
  const initials = profileName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  const isNewStudent = mode === 'empty'
  const isRequestBusy = (id: string) => workspace.busyActions.includes(`request:${id}`)
  const { notice, notify, clearNotice } = useWorkspaceNotice()

  useEffect(() => {
    if (!workspace.editProfileOpen) return
    editorRef.current?.open()
    document.getElementById('profile-summary')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    workspace.setEditProfileOpen(false)
  }, [workspace.editProfileOpen, workspace.setEditProfileOpen])

  const changeRequest = async (id: string, next: RequestStatus) => {
    await (next === 'accepted' ? acceptRequest(id) : declineRequest(id))
    notify(`${next === 'accepted' ? 'Accepted' : 'Declined'} locally in the sample. No meeting or notification was delivered.`)
  }
  const openProfile = () => {
    editorRef.current?.open()
    document.getElementById('profile-summary')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }
  const saveProfile = (updated: ProfileDetails) => { setProfile(updated); notify('Profile updated in this preview only. No server update was performed.') }
  const retryPreview = async () => { await retry(); setRecoverableError(false); notify('Preview restored.') }
  const findBuddy = () => setDialog('buddy')

  return <>
    {notice && <WorkspaceNotice message={notice} onClose={clearNotice} />}
    <main className="dashboard-content">
      <WelcomeActions onFind={findBuddy} onOffer={() => setDialog('skill')} onProjects={() => setDialog('project')} reading={isNewStudent} />
      <div className="preview-mode-bar"><span className={isNewStudent ? 'preview-empty-label' : 'preview-sample-label'}><span className="summary-dot" />{isNewStudent ? 'A calm place to begin' : 'Preview sample · local actions, not live student data'}</span><select aria-label="Workspace preview mode" value={mode} onChange={(event) => { const next = event.target.value as 'sample' | 'empty'; setMode(next); void setDemoMode(next); clearNotice() }}><option value="sample">Preview sample workspace</option><option value="empty">Getting-started view</option></select></div>
      {recoverableError ? <ErrorPanel retry={retryPreview} /> : isNewStudent ? <>
        <GettingStarted profile={profile} onProfile={openProfile} onFind={findBuddy} onSkill={() => setDialog('skill')} />
        <ProfileSummary ref={editorRef} id="profile-summary" name={profileName} initials={initials} profile={profile} onSave={saveProfile} />
      </> : status === 'loading' ? <div className="dashboard-layout"><div className="dashboard-main"><LoadingRows rows={4} /></div><aside className="dashboard-aside"><LoadingRows rows={2} /></aside></div> : <>
        <div className="dashboard-layout">
          <div className="dashboard-main">
            <RequestsPanel requests={snapshot.requests} people={snapshot.people} isBusy={isRequestBusy} onFind={findBuddy} onChange={changeRequest} />
            <YourWeek sessions={snapshot.sessions} loading={false} onFind={findBuddy} onChange={notify} />
            {drafts.skill.length > 0 && <section className="dashboard-card"><h2>Your preview offers</h2><div className="preview-offers">{drafts.skill.map((draft) => <div className="preview-offer" key={draft}><strong>{draft}</strong><span>Local only</span></div>)}</div></section>}
            <PeopleMatches people={snapshot.people} matches={snapshot.matches} busyActions={workspace.busyActions} onViewProfile={setProfilePerson} onConnect={async (id) => { await connect(id); notify('Connection saved in this preview. No request was sent.') }} onExchange={async (id) => { await sendExchange(id); notify('Exchange interest saved in this preview. No request was sent.') }} />
          </div>
          <aside className="dashboard-aside"><div id="profile-summary"><ProfileSummary ref={editorRef} name={profileName} initials={initials} profile={profile} onSave={saveProfile} /></div><ActivityPanel activities={snapshot.activities} loading={workspace.busyActions.includes('activity:read')} markAllRead={async () => { await markAllRead(); notify('Preview updates marked as read in this session.') }} onViewAll={() => notify('Viewing all activity available in this local sample. No live notifications were queried.')} /><CampusPreview /></aside>
        </div>
        <div id="projects" className="projects-area" tabIndex={-1}><section className="dashboard-card project-guide"><div><h2>Start with something you want to make</h2><p>Offer your skills to help with a student project.</p></div><button className="button button--outline" onClick={() => setDialog('project')}>Share a project idea <ArrowUpRight size={16} /></button></section></div>
      </>}
      <p className="dashboard-privacy-note">Preview actions do not create bookings, send notifications, or update accounts. <button onClick={() => setRecoverableError(true)} className="text-button">Preview error/recovery state</button></p>
    </main>
    {dialog && <TaskDialog kind={dialog} onClose={() => setDialog(null)} onNotice={notify} onSave={(kind, details) => { if (kind === 'skill') { setProfile((current) => ({ ...current, teach: [...current.teach, details.offer ?? ''], learn: [...current.learn, details.learn ?? ''] })); setDrafts((current) => ({ ...current, skill: [...current.skill, `${details.offer} ↔ ${details.learn}`] })) } else { setDrafts((current) => ({ ...current, project: [...current.project, details.title ?? 'Untitled project idea'] })) } }} />}
    {profilePerson && <ProfileDetailsDialog person={profilePerson} onClose={() => setProfilePerson(null)} />}
  </>
}
export { DashboardView }
