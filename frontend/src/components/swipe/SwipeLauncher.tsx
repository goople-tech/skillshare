import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { MessageCircle, X } from 'lucide-react'
import { apiRequest } from '../../api'
import { CrossedCards } from './CrossedCards'
import { SwipeDeck } from './SwipeDeck'
import { MatchBrowser } from './MatchBrowser'
import { ApiSwipeSource, PreviewSwipeSource, type Request, type SwipeDataSource } from './swipeSource'
import { DECK_LABEL, type SwipeCardView, type SwipeDirection, type SwipeKind, type SwipeMatchView } from './types'
import './swipe.css'

const HASH_OF: Record<SwipeKind, string> = { buddy: '#buddies', skill: '#skillshare' }
const kindFromHash = (hash: string): SwipeKind | null => hash === '#skillshare' ? 'skill' : hash === '#buddies' ? 'buddy' : null
const messagesPath = (kind: SwipeKind, personId: string) => `/${kind === 'skill' ? 'skillshare' : 'buddies'}/messages?participant=${personId}`

/**
 * Speed Matching entry point. On the dashboard (`#meet`) it shows both phones beside filters and
 * match tiles for the selected deck; the nav's Buddies tab sets `#buddies`, which puts the Buddies
 * phone in front. `/skillshare` reuses it with `skillOnly` (single phone, its own discovery grid).
 * Uses the live FastAPI endpoints; a clearly labelled sample deck is offered only if the service
 * can't be reached. Messaging goes through the existing conversations pages.
 */
export function SwipeLauncher({ skillOnly = false, cardProps, onDismiss }: { skillOnly?: boolean; cardProps?: Pick<ComponentProps<typeof CrossedCards>, 'id' | 'titleId'>; onDismiss?: () => void }) {
  const location = useLocation()
  const navigate = useNavigate()
  const apiSource = useMemo(() => new ApiSwipeSource(apiRequest as Request), [])
  const previewSource = useMemo(() => new PreviewSwipeSource(), [])
  const [usePreview, setUsePreview] = useState(false)
  const source: SwipeDataSource = usePreview ? previewSource : apiSource
  const browse = !skillOnly
  const [selected, setSelected] = useState<SwipeKind>(() => skillOnly ? 'skill' : kindFromHash(location.hash) ?? 'buddy')
  const [open, setOpen] = useState<SwipeKind | null>(null)
  const [matches, setMatches] = useState<SwipeMatchView[]>([])
  const [cards, setCards] = useState<SwipeCardView[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [busyIds, setBusyIds] = useState<string[]>([])
  const [notice, setNotice] = useState<{ text: string; person?: SwipeCardView } | null>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const meetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!onDismiss) return
    const section = sectionRef.current
    const listener = (event: KeyboardEvent) => { if (event.key === 'Escape' && !document.querySelector('dialog[open]')) { event.preventDefault(); onDismiss() } }
    section?.addEventListener('keydown', listener)
    return () => section?.removeEventListener('keydown', listener)
  }, [onDismiss])

  // The nav's Buddies tab (and links like /home#buddies) select a deck and bring the section into view.
  useEffect(() => {
    if (skillOnly) return
    const kind = kindFromHash(location.hash)
    if (!kind) return
    setSelected(kind)
    meetRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
  }, [location.hash, skillOnly])

  const select = useCallback((kind: SwipeKind) => {
    setSelected(kind)
    if (!skillOnly) navigate(HASH_OF[kind], { replace: true, preventScrollReset: true })
  }, [navigate, skillOnly])

  const refreshMatches = useCallback(async () => {
    try { setMatches(await source.loadMatches()) } catch { /* the deck and browser show service errors; keep last known matches */ }
  }, [source])
  const loadCards = useCallback(async () => {
    if (!browse) return
    setStatus('loading'); setError('')
    try { setCards(await source.loadDeck(selected)); setStatus('ready') }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load matches.'); setStatus('error') }
  }, [browse, selected, source])
  useEffect(() => { void refreshMatches() }, [refreshMatches])
  useEffect(() => { void loadCards() }, [loadCards])

  const swipeTile = async (card: SwipeCardView, direction: SwipeDirection) => {
    if (busyIds.includes(card.id)) return
    setBusyIds((ids) => [...ids, card.id]); setNotice(null)
    try {
      const outcome = await source.swipe(selected, card.id, direction)
      setCards((current) => current.filter((item) => item.id !== card.id))
      if (outcome.matched) {
        const person = outcome.person ?? card
        setNotice({ text: `You and ${person.name} both said yes!`, person })
        void refreshMatches()
      }
    } catch (reason) {
      setNotice({ text: reason instanceof Error ? `That wasn't saved: ${reason.message}` : "That wasn't saved. Try again." })
    } finally {
      setBusyIds((ids) => ids.filter((id) => id !== card.id))
    }
  }

  const cardsSection = <CrossedCards
    onOpen={setOpen}
    disabled={open !== null}
    kinds={skillOnly ? ['skill'] : ['buddy', 'skill']}
    selected={selected}
    onSelect={select}
    {...cardProps}
    heading={skillOnly ? 'Swipe to find your learning partner' : undefined}
    eyebrow={skillOnly ? 'SkillShare discovery' : undefined}
    description={skillOnly ? 'Explore the same shared SkillShare deck. A match lets both participants arrange a lesson.' : undefined}
  />

  return <div ref={meetRef} id={skillOnly ? undefined : 'meet'} className={`${onDismiss ? 'discovery-swipe-section' : ''}${browse ? ' meet' : ''}`.trim() || undefined}>
    <div className={browse ? 'meet-grid' : undefined}>
      <section ref={sectionRef} className="discovery-swipe-region" aria-label={onDismiss ? 'Optional swipe discovery' : undefined}>
        {onDismiss && <button type="button" className="discovery-dismiss" aria-label="Dismiss swipe discovery" onClick={onDismiss}><X size={20} /></button>}
        {cardsSection}
      </section>
      {browse && <MatchBrowser kind={selected} cards={cards} status={status} error={error} busyIds={busyIds} onSwipe={(card, dir) => void swipeTile(card, dir)} onRetry={() => void loadCards()} />}
    </div>
    {notice && <div className="meet-notice" role="status">
      <span>{notice.text}</span>
      {notice.person && source.kind === 'api' && <Link className="button button--outline" to={messagesPath(selected, notice.person.id)}><MessageCircle size={15} /> Message</Link>}
      <button type="button" className="button button--quiet" onClick={() => setNotice(null)}>Dismiss</button>
    </div>}
    {matches.length > 0 && <section className="swipe-matches dashboard-card" aria-labelledby="swipe-matches-title">
      <h2 id="swipe-matches-title">Your matches</h2>
      <ul>{matches.map((match) => <li key={`${match.kind}:${match.person.id}`}>
        {match.person.photo ? <img src={match.person.photo} alt="" /> : <span className="person-avatar person-avatar--small" aria-hidden="true">{match.person.initials}</span>}
        <span className="swipe-match-name"><strong>{match.person.name}</strong><small>{DECK_LABEL[match.kind]}</small></span>
        {source.kind === 'api' && <Link className="button button--quiet swipe-message-link" to={messagesPath(match.kind, match.person.id)} aria-label={`Message ${match.person.name}`}>Message</Link>}
      </li>)}</ul>
    </section>}
    {open && <SwipeDeck
      key={`${open}:${source.kind}`}
      kind={open}
      source={source}
      onClose={() => { setOpen(null); void refreshMatches(); void loadCards() }}
      onUsePreview={source.kind === 'api' ? () => setUsePreview(true) : undefined}
    />}
  </div>
}
