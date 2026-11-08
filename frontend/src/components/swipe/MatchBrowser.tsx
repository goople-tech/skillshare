import { useMemo, useState } from 'react'
import { Check, Heart, X } from 'lucide-react'
import { FILTERS, applyFilters, type FilterId } from './filters'
import { DECK_LABEL, type SwipeCardView, type SwipeDirection, type SwipeKind } from './types'

/**
 * Filters (round chips) above a grid of match tiles for the selected deck.
 * Like/Pass here records the same swipe as the deck; a tile leaves once the server acknowledges it.
 */
export function MatchBrowser({ kind, cards, status, error, busyIds, onSwipe, onRetry }: {
  kind: SwipeKind
  cards: SwipeCardView[]
  status: 'loading' | 'ready' | 'error'
  error: string
  busyIds: string[]
  onSwipe: (card: SwipeCardView, direction: SwipeDirection) => void
  onRetry: () => void
}) {
  const [selected, setSelected] = useState<FilterId[]>([])
  const filters = FILTERS[kind]
  const visible = useMemo(() => applyFilters(cards, kind, selected.filter((id) => filters.some((f) => f.id === id))), [cards, kind, selected, filters])
  const toggle = (id: FilterId) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])

  return <section className="match-browser dashboard-card" aria-labelledby="match-browser-title">
    <div className="match-browser-heading">
      <h2 id="match-browser-title">{kind === 'buddy' ? 'Buddies for you' : 'SkillShare matches'}</h2>
      {selected.length > 0 && <button type="button" className="button button--quiet" onClick={() => setSelected([])}>Clear filters</button>}
    </div>
    <div className="match-filters" role="group" aria-label={`${DECK_LABEL[kind]} filters`}>
      {filters.map((filter) => {
        const on = selected.includes(filter.id)
        return <button key={filter.id} type="button" className={`match-filter${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => toggle(filter.id)}>
          {on && <Check size={14} aria-hidden="true" />}{filter.label}
        </button>
      })}
    </div>
    {status === 'loading' && <div className="match-grid" aria-busy="true">{[0, 1, 2, 3].map((i) => <div key={i} className="match-tile match-tile--skeleton" />)}</div>}
    {status === 'error' && <div className="match-empty"><p>{error}</p><button type="button" className="button button--outline" onClick={onRetry}>Try again</button></div>}
    {status === 'ready' && !visible.length && <div className="match-empty"><p>{cards.length ? 'Nobody matches all of those filters yet. Try removing one.' : kind === 'skill' ? 'Add skills you can teach or want to learn to your profile to see matches.' : 'Add courses and interests to your profile to see buddies.'}</p></div>}
    {status === 'ready' && visible.length > 0 && <ul className="match-grid">
      {visible.slice(0, 8).map((card) => {
        const busy = busyIds.includes(card.id)
        return <li key={card.id} className="match-tile">
          <div className="match-tile-top">
            <span className={`match-tile-avatar match-tile-avatar--${kind}`} aria-hidden="true">{card.initials}</span>
            <div><h3>{card.name}</h3><p>{card.meets} · {card.pace}</p></div>
          </div>
          <p className="match-tile-reason">{card.reasons[0] ?? (kind === 'buddy' ? card.interests.slice(0, 2).join(', ') : card.teaches.slice(0, 2).join(', ')) ?? ''}</p>
          <div className="match-tile-actions">
            <button type="button" className="match-tile-btn match-tile-btn--pass" disabled={busy} onClick={() => onSwipe(card, 'pass')} aria-label={`Pass on ${card.name}`}><X size={18} /></button>
            <button type="button" className="match-tile-btn match-tile-btn--like" disabled={busy} onClick={() => onSwipe(card, 'like')} aria-label={`Like ${card.name}`}><Heart size={16} /> {busy ? 'Saving…' : 'Like'}</button>
          </div>
        </li>
      })}
    </ul>}
  </section>
}
