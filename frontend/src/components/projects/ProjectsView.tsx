import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { FolderKanban, Heart, MessageCircle, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { apiRequest } from '../../api'
import type { ApiPublicProfile, Request } from '../swipe/swipeSource'
import { loadProjects, MAX_PROJECTS, MAX_SKILLS, newProject, saveProjects, teammatesQuery, type Project } from './projectStore'
import './projects.css'

type SkillGroup = { skill: string; students: ApiPublicProfile[] }
const request = apiRequest as Request
const initials = (name: string) => name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
const MEETS: Record<string, string> = { in_person: 'In person', online: 'Online', either: 'Online or in person' }

/** Projects: describe what you're making, see real students who can teach each skill it needs. */
export function ProjectsView() {
  const [projects, setProjects] = useState<Project[]>(() => loadProjects())
  const [selectedId, setSelectedId] = useState<string | null>(() => loadProjects()[0]?.id ?? null)
  const [groups, setGroups] = useState<SkillGroup[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [error, setError] = useState('')
  const [matchedIds, setMatchedIds] = useState<Set<number>>(new Set())
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set())
  const [busyId, setBusyId] = useState<number | null>(null)
  const [notice, setNotice] = useState('')
  const [formError, setFormError] = useState('')
  const selected = useMemo(() => projects.find((p) => p.id === selectedId) ?? null, [projects, selectedId])

  useEffect(() => { saveProjects(projects) }, [projects])
  useEffect(() => {
    request<Array<{ profile: ApiPublicProfile }>>('/swipe/matches?kind=skill')
      .then((matches) => setMatchedIds(new Set(matches.map((m) => m.profile.id))))
      .catch(() => undefined) // matches only upgrade "Invite" to "Message"; the page works without them
  }, [])

  const findTeammates = useCallback(async (project: Project | null) => {
    if (!project || project.skills.length === 0) { setGroups([]); setStatus('idle'); return }
    setStatus('loading'); setError('')
    try { setGroups(await request<SkillGroup[]>(`/projects/teammates?${teammatesQuery(project.skills)}`)); setStatus('ready') }
    catch (reason) { setStatus('error'); setError(reason instanceof Error ? reason.message : 'The teammate finder is unavailable.') }
  }, [])
  useEffect(() => { void findTeammates(selected) }, [selected, findTeammates])

  const create = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const project = newProject(String(form.get('title') ?? ''), String(form.get('pitch') ?? ''), String(form.get('skills') ?? ''))
    if (!project.title) return setFormError('Give your project a name.')
    if (project.skills.length === 0) return setFormError('List at least one skill you need, separated by commas.')
    if (projects.length >= MAX_PROJECTS) return setFormError(`You can keep up to ${MAX_PROJECTS} projects. Remove one first.`)
    setFormError('')
    setProjects((current) => [project, ...current])
    setSelectedId(project.id)
    event.currentTarget.reset()
  }
  const remove = (id: string) => {
    const rest = projects.filter((p) => p.id !== id)
    setProjects(rest)
    if (selectedId === id) setSelectedId(rest[0]?.id ?? null)
  }
  const invite = async (student: ApiPublicProfile) => {
    setBusyId(student.id); setNotice('')
    try {
      const result = await request<{ matched: boolean }>('/swipe', { method: 'POST', body: JSON.stringify({ target_id: student.id, kind: 'skill', direction: 'like' }) })
      setLikedIds((current) => new Set(current).add(student.id))
      if (result.matched) { setMatchedIds((current) => new Set(current).add(student.id)); setNotice(`You and ${student.name} matched on SkillShare. You can message them now.`) }
      else setNotice(`Interest sent to ${student.name}. If they like you back on SkillShare, you can message each other.`)
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : 'Could not send interest. Try again.') }
    finally { setBusyId(null) }
  }

  const uniqueStudents = new Set(groups.flatMap((g) => g.students.map((s) => s.id))).size

  return <div className="projects-page">
    <header className="projects-header">
      <p className="projects-eyebrow"><FolderKanban size={15} aria-hidden="true" /> Projects</p>
      <h1>Find teammates for what you want to make</h1>
      <p>Describe a project and the skills it needs. We’ll show UBC students who listed those skills as something they can teach.</p>
    </header>
    {notice && <p className="projects-notice" role="status">{notice}</p>}
    <div className="projects-layout">
      <aside className="projects-aside">
        <form className="dashboard-card projects-form" onSubmit={create} aria-labelledby="new-project-title">
          <h2 id="new-project-title">New project</h2>
          <label htmlFor="project-title">Name</label>
          <input id="project-title" name="title" maxLength={80} placeholder="e.g. Bike-safe campus routes" />
          <label htmlFor="project-pitch">One-line pitch <span>(optional)</span></label>
          <textarea id="project-pitch" name="pitch" maxLength={280} rows={2} placeholder="What it does and who it's for" />
          <label htmlFor="project-skills">Skills you need</label>
          <input id="project-skills" name="skills" placeholder="React, Figma, Python" aria-describedby="project-skills-hint" />
          <p id="project-skills-hint" className="projects-hint">Comma-separated, up to {MAX_SKILLS}.</p>
          {formError && <p className="form-error" role="alert">{formError}</p>}
          <button type="submit" className="button button--primary"><Plus size={16} /> Add project</button>
        </form>
        <section className="dashboard-card projects-list" aria-labelledby="your-projects-title">
          <h2 id="your-projects-title">Your projects</h2>
          {projects.length === 0 ? <p className="projects-hint">No projects yet. Add one to start finding teammates.</p> : <ul>
            {projects.map((p) => <li key={p.id} className={p.id === selectedId ? 'is-selected' : ''}>
              <button type="button" className="projects-list-item" aria-pressed={p.id === selectedId} onClick={() => setSelectedId(p.id)}>
                <strong>{p.title}</strong><span>{p.skills.join(' · ')}</span>
              </button>
              <button type="button" className="projects-remove" aria-label={`Remove ${p.title}`} onClick={() => remove(p.id)}><Trash2 size={15} /></button>
            </li>)}
          </ul>}
          <p className="projects-hint">Saved in this browser only. Projects aren’t published to other students yet.</p>
        </section>
      </aside>

      <section className="projects-results" aria-labelledby="teammates-title" aria-busy={status === 'loading'}>
        {!selected ? <div className="dashboard-card projects-empty"><h2 id="teammates-title">Teammates</h2><p>Add a project on the left and we’ll look for students with the skills it needs.</p></div> : <>
          <div className="projects-results-heading">
            <div><h2 id="teammates-title">{selected.title}</h2>{selected.pitch && <p>{selected.pitch}</p>}</div>
            <button type="button" className="button button--outline" onClick={() => void findTeammates(selected)} disabled={status === 'loading'}><RefreshCw size={15} /> Refresh</button>
          </div>
          {status === 'loading' && <p className="projects-hint" role="status">Looking for teammates…</p>}
          {status === 'error' && <div className="dashboard-card projects-error" role="alert"><strong>We couldn’t load teammates.</strong><p>{error}</p><button type="button" className="button button--outline" onClick={() => void findTeammates(selected)}>Try again</button></div>}
          {status === 'ready' && <p className="projects-hint">{uniqueStudents === 0 ? 'Nobody has listed these skills yet. Try a broader skill name.' : `${uniqueStudents} ${uniqueStudents === 1 ? 'student can' : 'students can'} help with this project.`}</p>}
          {status === 'ready' && groups.map((group) => <section key={group.skill} className="projects-skill" aria-label={`Students who can teach ${group.skill}`}>
            <h3><span className="projects-skill-chip">{group.skill}</span><span>{group.students.length ? `${group.students.length} found` : 'No one yet'}</span></h3>
            {group.students.length > 0 && <ul className="projects-grid">{group.students.map((student) => <li key={student.id} className="dashboard-card projects-person">
              <header><span className="projects-avatar" aria-hidden="true">{initials(student.name)}</span><div><strong>{student.name}</strong><span>{MEETS[student.mode] ?? student.mode}</span></div></header>
              {student.bio && <p className="projects-bio">{student.bio}</p>}
              <p className="projects-teaches"><span>Can teach</span>{student.skills_teach}</p>
              {matchedIds.has(student.id)
                ? <Link className="button button--primary" to={`/skillshare/messages?participant=${student.id}`}><MessageCircle size={15} /> Message</Link>
                : <button type="button" className="button button--outline" disabled={busyId === student.id || likedIds.has(student.id)} onClick={() => void invite(student)}><Heart size={15} /> {likedIds.has(student.id) ? 'Interest sent' : 'Ask to team up'}</button>}
            </li>)}</ul>}
          </section>)}
        </>}
      </section>
    </div>
  </div>
}
