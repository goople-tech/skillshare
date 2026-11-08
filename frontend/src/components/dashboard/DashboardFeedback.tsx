import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AlertCircle, CheckCircle2, LoaderCircle, RotateCw, X } from 'lucide-react'

export function LoadingRows({ rows = 3 }: { rows?: number }) {
  return <div className="loading-rows" aria-label="Loading workspace" aria-busy="true">{Array.from({ length: rows }, (_, i) => <div className="skeleton-row" key={i}><span className="skeleton skeleton-avatar" /><div><span className="skeleton skeleton-title" /><span className="skeleton skeleton-text" /></div></div>)}</div>
}
export function EmptyPanel({ icon, heading, text, action }: { icon?: ReactNode; heading: string; text: string; action?: ReactNode }) {
  return <div className="empty-panel">{icon && <span className="empty-icon" aria-hidden="true">{icon}</span>}<h3>{heading}</h3><p>{text}</p>{action}</div>
}
export function ErrorPanel({ retry, message = 'We couldn’t load this workspace.' }: { retry: () => Promise<void>; message?: string }) {
  return <div className="error-panel" role="alert"><AlertCircle size={20} /><div><strong>{message}</strong><p>Try again. Your profile has not been changed.</p></div><button className="button button--outline" onClick={() => void retry()}><RotateCw size={16} /> Retry</button></div>
}
export function BusyLabel({ busy, children }: { busy: boolean; children: ReactNode }) {
  return <>{busy && <LoaderCircle className="spin" size={14} aria-hidden="true" />}{children}</>
}
export function WorkspaceNotice({ message, onClose }: { message: string; onClose: () => void }) {
  return <div className="workspace-notice" role="status"><CheckCircle2 size={17} /><span>{message}</span><button aria-label="Dismiss confirmation" onClick={onClose}><X size={16} /></button></div>
}
export function useWorkspaceNotice() {
  const [notice, setNotice] = useState('')
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current) }, [])
  const notify = (text: string) => { setNotice(text); if (closeTimer.current) clearTimeout(closeTimer.current); closeTimer.current = setTimeout(() => setNotice(''), 5500) }
  return { notice, notify, clearNotice: () => setNotice('') }
}
