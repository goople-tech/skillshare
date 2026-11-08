import type { ApiPublicProfile, Request } from '../swipe/swipeSource'

export const CATEGORIES = [
  { id: 'technical', label: 'Technical & programming' },
  { id: 'academic', label: 'Academic courses' },
  { id: 'creative', label: 'Creative' },
  { id: 'design', label: 'Design' },
  { id: 'music', label: 'Music' },
  { id: 'languages', label: 'Languages' },
  { id: 'other', label: 'Other' },
] as const
export type Category = typeof CATEGORIES[number]['id'] | ''
export const RATINGS = [
  { field: 'learned', label: 'Learned something useful', description: 'The exchange helped me understand or practise something new.' },
  { field: 'taught', label: 'Taught clearly', description: 'Explanations and guidance were clear for me.' },
  { field: 'collaboration', label: 'Collaboration worked well', description: 'We worked together respectfully and constructively.' },
] as const
export const RATING_LABELS = ['Not met', 'Needs work', 'Adequate', 'Good', 'Excellent'] as const

export type Meeting = 'in_person' | 'online' | 'either' | ''
export type Filters = { category: Category; seeking: string; offering: string; meeting: Meeting; minimumRating: string }
export const emptyFilters: Filters = { category: '', seeking: '', offering: '', meeting: '', minimumRating: '' }
export type Rating = { average: number | null; completed_reviews: number }
export type DiscoveryResult = {
  profile: ApiPublicProfile; categories: Exclude<Category, ''>[]
  they_teach_me: string[]; i_teach_them: string[]; mutual: boolean; reasons: string[]; rating: Rating
}
export type DiscoveryPage = { results: DiscoveryResult[]; count: number; limit: number }
export type ReviewStatus = 'waiting_for_peer' | 'awaiting_completion' | 'eligible' | 'submitted'
export type Exchange = {
  id: number; partner: ApiPublicProfile; scheduled_for: string
  review: { status: ReviewStatus; can_rate: boolean; can_confirm_completion: boolean; acknowledged_by_me: boolean; acknowledged_by_peer: boolean; values?: ReviewInput | null }
}
export type ReviewInput = { learned: number; taught: number; collaboration: number }
export type ScheduleInput = { partner_id: number; scheduled_for: string }
export const REVIEW_LABELS: Record<ReviewStatus, string> = {
  waiting_for_peer: 'Confirmed by you · waiting for your partner',
  awaiting_completion: 'Both participants confirm completion before rating',
  eligible: 'Rate this exchange',
  submitted: 'Rating submitted · edit rating',
}

export const discoveryQuery = (filters: Filters): string => {
  const params = new URLSearchParams()
  if (filters.category) params.set('category', filters.category)
  if (filters.seeking) params.set('seeking', filters.seeking)
  if (filters.offering) params.set('offering', filters.offering)
  if (filters.meeting) params.set('meeting', filters.meeting)
  if (filters.minimumRating) params.set('minimum_rating', filters.minimumRating)
  params.set('limit', '24')
  return params.toString()
}

/** All SkillShare I/O stays here. Presentation components receive typed view data. */
export interface DiscoveryDataSource {
  search(filters: Filters): Promise<DiscoveryPage>
  catalog(): Promise<{ skills: string[] }>
  confirmedMatches(): Promise<Array<{ profile: DiscoveryResult['profile'] }>>
  exchanges(): Promise<Exchange[]>
  schedule(input: ScheduleInput): Promise<Exchange>
  acknowledgeCompletion(id: number): Promise<Exchange>
  submitReview(id: number, input: ReviewInput): Promise<void>
}
export class ApiDiscoverySource implements DiscoveryDataSource {
  constructor(private readonly request: Request) {}
  search(filters: Filters) { return this.request<DiscoveryPage>(`/skillshare/discover?${discoveryQuery(filters)}`) }
  catalog() { return this.request<{ skills: string[] }>('/skillshare/catalog') }
  confirmedMatches() { return this.request<Array<{ kind: 'skill'; profile: DiscoveryResult['profile'] }>>('/swipe/matches?kind=skill') }
  exchanges() { return this.request<Exchange[]>('/skillshare/exchanges') }
  schedule(input: ScheduleInput) { return this.request<Exchange>('/skillshare/exchanges', { method: 'POST', body: JSON.stringify(input) }) }
  acknowledgeCompletion(id: number) { return this.request<Exchange>(`/skillshare/exchanges/${id}/completion`, { method: 'PUT' }) }
  async submitReview(id: number, input: ReviewInput) {
    await this.request(`/skillshare/exchanges/${id}/review`, { method: 'PUT', body: JSON.stringify(input) })
  }
}
