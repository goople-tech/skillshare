import { CheckCheck, FolderKanban, GraduationCap, Users, Zap } from 'lucide-react'
import { useState } from 'react'
import type { Activity } from './types'
import { EmptyPanel, LoadingRows, BusyLabel } from './DashboardFeedback'

export function ActivityPanel({ activities, loading, markAllRead, onViewAll }: { activities: Activity[]; loading: boolean; markAllRead: () => Promise<void>; onViewAll: () => void }) {
  const [reading, setReading] = useState(false)
  return <section id="activity" className="dashboard-card activity-card" aria-labelledby="activity-title"><div className="card-heading"><h2 id="activity-title">Recent activity</h2>{activities.some((activity) => activity.unread) && <button className="button button--quiet" disabled={reading} onClick={async () => { if (reading) return; setReading(true); try { await markAllRead() } finally { setReading(false) } }}><BusyLabel busy={reading}><CheckCheck size={15} />{reading ? 'Marking' : 'Mark all as read'}</BusyLabel></button>}</div>
  {loading ? <LoadingRows rows={3} /> : activities.length ? <div className="activity-list">{activities.map((activity) => <article key={activity.id} className={`activity-item ${activity.unread ? 'activity-item--unread' : ''}`}><ActivityIcon kind={activity.kind} /><div><span className="activity-kind">{activity.kind}{activity.unread && <span className="unread-label"> · new</span>}</span><p>{activity.text}</p><time>{activity.time}</time></div></article>)}</div> : <EmptyPanel heading="Nothing here yet" text="Your accepted exchanges and collaboration updates will show up here." />}{activities.length > 3 && <button className="button button--quiet view-all-link" onClick={onViewAll}>View all notifications</button>}</section>
}
const ActivityIcon = ({ kind }: { kind: Activity['kind'] }) => kind === 'Buddy' ? <Users size={17} /> : kind === 'SkillShare' ? <GraduationCap size={17} /> : kind === 'Project' ? <FolderKanban size={17} /> : <Zap size={17} />
