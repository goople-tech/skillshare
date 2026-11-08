import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, ArrowRightLeft, Users } from 'lucide-react'
import type { SwipeKind } from './types'

type Side = 'left' | 'right'
const SIDE_KIND: Record<Side, SwipeKind> = { left: 'buddy', right: 'skill' }
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Two phone-shaped cards crossed like an X. They pop apart as the section scrolls into view.
 * ← once lifts the Buddies card, ← again opens the Buddies deck; → does the same for SkillShare.
 * Keys only act while this section is on screen (or focused), so the rest of the page keeps its arrows.
 */
export function CrossedCards({ onOpen, disabled = false, kinds = ['buddy', 'skill'], id = 'swipe-decks', titleId = 'crossed-cards-title', heading = 'Swipe to find your people', eyebrow = 'Meet people', description = "Pick a deck. Pass on the left, like on the right. When you both like each other, you're connected." }: {
  onOpen: (kind: SwipeKind) => void; disabled?: boolean; kinds?: SwipeKind[]; id?: string; titleId?: string; heading?: string; eyebrow?: string; description?: string
}) {
  const sectionRef = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [active, setActive] = useState<Side | null>(null)

  // Reveal once, then track visibility for keyboard handling.
  useEffect(() => {
    const node = sectionRef.current
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.intersectionRatio >= 0.45)
      if (entry.intersectionRatio >= 0.25) setRevealed(true)
    }, { threshold: [0, 0.25, 0.45, 0.75, 1] })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  // Scroll-linked spread: --spread goes 0 → 1 → 0 as the section passes through the viewport.
  useEffect(() => {
    const node = sectionRef.current
    if (!node || reducedMotion()) return
    let frame = 0
    const update = () => {
      frame = 0
      const rect = node.getBoundingClientRect()
      const viewport = window.innerHeight || 1
      const center = rect.top + rect.height / 2
      const distance = Math.min(1, Math.abs(center - viewport / 2) / (viewport / 2 + rect.height / 2))
      node.style.setProperty('--spread', (1 - distance).toFixed(3))
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); if (frame) cancelAnimationFrame(frame) }
  }, [])

  // Kept in a ref so a fast double press reads the latest value (and no side effect runs inside a state updater).
  const activeRef = useRef<Side | null>(null)
  const press = useCallback((side: Side) => {
    if (disabled) return
    if (activeRef.current === side) {
      activeRef.current = null
      setActive(null)
      onOpen(SIDE_KIND[side])
      return
    }
    activeRef.current = side
    setActive(side)
  }, [disabled, onOpen])

  useEffect(() => {
    if (!visible || disabled) return
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return
      const target = event.target as HTMLElement | null
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return
      if (document.querySelector('dialog[open]')) return
      if (event.key === 'ArrowLeft' && kinds.includes('buddy')) { event.preventDefault(); press('left') }
      else if (event.key === 'ArrowRight' && kinds.includes('skill')) { event.preventDefault(); press('right') }
      else if (event.key === 'Escape') { activeRef.current = null; setActive(null) }
      else if (event.key === 'Enter' && active && document.activeElement === sectionRef.current) { event.preventDefault(); press(active) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [visible, disabled, press, active, kinds])

  const hint = active === 'left' ? 'Press ← again to open Buddies' : active === 'right' ? 'Press → again to open SkillShare' : kinds.length === 1 ? 'Press → twice, or tap the card' : 'Use ← or → (press twice), or tap a card'

  return <section
    ref={sectionRef}
    id={id}
    tabIndex={-1}
    className={`crossed-cards${revealed ? ' crossed-cards--revealed' : ''}${active ? ` crossed-cards--${active}` : ''}${kinds.length === 1 ? ' crossed-cards--single' : ''}`}
    aria-labelledby={titleId}
  >
    <div className="crossed-cards-copy">
      <span className="workspace-eyebrow">{eyebrow}</span>
      <h2 id={titleId}>{heading}</h2>
      <p>{description}</p>
      <p className="crossed-cards-hint" aria-live="polite">{hint}</p>
    </div>
    <div className="crossed-cards-stage">
      {kinds.includes('buddy') && <button type="button" className="phone-card phone-card--left" aria-pressed={active === 'left'} aria-label={active === 'left' ? 'Open the Buddies deck' : 'Choose the Buddies deck'} onClick={() => press('left')} disabled={disabled}>
        <span className="phone-card-notch" aria-hidden="true" />
        <Users size={38} aria-hidden="true" />
        <strong>Buddies</strong>
        <span>Study partners and friends who share your courses and interests</span>
        <kbd aria-hidden="true"><ArrowLeft size={14} /><ArrowLeft size={14} /></kbd>
      </button>}
      {kinds.includes('skill') && <button type="button" className="phone-card phone-card--right" aria-pressed={active === 'right'} aria-label={active === 'right' ? 'Open the SkillShare deck' : 'Choose the SkillShare deck'} onClick={() => press('right')} disabled={disabled}>
        <span className="phone-card-notch" aria-hidden="true" />
        <ArrowRightLeft size={38} aria-hidden="true" />
        <strong>SkillShare</strong>
        <span>Trade what you know for what you want to learn</span>
        <kbd aria-hidden="true"><ArrowRight size={14} /><ArrowRight size={14} /></kbd>
      </button>}
    </div>
  </section>
}
