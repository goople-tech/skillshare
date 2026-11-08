import { useEffect, useRef } from 'react'
import { Laptop, MapPin } from 'lucide-react'
import type { Person } from './types'
export function ProfileDetailsDialog({ person, onClose }: { person: Person | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { if (person && !ref.current?.open) ref.current?.showModal() }, [person])
  if (!person) return null
  return <dialog ref={ref} className="dashboard-dialog" aria-labelledby="profile-dialog-title" onClose={onClose} onCancel={(event) => { event.preventDefault(); ref.current?.close(); onClose() }} onClick={(event) => { if (event.target === event.currentTarget) onClose() }}><div className="dialog-body"><button className="dialog-close" onClick={onClose} aria-label="Close profile">×</button><span className="person-avatar">{person.initials}</span><h2 id="profile-dialog-title">{person.name}</h2><p>{person.program} · {person.year}</p><p>{person.context}</p><div className="profile-tags"><span>Courses</span><div>{person.courses.map((item) => <span className="workspace-tag" key={item}>{item}</span>)}</div></div><div className="profile-tags"><span>Interests</span><div>{person.interests.map((item) => <span className="workspace-tag workspace-tag--sand" key={item}>{item}</span>)}</div></div><div className="profile-tags"><span>Teaching</span><div>{person.offers.map((item) => <span className="workspace-tag" key={item}>{item}</span>)}</div></div><p className="profile-preference">{person.preference.includes('Online') ? <Laptop size={13} /> : <MapPin size={13} />}{person.preference}</p><p className="preview-callout">Shared interests and skills only.</p></div></dialog>
}
