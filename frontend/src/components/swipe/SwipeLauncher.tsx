import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { apiRequest } from '../../api'
import { CrossedCards } from './CrossedCards'
import { SwipeDeck } from './SwipeDeck'
import { MatchBrowser } from './MatchBrowser'
import { ChatDialog } from './ChatDialog'
import { ApiSwipeSource, PreviewSwipeSource, type Request, type SwipeDataSource } from './swipeSource'
import { DECK_LABEL, type SwipeCardView, type SwipeDirection, type SwipeKind, type SwipeMatchView } from './types'
import './swipe.css'

const HASH_OF: Record<SwipeKind, string> = { buddy: '#buddies', skill: '#skillshare' }
const kindFromHash = (hash: string): SwipeKind | null => hash === '#skillshare' ? 'skill' : hash === '#buddies' ? 'buddy' : null

/**
 * "Meet people" section: Speed Matching (crossed phones) beside filters and match tiles for the
 * selected deck, plus mutual matches with messaging. The nav's Buddies/SkillShare tabs set
 * `#buddies` / `#skillshare`, which selects the matching phone. Uses the live FastAPI endpoints;
 * a clearly labelled sample deck is offered only if the campus service can't be reached.
 */
export function SwipeLauncher() {
  const location = useLocation()
  const navigate = useNavigate()
  const apiSource = useMemo(() => new ApiSwipeSource(apiRequest as Request), [])
  const previewSource = useMemo(() => new PreviewSwipeSource(), [])
  const [usePreview, setUsePreview] = useState(false)
  const source: SwipeDataSource = usePreview ? previewSource : apiSource
  const [selected, setSelected] = useState<SwipeKind>(() => kindFromHash(location.hash) ?? 'buddy')
  const [open, setOpen] = useState<SwipeKind | null>(null)
  const [chatWith, setChatWith] = useState<SwipeCardView | null>(null)
  const [matches, setMatches] = useState<SwipeMatchView[]>([])
  const [cards, setCards] = useState<SwipeCardView[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [busyIds, setBusyIds] = useState<string[]>([])
  const [notice, setNotice] = useState<{ text: string; person?: SwipeCardView } | null>(null)

  // Nav tabs drive the selected deck.
  useEffect(() => {
    const kind = kindFromHash(location.hash)
    if (kind) setSelected(kind)
  }, [location.hash])

  const select = useCallback((kind: SwipeKind) => {
    setSelected(kind)
    navigate(HASH_OF[kind], { replace: true })
  }, [navigate])

  const refreshMatches = useCallback(async () => {
    try { setMatches(await source.loadMatches()) } catch { /* deck/browser surface service errors */ }
  }, [source])

  const loadCards = useCallback(async () => {
    setStatus('loading'); setError('')
    try { setCards(await source.loadDeck(selected)); setStatus('ready') }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load matches.'); setStatus('error') }
  }, [selected, source])

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

  return <div id="meet" className="meet" tabIndex={-1}>
    <div className="meet-grid">
      <CrossedCards selected={selected} onSelect={select} onOpen={setOpen} disabled={open !== null || chatWith !== null} />
      <MatchBrowser kind={selected} cards={cards} status={status} error={error} busyIds={busyIds} onSwipe={(card, dir) => void swipeTile(card, dir)} onRetry={() => void loadCards()} />
    </div>
    {notice && <div className="meet-notice" role="status">
      <span>{notice.text}</span>
      {notice.person && source.kind === 'api' && <button type="button" className="button button--outline" onClick={() => { setChatWith(notice.person!); setNotice(null) }}><MessageCircle size={15} /> Say hi</button>}
      <button type="button" className="button button--quiet" onClick={() => setNotice(null)}>Dismiss</button>
    </div>}
    {matches.length > 0 && <section className="swipe-matches dashboard-card" aria-labelledby="swipe-matches-title">
      <h2 id="swipe-matches-title">Your matches</h2>
      <ul>{matches.map((match) => <li key={`${match.kind}:${match.person.id}`}>
        <span className="person-avatar person-avatar--small" aria-hidden="true">{match.person.initials}</span>
        <span className="swipe-match-name"><strong>{match.person.name}</strong><small>{DECK_LABEL[match.kind]}</small></span>
        <button type="button" className="swipe-match-chat" onClick={() => setChatWith(match.person)} aria-label={`Message ${match.person.name}`}><MessageCircle size={16} /></button>
      </li>)}</ul>
    </section>}
    {open && <SwipeDeck
      key={`${open}:${source.kind}`}
      kind={open}
      source={source}
      onClose={() => { setOpen(null); void refreshMatches(); void loadCards() }}
      onUsePreview={source.kind === 'api' ? () => setUsePreview(true) : undefined}
    />}
    {chatWith && <ChatDialog key={chatWith.id} person={chatWith} source={source} onClose={() => { setChatWith(null) }} />}
  </div>
}
