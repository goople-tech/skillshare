import { useEffect, useState } from 'react'

const STEPS = [
  { id: 'dashboard-top', title: 'This is your home', body: 'Find a buddy for a class, offer a skill you can teach, or share a project you want help with.' },
  { id: 'swipe-decks', title: 'Two ways to meet', body: 'Buddies is for a study partner or someone to hang out with. SkillShare is a trade: you teach one thing, they teach you another. You only match if you both say yes.' },
  { id: 'requests', title: 'Requests for you', body: 'When another student wants to meet, it lands here. Accept if you want to, or pass if you don’t.' },
  { id: 'skills-matches', title: 'People who fit', body: 'These students overlap with your courses, interests, or the skill you want to learn.' },
  { id: 'profile-summary', title: 'Your profile', body: 'Matches use the courses, interests, and skills you put here. Your email stays as it is.' },
  { id: 'campus-activity', title: 'Where campus is busy', body: 'The map shows an area, like a library or the Nest, and how many students are around it. It does not follow anyone’s exact spot.' },
]

export function DashboardTour({ onClose }: { onClose: () => void }) {
  const [index, setIndex] = useState(0)
  const [box, setBox] = useState<DOMRect | null>(null)
  const step = STEPS[index]
  const last = index === STEPS.length - 1

  useEffect(() => {
    const node = document.getElementById(step.id)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    node?.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' })
    const measure = () => setBox(node?.getBoundingClientRect() ?? null)
    const timer = window.setTimeout(measure, reduced ? 0 : 320)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => { window.clearTimeout(timer); window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true) }
  }, [step.id])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowRight') setIndex((current) => Math.min(STEPS.length - 1, current + 1))
      if (event.key === 'ArrowLeft') setIndex((current) => Math.max(0, current - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const cardTop = box ? (box.bottom + 16 + 210 < window.innerHeight ? box.bottom + 16 : Math.max(12, box.top - 210)) : 24
  const cardLeft = box ? Math.min(Math.max(12, box.left), window.innerWidth - 372) : 12

  return (
    <div className="tour-root" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {box && <div className="tour-hole" style={{ top: box.top - 8, left: box.left - 8, width: box.width + 16, height: box.height + 16 }} />}
      <div className="tour-card" style={{ top: cardTop, left: cardLeft }}>
        <p className="tour-count">Step {index + 1} of {STEPS.length}</p>
        <h2 id="tour-title">{step.title}</h2>
        <p>{step.body}</p>
        <div className="tour-actions">
          <button type="button" className="button button--quiet" onClick={onClose}>Skip</button>
          {index > 0 && <button type="button" className="button button--outline" onClick={() => setIndex(index - 1)}>Back</button>}
          <button type="button" className="button button--primary" onClick={() => (last ? onClose() : setIndex(index + 1))}>{last ? 'Done' : 'Next'}</button>
        </div>
      </div>
    </div>
  )
}
