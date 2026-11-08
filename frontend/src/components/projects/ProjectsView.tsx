import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { FolderKanban, Heart, MessageCircle, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { apiRequest } from '../../api'
import type { ApiPublicProfile, Request } from '../swipe/swipeSource'
import { ApiProjectSource, MAX_SKILLS, parseSkills, type Project, type SkillGroup } from './projectStore'
import './projects.css'

const initials = (name: string) => name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
const MEETS: Record<string, string> = { in_person: 'In person', online: 'Online', either: 'Online or in person' }
const message = (reason: unknown, fallback: string) => reason instanceof Error ? reason.message : fallback

/** Projects: post what you're making (saved on the server), see who can teach each skill, and browse other students' projects. */
export function ProjectsView() {
  const source = useMemo(() => new ApiProjectSource(apiRequest as Request), [])
  const [projects, setProjects] = useState<Project[]>([])
  const [listStatus, setListStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [listError, setListError] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [groups, setGroups] = useState<SkillGroup[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [error, setError] = useState('')
  const [matchedIds, setMatchedIds] = useState<Set<number>>(new Set())
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [formError, setFormError] = useState('')
  const mine = projects.filter((p) => p.is_mine)
  const others = projects.filter((p) => !p.is_mine)
  const selected = mine.find((p) => p.id === selectedId) ?? null

  const loadProjects = useCallback(async () => {
    setListStatus('loading'); setListError('')
    try {
      const loaded = await source.list()
      setProjects(loaded)
      setSelectedId((current) => loaded.some((p) => p.is_mine && p.id === current) ? current : loaded.find((p) => p.is_mine)?.id ?? null)
      setListStatus('ready')
    } catch (reason) { setListStatus('error'); setListError(message(reason, 'Projects are unavailable right now.')) }
  }, [source])
  useEffect(() => { void loadProjects() }, [loadProjects])
  useEffect(() => {
    source.matches().then((m) => setMatchedIds(new Set(m.map((x) => x.profile.id)))).catch(() => undefined) // only upgrades buttons to "Message"
  }, [source])

  const findTeammates = useCallback(async (projectId: number | null) => {
    if (projectId === null) { setGroups([]); setStatus('idle'); return }
    setStatus('loading'); setError('')
    try { setGroups(await source.teammates(projectId)); setStatus('ready') }
    catch (reason) { setStatus('error'); setError(message(reason, 'The teammate finder is unavailable.')) }
  }, [source])
  useEffect(() => { void findTeammates(selectedId) }, [selectedId, findTeammates])

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formEl = event.currentTarget
    const form = new FormData(formEl)
    const title = String(form.get('title') ?? '').trim()
    const skills = parseSkills(String(form.get('skills') ?? ''))
    if (!title) return setFormError('Give your project a name.')
    if (skills.length === 0) return setFormError('List at least one skill you need, separated by commas.')
    setFormError(''); setBusy('create')
    try {
      const project = await source.create({ title, pitch: String(form.get('pitch') ?? '').trim(), skills_needed: skills })
      setProjects((current) => [project, ...current])
      setSelectedId(project.id)
      formEl.reset()
      setNotice(`“${project.title}” is posted. Other students can see it under Projects from other students.`)
    } catch (reason) { setFormError(message(reason, 'Could not save the project. Try again.')) }
    finally { setBusy(null) }
  }
  const remove = async (project: Project) => {
    setBusy(`delete:${project.id}`); setNotice('')
    try {
      await source.remove(project.id)
      const rest = projects.filter((p) => p.id !== project.id)
      setProjects(rest)
      if (selectedId === project.id) setSelectedId(rest.find((p) => p.is_mine)?.id ?? null)
      setNotice(`Deleted “${project.title}”.`)
    } catch (reason) { setNotice(message(reason, 'Could not delete the project. Try again.')) }
    finally { setBusy(null) }
  }
  const like = async (student: ApiPublicProfile) => {
    setBusy(`like:${student.id}`); setNotice('')
    try {
      const result = await source.like(student.id)
      setLikedIds((current) => new Set(current).add(student.id))
      if (result.matched) { setMatchedIds((current) => new Set(current).add(student.id)); setNotice(`You and ${student.name} matched on SkillShare. You can message them now.`) }
      else setNotice(`Interest sent to ${student.name}. If they like you back on SkillShare, you can message each other.`)
    } catch (reason) { setNotice(message(reason, 'Could not send interest. Try again.')) }
    finally { setBusy(null) }
  }
  const connectButton = (student: ApiPublicProfile, label: string) => matchedIds.has(student.id)
    ? <Link className="button button--primary" to={`/skillshare/messages?participant=${student.id}`}><MessageCircle size={15} /> Message</Link>
    : <button type="button" className="button button--outline" disabled={busy === `like:${student.id}` || likedIds.has(student.id)} onClick={() => void like(student)}><Heart size={15} /> {likedIds.has(student.id) ? 'Interest sent' : label}</button>

  const uniqueStudents = new Set(groups.flatMap((g) => g.students.map((s) => s.id))).size

  return <div className="projects-page">
    <header className="projects-header">
      <p className="projects-eyebrow"><FolderKanban size={15} aria-hidden="true" /> Projects</p>
      <h1>Find teammates for what you want to make</h1>
      <p>Post a project and the skills it needs. We’ll show students who can teach those skills, and other students can find your project too.</p>
    </header>
    {notice && <p className="projects-notice" role="status">{notice}</p>}
    <div className="projects-layout">
      <aside className="projects-aside">
        <form className="dashboard-card projects-form" onSubmit={(e) => void create(e)} aria-labelledby="new-project-title">
          <h2 id="new-project-title">New project</h2>
          <label htmlFor="project-title">Name</label>
          <input id="project-title" name="title" maxLength={80} placeholder="e.g. Bike-safe campus routes" />
          <label htmlFor="project-pitch">One-line pitch <span>(optional)</span></label>
          <textarea id="project-pitch" name="pitch" maxLength={280} rows={2} placeholder="What it does and who it's for" />
          <label htmlFor="project-skills">Skills you need</label>
          <input id="project-skills" name="skills" placeholder="React, Figma, Python" aria-describedby="project-skills-hint" />
          <p id="project-skills-hint" className="projects-hint">Comma-separated, up to {MAX_SKILLS}.</p>
          {formError && <p className="form-error" role="alert">{formError}</p>}
          <button type="submit" className="button button--primary" disabled={busy === 'create'}><Plus size={16} /> {busy === 'create' ? 'Posting…' : 'Post project'}</button>
        </form>
        <section className="dashboard-card projects-list" aria-labelledby="your-projects-title" aria-busy={listStatus === 'loading'}>
          <h2 id="your-projects-title">Your projects</h2>
          {listStatus === 'loading' && <p className="projects-hint" role="status">Loading your projects…</p>}
          {listStatus === 'error' && <div className="projects-error" role="alert"><p>{listError}</p><button type="button" className="button button--outline" onClick={() => void loadProjects()}>Try again</button></div>}
          {listStatus === 'ready' && (mine.length === 0 ? <p className="projects-hint">No projects yet. Post one to start finding teammates.</p> : <ul>
            {mine.map((p) => <li key={p.id} className={p.id === selectedId ? 'is-selected' : ''}>
              <button type="button" className="projects-list-item" aria-pressed={p.id === selectedId} onClick={() => setSelectedId(p.id)}>
                <strong>{p.title}</strong><span>{p.skills_needed.join(' · ')}</span>
              </button>
              <button type="button" className="projects-remove" aria-label={`Delete ${p.title}`} disabled={busy === `delete:${p.id}`} onClick={() => void remove(p)}><Trash2 size={15} /></button>
            </li>)}
          </ul>)}
        </section>
      </aside>

      <section className="projects-results" aria-labelledby="teammates-title" aria-busy={status === 'loading'}>
        {!selected ? <div className="dashboard-card projects-empty"><h2 id="teammates-title">Teammates</h2><p>Post a project on the left and we’ll look for students with the skills it needs.</p></div> : <>
          <div className="projects-results-heading">
            <div><h2 id="teammates-title">{selected.title}</h2>{selected.pitch && <p>{selected.pitch}</p>}</div>
            <button type="button" className="button button--outline" onClick={() => void findTeammates(selected.id)} disabled={status === 'loading'}><RefreshCw size={15} /> Refresh</button>
          </div>
          {status === 'loading' && <p className="projects-hint" role="status">Looking for teammates…</p>}
          {status === 'error' && <div className="dashboard-card projects-error" role="alert"><strong>We couldn’t load teammates.</strong><p>{error}</p><button type="button" className="button button--outline" onClick={() => void findTeammates(selected.id)}>Try again</button></div>}
          {status === 'ready' && <p className="projects-hint">{uniqueStudents === 0 ? 'Nobody has listed these skills yet. Try a broader skill name.' : `${uniqueStudents} ${uniqueStudents === 1 ? 'student can' : 'students can'} help with this project.`}</p>}
          {status === 'ready' && groups.map((group) => <section key={group.skill} className="projects-skill" aria-label={`Students who can teach ${group.skill}`}>
            <h3><span className="projects-skill-chip">{group.skill}</span><span>{group.students.length ? `${group.students.length} found` : 'No one yet'}</span></h3>
            {group.students.length > 0 && <ul className="projects-grid">{group.students.map((student) => <li key={student.id} className="dashboard-card projects-person">
              <header><span className="projects-avatar" aria-hidden="true">{initials(student.name)}</span><div><strong>{student.name}</strong><span>{MEETS[student.mode] ?? student.mode}</span></div></header>
              {student.bio && <p className="projects-bio">{student.bio}</p>}
              <p className="projects-teaches"><span>Can teach</span>{student.skills_teach}</p>
              {connectButton(student, 'Ask to team up')}
            </li>)}</ul>}
          </section>)}
        </>}

        <section className="projects-browse" aria-labelledby="browse-title">
          <h2 id="browse-title">Projects from other students</h2>
          {listStatus === 'ready' && others.length === 0 && <p className="projects-hint">No other projects yet. Yours will show up here for other students.</p>}
          {others.length > 0 && <ul className="projects-grid">{others.map((p) => <li key={p.id} className="dashboard-card projects-person">
            <strong className="projects-browse-title">{p.title}</strong>
            {p.pitch && <p className="projects-bio">{p.pitch}</p>}
            <p className="projects-chips">{p.skills_needed.map((s) => <span key={s} className="projects-skill-chip">{s}</span>)}</p>
            <header><span className="projects-avatar" aria-hidden="true">{initials(p.owner.name)}</span><div><strong>{p.owner.name}</strong><span>Can teach: {p.owner.skills_teach || 'not listed'}</span></div></header>
            {connectButton(p.owner, 'I can help')}
          </li>)}</ul>}
        </section>
      </section>
    </div>
  </div>
}
