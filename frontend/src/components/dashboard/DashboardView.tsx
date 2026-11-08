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

export function DashboardView() {
  const { user } = useSession()
  const workspace = useWorkspace()
  const { snapshot, updateProfile, createSkillOffer, createProjectOffer } = workspace
  const [mode, setMode] = useState<'sample' | 'empty'>('sample')
  const [dialog, setDialog] = useState<'buddy' | 'skill' | 'project' | null>(null)
  const [profilePerson, setProfilePerson] = useState<Person | null>(null)
  const [taskError, setTaskError] = useState('')
  const editorRef = useRef<ProfileEditorHandle>(null)
  const profileName = user?.name ?? user?.email?.split('@')[0] ?? 'Student'
  const initials = profileName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  const isNewStudent = mode === 'empty'
  const isSample = workspace.kind === 'preview'
  const isLoading = workspace.status === 'loading'
  const [recoverableError, setRecoverableError] = useState(false)
  const { notice, notify, clearNotice } = useWorkspaceNotice()

  useEffect(() => {
    if (!workspace.editProfileOpen) return
    editorRef.current?.open()
    document.getElementById('profile-summary')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    workspace.setEditProfileOpen(false)
  }, [workspace.editProfileOpen, workspace.setEditProfileOpen])

  const changeRequest = async (id: string, next: RequestStatus) => {
    await (next === 'accepted' ? workspace.acceptRequest(id) : workspace.declineRequest(id))
    notify(next === 'accepted' ? 'Accepted in this preview. No meeting or notification was delivered.' : 'Declined in this preview. No notification was delivered.')
  }
  const openProfile = () => {
    editorRef.current?.open()
    document.getElementById('profile-summary')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }
  const saveProfile = async (profile: ProfileDetails) => {
    await updateProfile(profile)
    clearNotice()
    notify(workspace.kind === 'preview' ? 'Profile updated in this preview only. No server update was performed.' : 'Profile saved.')
  }
  const handleSaveOffer = async (kind: 'skill' | 'project', details: { offer?: string; learn?: string; title?: string; help?: string }) => {
    setTaskError('')
    setRecoverableError(false)
    try {
      if (kind === 'skill') await createSkillOffer({ teach: details.offer ?? '', learn: details.learn ?? '' })
      else await createProjectOffer({ title: details.title ?? '', skillsNeeded: (details.help ?? '').split(',').map((item) => item.trim()).filter(Boolean) })
      clearNotice()
      setRecoverableError(false)
      notify(`${kind === 'skill' ? 'Skill offer' : 'Project idea'} saved in this preview only. Nothing was published or sent.`)
    } catch (reason) {
      setTaskError(reason instanceof Error ? reason.message : 'Saving failed. Please try again.')
    }
  }
  const findBuddy = () => setDialog('buddy')

  return <>
    {notice && <WorkspaceNotice message={notice} onClose={clearNotice} />}
    <main className="dashboard-content">
      <WelcomeActions onFind={findBuddy} onOffer={() => setDialog('skill')} onProjects={() => setDialog('project')} reading={isNewStudent} />
      {isSample && <div className="preview-mode-bar"><span className={isNewStudent ? 'preview-empty-label' : 'preview-sample-label'}><span className="summary-dot" />{isNewStudent ? 'A calm place to begin' : workspace.sourceDescription}</span><select aria-label="Workspace preview mode" value={mode} onChange={(event) => { setMode(event.target.value as 'sample' | 'empty'); void workspace.selectPreviewMode(event.target.value === 'empty'); clearNotice() }}><option value="sample">Preview sample workspace</option><option value="empty">Getting-started view</option></select></div>}
      {!isSample && workspace.error && <ErrorPanel retry={workspace.retry} message={workspace.error} />}
      {isNewStudent ? <>
        <GettingStarted profile={snapshot.profile} onProfile={openProfile} onFind={findBuddy} onSkill={() => setDialog('skill')} />
        <ProfileSummary ref={editorRef} id="profile-summary" name={profileName} initials={initials} profile={snapshot.profile} sourceKind={workspace.kind} onSave={saveProfile} />
      </> : recoverableError ? <ErrorPanel message={workspace.error} retry={async () => { await workspace.retry(); setRecoverableError(false) }} /> : isLoading ? <div className="dashboard-layout"><div className="dashboard-main"><LoadingRows rows={4} /></div><aside className="dashboard-aside"><LoadingRows rows={2} /></aside></div> : <>
        <div className="dashboard-layout">
          <div className="dashboard-main">
            <RequestsPanel requests={snapshot.requests} people={snapshot.people} isBusy={(id) => workspace.isBusy(`request:${id}`)} onFind={findBuddy} onChange={async (id, next) => { setRecoverableError(false); try { await changeRequest(id, next) } catch { setRecoverableError(true) } }} />
            <YourWeek sessions={snapshot.sessions} loading={false} onFind={findBuddy} onChange={notify} />
            {snapshot.skillOffers.length > 0 && <section className="dashboard-card"><h2>Your preview offers</h2><div className="preview-offers">{snapshot.skillOffers.map((offer, index) => <div className="preview-offer" key={`${offer.teach}-${offer.learn}-${index}`}><strong>{offer.teach} ↔ {offer.learn}</strong><span>{isSample ? 'Local only' : 'Saved'}</span></div>)}</div></section>}
            <PeopleMatches people={snapshot.people} matches={snapshot.matches} busyActions={snapshot.people.filter((person) => workspace.isBusy(`person:${person.id}`)).map((person) => `person:${person.id}`).concat(snapshot.matches.filter((match) => workspace.isBusy(`exchange:${match.id}`)).map((match) => `exchange:${match.id}`))} onViewProfile={setProfilePerson} onConnect={async (id) => { setRecoverableError(false); notify(await workspace.connect(id)) }} onExchange={async (id) => { setRecoverableError(false); notify(await workspace.sendExchange(id)) }} />
          </div>
          <aside className="dashboard-aside"><div id="profile-summary"><ProfileSummary ref={editorRef} name={profileName} initials={initials} profile={snapshot.profile} sourceKind={workspace.kind} onSave={saveProfile} /></div><ActivityPanel activities={snapshot.activities} loading={workspace.isBusy('activity:read')} markAllRead={async () => { notify(await workspace.markAllRead()) }} onViewAll={() => notify('Viewing all activity available in this preview. No extra notifications were queried.')} /><CampusPreview /></aside>
        </div>
        <div id="projects" className="projects-area" tabIndex={-1}><section className="dashboard-card project-guide"><div><h2>Start with something you want to make</h2><p>Offer your skills to help with a student project.</p></div><button className="button button--outline" onClick={() => setDialog('project')}>Share a project idea <ArrowUpRight size={16} /></button></section></div>
      </>}
      {isSample && <p className="dashboard-privacy-note">Preview actions do not create bookings, send notifications, or update accounts.</p>}
    </main>
    {dialog && <TaskDialog kind={dialog} isPreview={isSample} onClose={() => setDialog(null)} onError={setTaskError} error={taskError} onSave={handleSaveOffer} />}
    {profilePerson && <ProfileDetailsDialog person={profilePerson} onClose={() => setProfilePerson(null)} />}
  </>
}

export default DashboardView
