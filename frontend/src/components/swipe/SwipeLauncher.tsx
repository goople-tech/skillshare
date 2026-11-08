import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiRequest } from '../../api'
import { CrossedCards } from './CrossedCards'
import { SwipeDeck } from './SwipeDeck'
import { ApiSwipeSource, PreviewSwipeSource, type Request, type SwipeDataSource } from './swipeSource'
import { DECK_LABEL, type SwipeKind, type SwipeMatchView } from './types'
import './swipe.css'
import { X } from 'lucide-react'
import type { ComponentProps } from 'react'
import { Link } from 'react-router-dom'

/**
 * Dashboard entry point: the crossed Buddies/SkillShare cards, the full-screen deck,
 * and a strip of mutual matches. Uses the live FastAPI swipe endpoints; a clearly
 * labelled sample deck is offered only if the campus service can't be reached.
 */
export function SwipeLauncher({ skillOnly = false, cardProps, onDismiss }: { skillOnly?: boolean; cardProps?: Pick<ComponentProps<typeof CrossedCards>, 'id' | 'titleId'>; onDismiss?: () => void }) {
  const apiSource = useMemo(() => new ApiSwipeSource(apiRequest as Request), [])
  const previewSource = useMemo(() => new PreviewSwipeSource(), [])
  const [usePreview, setUsePreview] = useState(false)
  const source: SwipeDataSource = usePreview ? previewSource : apiSource
  const [open, setOpen] = useState<SwipeKind | null>(null)
  const [matches, setMatches] = useState<SwipeMatchView[]>([])
  const sectionRef = useRef<HTMLElement>(null)
  useEffect(() => {
    if (!onDismiss) return
    const section = sectionRef.current
    const listener = (event: KeyboardEvent) => { if (event.key === 'Escape' && !document.querySelector('dialog[open]')) { event.preventDefault(); onDismiss() } }
    section?.addEventListener('keydown', listener)
    return () => section?.removeEventListener('keydown', listener)
  }, [onDismiss])

  const refreshMatches = useCallback(async () => {
    try { setMatches(await source.loadMatches()) } catch { /* the deck shows service errors; keep last known matches */ }
  }, [source])
  useEffect(() => { void refreshMatches() }, [refreshMatches])

  return <>
    <div className={onDismiss ? 'discovery-swipe-section' : undefined}><section ref={sectionRef} className="discovery-swipe-region" aria-label={onDismiss ? 'Optional swipe discovery' : undefined}>
      {onDismiss && <button type="button" className="discovery-dismiss" aria-label="Dismiss swipe discovery" onClick={onDismiss}><X size={20} /></button>}
      <CrossedCards onOpen={setOpen} disabled={open !== null} kinds={skillOnly ? ['skill'] : ['buddy', 'skill']} {...cardProps} heading={skillOnly ? 'Swipe to find your learning partner' : undefined} eyebrow={skillOnly ? 'SkillShare discovery' : undefined} description={skillOnly ? 'Explore the same shared SkillShare deck. A match lets both participants arrange a lesson.' : undefined} />
    </section>
    {matches.length > 0 && <section className="swipe-matches dashboard-card" aria-labelledby="swipe-matches-title">
      <h2 id="swipe-matches-title">Your matches</h2>
      <ul>{matches.map((match) => <li key={`${match.kind}:${match.person.id}`}>
        {match.person.photo ? <img src={match.person.photo} alt="" /> : <span className="person-avatar person-avatar--small" aria-hidden="true">{match.person.initials}</span>}
        <span><strong>{match.person.name}</strong><small>{DECK_LABEL[match.kind]}</small></span>
        {source.kind === 'api' && <Link className="button button--quiet swipe-message-link" to={`/${match.kind === 'skill' ? 'skillshare' : 'buddies'}/messages?participant=${match.person.id}`} aria-label={`Message ${match.person.name}`}>Message</Link>}
      </li>)}</ul>
    </section>}
    {open && <SwipeDeck
      key={`${open}:${source.kind}`}
      kind={open}
      source={source}
      onClose={() => { setOpen(null); void refreshMatches() }}
      onUsePreview={source.kind === 'api' ? () => setUsePreview(true) : undefined}
    />}
    </div>
  </>
}
