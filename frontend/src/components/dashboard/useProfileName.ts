import { useEffect, useState } from 'react'
import { apiRequest } from '../../api'
import { useSession } from './useSession'

/**
 * The name the student saved on their profile.
 * Passwordless login has no display name, so the session name is just the email prefix ("anitali1").
 * Until the profile loads, or if it can't be reached, the fallback is shown instead.
 */
export function useProfileName(fallback: string): string {
  const { isSignedIn } = useSession()
  const [name, setName] = useState('')
  useEffect(() => {
    if (!isSignedIn) return
    let cancelled = false
    apiRequest<{ name?: string }>('/me').then((account) => { if (!cancelled) setName((account?.name ?? '').trim()) }).catch(() => {})
    return () => { cancelled = true }
  }, [isSignedIn])
  return name || fallback
}
