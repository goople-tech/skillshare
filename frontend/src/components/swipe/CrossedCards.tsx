import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, ArrowRightLeft, Users } from 'lucide-react'
import type { SwipeKind } from './types'

const SIDE_OF: Record<SwipeKind, 'left' | 'right'> = { buddy: 'left', skill: 'right' }
const ARROW_OF: Record<SwipeKind, '←' | '→'> = { buddy: '←', skill: '→' }
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Light-hearted prompts for the selected deck; a new random one is picked every time a phone is selected.
export const QUIRKS: Record<SwipeKind, string[]> = {
  buddy: [
    'Need someone to survive midterms with?',
    'Studying alone in IKB again?',
    'Want a gym buddy who actually shows up?',
    'Looking for a Koerner study crew?',
    'Need a friend for the Nest lunch rush?',
    'Commuting in and want company between classes?',
    'Want someone to try every food truck with?',
    'Need a partner for the 8 a.m. lecture grind?',
  ],
  skill: [
    'Know Python, want to learn guitar?',
    'Can teach Figma, need help with calculus?',
    'Got a skill worth trading?',
    'Want to swap a language for a lesson?',
    'Fluent in React, lost in statistics?',
    'Great at essays, struggling with chemistry?',
    'Play an instrument and want to learn to code?',
    'Could you explain something in 20 minutes?',
  ],
}
export const pickQuirk = (kind: SwipeKind, previous?: string, random: () => number = Math.random) => {
  const options = QUIRKS[kind].filter((quirk) => quirk !== previous)
  return options[Math.floor(random() * options.length)] ?? QUIRKS[kind][0]
}

/**
 * Speed Matching: phone-shaped cards crossed like an X; the selected deck's phone sits in front.
 * Press the selected deck's arrow (or click its phone) to open the deck; the other arrow (or phone) switches decks.
 * Selection is controlled by the parent when `selected`/`onSelect` are passed (e.g. from the nav tabs).
 * Keys only act while the section fills enough of the screen (including when zoomed in) and no dialog is open.
 */
export function CrossedCards({ onOpen, disabled = false, kinds = ['buddy', 'skill'], selected: selectedProp, onSelect, id = 'swipe-decks', titleId = 'crossed-cards-title', heading = 'Swipe to find your people', eyebrow = 'Speed matching', description }: {
  onOpen: (kind: SwipeKind) => void; disabled?: boolean; kinds?: SwipeKind[]; selected?: SwipeKind; onSelect?: (kind: SwipeKind) => void
  id?: string; titleId?: string; heading?: string; eyebrow?: string; description?: string
}) {
  const sectionRef = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [ownSelected, setOwnSelected] = useState<SwipeKind>(kinds[0])
  const selected = kinds.includes(selectedProp ?? ownSelected) ? (selectedProp ?? ownSelected) : kinds[0]
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
    if (disabled || !kinds.includes(kind)) return
    if (kind === selected) { onOpen(kind); return }
    setOwnSelected(kind)
    onSelect?.(kind)
  }, [disabled, kinds, onOpen, onSelect, selected])

  useEffect(() => {
    if (!visible || disabled) return
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return
      const target = event.target as HTMLElement | null
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return
      if (document.querySelector('dialog[open]')) return
      if (event.key === 'ArrowLeft' && kinds.includes('buddy')) { event.preventDefault(); press('buddy') }
      else if (event.key === 'ArrowRight' && kinds.includes('skill')) { event.preventDefault(); press('skill') }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [visible, disabled, press, kinds])

  const other = kinds.find((kind) => kind !== selected)
  const help = `Press ${ARROW_OF[selected]} again or tap the front card to start swiping${other ? ` · ${ARROW_OF[other]} for ${other === 'skill' ? 'SkillShare' : 'Buddies'}` : ''}`

  return <section
    ref={sectionRef}
    id={id}
    tabIndex={-1}
    className={`crossed-cards${kinds.length > 1 ? ' crossed-cards--compact' : ''}${revealed ? ' crossed-cards--revealed' : ''} crossed-cards--${SIDE_OF[selected]}${kinds.length === 1 ? ' crossed-cards--single' : ''}`}
    aria-labelledby={titleId}
  >
    <div className="crossed-cards-copy">
      <span className="workspace-eyebrow">{eyebrow}</span>
      <h2 id={titleId}>{heading}</h2>
      {description && <p>{description}</p>}
      <p className="crossed-cards-quirk" aria-live="polite">{quirk} <strong>Select {ARROW_OF[selected]}</strong></p>
      <p className="crossed-cards-help">{help}</p>
    </div>
    <div className="crossed-cards-stage">
      {kinds.includes('buddy') && <button type="button" className="phone-card phone-card--left" aria-pressed={selected === 'buddy'} aria-label={selected === 'buddy' ? 'Open the Buddies deck' : 'Switch to Buddies'} onClick={() => press('buddy')} disabled={disabled}>
        <span className="phone-card-notch" aria-hidden="true" />
        <Users size={34} aria-hidden="true" />
        <strong>Buddies</strong>
        <span>Study partners and friends who share your courses and interests</span>
        <kbd aria-hidden="true"><ArrowLeft size={14} /></kbd>
      </button>}
      {kinds.includes('skill') && <button type="button" className="phone-card phone-card--right" aria-pressed={selected === 'skill'} aria-label={selected === 'skill' ? 'Open the SkillShare deck' : 'Switch to SkillShare'} onClick={() => press('skill')} disabled={disabled}>
        <span className="phone-card-notch" aria-hidden="true" />
        <ArrowRightLeft size={34} aria-hidden="true" />
        <strong>SkillShare</strong>
        <span>Trade what you know for what you want to learn</span>
        <kbd aria-hidden="true"><ArrowRight size={14} /></kbd>
      </button>}
    </div>
  </section>
}
