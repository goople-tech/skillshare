import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import L, { type CircleMarker } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { setTokenGetter } from '../../api'
import { browserLocation, savePresence, deletePresence, fetchHeatmap, fetchMyPresence, timeToExpire, type MyPresence } from '../../presence'
import { browserMessage } from './presenceMessages'

type HeatSpot = { area: { lat: number; lng: number }; count: number }
const CAMPUS: [number, number] = [49.2628, -123.2505]
const PLACES: Array<[string, number, number]> = [
  ['the Nest', 49.2665, -123.2499],
  ['Irving K. Barber Library', 49.2678, -123.2523],
  ['Koerner Library', 49.2665, -123.2552],
  ['Buchanan', 49.2692, -123.2546],
  ['Sauder', 49.2649, -123.2536],
  ['the Bus Loop', 49.2662, -123.248],
  ['Main Mall', 49.2648, -123.253],
  ['the Rose Garden', 49.2697, -123.2566],
  ['Life Sciences Centre', 49.2624, -123.2465],
  ['Orchard Commons', 49.2604, -123.2502],
  ['Place Vanier', 49.2644, -123.2586],
  ['the Aquatic Centre', 49.2684, -123.2486],
]

function nearestPlace(spot: HeatSpot) {
  let nearest: string | null = null
  let nearestMeters = 280
  for (const [name, lat, lng] of PLACES) {
    const north = (spot.area.lat - lat) * 111_320
    const east = (spot.area.lng - lng) * 111_320 * Math.cos((spot.area.lat * Math.PI) / 180)
    const meters = Math.hypot(north, east)
    if (meters < nearestMeters) {
      nearest = name
      nearestMeters = meters
    }
  }
  return nearest
}

function areaLabel(spot: HeatSpot) {
  const people = spot.count === 1 ? '1 student' : `${spot.count} students`
  const nearest = nearestPlace(spot)
  return nearest ? `${people} near ${nearest}` : `${people} in this campus area`
}

/** The signed-in campus map: a light area wash, with a place and a count on each spot. */
export function CampusActivityMap({ areas, mine }: { areas: HeatSpot[]; mine?: { lat: number; lng: number } | null }) {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const spots = useRef<L.LayerGroup | null>(null)
  const marker = useRef<CircleMarker | null>(null)

  useEffect(() => {
    if (!ref.current || mapRef.current) return
    const map = L.map(ref.current).setView(CAMPUS, 15)
    mapRef.current = map
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map)
    spots.current = L.layerGroup().addTo(map)
    map.attributionControl?.setPrefix('')
    requestAnimationFrame(() => map.invalidateSize())
    return () => { map.remove(); mapRef.current = null; spots.current = null; marker.current = null }
  }, [])

  useEffect(() => {
    const group = spots.current
    const map = mapRef.current
    if (!group || !map) return
    group.clearLayers()
    for (const spot of areas) {
      const label = areaLabel(spot)
      const place = nearestPlace(spot)
      const circle = L.circle([spot.area.lat, spot.area.lng], {
        radius: Math.min(150, 80 + spot.count * 6),
        color: '#173B5E',
        weight: 1.5,
        opacity: 0.45,
        fillColor: spot.count >= 8 ? '#e09a62' : '#8ecae6',
        fillOpacity: Math.min(0.28, 0.12 + spot.count * 0.02),
      })
      circle.bindTooltip(place ? `${spot.count} · ${place}` : `${spot.count} students`, {
        permanent: true,
        direction: 'center',
        className: 'heat-area-label',
        opacity: 1,
      })
      circle.bindPopup(`${label}. This is a shared area, not an exact spot.`)
      group.addLayer(circle)
    }
    if (areas.length) map.fitBounds(L.latLngBounds(areas.map((spot) => [spot.area.lat, spot.area.lng])).pad(0.45))
  }, [areas])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (mine) {
      if (marker.current) marker.current.setLatLng([mine.lat, mine.lng])
      else {
        marker.current = L.circleMarker([mine.lat, mine.lng], { radius: 8, color: '#002145', weight: 2, fillColor: '#f2a900', fillOpacity: 0.9 }).addTo(map)
        marker.current.bindPopup('Your shared location')
      }
    } else {
      marker.current?.remove()
      marker.current = null
    }
  }, [mine])

  return <div ref={ref} className="live-campus-map" role="img" aria-label="Campus map with anonymous area activity" />
}

export function LiveHeatmap() {
  const mounted = useRef(true)
  const busy = useRef(false)
  const [presence, setPresence] = useState<MyPresence>({ sharing: false })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [remaining, setRemaining] = useState(30)
  const [ttl, setTtl] = useState(180)
  const [count, setCount] = useState(0)
  const [areas, setAreas] = useState<HeatSpot[]>([])
  const [latest, setLatest] = useState(Date.now())
  const { getAccessTokenSilently } = useAuth0()
  useEffect(() => { setTokenGetter(getAccessTokenSilently) }, [getAccessTokenSilently])

  const pull = useCallback(async () => {
    try {
      const [profile, map] = await Promise.all([fetchMyPresence(), fetchHeatmap()])
      if (!mounted.current) return
      setPresence(profile)
      setCount(map.active_students)
      setAreas(map.areas)
      if (profile.sharing) setMessage('Location active. Refreshed from the server.')
      else setMessage('Campus activity without your name. Choose to share when you’re ready.')
      setRemaining(map.refresh_seconds || 30)
      setTtl(map.ttl_seconds || 180)
      setLatest(Date.now())
    } catch (error) { setMessage(browserMessage(error)) }
  }, [])

  useEffect(() => {
    mounted.current = true
    void pull()
    const timer = setInterval(() => { if (!busy.current) void pull() }, 30000)
    return () => { mounted.current = false; clearInterval(timer) }
  }, [pull])
  useEffect(() => {
    const timer = setInterval(() => setRemaining((current) => current > 0 ? current - 1 : 30), 1000)
    return () => clearInterval(timer)
  }, [])

  const start = async () => {
    if (busy.current) return
    busy.current = true; setLoading(true); setMessage('Allow location access, then we’ll save your choice.')
    try {
      const point = await browserLocation()
      const saved = await savePresence(point)
      if (!mounted.current) return
      setPresence(saved)
      setMessage('Location active. It stays on through refresh.')
      await pull()
    } catch (error) { if (mounted.current) setMessage(browserMessage(error)) }
    finally { busy.current = false; setLoading(false) }
  }
  const stop = async () => {
    if (busy.current) return
    busy.current = true; setLoading(true); setMessage('Stopping sharing…')
    try {
      const result = await deletePresence()
      if (!mounted.current) return
      setPresence(result)
      setMessage('Location sharing stopped.')
      await pull()
    } catch (error) { if (mounted.current) setMessage(browserMessage(error)) }
    finally { busy.current = false; setLoading(false) }
  }
  const seconds = remaining ? Math.max(0, remaining - Math.floor((Date.now() - latest) / 1000)) : 30
  const mine = presence.sharing && typeof presence.lat === 'number' && typeof presence.lng === 'number' ? { lat: presence.lat, lng: presence.lng } : null
  return <>
    <p>You’re in control. Share a campus spot without your name for about {timeToExpire(ttl)}.</p>
    <CampusActivityMap areas={areas} mine={mine} />
    <div className="live-campus-actions">
      {presence.sharing ? <button type="button" className="button button--outline" disabled={loading} onClick={() => void stop()}>Stop sharing</button> : <button type="button" className="button button--primary" disabled={loading} onClick={() => void start()}>{loading ? 'Allow access…' : 'Share my location'}</button>}
      <span>Updates in {seconds}s</span>{count > 0 && <span>{count} active</span>}
    </div>
    {areas.length > 0 && <ul className="live-campus-areas">{[...areas].sort((a, b) => b.count - a.count).map((spot) => <li key={`${spot.area.lat},${spot.area.lng}`}>{areaLabel(spot)}</li>)}</ul>}
    <p className="live-campus-status" role="status">{message}</p>
  </>
}
