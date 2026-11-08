import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowRight, GraduationCap } from 'lucide-react'

type Kind = 'buddy' | 'skill' | 'project'
type Details = { offer?: string; learn?: string; style?: string; title?: string; help?: string }
export function TaskDialog({ kind, onClose, onNotice, onSave }: { kind: Kind; onClose: () => void; onNotice: (message: string) => void; onSave: (kind: Exclude<Kind, 'buddy'>, details: Details) => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [saved, setSaved] = useState<'skill' | 'project' | null>(null)
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => { if (dialog?.open) dialog.close() } }, [])
  const heading = kind === 'buddy' ? 'Find a buddy that fits your pace' : kind === 'skill' ? 'Offer a skill to exchange' : 'Share something to make together'
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    if (kind === 'buddy') {
      onClose()
      onNotice('Showing sample recommendations only. No live student search was performed.')
      document.getElementById('skills-matches')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
      return
    }
    if (kind === 'skill' && !saved) {
      setSaved('skill')
      onSave(kind, { offer: String(data.get('offer') ?? ''), learn: String(data.get('learn') ?? '') })
    }
    if (kind === 'project' && !saved) {
      setSaved('project')
      onSave(kind, { title: String(data.get('title') ?? ''), help: String(data.get('help') ?? '') })
    }
    onNotice(`Only this preview session changed. No ${kind === 'skill' ? 'offer or request' : 'project or invitation'} was published.`)
  }
  return <dialog ref={ref} className="dashboard-dialog" aria-labelledby="task-dialog-title" onClose={onClose} onCancel={(event) => { event.preventDefault(); ref.current?.close(); onClose() }} onClick={(event) => { if (event.target === event.currentTarget) onClose() }}><div className="dialog-body"><button className="dialog-close" aria-label="Close dialog" onClick={onClose}>×</button><GraduationCap size={24} className="dialog-heading-icon" /><h2 id="task-dialog-title">{heading}</h2><form onSubmit={submit}>
    {kind === 'buddy' ? <><label htmlFor="buddy-course">Course or interest</label><input id="buddy-course" name="course" required placeholder="CPSC 210, photography…" /><label htmlFor="friend-style">How would you prefer to meet?</label><select id="friend-style" defaultValue="either"><option value="either">In person or online</option><option value="online">Online</option><option value="in-person">In person</option></select></> : kind === 'skill' ? <><label htmlFor="teach">I can teach</label><input id="teach" name="offer" required placeholder="Python, portfolio design…" /><label htmlFor="learn">I want to learn</label><input id="learn" name="learn" required placeholder="Statistics, guitar…" /></> : <><label htmlFor="project-title">Project idea</label><input id="project-title" name="title" required placeholder="A portfolio or club website…" /><label htmlFor="project-help">What would help?</label><textarea id="project-help" name="help" placeholder="Design, Python, feedback…" /></>}
    <p className="preview-callout">{kind === 'buddy' ? 'These filters are a UI preview. No live student directory is queried.' : 'You can review what you added below. Nothing is published or sent.'}</p>
    <button className="button button--primary">{kind === 'buddy' ? 'Explore preview connections' : saved === kind ? 'Saved in this preview' : kind === 'skill' ? 'Add to preview offers' : 'Add to preview projects'} <ArrowRight size={16} /></button>
  </form></div></dialog>
}
