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
      heat.current?.setLatLngs(map.areas.map(({ area, count }) => [area.lat, area.lng, count]))
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
    heat.current = new HeatLayer([], { radius: 42, blur: 30, maxZoom: 15, minOpacity: 0.45, gradient: { 0.3: '#7eb6ff', 0.55: '#f2a900', 0.8: '#e85d04', 1: '#9b2226' } }) as unknown as CompatibleHeatLayer
    map.addLayer(heat.current)
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
