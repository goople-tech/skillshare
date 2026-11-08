import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, ArrowRightLeft, Users } from 'lucide-react'
import type { SwipeKind } from './types'

const SIDE_OF: Record<SwipeKind, 'left' | 'right'> = { buddy: 'left', skill: 'right' }
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Light-hearted prompts for the selected deck; a new one is picked each time the selection changes.
export const QUIRKS: Record<SwipeKind, string[]> = {
  buddy: [
    'Need someone to survive midterms with?',
    'Studying alone in IKB again?',
    'Want a gym buddy who actually shows up?',
    'Looking for a Koerner study crew?',
    'Need a friend for the Nest lunch rush?',
  ],
  skill: [
    'Know Python, want to learn guitar?',
    'Can teach Figma, need help with calculus?',
    'Got a skill worth trading?',
    'Want to swap a language for a lesson?',
    'Fluent in React, lost in statistics?',
  ],
}
const pickQuirk = (kind: SwipeKind, previous?: string) => {
  const options = QUIRKS[kind].filter((quirk) => quirk !== previous)
  return options[Math.floor(Math.random() * options.length)]
}

/**
 * Speed Matching: two phone-shaped cards crossed like an X; the selected deck sits in front.
 * Press the selected deck's arrow (or click its card) to open it; the other arrow (or card) switches decks.
 * Keys only act while this section fills enough of the screen (including when zoomed in) and no dialog is open.
 */
export function CrossedCards({ selected, onSelect, onOpen, disabled = false }: {
  selected: SwipeKind
  onSelect: (kind: SwipeKind) => void
  onOpen: (kind: SwipeKind) => void
  disabled?: boolean
}) {
  const sectionRef = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [quirk, setQuirk] = useState(() => pickQuirk(selected))
  const lastSelected = useRef(selected)

  useEffect(() => {
    if (lastSelected.current === selected) return
    lastSelected.current = selected
    setQuirk((previous) => pickQuirk(selected, previous))
  }, [selected])

  // Visible when most of the section is on screen, or when it fills most of the screen
  // (a zoomed-in page can make the section taller than the viewport).
  useEffect(() => {
    const node = sectionRef.current
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => {
      const fillsScreen = entry.intersectionRect.height >= window.innerHeight * 0.4
      setVisible(entry.intersectionRatio >= 0.45 || fillsScreen)
      if (entry.intersectionRatio >= 0.2 || fillsScreen) setRevealed(true)
    }, { threshold: [0, 0.1, 0.2, 0.3, 0.45, 0.6, 0.75, 1] })
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

  const press = useCallback((kind: SwipeKind) => {
    if (disabled) return
    if (kind === selected) onOpen(kind)
    else onSelect(kind)
  }, [disabled, onOpen, onSelect, selected])

  useEffect(() => {
    if (!visible || disabled) return
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return
      const target = event.target as HTMLElement | null
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return
      if (document.querySelector('dialog[open]')) return
      if (event.key === 'ArrowLeft') { event.preventDefault(); press('buddy') }
      else if (event.key === 'ArrowRight') { event.preventDefault(); press('skill') }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [visible, disabled, press])

  const arrow = selected === 'buddy' ? '←' : '→'

  return <section
    ref={sectionRef}
    id="swipe-decks"
    tabIndex={-1}
    className={`crossed-cards crossed-cards--compact${revealed ? ' crossed-cards--revealed' : ''} crossed-cards--${SIDE_OF[selected]}`}
    aria-labelledby="crossed-cards-title"
  >
    <div className="crossed-cards-copy">
      <span className="workspace-eyebrow">Speed matching</span>
      <h2 id="crossed-cards-title">Swipe to find your people</h2>
      <p className="crossed-cards-quirk" aria-live="polite">{quirk} <strong>Select {arrow}</strong></p>
      <p className="crossed-cards-help">Press {arrow} again or tap the front card to start swiping · {selected === 'buddy' ? '→ for SkillShare' : '← for Buddies'}</p>
    </div>
    <div className="crossed-cards-stage">
      <button type="button" className="phone-card phone-card--left" aria-pressed={selected === 'buddy'} aria-label={selected === 'buddy' ? 'Open the Buddies deck' : 'Switch to Buddies'} onClick={() => press('buddy')} disabled={disabled}>
        <span className="phone-card-notch" aria-hidden="true" />
        <Users size={34} aria-hidden="true" />
        <strong>Buddies</strong>
        <span>Study partners and friends who share your courses and interests</span>
        <kbd aria-hidden="true"><ArrowLeft size={14} /></kbd>
      </button>
      <button type="button" className="phone-card phone-card--right" aria-pressed={selected === 'skill'} aria-label={selected === 'skill' ? 'Open the SkillShare deck' : 'Switch to SkillShare'} onClick={() => press('skill')} disabled={disabled}>
        <span className="phone-card-notch" aria-hidden="true" />
        <ArrowRightLeft size={34} aria-hidden="true" />
        <strong>SkillShare</strong>
        <span>Trade what you know for what you want to learn</span>
        <kbd aria-hidden="true"><ArrowRight size={14} /></kbd>
      </button>
    </div>
  </section>
}
