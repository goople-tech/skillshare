import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '../../api'
import { profileFromApi, profileToApi } from './apiDataSource'
import type { ApiAccount } from './apiTypes'
import type { ProfileDetails } from './types'
import { useSession } from './useSession'

/**
 * The signed-in student's real profile from the backend (GET /me, saved with PUT /me).
 * The rest of the dashboard still uses sample data; only the profile card and the greeting use this.
 * `profile` stays null until it loads (or if the student has no backend profile yet), so callers fall back.
 * Passwordless login has no display name, so the session name is just the email prefix; the saved name is better.
 */
export function useRealProfile(fallbackName: string): { name: string; profile: ProfileDetails | null; save: (next: ProfileDetails) => Promise<void> } {
  const { isSignedIn } = useSession()
  const [account, setAccount] = useState<ApiAccount | null>(null)
  useEffect(() => {
    if (!isSignedIn) return
    let cancelled = false
    apiRequest<ApiAccount>('/me').then((value) => { if (!cancelled) setAccount(value) }).catch(() => {})
    return () => { cancelled = true }
  }, [isSignedIn])
  const save = useCallback(async (next: ProfileDetails) => {
    const updated = await apiRequest<ApiAccount>('/me', { method: 'PUT', body: JSON.stringify(profileToApi(next)) })
    setAccount(updated)
  }, [])
  return { name: account?.name?.trim() || fallbackName, profile: account ? profileFromApi(account) : null, save }
}
