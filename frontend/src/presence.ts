import { apiRequest } from './api'

export type HeatPoint = { lat: number; lng: number }
export type HeatResponse = { points: HeatPoint[]; refresh_seconds: number; ttl_seconds: number }
export type MyPresence = { sharing: boolean; lat?: number | null; lng?: number | null }

export const fetchHeatmap = () => apiRequest<HeatResponse>('/presence/heatmap')
export const fetchMyPresence = () => apiRequest<MyPresence>('/presence/me')
export const savePresence = (point: HeatPoint) => apiRequest<MyPresence>('/presence', { method: 'POST', body: JSON.stringify(point) })
export const deletePresence = () => apiRequest<MyPresence>('/presence', { method: 'DELETE' })
export function browserLocation(): Promise<HeatPoint> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('This browser cannot read your location.')); return }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      (error) => reject(new Error(error.code === error.PERMISSION_DENIED ? 'Location access was blocked. Allow it and try again.' : 'Could not get your location. Try again.')),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 15000 },
    )
  })
}
export const timeToExpire = (ttl: number) => {
  const value = Math.max(1, Math.round(ttl / 60))
  return value === 1 ? 'a minute' : `${value} minutes`
}
