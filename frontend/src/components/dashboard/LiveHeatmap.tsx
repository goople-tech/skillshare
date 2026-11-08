import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import L, { type CircleMarker, type Layer } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { HeatLayer } from 'leaflet.heat'
import { setTokenGetter } from '../../api'
import { browserLocation, savePresence, deletePresence, fetchHeatmap, fetchMyPresence, timeToExpire, type MyPresence } from '../../presence'
import { browserMessage } from './presenceMessages'

type CompatibleHeatLayer = InstanceType<typeof HeatLayer> & Layer
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

function areaLabel(spot: HeatSpot) {
  const people = spot.count === 1 ? '1 student' : `${spot.count} students`
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
  return nearest ? `${people} near ${nearest}` : `${people} in this campus area`
}
export function LiveHeatmap() {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const marker = useRef<CircleMarker | null>(null)
  const heat = useRef<CompatibleHeatLayer | null>(null)
  const spots = useRef<L.LayerGroup | null>(null)
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
  // Your Auth0 adapter owns tokens; request failures keep last-confirmed sharing state visible.
  useEffect(() => { setTokenGetter(getAccessTokenSilently) }, [getAccessTokenSilently])

  const showMine = useCallback((profile: MyPresence) => {
    if (!mounted.current || !mapRef.current) return
    if (profile.sharing && typeof profile.lat === 'number' && typeof profile.lng === 'number') {
      if (marker.current) {
        marker.current.setLatLng([profile.lat, profile.lng])
      } else {
        const m = L.circleMarker([profile.lat, profile.lng], { radius: 9, color: '#002145', weight: 2, fillColor: '#f2a900', fillOpacity: 1 }).addTo(mapRef.current)
        m.bindPopup('Your shared location')
        marker.current = m
      }
    } else { marker.current?.remove(); marker.current = null }
  }, [])
  const pull = useCallback(async () => {
    try {
      const [profile, map] = await Promise.all([fetchMyPresence(), fetchHeatmap()])
      if (!mounted.current) return
      setPresence(profile); setCount(map.active_students); setAreas(map.areas)
      heat.current?.setLatLngs(map.areas.map(({ area, count: weight }) => [area.lat, area.lng, weight]))
      spots.current?.clearLayers()
      for (const spot of map.areas) {
        const label = areaLabel(spot)
        const pin = L.circleMarker([spot.area.lat, spot.area.lng], {
          radius: 8,
          color: '#173B5E',
          weight: 1.5,
          fillColor: '#f4e7c8',
          fillOpacity: 0.85,
        })
        pin.bindTooltip(label, { direction: 'top', opacity: 0.95 })
        pin.bindPopup(`${label}. This is a shared area, not an exact spot.`)
        spots.current?.addLayer(pin)
      }
      showMine(profile)
      if (profile.sharing) setMessage('Location active. Refreshed from the server.')
      else setMessage('Campus activity without your name. Choose to share when you’re ready.')
      setRemaining(map.refresh_seconds || 30)
      setTtl(map.ttl_seconds || 180)
      setLatest(Date.now())
    } catch (error) { setMessage(browserMessage(error)) }
  }, [showMine])
  useEffect(() => {
    mounted.current = true
    if (!ref.current) return
    const map = L.map(ref.current).setView(CAMPUS, 15)
    mapRef.current = map
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map)
    heat.current = new HeatLayer([], { radius: 26, blur: 16, max: 8, maxZoom: 17, minOpacity: 0.12, gradient: { 0.25: '#8ecae6', 0.5: '#f6d58a', 0.75: '#e09a62', 1: '#c46b4a' } }) as unknown as CompatibleHeatLayer
    map.addLayer(heat.current)
    spots.current = L.layerGroup().addTo(map)
    map.attributionControl?.setPrefix('')
    requestAnimationFrame(() => map.invalidateSize())
    void pull()
    const timer = setInterval(() => { if (!busy.current) void pull() }, 30000)
    return () => { mounted.current = false; clearInterval(timer); map.remove(); mapRef.current = null }
  }, [pull])
  useEffect(() => {
    const timer = setInterval(() => setRemaining(current => current > 0 ? current - 1 : 30), 1000)
    return () => clearInterval(timer)
  }, []);

  const start = async () => {
    if (busy.current) return
    busy.current = true; setLoading(true); setMessage('Allow location access, then we’ll save your choice.')
    try {
      const point = await browserLocation()
      const saved = await savePresence(point)
      if (!mounted.current) return
      setPresence(saved)
      showMine(saved)
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
      marker.current?.remove()
      setMessage('Location sharing stopped.')
      await pull()
    } catch (error) { if (mounted.current) setMessage(browserMessage(error)) }
    finally { busy.current = false; setLoading(false) }
  }
  const seconds = remaining ? Math.max(0, remaining - Math.floor((Date.now() - latest) / 1000)) : 30
  return <>
    <p>You’re in control. Share a campus spot without your name for about {timeToExpire(ttl)}.</p>
    <div ref={ref} className="live-campus-map" role="img" aria-label="Campus map with anonymous location activity" />
    <div className="live-campus-actions">
      {presence.sharing ? <button type="button" className="button button--outline" disabled={loading} onClick={() => void stop()}>Stop sharing</button> : <button type="button" className="button button--primary" disabled={loading} onClick={() => void start()}>{loading ? 'Allow access…' : 'Share my location'}</button>}
      <span>Updates in {seconds}s</span>{count > 0 && <span>{count} active</span>}
    </div>
    {areas.length > 0 && <ul className="live-campus-areas">{[...areas].sort((a, b) => b.count - a.count).map((spot) => <li key={`${spot.area.lat},${spot.area.lng}`}>{areaLabel(spot)}</li>)}</ul>
    <p className="live-campus-status" role="status">{message}</p>
  </>
}
