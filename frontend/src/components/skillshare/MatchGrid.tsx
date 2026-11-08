import { ArrowRightLeft, CalendarPlus, Check, RefreshCw } from 'lucide-react'
import type { DiscoveryPage, DiscoveryResult } from './discoverySource'

const items = (value: string) => value.split(',').map(item => item.trim()).filter(Boolean)
const initials = (name: string) => name.split(/\s+/).filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase()
const mode = { online: 'Online', in_person: 'In person', either: 'Online or in person' }

export function MatchGrid({ data, status, error, busy, confirmedIds, onRetry, onSchedule }: {
  data?: DiscoveryPage; status: 'loading' | 'ready' | 'error'; error: string; busy: boolean
  confirmedIds: number[]; onRetry: () => void; onSchedule: (person: DiscoveryResult) => void
}) {
  return <section className="discovery-results" aria-labelledby="results-title" aria-busy={busy}>
    <div className="discovery-results-heading"><h2 id="results-title">Learning exchanges</h2>
      <p role="status">{status === 'loading' && !data ? 'Finding exchanges…' : data ? `${data.count} ${data.count === 1 ? 'match' : 'matches'}${busy ? ' · updating…' : ''}` : 'Matches unavailable'}</p></div>
    {status === 'error' && <div className="discovery-state discovery-state--error" role="alert"><strong>We couldn’t load matches.</strong><p>{error}</p><button type="button" className="button button--outline" onClick={onRetry}><RefreshCw size={15} /> Try again</button></div>}
    {status === 'loading' && !data && <div className="discovery-state" role="status"><span className="discovery-spinner" aria-hidden="true" /><p>Loading people who can exchange skills with you…</p></div>}
    {status === 'ready' && data?.count === 0 && <div className="discovery-state"><strong>No exchanges match those filters.</strong><p>Try a broader skill or clear the rating and category filters. No student results are being suggested here.</p></div>}
    {data && data.results.length > 0 && <ul className="discovery-match-grid">{data.results.map(person => <MatchCard key={person.profile.id} person={person} matched={confirmedIds.includes(person.profile.id)} onSchedule={() => onSchedule(person)} />)}</ul>}
    {data && <p className="discovery-result-note">Showing up to {data.limit} server-filtered results. Open SkillShare swiping to save your interest; only mutual SkillShare matches can schedule a lesson.</p>}
  </section>
}

function MatchCard({ person, matched, onSchedule }: { person: DiscoveryResult; matched: boolean; onSchedule: () => void }) {
  const profile = person.profile
  const teaches = items(profile.skills_teach)
  const learns = items(profile.skills_learn)
  return <li className="discovery-match-card">
    <header className="discovery-person-heading"><span className="discovery-avatar" aria-hidden="true">{initials(profile.name)}</span><div><h3>{profile.name}</h3><p>{person.mutual ? 'Two-way skill exchange' : 'Can teach a skill you’re seeking'}</p></div></header>
    {profile.bio && <p className="discovery-bio">{profile.bio}</p>}
    <div className="discovery-exchange"><span>A skill exchange</span><div><strong>{person.i_teach_them[0] ?? 'Your skills'}</strong><ArrowRightLeft size={18} aria-label="exchanged for" /><strong>{person.they_teach_me[0] ?? teaches[0] ?? 'Their skills'}</strong></div>
      <p>{person.i_teach_them.length ? `They want to learn ${person.i_teach_them.join(', ')}.` : 'Your profile doesn’t list a skill they currently want.'}</p></div>
    <dl className="discovery-skill-context"><div><dt>They can teach</dt><dd>{teaches.length ? teaches.join(', ') : 'No teachable skills listed'}</dd></div><div><dt>They want to learn</dt><dd>{learns.length ? learns.join(', ') : 'No requested skills listed'}</dd></div></dl>
    {profile.courses && <p className="discovery-courses"><span>Courses</span>{items(profile.courses).join(', ')}</p>}
    {person.reasons.length > 0 && <div className="discovery-reason"><span>Why this exchange</span>{person.reasons.filter(reason => reason.startsWith('Skill swap') || reason.startsWith('Can teach') || reason.startsWith('Wants to learn')).slice(0, 2).map(reason => <p key={reason}><Check size={14} aria-hidden="true" />{reason}</p>)}</div>}
    <footer className="discovery-person-footer"><div><p>{mode[profile.mode as keyof typeof mode] ?? profile.mode}</p><p className="discovery-rating">{person.rating.average === null ? 'No ratings yet' : `${person.rating.average.toFixed(1)} / 5 · ${person.rating.completed_reviews} completed ${person.rating.completed_reviews === 1 ? 'review' : 'reviews'}`}</p></div>
      <button type="button" className="button button--outline" onClick={onSchedule} disabled={!matched} title={!matched ? 'A mutual SkillShare swipe match is required before scheduling' : undefined}><CalendarPlus size={15} />{matched ? 'Schedule exchange' : 'Match to schedule'}</button></footer>
  </li>
}
