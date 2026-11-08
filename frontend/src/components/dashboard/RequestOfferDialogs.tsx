import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowRight, GraduationCap } from 'lucide-react'
import { BusyLabel } from './DashboardFeedback'

type Details = { title?: string; help?: string }
type Props = { isPreview: boolean; error: string; onClose: () => void; onError: (message: string) => void; onSave: (details: Details) => Promise<void> }
export function TaskDialog({ isPreview, onClose, onError, onSave, error }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => { if (dialog?.open) dialog.close() } }, [])
  const heading = 'Share something to make together'
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving || saved) return
    onError('')
    const data = new FormData(event.currentTarget)
      setSaving(true)
    try {
      await onSave({ title: String(data.get('title') ?? ''), help: String(data.get('help') ?? '') })
      setSaved(true)
    } catch (reason) { onError(reason instanceof Error ? reason.message : 'Could not save. Please try again.') }
    finally { setSaving(false) }
  }
  return <dialog ref={ref} className="dashboard-dialog dashboard-dialog--centered" aria-labelledby="task-dialog-title" onClose={onClose} onCancel={(event) => { event.preventDefault(); ref.current?.close(); onClose() }} onClick={(event) => { if (event.target === event.currentTarget) onClose() }}><div className="dialog-body"><button className="dialog-close" aria-label="Close dialog" onClick={onClose}>×</button><GraduationCap size={24} className="dialog-heading-icon" /><h2 id="task-dialog-title">{heading}</h2><form onSubmit={(event) => void submit(event)}>
    <><label htmlFor="project-title">Project idea</label><input id="project-title" name="title" required placeholder="A portfolio or club website…" /><label htmlFor="project-help">What would help?</label><textarea id="project-help" name="help" placeholder="Design, Python, feedback…" /></>
    <p className="preview-callout">{isPreview ? 'This stays in your preview.' : 'We’ll only save this on the server when connected.'}</p>{error && <p className="form-error" role="alert">{error}</p>}<div className="dialog-form-actions"><button className="button button--primary" disabled={saving || saved}>{saved ? 'Saved in this preview' : saving ? 'Saving…' : 'Add to preview projects'} {saving && <BusyLabel busy> </BusyLabel>}{!saving && <ArrowRight size={16} />}</button>{saved && <button type="button" className="button button--outline" onClick={onClose}>Done</button>}</div>
  </form></div></dialog>
}
