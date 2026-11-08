import type { DashboardRequest, ProfileDetails, ProjectOffer, SkillOffer, WorkspaceSnapshot } from './types'

/** UI-facing I/O boundary. Backend resource schemas never reach cards. */
export interface WorkspaceDataSource {
  readonly kind: 'preview' | 'api'
  readonly description: string
  load(): Promise<WorkspaceSnapshot>
  respondToRequest(id: DashboardRequest['id'], status: 'accepted' | 'declined'): Promise<void>
  updateProfile(profile: ProfileDetails): Promise<ProfileDetails>
  connectWithPerson(personId: string): Promise<void>
  requestSkillExchange(exchangeId: string): Promise<void>
  markAllActivityRead(): Promise<void>
  createSkillOffer(offer: SkillOffer): Promise<void>
  createProjectOffer(offer: ProjectOffer): Promise<void>
  /** Preview-only view initialization; API sources omit these methods. */
  setProfile?(profile: ProfileDetails): void
  setNewStudentMode?(isNewStudent: boolean): WorkspaceSnapshot | Promise<WorkspaceSnapshot>
}
