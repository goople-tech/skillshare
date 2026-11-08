/** Public URL only, distinct from backend/Auth0 credentials. */
export function readApiUrl(): string | null {
  const configured = import.meta.env.VITE_API_URL?.trim().replace(/\/$/, '')
  if (configured) return configured
  return import.meta.env.DEV && ['localhost', '127.0.0.1'].includes(window.location.hostname) ? 'http://localhost:8000' : null
}
export const API_UNSET_ERROR = 'Location sharing is not configured yet. The team still needs to connect the hosted backend.'
