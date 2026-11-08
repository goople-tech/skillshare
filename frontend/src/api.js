// Real Auth0 token-authenticated FastAPI calls live here.
import { readApiUrl, API_UNSET_ERROR } from './apiConfig'

let getToken = async () => null
export const setTokenGetter = (fn) => { getToken = fn }

export async function apiRequest(path, options = {}) {
  const base = readApiUrl()
  if (!base) throw new Error(API_UNSET_ERROR)
  const token = await getToken()
  const { keepalive, ...requestOptions } = options
  try {
    const response = await fetch(base + path, {
      ...requestOptions,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      keepalive: Boolean(keepalive),
    })
    const data = await response.json().catch(() => {
      throw new Error('The campus service returned an invalid response.')
    })
    if (!response.ok) {
      if (response.status === 404) throw new Error('Profile not found')
      throw new Error(typeof data.detail === 'string' ? data.detail : `The campus service could not complete that request (${response.status}).`)
    }
    return data
  } catch (error) {
    if (error instanceof TypeError) throw new Error('Could not reach the campus service. Check your connection and try again.')
    throw error
  }
}

export const api = {
  me: () => apiRequest('/me'),
  signup: (user) => apiRequest('/users', { method: 'POST', body: JSON.stringify(user) }),
  updateMe: (changes) => apiRequest('/me', { method: 'PUT', body: JSON.stringify(changes) }),
  getListings: (category) => apiRequest('/listings' + (category ? `?category=${category}` : '')),
  createListing: (listing) => apiRequest('/listings', { method: 'POST', body: JSON.stringify(listing) }),
  join: (listingId) => apiRequest(`/listings/${listingId}/join`, { method: 'POST' }),
  aiDraft: (text) => apiRequest('/ai/draft', { method: 'POST', body: JSON.stringify({ text }) }),
  aiMatch: () => apiRequest('/ai/match', { method: 'POST' }),
  skillMatches: () => apiRequest('/skillshare/matches'),
}
