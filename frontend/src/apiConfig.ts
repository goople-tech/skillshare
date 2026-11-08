let runtimeApiUrl: string | null | undefined

/** Auth bootstrap supplies the deployed public configuration before its children run. */
export function configureApiUrl(value: string | undefined | null): void {
  runtimeApiUrl = value === null ? null : value?.trim().replace(/\/$/, '') || undefined
}

export function readApiUrl(): string | null {
  if (runtimeApiUrl === null) return null
  if (runtimeApiUrl) return runtimeApiUrl
  const configured = import.meta.env.VITE_API_URL?.trim().replace(/\/$/, '')
  if (configured) return configured
  return ['localhost', '127.0.0.1'].includes(window.location.hostname) ? 'http://localhost:8000' : null
}
export const API_UNSET_ERROR = 'Location sharing is not configured yet. The team still needs to connect the hosted backend.'
