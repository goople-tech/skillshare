import type { MessageView, SwipeCardView, SwipeDirection, SwipeKind, SwipeMatchView, SwipeOutcome } from './types'

/** I/O boundary for the swipe decks, mirroring the dashboard's data-source pattern. */
export interface SwipeDataSource {
  readonly kind: 'api' | 'preview'
  loadDeck(deck: SwipeKind): Promise<SwipeCardView[]>
  swipe(deck: SwipeKind, personId: string, direction: SwipeDirection): Promise<SwipeOutcome>
  loadMatches(): Promise<SwipeMatchView[]>
  /** Messages with a matched student, oldest first; pass the last seen id to poll for new ones. */
  loadMessages(personId: string, afterId?: number): Promise<MessageView[]>
  sendMessage(personId: string, body: string): Promise<MessageView>
}

/** Backend shapes (FastAPI `StudentMatchOut`, `SwipeCard`, `SwipeResult`, `SwipeMatch`). Other students' photos are not shared. */
export type ApiPublicProfile = {
  id: number; name: string; bio: string; courses: string; interests: string
  skills_teach: string; skills_learn: string; mode: string; energy: string; photo?: string
}
export type ApiSwipeCard = { profile: ApiPublicProfile; reasons: string[] }
export type ApiSwipeResult = { matched: boolean; profile: ApiPublicProfile | null }
export type ApiSwipeMatch = { kind: SwipeKind; profile: ApiPublicProfile }
export type ApiMessage = { id: number; mine: boolean; body: string; sent_at: string }
export type Request = <T>(path: string, options?: { method?: string; body?: string }) => Promise<T>

const split = (value: string) => (value ?? '').split(',').map((item) => item.trim()).filter(Boolean)
const initials = (name: string) => name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
const MEETS: Record<string, string> = { in_person: 'In person', online: 'Online', either: 'Online or in person' }
const PACE: Record<string, string> = { low: 'Quiet sessions', medium: 'Flexible pacing', high: 'Active collaboration' }

/** The one translation point from backend records to card view models. */
export const cardFromApi = (profile: ApiPublicProfile, reasons: string[] = []): SwipeCardView => ({
  id: String(profile.id),
  name: profile.name,
  initials: initials(profile.name),
  bio: profile.bio,
  photo: profile.photo || undefined,
  courses: split(profile.courses),
  interests: split(profile.interests),
  teaches: split(profile.skills_teach),
  learns: split(profile.skills_learn),
  meets: MEETS[profile.mode] ?? 'Online or in person',
  pace: PACE[profile.energy] ?? 'Flexible pacing',
  reasons,
})

export class ApiSwipeSource implements SwipeDataSource {
  readonly kind = 'api' as const
  private request: Request
  constructor(request: Request) { this.request = request }
  async loadDeck(deck: SwipeKind) {
    const cards = await this.request<ApiSwipeCard[]>(`/swipe/${deck}/deck`)
    return cards.map((card) => cardFromApi(card.profile, card.reasons))
  }
  async swipe(deck: SwipeKind, personId: string, direction: SwipeDirection) {
    const result = await this.request<ApiSwipeResult>('/swipe', {
      method: 'POST', body: JSON.stringify({ target_id: Number(personId), kind: deck, direction }),
    })
    return { matched: result.matched, person: result.profile ? cardFromApi(result.profile) : undefined }
  }
  async loadMatches() {
    const matches = await this.request<ApiSwipeMatch[]>('/swipe/matches')
    return matches.map((match) => ({ kind: match.kind, person: cardFromApi(match.profile) }))
  }
  async loadMessages(personId: string, afterId = 0) {
    const rows = await this.request<ApiMessage[]>(`/messages/${Number(personId)}?after_id=${afterId}`)
    return rows.map(messageFromApi)
  }
  async sendMessage(personId: string, body: string) {
    return messageFromApi(await this.request<ApiMessage>(`/messages/${Number(personId)}`, { method: 'POST', body: JSON.stringify({ body }) }))
  }
}

export const messageFromApi = (row: ApiMessage): MessageView => ({ id: row.id, mine: row.mine, body: row.body, sentAt: row.sent_at })

const sample = (id: number, name: string, courses: string, interests: string, teach: string, learn: string, mode: string, energy: string, reasons: Record<SwipeKind, string[]>) =>
  ({ card: cardFromApi({ id, name, bio: 'Sample card · not a real student', courses, interests, skills_teach: teach, skills_learn: learn, mode, energy }), reasons })
const SAMPLES = [
  sample(-1, 'Maya Chen', 'CPSC 213, MATH 200', 'bouldering, board games', 'python, figma', 'guitar', 'in_person', 'medium', { buddy: ['Also in CPSC 213', 'Into board games'], skill: ['Can teach you figma'] }),
  sample(-2, 'Jordan Okafor', 'CPSC 330', 'basketball, hackathons', 'react', 'python', 'either', 'high', { buddy: ['Into hackathons'], skill: ['Skill swap: you both have something to teach', 'Can teach you react'] }),
  sample(-3, 'Priya Natarajan', 'BIOL 112', 'hiking, photography', 'spanish', 'python', 'in_person', 'low', { buddy: ['Into hiking', 'Also likes quiet sessions'], skill: ['Can teach you spanish'] }),
  sample(-4, 'Leo Martins', 'DSCI 100', 'anime, chess', 'sql', 'piano', 'online', 'medium', { buddy: ['Into chess'], skill: ['Can teach you sql'] }),
]

/** In-memory sample deck for demos without the campus service. Nothing is saved or sent. */
export class PreviewSwipeSource implements SwipeDataSource {
  readonly kind = 'preview' as const
  private swiped = new Set<string>()
  async loadDeck(deck: SwipeKind) {
    return SAMPLES.filter((s) => !this.swiped.has(`${deck}:${s.card.id}`)).map((s) => ({ ...s.card, reasons: s.reasons[deck] }))
  }
  async swipe(deck: SwipeKind, personId: string, _direction: SwipeDirection): Promise<SwipeOutcome> {
    void _direction
    this.swiped.add(`${deck}:${personId}`)
    return { matched: false } // sample people can't like you back
  }
  async loadMatches() { return [] }
  loadMessages(): Promise<MessageView[]> { return Promise.reject(new Error('Messaging needs the campus service.')) }
  sendMessage(): Promise<MessageView> { return Promise.reject(new Error('Messaging needs the campus service.')) }
}
