import { BookOpen, CalendarDays, MapPin, MessageCircle } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { DashboardRequest } from './types'

export function RequestDetails({ request, personContext, onClose, open }: { request: DashboardRequest; personContext: string; onClose: () => void; open: boolean }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { const dialog = ref.current; if (open && !dialog?.open) dialog?.showModal(); if (!open && dialog?.open) dialog.close() }, [open])
  return <dialog ref={ref} className="dashboard-dialog" aria-labelledby="detail-title" onClose={onClose} onCancel={(event) => { event.preventDefault(); ref.current?.close(); onClose() }} onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <div className="dialog-body"><button className="dialog-close" onClick={onClose} aria-label="Close request details">×</button><span className="request-type">{request.type} · Example</span><h2 id="detail-title">{request.personName}</h2><p>{personContext}</p><dl className="detail-list"><div><dt><BookOpen size={16} /> Shared context</dt><dd>{request.context}</dd></div><div><dt><CalendarDays size={16} /> Meeting preference</dt><dd>{request.meeting}</dd></div><div><dt><MapPin size={16} /> Status</dt><dd>{request.status}</dd></div></dl><p className="preview-callout">Meeting preferences, not a confirmed booking.</p><button className="button button--primary" onClick={onClose}><MessageCircle size={16} /> Back to requests</button></div>
  </dialog>
}
