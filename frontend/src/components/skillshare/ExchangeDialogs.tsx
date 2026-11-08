import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Check, Star, X } from 'lucide-react'
import { RATINGS, RATING_LABELS, type DiscoveryResult, type Exchange, type ReviewInput } from './discoverySource'

export function Modal({ titleId, children, onClose, label = 'Close dialog' }: { titleId: string; children: React.ReactNode; onClose: () => void; label?: string }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => { if (dialog?.open) dialog.close() } }, [])
  return <dialog ref={ref} className="dashboard-dialog discovery-dialog" aria-labelledby={titleId} onClose={onClose} onCancel={event => { event.preventDefault(); ref.current?.close(); onClose() }} onClick={event => { if (event.target === event.currentTarget) ref.current?.close() }}>
    <div className="dialog-body"><button type="button" className="dialog-close" onClick={() => ref.current?.close()} aria-label={label}><X size={19} /></button>{children}</div>
  </dialog>
}

export function ScheduleDialog({ person, onClose, onSave }: { person: DiscoveryResult; onClose: () => void; onSave: (at: string) => Promise<void> }) {
  const [time, setTime] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('')
    try { await onSave(new Date(time).toISOString()); onClose() } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not schedule this exchange.') } finally { setBusy(false) }
  }
  return <Modal titleId="schedule-title" onClose={onClose} label="Cancel scheduling"><h2 id="schedule-title">Schedule an exchange</h2><p>You and {person.profile.name} have a confirmed SkillShare match. Choose the agreed lesson time. This time is shared only with the two participants.</p>
    <form onSubmit={submit}><label htmlFor="exchange-time">Lesson date and time<input id="exchange-time" type="datetime-local" value={time} onChange={event => setTime(event.target.value)} required disabled={busy} /></label>
      <p className="discovery-dialog-note">Use your browser’s local timezone. No room booking, invitation delivery or message is implied. One lesson is supported per matched pair in this first version.</p>
      {error && <p className="form-error" role="alert">{error}</p>}<div className="dialog-form-actions"><button type="submit" className="button button--primary" disabled={busy}>{busy ? 'Saving…' : 'Save lesson time'}</button><button type="button" className="button button--outline" disabled={busy} onClick={onClose}>Cancel</button></div></form>
  </Modal>
}

export function ReviewDialog({ exchange, onClose, onSave }: { exchange: Exchange; onClose: () => void; onSave: (input: ReviewInput) => Promise<void> }) {
  const [scores, setScores] = useState<ReviewInput>(exchange.review.values ?? { learned: 3, taught: 3, collaboration: 3 })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('')
    try { await onSave(scores); onClose() } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not submit your rating.') } finally { setBusy(false) }
  }
  return <Modal titleId="rating-title" onClose={onClose} label="Close rating form"><span className="workspace-eyebrow">Completed exchange</span><h2 id="rating-title">How did this lesson go?</h2><p>Your ratings for your exchange with {exchange.partner.name} help describe the learning experience. Author identities are not included in public aggregates.</p>
    <form onSubmit={submit} className="discovery-rating-form">{RATINGS.map(category => <fieldset key={category.field} className="discovery-rating-category"><legend>{category.label}</legend><p>{category.description}</p><div className="discovery-rating-options">{RATING_LABELS.map((label, index) => <label key={label} className={scores[category.field] === index + 1 ? 'is-selected' : ''}><input type="radio" name={category.field} value={index + 1} checked={scores[category.field] === index + 1} onChange={() => setScores(current => ({ ...current, [category.field]: index + 1 }))} disabled={busy} /><Star size={16} aria-hidden="true" /><span>{index + 1} · {label}</span></label>)}</div></fieldset>)}
      {error && <p className="form-error" role="alert">{error}</p>}<p className="discovery-dialog-note">Submitting again updates your own rating for this lesson; it does not create another review.</p><div className="dialog-form-actions"><button type="submit" className="button button--primary" disabled={busy}>{busy ? 'Submitting…' : <><Check size={16} /> Submit rating</>}</button><button type="button" className="button button--outline" disabled={busy} onClick={onClose}>Cancel</button></div>
    </form>
  </Modal>
}
