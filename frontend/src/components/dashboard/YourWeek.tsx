import { ArrowUpRight, CalendarDays, Clock3, Laptop, MapPin } from 'lucide-react'
import { useState } from 'react'
import type { Session } from './types'
import { EmptyPanel, LoadingRows } from './DashboardFeedback'

export function YourWeek({ sessions, loading, onChange, onFind }: { sessions: Session[]; loading: boolean; onChange: (message: string) => void; onFind: () => void }) {
  return <section className="dashboard-card week-card" aria-labelledby="week-title"><div className="card-heading"><div><h2 id="week-title">Your week</h2><p>What’s next when you’re ready.</p></div><CalendarDays size={19} /></div>
    {loading ? <LoadingRows rows={2} /> : sessions.length ? <div className="session-list">{sessions.map((session) => <SessionItem key={session.id} session={session} onChange={onChange} />)}</div> : <EmptyPanel heading="Nothing scheduled yet." text="Find a study buddy or propose a skill exchange." action={<button className="button button--outline" onClick={onFind}>Find a buddy</button>} />}
    </section>
}
function SessionItem({ session, onChange }: { session: Session; onChange: (message: string) => void }) {
  const [open, setOpen] = useState(false)
  return <article className="session-item"><div className="session-date"><CalendarDays size={19} /></div><div><span className="request-type">{session.type}</span><h3>{session.activity}</h3><p>{session.personName} · {session.time}</p><span className="session-location">{session.format === 'Online' ? <Laptop size={13} /> : <MapPin size={13} />}{session.format}</span>{session.id.startsWith('session-') && <p className="sample-status">Preview · not booked</p>}</div><div className="session-actions"><button className="button button--quiet" onClick={() => setOpen((expanded) => !expanded)} aria-expanded={open}>View details <ArrowUpRight size={14} /></button>{open && <p className="session-detail" role="status">Session details are a preview. Choose a time together before treating a meeting as confirmed. {!session.id.startsWith('session-') && session.time}</p>}<button className="button button--quiet" onClick={() => onChange('Messaging is not connected yet; no message was sent.')}>Open conversation</button></div></article>
}
