import type { SwipeCardView, SwipeKind } from './types'

export type FilterId = 'course' | 'interest' | 'teachesMe' | 'wantsMine' | 'swap' | 'inPerson' | 'online' | 'quiet' | 'active'
export type Filter = { id: FilterId; label: string; test: (card: SwipeCardView) => boolean }

const reason = (card: SwipeCardView, prefix: string) => card.reasons.some((text) => text.startsWith(prefix))
const meets = (card: SwipeCardView, mode: 'In person' | 'Online') => card.meets === mode || card.meets === 'Online or in person'

const ALL: Record<FilterId, Filter> = {
  course: { id: 'course', label: 'Shares a course', test: (c) => reason(c, 'Also in') },
  interest: { id: 'interest', label: 'Shares an interest', test: (c) => reason(c, 'Into') },
  teachesMe: { id: 'teachesMe', label: 'Can teach me', test: (c) => reason(c, 'Can teach you') },
  wantsMine: { id: 'wantsMine', label: 'Wants my skills', test: (c) => reason(c, 'Wants to learn') },
  swap: { id: 'swap', label: 'Two-way swap', test: (c) => reason(c, 'Skill swap') },
  inPerson: { id: 'inPerson', label: 'In person', test: (c) => meets(c, 'In person') },
  online: { id: 'online', label: 'Online', test: (c) => meets(c, 'Online') },
  quiet: { id: 'quiet', label: 'Quiet sessions', test: (c) => c.pace === 'Quiet sessions' },
  active: { id: 'active', label: 'High energy', test: (c) => c.pace === 'Active collaboration' },
}

/** Six filters per deck (the circles in the design), all built from server-provided fields. */
export const FILTERS: Record<SwipeKind, Filter[]> = {
  buddy: [ALL.course, ALL.interest, ALL.inPerson, ALL.online, ALL.quiet, ALL.active],
  skill: [ALL.teachesMe, ALL.wantsMine, ALL.swap, ALL.inPerson, ALL.online, ALL.quiet],
}

/** Every selected filter must match (AND), keeping the server's compatibility order. */
export function applyFilters(cards: SwipeCardView[], kind: SwipeKind, selected: FilterId[]): SwipeCardView[] {
  const active = FILTERS[kind].filter((filter) => selected.includes(filter.id))
  return cards.filter((card) => active.every((filter) => filter.test(card)))
}
