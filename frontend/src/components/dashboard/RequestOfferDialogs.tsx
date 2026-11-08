import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowRight, GraduationCap } from 'lucide-react'
import { BusyLabel } from './DashboardFeedback'

type Kind = 'buddy' | 'skill' | 'project'
type Details = { offer?: string; learn?: string; title?: string; help?: string }
type Props = { kind: Kind; isPreview: boolean; error: string; onClose: () => void; onError: (message: string) => void; onSave: (kind: Exclude<Kind, 'buddy'>, details: Details) => Promise<void> }
export function TaskDialog({ kind, isPreview, onClose, onError, onSave, error }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => { if (dialog?.open) dialog.close() } }, [])
  const heading = kind === 'buddy' ? 'Find a buddy that fits your pace' : kind === 'skill' ? 'Offer a skill to exchange' : 'Share something to make together'
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving || saved) return
    onError('')
    const data = new FormData(event.currentTarget)
    if (kind === 'buddy') {
      onClose()
      document.getElementById('skills-matches')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
      return
    }
    setSaving(true)
    try {
      await onSave(kind, { offer: String(data.get('offer') ?? ''), learn: String(data.get('learn') ?? ''), title: String(data.get('title') ?? ''), help: String(data.get('help') ?? '') })
      setSaved(true)
    } catch (reason) { onError(reason instanceof Error ? reason.message : 'Could not save. Please try again.') }
    finally { setSaving(false) }
  }
  return <dialog ref={ref} className="dashboard-dialog dashboard-dialog--centered" aria-labelledby="task-dialog-title" onClose={onClose} onCancel={(event) => { event.preventDefault(); ref.current?.close(); onClose() }} onClick={(event) => { if (event.target === event.currentTarget) onClose() }}><div className="dialog-body"><button className="dialog-close" aria-label="Close dialog" onClick={onClose}>×</button><GraduationCap size={24} className="dialog-heading-icon" /><h2 id="task-dialog-title">{heading}</h2><form onSubmit={(event) => void submit(event)}>
    {kind === 'buddy' ? <><label htmlFor="buddy-course">Course or interest</label><input id="buddy-course" name="course" required placeholder="CPSC 210, photography…" /><label htmlFor="friend-style">How would you prefer to meet?</label><select id="friend-style" defaultValue="either"><option value="either">In person or online</option><option value="online">Online</option><option value="in-person">In person</option></select></> : kind === 'skill' ? <><label htmlFor="teach">I can teach</label><input id="teach" name="offer" required placeholder="Python, portfolio design…" /><label htmlFor="learn">I want to learn</label><input id="learn" name="learn" required placeholder="Statistics, guitar…" /></> : <><label htmlFor="project-title">Project idea</label><input id="project-title" name="title" required placeholder="A portfolio or club website…" /><label htmlFor="project-help">What would help?</label><textarea id="project-help" name="help" placeholder="Design, Python, feedback…" /></>}
    <p className="preview-callout">{kind === 'buddy' ? isPreview ? 'Example connections to explore.' : 'Search live recommendations when the matching endpoint is ready.' : isPreview ? 'This stays in your preview.' : 'We’ll only save this on the server when connected.'}</p>{error && <p className="form-error" role="alert">{error}</p>}<div className="dialog-form-actions"><button className="button button--primary" disabled={saving || saved}>{kind === 'buddy' ? isPreview ? 'Explore preview connections' : 'Search connections' : saved ? 'Saved in this preview' : saving ? 'Saving…' : kind === 'skill' ? 'Add to preview offers' : 'Add to preview projects'} {saving && <BusyLabel busy> </BusyLabel>}{!saving && <ArrowRight size={16} />}</button>{saved && <button type="button" className="button button--outline" onClick={onClose}>Done</button>}</div>
  </form></div></dialog>
}
