export type DataMode = 'live' | 'sample'
export type RequestStatus = 'pending' | 'accepted' | 'declined'
export type Person = { id: string; name: string; initials: string; program: string; year: string; context: string; courses: string[]; interests: string[]; offers: string[]; learns: string[]; preference: string; invited: boolean }
export type RequestType = 'Buddy request' | 'SkillShare exchange' | 'Project invitation'
export type DashboardRequest = { id: string; type: RequestType; personId: string; personName: string; initials: string; context: string; meeting: string; timestamp: string; status: RequestStatus }
export type Activity = { id: string; kind: 'Buddy' | 'SkillShare' | 'Project' | 'Recommendation'; text: string; time: string; unread: boolean }
export type Session = { id: string; type: string; personName: string; activity: string; time: string; format: 'Online' | 'In person' }
export type SkillMatch = { id: string; personId: string; name: string; initials: string; offer: string; learn: string; invited: boolean }
export type ProfileDetails = { program: string; year: string; courses: string[]; interests: string[]; teach: string[]; learn: string[]; preference: string; imageUrl?: string; verified: boolean }
export type SkillOffer = { teach: string; learn: string }
export type ProjectOffer = { title: string; skillsNeeded: string[] }
export type WorkspaceSnapshot = { mode: DataMode; profile: ProfileDetails; requests: DashboardRequest[]; activities: Activity[]; sessions: Session[]; people: Person[]; matches: SkillMatch[]; skillOffers: SkillOffer[]; projectOffers: ProjectOffer[] }
export type WorkspaceData = {
  /** Source mode is information for preview-specific UI only. */
  kind: 'preview' | 'api'
  status: 'loading' | 'ready' | 'error'
  error: string
  snapshot: WorkspaceSnapshot
  retry: () => Promise<void>
  acceptRequest: (id: string) => Promise<string>
  declineRequest: (id: string) => Promise<string>
  connect: (personId: string) => Promise<string>
  sendExchange: (id: string) => Promise<string>
  markAllRead: () => Promise<string>
  updateProfile: (profile: ProfileDetails) => Promise<string>
  createSkillOffer: (offer: SkillOffer) => Promise<string>
  createProjectOffer: (offer: ProjectOffer) => Promise<string>
  sourceDescription: string
  selectPreviewMode: (isNewStudent: boolean) => Promise<void>
  isBusy: (key: string) => boolean
  editProfileOpen: boolean
  setEditProfileOpen: (open: boolean) => void
}
export const initialPreviewProfile: ProfileDetails = { program: '', year: '', courses: [], interests: [], teach: [], learn: [], preference: '', verified: false }
export const emptySnapshot: WorkspaceSnapshot = { mode: 'sample', profile: initialPreviewProfile, requests: [], activities: [], sessions: [], people: [], matches: [], skillOffers: [], projectOffers: [] }
