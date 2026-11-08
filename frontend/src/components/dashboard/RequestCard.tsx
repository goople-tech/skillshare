import { ArrowRight, Check, ChevronDown, Clock3, X } from 'lucide-react'
import { useState } from 'react'
import { BusyLabel } from './DashboardFeedback'
import type { DashboardRequest } from './types'
import type { WorkspaceData } from './types'
import { RequestDetails } from './RequestDetails'

export function RequestCard({ request, personContext, onAccept, onDecline, busyAction }: { request: DashboardRequest; personContext: string; onAccept: (id: string) => Promise<void>; onDecline: (id: string) => Promise<void>; busyAction: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  return <article className="request-card">
    <div className="request-main"><span className="person-avatar person-avatar--blue" aria-hidden="true">{request.initials}</span><div className="request-content"><div className="request-title"><h3>{request.personName}</h3><span className={`request-status request-status--${request.status}`}>{request.status}</span></div><div className="request-meta"><span className="request-type">{request.type}</span><span className="request-time"><Clock3 size={12} />{request.timestamp}</span></div><p>{request.context}</p><span className="request-preference">{request.meeting}</span>{expanded && <p className="request-person-context">{personContext}</p>}</div></div>
    <div className="request-actions"><button className="button button--quiet" onClick={() => setExpanded((open) => !open)} aria-expanded={expanded}>View<ChevronDown size={14} /></button>{request.status === 'pending' ? <><button disabled={busyAction} className="button button--primary" onClick={() => void onAccept(request.id)}><BusyLabel busy={busyAction}><Check size={14} />{busyAction ? 'Saving' : 'Accept'}</BusyLabel></button><button disabled={busyAction} className="button button--quiet" onClick={() => void onDecline(request.id)}><BusyLabel busy={busyAction}><X size={14} />{busyAction ? 'Saving' : 'Decline'}</BusyLabel></button></> : <button className="button button--quiet" onClick={() => setDetailsOpen(true)}>View details <ArrowRight size={14} /></button>}</div>
    {detailsOpen && <RequestDetails open={detailsOpen} onClose={() => setDetailsOpen(false)} request={request} personContext={personContext} />}
  </article>
}
