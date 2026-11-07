// All calls to the FastAPI backend live here.
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail))
  return data
}

export const api = {
  signup: (user) => request('/users', { method: 'POST', body: JSON.stringify(user) }),
  getListings: (category) => request('/listings' + (category ? `?category=${category}` : '')),
  createListing: (listing) => request('/listings', { method: 'POST', body: JSON.stringify(listing) }),
  join: (listingId, userId) => request(`/listings/${listingId}/join?user_id=${userId}`, { method: 'POST' }),
  aiDraft: (text) => request('/ai/draft', { method: 'POST', body: JSON.stringify({ text }) }),
  aiMatch: (userId) => request('/ai/match', { method: 'POST', body: JSON.stringify({ user_id: userId }) }),
  skillMatches: (userId) => request(`/skillshare/matches/${userId}`),
}
