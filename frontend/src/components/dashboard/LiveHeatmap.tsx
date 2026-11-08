import { useEffect, useRef, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { HeatLayer } from 'leaflet.heat'
import { apiRequest, setTokenGetter } from '../../api'

declare module 'leaflet' {
  const leaflet: {
    map: (el: HTMLElement) => LeafletMap
    tileLayer: (url: string, options: object) => { addTo: (map: LeafletMap) => void }
    circleMarker: (latlng: [number, number], options: object) => LeafletMarker
  }
  export default leaflet
}

interface LeafletMap {
  setView: (center: [number, number], zoom: number) => LeafletMap
  remove: () => void
  flyTo: (center: [number, number], zoom: number) => void
  invalidateSize: () => void
  attributionControl?: { setPrefix: (prefix: string) => void }
}

interface LeafletMarker {
  addTo: (map: LeafletMap) => LeafletMarker
  bindPopup: (text: string) => void
  setLatLng: (latlng: [number, number]) => void
  remove: () => void
}

declare module 'leaflet.heat' {
  export class HeatLayer {
    constructor(latlngs: unknown[], options?: object)
    setLatLngs(latlngs: unknown[]): unknown
    addTo(map: LeafletMap): this
  }
}

const CAMPUS: [number, number] = [49.2628, -123.2505]

type HeatResponse = { points: { lat: number; lng: number }[]; refresh_seconds: number; ttl_seconds: number }
type MineResponse = { sharing: boolean; lat?: number | null; lng?: number | null }

function minutes(seconds: number) {
  const value = Math.max(1, Math.round(seconds / 60))
  return value === 1 ? '1 minute' : `${value} minutes`
}

export function LiveHeatmap() {
  const { getAccessTokenSilently } = useAuth0()
  const mapEl = useRef<HTMLDivElement>(null)
  const shareRef = useRef(false)
  const refreshRef = useRef(30)
  const actions = useRef<{ pull?: () => Promise<void>; push?: () => Promise<void>; removeMarker?: () => void }>({})
  const [sharing, setSharing] = useState(false)
  const [seconds, setSeconds] = useState(30)
  const [status, setStatus] = useState('Loading the live map…')

  useEffect(() => { setTokenGetter(() => getAccessTokenSilently()) }, [getAccessTokenSilently])

  useEffect(() => {
    if (!mapEl.current) return
    const map = L.map(mapEl.current).setView(CAMPUS, 15)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map)
    const heat = new HeatLayer([], {
      radius: 42,
      blur: 30,
      maxZoom: 15,
      minOpacity: 0.45,
      gradient: { 0.3: '#7eb6ff', 0.55: '#f2a900', 0.8: '#e85d04', 1: '#9b2226' },
    }).addTo(map)
    map.attributionControl?.setPrefix('')

    let marker: LeafletMarker | null = null
    let alive = true
    let left = 30

    const placeMarker = (lat: number, lng: number) => {
      const first = !marker
      if (!marker) {
        marker = L.circleMarker([lat, lng], {
          radius: 9,
          color: '#002145',
          weight: 2,
          fillColor: '#f2a900',
          fillOpacity: 1,
        }).addTo(map)
        marker.bindPopup('You are live')
      } else {
        marker.setLatLng([lat, lng])
      }
      if (first) map.flyTo([lat, lng], 16)
    }

    const removeMarker = () => {
      marker?.remove()
      marker = null
    }

    const describe = (count: number, ttlSeconds: number, live: boolean) => {
      const fade = minutes(ttlSeconds)
      if (live) return `You are live. Your location updates every ${refreshRef.current} seconds and drops off after about ${fade}.`
      if (count === 0) return `No one is live right now. A shared location stays on the map for about ${fade}.`
      return count === 1
        ? `1 person is live. Spots drop off after about ${fade}.`
        : `${count} people are live. Spots drop off after about ${fade}.`
    }

    const pull = async () => {
      const data = await apiRequest<HeatResponse>('/presence/heatmap')
      if (!alive) return
      refreshRef.current = data.refresh_seconds || 30
      heat.setLatLngs(data.points.map((point) => [point.lat, point.lng, 1]))
      setStatus(describe(data.points.length, data.ttl_seconds, shareRef.current))
    }

    const push = () => new Promise<void>((resolve) => {
      if (!navigator.geolocation) {
        shareRef.current = false
        setSharing(false)
        setStatus('This browser cannot read your location. You can still see people who are sharing.')
        resolve()
        return
      }
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          await apiRequest('/presence', { method: 'POST', body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }) })
          if (alive) placeMarker(pos.coords.latitude, pos.coords.longitude)
        } catch (err) {
          if (alive) setStatus(err instanceof Error ? err.message : 'Could not update your location.')
        }
        resolve()
      }, () => {
        shareRef.current = false
        setSharing(false)
        removeMarker()
        apiRequest('/presence', { method: 'DELETE', keepalive: true }).catch(() => {})
        if (alive) setStatus('Location was blocked. You can still see people who are sharing.')
        resolve()
      }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 })
    })

    actions.current = { pull, push, removeMarker }

    const tick = async () => {
      try {
        await pull()
        if (shareRef.current) await push()
        if (shareRef.current && alive) await pull()
      } catch (err) {
        if (alive) setStatus(err instanceof Error ? err.message : 'The map could not refresh.')
      }
      left = refreshRef.current
      if (alive) setSeconds(left)
    }

    const boot = async () => {
      try {
        const mine = await apiRequest<MineResponse>('/presence/me')
        if (!alive) return
        if (mine.sharing) {
          shareRef.current = true
          setSharing(true)
          if (typeof mine.lat === 'number' && typeof mine.lng === 'number') placeMarker(mine.lat, mine.lng)
        }
      } catch (err) {
        if (alive) setStatus(err instanceof Error ? err.message : 'The map could not load.')
      }
      await tick()
    }

    void boot()
    const id = window.setInterval(() => {
      left -= 1
      if (left <= 0) void tick()
      else if (alive) setSeconds(left)
    }, 1000)
    const onHide = () => { if (shareRef.current) void apiRequest('/presence', { method: 'DELETE', keepalive: true }).catch(() => {}) }
    window.addEventListener('pagehide', onHide)
    requestAnimationFrame(() => map.invalidateSize())

    return () => {
      alive = false
      window.clearInterval(id)
      window.removeEventListener('pagehide', onHide)
      if (shareRef.current) void apiRequest('/presence', { method: 'DELETE', keepalive: true }).catch(() => {})
      map.remove()
    }
  }, [])

  const start = async () => {
    shareRef.current = true
    setSharing(true)
    setStatus('Asking for your location…')
    await actions.current.push?.()
    try { await actions.current.pull?.() } catch (err) { setStatus(err instanceof Error ? err.message : 'The map could not refresh.') }
    setSeconds(refreshRef.current)
  }

  const stop = async () => {
    shareRef.current = false
    setSharing(false)
    actions.current.removeMarker?.()
    try {
      await apiRequest('/presence', { method: 'DELETE' })
      await actions.current.pull?.()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not stop sharing.')
    }
  }

  return (
    <>
      <p>People who choose to share show up as heat, without names. The map refreshes on a timer, then the spot disappears.</p>
      <div ref={mapEl} className="live-campus-map" />
      <div className="live-campus-actions">
        {sharing ? (
          <button type="button" className="button button--outline" onClick={() => void stop()}>Stop sharing</button>
        ) : (
          <button type="button" className="button button--primary" onClick={() => void start()}>Share my location</button>
        )}
        <span>Updates in {seconds}s</span>
      </div>
      <p className="live-campus-status" role="status">{status}</p>
    </>
  )
}
