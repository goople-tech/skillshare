export type SessionUser = { name: string; email: string; imageUrl?: string }
export type WorkspaceSession = { isLoaded: boolean; isSignedIn: boolean; user: SessionUser | null; userLoading?: boolean; signIn: () => void | Promise<void>; signOut: () => void | Promise<void> }
