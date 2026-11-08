import { useEffect, useMemo } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { apiRequest, setTokenGetter } from '../../api'
import { ApiWorkspaceDataSource } from './apiDataSource'
import type { ApiAccount, ApiSkillMatch } from './apiTypes'

/** Transport provider readiness belongs here; pass the result to WorkspaceProvider. */
export function useApiWorkspaceDataSource(): ApiWorkspaceDataSource {
  const { getAccessTokenSilently } = useAuth0()
  const source = useMemo(() => new ApiWorkspaceDataSource({
    me: () => apiRequest<ApiAccount>('/me'),
    skillMatches: () => apiRequest<ApiSkillMatch[]>('/skillshare/matches'),
    updateMe: (changes) => apiRequest<ApiAccount>('/me', { method: 'PUT', body: JSON.stringify(changes) }),
  }), [])
  useEffect(() => { setTokenGetter(async () => (await getAccessTokenSilently()) ?? null) }, [getAccessTokenSilently])
  return source
}
