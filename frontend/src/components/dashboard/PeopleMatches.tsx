import { ArrowUpRight, ArrowRightLeft } from 'lucide-react'
import type { SkillMatch, Person } from './types'
import { EmptyPanel, BusyLabel } from './DashboardFeedback'

type Props = {
  people: Person[]
  matches: SkillMatch[]
  busyActions: string[]
  onViewProfile: (person: Person) => void
  onConnect: (id: string) => Promise<void>
  onExchange: (id: string) => Promise<void>
}
export function PeopleMatches({ people, matches, busyActions, onViewProfile, onConnect, onExchange }: Props) {
  return <section id="skills-matches" className="matches-grid" tabIndex={-1} aria-label="Connections">
    <section className="dashboard-card matches-card" aria-labelledby="people-matches-title"><div className="card-heading"><div><h2 id="people-matches-title">People you may connect with</h2></div></div>{people.length ? <div className="match-list">{people.map((person) => {
      const busy = busyActions.includes(`person:${person.id}`)
      return <article className="person-match" key={person.id}><span className="person-avatar person-avatar--small" aria-hidden="true">{person.initials}</span><div className="person-match-copy"><h3>{person.name}</h3><p>{person.courses[0]} · {person.preference.split('·')[0]}</p></div><div className="match-actions"><button className="button button--quiet" onClick={() => onViewProfile(person)}>View profile <ArrowUpRight size={14} /></button><button className="button button--outline" disabled={busy || person.invited} onClick={() => void onConnect(person.id)}><BusyLabel busy={busy}> </BusyLabel>{person.invited ? 'Preview invited' : busy ? 'Saving…' : 'Connect'}</button></div></article>
    })}</div> : <EmptyPanel heading="No connections yet" text="Add a few details to get started." />}</section>
    <section className="dashboard-card matches-card" aria-labelledby="skill-matches-title"><div className="card-heading"><div><h2 id="skill-matches-title">SkillShare matches</h2></div></div>{matches.length ? <div className="match-list">{matches.map((match) => {
      const busy = busyActions.includes(`exchange:${match.id}`)
      const person = people.find((entry) => entry.id === match.personId)
      return <article className="person-match" key={match.id}><span className="person-avatar person-avatar--small person-avatar--ocean" aria-hidden="true">{match.initials}</span><div className="person-match-copy"><h3 className="exchange-skills"><span className="exchange-skill">{match.offer}</span><ArrowRightLeft className="swap-inline" size={15} /><span className="exchange-skill">{match.learn}</span></h3><p>Your {match.offer} ↔ {match.name}’s {match.learn}</p></div><div className="match-actions"><button className="button button--quiet" disabled={!person} onClick={() => { if (person) onViewProfile(person) }}>View exchange <ArrowUpRight size={14} /></button><button className="button button--outline" disabled={busy || match.invited} onClick={() => void onExchange(match.id)}><BusyLabel busy={busy}> </BusyLabel>{match.invited ? 'Exchange preview saved' : busy ? 'Saving…' : 'Send request'}</button></div></article>
    })}</div> : <EmptyPanel heading="No exchanges yet" text="Share a skill to get started." />}</section>
  </section>
}
