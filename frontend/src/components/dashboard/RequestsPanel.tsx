import { Inbox } from 'lucide-react'
import type { Person, DashboardRequest, RequestStatus } from './types'
import { EmptyPanel } from './DashboardFeedback'
import { RequestCard } from './RequestCard'

export function RequestsPanel({ requests, people, isBusy, onFind, onChange }: { requests: DashboardRequest[]; people: Person[]; isBusy: (id: string) => boolean; onFind: () => void; onChange: (id: string, status: RequestStatus) => Promise<void> }) {
  const pending = requests.filter((request) => request.status === 'pending')
  const responded = requests.filter((request) => request.status !== 'pending')
  return <section id="requests" tabIndex={-1} className="dashboard-card requests-card" aria-labelledby="requests-title">
    <div className="card-heading"><div><h2 id="requests-title">Requests for you {pending.length > 0 && <span className="heading-count">{pending.length}</span>}</h2></div></div>
    {pending.length ? <div className="requests-list">{pending.map((request) => <RequestCard key={request.id} request={request} personContext={people.find((person) => person.id === request.personId)?.context ?? 'Example student profile'} onAccept={(id) => onChange(id, 'accepted')} onDecline={(id) => onChange(id, 'declined')} busyAction={isBusy(request.id)} />)}</div> : <EmptyPanel icon={<Inbox size={26} />} heading="You’re all caught up" text="Nothing needs your attention right now." action={<button className="button button--outline" onClick={onFind}>Find a buddy</button>} />}
    {responded.length > 0 && <details className="request-history"><summary>Responded requests ({responded.length})</summary><div className="requests-list">{responded.map((request) => <RequestCard key={request.id} request={request} personContext={people.find((person) => person.id === request.personId)?.context ?? 'Example student profile'} onAccept={(id) => onChange(id, 'accepted')} onDecline={(id) => onChange(id, 'declined')} busyAction={false} />)}</div></details>}
  </section>
}
