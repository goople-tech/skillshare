// FastAPI requests share transport, auth-token ownership, and honest failures.
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
      throw new Error(response.status === 502 || response.status === 504 ? 'The campus service is temporarily unavailable. Try again soon.' : 'The campus service returned an invalid response.')
    })
    if (!response.ok) {
      if (response.status === 401 || response.status === 403 || response.status === 404) {
        throw new Error(response.status === 404 ? 'Profile not found' : 'Please sign in and complete your profile before sharing.')
      }
      throw new Error(typeof data.detail === 'string' ? data.detail : `Request failed (${response.status}).`)
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
