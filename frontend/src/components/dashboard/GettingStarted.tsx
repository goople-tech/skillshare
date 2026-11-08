import { ArrowRight, Check, Plus, UserRound } from 'lucide-react'
import type { ProfileDetails } from './types'

export function GettingStarted({ profile, onProfile, onFind, onSkill }: { profile: ProfileDetails; onProfile: () => void; onFind: () => void; onSkill: () => void }) {
  const tasks = [
    { done: !!profile.program && !!profile.year, label: 'Program and year' },
    { done: !!profile.courses.length, label: 'Courses' },
    { done: !!profile.interests.length, label: 'Interests' },
    { done: !!profile.teach.length, label: 'A skill you can teach' },
    { done: !!profile.learn.length, label: 'A skill you want to learn' },
  ]
  const doneCount = tasks.filter((task) => task.done).length
  return <section className="dashboard-card getting-started" aria-labelledby="get-started-title"><span className="getting-started-icon"><UserRound size={26} /></span><div className="card-heading"><div><h2 id="get-started-title">Make your profile a starting point</h2><p>A few details help start a comfortable conversation.</p></div></div><div className="getting-started-layout"><div><ol className="start-checklist">{tasks.map((task) => <li key={task.label}><span className={`checklist-check ${task.done ? 'checklist-check--done' : ''}`} aria-hidden="true">{task.done ? <Check size={13} /> : null}</span><div><strong>{task.label}</strong></div></li>)}</ol><button className="button button--quiet edit-profile-cta" onClick={onProfile}>{doneCount === tasks.length ? 'Review your details' : 'Complete profile'} <ArrowRight size={14} /></button></div><div className="getting-started-actions"><button className="button button--primary" onClick={onFind}><Plus size={17} /> Find your first buddy</button><button className="button button--outline" onClick={onSkill}>Offer your first skill <ArrowRight size={15} /></button><p>Connect in person or online, at your own pace.</p></div></div><span className="sr-only">{doneCount} of {tasks.length} profile essentials complete.</span></section>
}
