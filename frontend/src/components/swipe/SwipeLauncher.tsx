import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../api'
import { CrossedCards } from './CrossedCards'
import { SwipeDeck } from './SwipeDeck'
import { ApiSwipeSource, PreviewSwipeSource, type Request, type SwipeDataSource } from './swipeSource'
import { DECK_LABEL, type SwipeKind, type SwipeMatchView } from './types'
import './swipe.css'

/**
 * Dashboard entry point: the crossed Buddies/SkillShare cards, the full-screen deck,
 * and a strip of mutual matches. Uses the live FastAPI swipe endpoints; a clearly
 * labelled sample deck is offered only if the campus service can't be reached.
 */
export function SwipeLauncher() {
  const apiSource = useMemo(() => new ApiSwipeSource(apiRequest as Request), [])
  const previewSource = useMemo(() => new PreviewSwipeSource(), [])
  const [usePreview, setUsePreview] = useState(false)
  const source: SwipeDataSource = usePreview ? previewSource : apiSource
  const [open, setOpen] = useState<SwipeKind | null>(null)
  const [matches, setMatches] = useState<SwipeMatchView[]>([])

  const refreshMatches = useCallback(async () => {
    try { setMatches(await source.loadMatches()) } catch { /* the deck shows service errors; keep last known matches */ }
  }, [source])
  useEffect(() => { void refreshMatches() }, [refreshMatches])

  return <>
    <CrossedCards onOpen={setOpen} disabled={open !== null} />
    {matches.length > 0 && <section className="swipe-matches dashboard-card" aria-labelledby="swipe-matches-title">
      <h2 id="swipe-matches-title">Your matches</h2>
      <ul>{matches.map((match) => <li key={`${match.kind}:${match.person.id}`}>
        {match.person.photo ? <img src={match.person.photo} alt="" /> : <span className="person-avatar person-avatar--small" aria-hidden="true">{match.person.initials}</span>}
        <span><strong>{match.person.name}</strong><small>{DECK_LABEL[match.kind]}</small></span>
      </li>)}</ul>
    </section>}
    {open && <SwipeDeck
      key={`${open}:${source.kind}`}
      kind={open}
      source={source}
      onClose={() => { setOpen(null); void refreshMatches() }}
      onUsePreview={source.kind === 'api' ? () => setUsePreview(true) : undefined}
    />}
  </>
}
