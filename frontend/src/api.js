// All calls to the FastAPI backend live here.
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Set by App once Auth0 is ready; returns a fresh access token.
let getToken = async () => null
export const setTokenGetter = (fn) => { getToken = fn }

async function apiRequest(path, options = {}) {
  const token = await getToken()
  const { keepalive, ...rest } = options
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...rest,
    keepalive: Boolean(keepalive),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail))
  return data
}

export const api = {
  me: () => apiRequest('/me'),
  signup: (user) => apiRequest('/users', { method: 'POST', body: JSON.stringify(user) }),
  updateMe: (changes) => apiRequest('/me', { method: 'PUT', body: JSON.stringify(changes) }),
  getListings: (category) => request('/listings' + (category ? `?category=${category}` : '')),
  createListing: (listing) => request('/listings', { method: 'POST', body: JSON.stringify(listing) }),
  join: (listingId) => request(`/listings/${listingId}/join`, { method: 'POST' }),
  aiDraft: (text) => request('/ai/draft', { method: 'POST', body: JSON.stringify({ text }) }),
  aiMatch: () => apiRequest('/ai/match', { method: 'POST' }),
  skillMatches: () => apiRequest('/skillshare/matches'),
}

export { apiRequest }
