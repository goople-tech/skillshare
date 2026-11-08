/** View models for the swipe decks. Components never see raw API records. */
export type SwipeKind = 'buddy' | 'skill'
export type SwipeDirection = 'like' | 'pass'

export type SwipeCardView = {
  id: string
  name: string
  initials: string
  bio: string
  photo?: string
  courses: string[]
  interests: string[]
  teaches: string[]
  learns: string[]
  meets: string
  pace: string
  /** Plain-language overlaps from the server, e.g. "Also in CPSC 213". Never a score. */
  reasons: string[]
}

export type SwipeOutcome = { matched: boolean; person?: SwipeCardView }
export type SwipeMatchView = { kind: SwipeKind; person: SwipeCardView }

export const DECK_LABEL: Record<SwipeKind, string> = { buddy: 'Buddies', skill: 'SkillShare' }
