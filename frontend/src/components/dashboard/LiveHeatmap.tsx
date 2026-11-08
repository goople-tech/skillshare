import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import L, { type CircleMarker, type Layer } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { HeatLayer } from 'leaflet.heat'
import { setTokenGetter } from '../../api'
import { browserLocation, savePresence, deletePresence, fetchHeatmap, fetchMyPresence, timeToExpire, type MyPresence } from '../../presence'
import { browserMessage } from './presenceMessages'

type CompatibleHeatLayer = InstanceType<typeof HeatLayer> & Layer
const CAMPUS: [number, number] = [49.2628, -123.2505]
export function LiveHeatmap() {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const marker = useRef<CircleMarker | null>(null)
  const heat = useRef<CompatibleHeatLayer | null>(null)
  const mounted = useRef(true)
  const busy = useRef(false)
  const [presence, setPresence] = useState<MyPresence>({ sharing: false })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [remaining, setRemaining] = useState(30)
  const [ttl, setTtl] = useState(180)
  const [count, setCount] = useState(0)
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
      setPresence(profile); setCount(map.active_students)
      // leaflet.heat treats every point at or above `max` (default 1) as the hottest colour, so raw counts turn the whole
      // map into one red blob. Scale to 0..1 against the busiest cell (never below 3, so 3 people in one cell already read as red),
      // with a square root so quiet spots are still visible next to a hotspot.
      const busiest = Math.max(3, ...map.areas.map(({ count }) => count))
      heat.current?.setLatLngs(map.areas.map(({ area, count }) => [area.lat, area.lng, Math.sqrt(count / busiest)]))
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
    heat.current = new HeatLayer([], { radius: 30, blur: 22, maxZoom: 1, minOpacity: 0.3, gradient: { 0.2: '#3b6fd6', 0.35: '#17b4c8', 0.5: '#6fcf6a', 0.65: '#ffe14d', 0.8: '#ff9a1f', 0.95: '#e0301e' } }) as unknown as CompatibleHeatLayer
    // Size each blob in metres, not pixels, so it covers about the same ground (~70 m, close to one server cell) at every zoom.
    // maxZoom: 1 switches off the library's own zoom dimming, which would otherwise fade points as you zoom out.
    const fitToZoom = () => {
      const metresPerPixel = 156543.03392 * Math.cos((map.getCenter().lat * Math.PI) / 180) / 2 ** map.getZoom()
      const radius = Math.min(140, Math.max(12, 70 / metresPerPixel))
      ;(heat.current as unknown as { setOptions: (o: { radius: number; blur: number }) => void }).setOptions({ radius, blur: radius * 0.7 })
    }
    map.addLayer(heat.current)
    fitToZoom()
    map.on('zoomend', fitToZoom)
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
    <p className="live-campus-status" role="status">{message || status}</p>
  </>
}
