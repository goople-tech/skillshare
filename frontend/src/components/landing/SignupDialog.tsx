/** Public product landing UI. No auth-library calls belong in this file.
 * Auth0 integration / verified identity belongs to the app/backend owner.
 * The shared transition boundary is documented in AUTH_TRANSITION.md.
 */
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowRight, Check, Info, Mail, ShieldCheck } from 'lucide-react'
import { getUniversityEmailError } from './validation'
import { CampusMark } from './CampusMark'

type SignupDialogProps = { open: boolean; onClose: () => void }

export function SignupDialog({ open, onClose }: SignupDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    if (open) {
      setError('')
      setSent(false)
      requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }))
    }
  }, [open])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const problem = getUniversityEmailError(email)
    if (problem) {
      setError(problem)
      requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }))
      return
    }
    setError('')
    setSent(true)
  }

  return (
    <dialog ref={dialogRef} className="signup-dialog" aria-labelledby="signup-title" onClose={onClose} onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="dialog-art" aria-hidden="true"><CampusMark /><span className="dialog-art-word">Room for you.<br />Room to grow.</span><div className="dialog-art-path" /></div>
      <div className="dialog-body">
        <button className="dialog-close" type="button" onClick={onClose} aria-label="Close signup dialog">×</button>
        {!sent ? (
          <>
            <span className="eyebrow">YOUR PLACE STARTS HERE</span>
            <h2 id="signup-title">Come as you are.<br />Leave with your people.</h2>
            <p>Use your university email to start your student profile. Browse the community first—connect when it feels right.</p>
            <form onSubmit={submit} noValidate>
              <label htmlFor="university-email">University email</label>
              <div className={`dialog-input ${error ? 'dialog-input--error' : ''}`}><Mail size={19} aria-hidden="true" /><input ref={inputRef} id="university-email" name="email" type="email" autoComplete="email" placeholder="you@student.ubc.ca" value={email} onChange={(event) => { setEmail(event.target.value); if (error) setError('') }} aria-describedby={error ? 'email-error' : 'email-hint'} aria-invalid={Boolean(error)} /></div>
              {error ? <p id="email-error" className="form-error" role="alert">{error}</p> : <p id="email-hint" className="form-hint">Prototype preview: enter a valid UBC-format address. Nothing will be sent.</p>}
              <button className="button button--primary dialog-submit" type="submit">Preview next step <ArrowRight size={17} /></button>
            </form>
            <p className="dialog-security"><ShieldCheck size={16} />Student status is confirmed before full access in the live platform.</p>
          </>
        ) : (
          <div className="prototype-success" role="status">
            <span className="success-icon"><Check size={30} /></span>
            <span className="eyebrow">LOOKS GOOD SO FAR</span>
            <h2 id="signup-title">A first step toward your community.</h2>
            <p><strong>{email.trim().toLowerCase()}</strong> uses a permitted UBC email domain.</p>
            <div className="prototype-notice"><Info size={19} /><p>You’re exploring the signup prototype. No email was sent and no account was created yet. Student verification will be connected in the next stage.</p></div>
            <button className="button button--primary dialog-submit" type="button" onClick={onClose}>Keep exploring <ArrowRight size={17} /></button>
          </div>
        )}
      </div>
    </dialog>
  )
}
