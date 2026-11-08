import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { ArrowLeft, ArrowRight, Check, Heart, MessageCircle, RotateCcw, Sparkles, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { SwipeDataSource } from './swipeSource'
import { DECK_LABEL, type SwipeCardView, type SwipeDirection, type SwipeKind } from './types'

const FLING_PX = 110
const FLING_VELOCITY = 0.6 // px per ms
const EXIT_MS = 380
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

type Drag = { id: string; startX: number; startY: number; dx: number; dy: number; lastX: number; lastT: number; velocity: number }
type Exit = { id: string; direction: SwipeDirection }

/**
 * Full-screen swipe deck in a native modal dialog.
 * Drag the top card, or press ← / → once to tilt it (PASS / LIKE preview) and again to commit.
 * The opposite arrow switches the tilt; ↓ or Esc cancels it (Esc again closes the deck).
 */
export function SwipeDeck({ kind, source, onClose, onUsePreview }: {
  kind: SwipeKind
  source: SwipeDataSource
  onClose: () => void
  onUsePreview?: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [cards, setCards] = useState<SwipeCardView[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [pending, setPending] = useState<SwipeDirection | null>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [exit, setExit] = useState<Exit | null>(null)
  const [match, setMatch] = useState<SwipeCardView | null>(null)
  const [notice, setNotice] = useState('')
  const [messageBusy, setMessageBusy] = useState(false)
  const navigate = useNavigate()
  const pendingRef = useRef<SwipeDirection | null>(null)
  const busyRef = useRef(false)
  const label = DECK_LABEL[kind]

  const load = useCallback(async () => {
    setStatus('loading'); setError('')
    try {
      setCards(await source.loadDeck(kind))
      setStatus('ready')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load this deck.')
      setStatus('error')
    }
  }, [kind, source])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
    return () => { if (dialog?.open) dialog.close() }
  }, [])

  const setTilt = (next: SwipeDirection | null) => { pendingRef.current = next; setPending(next) }

  const commit = useCallback((direction: SwipeDirection) => {
    const top = cards[0]
    if (!top || busyRef.current || match) return
    busyRef.current = true
    setTilt(null)
    setDrag(null)
    setExit({ id: top.id, direction })
    setNotice('')
    const request = source.swipe(kind, top.id, direction)
    window.setTimeout(async () => {
      setCards((current) => current.filter((card) => card.id !== top.id))
      setExit(null)
      try {
        const outcome = await request
        if (outcome.matched) setMatch(outcome.person ?? top)
      } catch (reason) {
        // Roll back: put the card back on top so nothing is silently lost.
        setCards((current) => [top, ...current.filter((card) => card.id !== top.id)])
        setNotice(reason instanceof Error ? `Your swipe wasn't saved: ${reason.message}` : "Your swipe wasn't saved. Try again.")
      } finally {
        busyRef.current = false
      }
    }, reducedMotion() ? 0 : EXIT_MS)
  }, [cards, kind, match, source])

  async function messageMatch(person: SwipeCardView) {
    if (!source.resolveConversation || messageBusy) return
    setMessageBusy(true)
    setNotice('')
    try {
      const id = await source.resolveConversation(kind, person.id)
      dialogRef.current?.close()
      void navigate(`/${kind === 'skill' ? 'skillshare' : 'buddies'}/messages?conversation=${id}`)
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Could not open the conversation. Try again.')
      setMessageBusy(false)
    }
  }

  // Keyboard: first press tilts, second press of the same arrow commits.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const onKey = (event: KeyboardEvent) => {
      if (match) { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setMatch(null) } return }
      if (status !== 'ready' || !cards.length) return
      const direction: SwipeDirection | null = event.key === 'ArrowLeft' ? 'pass' : event.key === 'ArrowRight' ? 'like' : null
      if (direction) {
        event.preventDefault()
        if (pendingRef.current === direction) commit(direction)
        else setTilt(direction)
      } else if (event.key === 'ArrowDown' || event.key === 'Backspace') {
        event.preventDefault(); setTilt(null)
      }
    }
    const onCancel = (event: Event) => {
      // Esc: first clears a tilt or a match card; only then does it close the deck.
      if (pendingRef.current || match) { event.preventDefault(); setTilt(null); setMatch(null) }
    }
    dialog.addEventListener('keydown', onKey)
    dialog.addEventListener('cancel', onCancel)
    return () => { dialog.removeEventListener('keydown', onKey); dialog.removeEventListener('cancel', onCancel) }
  }, [cards.length, commit, match, status])

  // Pointer drag on the top card.
  const onPointerDown = (event: ReactPointerEvent<HTMLElement>, id: string) => {
    if (busyRef.current || match || (event.pointerType === 'mouse' && event.button !== 0)) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setTilt(null)
    setDrag({ id, startX: event.clientX, startY: event.clientY, dx: 0, dy: 0, lastX: event.clientX, lastT: event.timeStamp, velocity: 0 })
  }
  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (!drag) return
    const dt = Math.max(1, event.timeStamp - drag.lastT)
    setDrag({ ...drag, dx: event.clientX - drag.startX, dy: event.clientY - drag.startY, lastX: event.clientX, lastT: event.timeStamp, velocity: (event.clientX - drag.lastX) / dt })
  }
  const onPointerUp = () => {
    if (!drag) return
    const fast = Math.abs(drag.velocity) > FLING_VELOCITY && Math.abs(drag.dx) > 40
    if (Math.abs(drag.dx) > FLING_PX || fast) commit(drag.dx > 0 ? 'like' : 'pass')
    else setDrag(null)
  }

  const cardStyle = (card: SwipeCardView, index: number) => {
    if (exit?.id === card.id) {
      const sign = exit.direction === 'like' ? 1 : -1
      return { transform: `translate(${sign * 130}vw, -6vh) rotate(${sign * 32}deg)`, transition: `transform ${EXIT_MS}ms cubic-bezier(.3,.7,.4,1), opacity ${EXIT_MS}ms`, opacity: 0.4 }
    }
    if (index === 0 && drag?.id === card.id) {
      return { transform: `translate(${drag.dx}px, ${drag.dy * 0.35}px) rotate(${drag.dx * 0.06}deg)`, transition: 'none', cursor: 'grabbing' }
    }
    if (index === 0 && pending) {
      const sign = pending === 'like' ? 1 : -1
      return { transform: `translateX(${sign * 46}px) rotate(${sign * 7}deg)` }
    }
    return { transform: `translateY(${index * 14}px) scale(${1 - index * 0.045})` }
  }
  const stampOpacity = (direction: SwipeDirection) => {
    if (pending === direction) return 1
    if (!drag) return 0
    const amount = (direction === 'like' ? drag.dx : -drag.dx) / FLING_PX
    return Math.max(0, Math.min(1, amount))
  }

  const visible = cards.slice(0, 3)
  const hint = pending === 'like' ? 'Press → again to like · ↓ to cancel' : pending === 'pass' ? 'Press ← again to pass · ↓ to cancel' : 'Drag the card, or press ← / → twice'

  return <dialog ref={dialogRef} className="swipe-dialog" aria-labelledby="swipe-deck-title" onClose={onClose}>
    <div className={`swipe-shell swipe-shell--${kind}`}>
      <header className="swipe-header">
        <div>
          <span className="workspace-eyebrow">{source.kind === 'preview' ? 'Sample deck · nothing is saved' : 'Live deck'}</span>
          <h2 id="swipe-deck-title">{label}</h2>
        </div>
        <button type="button" className="swipe-close" onClick={() => dialogRef.current?.close()} aria-label="Close deck"><X size={20} /></button>
      </header>

      <div className="swipe-stage" aria-live="polite">
        {status === 'loading' && <div className="swipe-empty"><span className="swipe-spinner" aria-hidden="true" />Finding people…</div>}
        {status === 'error' && <div className="swipe-empty">
          <strong>We couldn't load this deck.</strong>
          <p>{error}</p>
          <div className="swipe-empty-actions">
            <button type="button" className="button button--outline" onClick={() => void load()}><RotateCcw size={15} /> Try again</button>
            {onUsePreview && <button type="button" className="button button--quiet" onClick={onUsePreview}>Use sample cards</button>}
          </div>
        </div>}
        {status === 'ready' && !cards.length && !exit && <div className="swipe-empty">
          <Sparkles size={28} aria-hidden="true" />
          <strong>You're all caught up</strong>
          <p>{kind === 'skill' ? 'Add more skills you can teach or want to learn to see more people.' : 'Add courses and interests to your profile to meet more people.'}</p>
          <button type="button" className="button button--outline" onClick={() => void load()}><RotateCcw size={15} /> Check again</button>
        </div>}
        {status === 'ready' && visible.slice().reverse().map((card) => {
          const index = visible.indexOf(card)
          const isTop = index === 0
          return <article
            key={card.id}
            className={`swipe-card${isTop ? ' swipe-card--top' : ''}`}
            style={{ zIndex: 10 - index, ...cardStyle(card, index) }}
            aria-hidden={!isTop}
            aria-label={isTop ? `${card.name}. ${card.reasons.join('. ')}` : undefined}
            onPointerDown={isTop ? (event) => onPointerDown(event, card.id) : undefined}
            onPointerMove={isTop ? onPointerMove : undefined}
            onPointerUp={isTop ? onPointerUp : undefined}
            onPointerCancel={isTop ? () => setDrag(null) : undefined}
          >
            <div className="swipe-card-photo">
              {card.photo ? <img src={card.photo} alt="" draggable={false} /> : <span className="swipe-card-initials" aria-hidden="true">{card.initials}</span>}
              {isTop && <>
                <span className="swipe-stamp swipe-stamp--pass" style={{ opacity: stampOpacity('pass') }}>Pass</span>
                <span className="swipe-stamp swipe-stamp--like" style={{ opacity: stampOpacity('like') }}>Like</span>
              </>}
            </div>
            <div className="swipe-card-body">
              <h3>{card.name}</h3>
              {card.bio && <p className="swipe-card-bio">{card.bio}</p>}
              {card.reasons.length > 0 && <ul className="swipe-reasons">{card.reasons.slice(0, 3).map((reason) => <li key={reason}><Check size={14} aria-hidden="true" />{reason}</li>)}</ul>}
              <div className="swipe-chips">
                {(kind === 'skill' ? card.teaches.map((skill) => `Teaches ${skill}`) : card.courses).slice(0, 3).map((chip) => <span key={chip} className="swipe-chip">{chip}</span>)}
                {(kind === 'skill' ? card.learns.map((skill) => `Learning ${skill}`) : card.interests).slice(0, 3).map((chip) => <span key={chip} className="swipe-chip swipe-chip--soft">{chip}</span>)}
              </div>
              <p className="swipe-card-meta">{card.meets} · {card.pace}</p>
            </div>
          </article>
        })}

        {match && <div className="swipe-match" role="alertdialog" aria-labelledby="swipe-match-title">
          <div className="swipe-match-card">
            <Heart size={30} aria-hidden="true" />
            <h3 id="swipe-match-title">{kind === 'skill' ? "It's a skill swap!" : "You're connected!"}</h3>
            <p>You and {match.name} both said yes{kind === 'skill' ? ' to trading skills' : ' to meeting up'}. They'll see you in their matches too.</p>
            <button type="button" className="button" autoFocus onClick={() => setMatch(null)}>Keep swiping</button>
            {source.kind === 'api' && <button type="button" className="button" disabled={messageBusy} onClick={() => void messageMatch(match)}><MessageCircle size={16} />{messageBusy ? 'Opening conversation…' : 'Message match'}</button>}
          </div>
        </div>}
      </div>

      {notice && <p className="swipe-notice" role="alert">{notice}</p>}

      <footer className="swipe-controls">
        <button type="button" className={`swipe-action swipe-action--pass${pending === 'pass' ? ' is-armed' : ''}`} disabled={!cards.length || !!match || status !== 'ready'} onClick={() => commit('pass')} aria-label="Pass">
          <X size={26} />
        </button>
        <p className="swipe-hint"><ArrowLeft size={14} aria-hidden="true" /> {hint} <ArrowRight size={14} aria-hidden="true" /></p>
        <button type="button" className={`swipe-action swipe-action--like${pending === 'like' ? ' is-armed' : ''}`} disabled={!cards.length || !!match || status !== 'ready'} onClick={() => commit('like')} aria-label="Like">
          <Heart size={24} />
        </button>
      </footer>
    </div>
  </dialog>
}
