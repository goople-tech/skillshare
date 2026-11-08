import { useEffect, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { api, setTokenGetter } from './api'

const CATEGORIES = ['', 'study', 'skill', 'ride']
const emptyListing = { category: 'study', title: '', description: '', tag: '', location: '', time: '', capacity: 4 }

export default function App() {
  const { isLoading, isAuthenticated, loginWithRedirect, logout, getAccessTokenSilently } = useAuth0()
  const [user, setUser] = useState(null)
  const [needsProfile, setNeedsProfile] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)

  // Give the API layer a way to get a fresh token.
  useEffect(() => { setTokenGetter(() => getAccessTokenSilently()) }, [getAccessTokenSilently])

  // Once logged in, load the profile; a 404 means we still need to create one.
  useEffect(() => {
    if (!isAuthenticated) return
    api.me().then(setUser).catch((e) => {
      if (e.message === 'Profile not found') setNeedsProfile(true)
      else setError(e.message)
    })
  }, [isAuthenticated])

  if (isLoading) return <p style={{ fontFamily: 'sans-serif', padding: 16 }}>Loading…</p>

  if (!isAuthenticated) {
    return (
      <div style={{ maxWidth: 400, margin: '40px auto', fontFamily: 'sans-serif' }}>
        <h2>UBC Hub</h2>
        <p>Log in with your UBC email. We'll email you a one-time code, no password needed.</p>
        <button onClick={() => loginWithRedirect({ authorizationParams: { connection: 'email' } })}>
          Log in with UBC email
        </button>
      </div>
    )
  }

  if (!user) {
    if (error) return <p style={{ color: 'red', padding: 16 }}>{error} <button onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}>Log out</button></p>
    return needsProfile ? <ProfileForm onDone={setUser} /> : <p style={{ padding: 16 }}>Loading profile…</p>
  }

  if (editing) {
    return <ProfileForm initial={user} onDone={(u) => { setUser(u); setEditing(false) }} onCancel={() => setEditing(false)} />
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', fontFamily: 'sans-serif', padding: 16 }}>
      <h1>UBC Hub</h1>
      <p>
        Logged in as {user.name} ({user.email}) · XP: {user.xp}{' '}
        <button onClick={() => setEditing(true)}>Edit profile</button>{' '}
        <button onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}>Log out</button>
      </p>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <ProfileSummary user={user} />
      <Listings user={user} setUser={setUser} setError={setError} />
    </div>
  )
}

const PROFILE_FIELDS = ['name', 'bio', 'courses', 'skills_teach', 'skills_learn', 'interests', 'mode', 'energy']
const MODE_LABELS = { in_person: 'In person', online: 'Online', either: 'Either' }
const ENERGY_LABELS = { low: 'Low-key', medium: 'Medium', high: 'High energy' }

// Used both to create a new profile and (with `initial`) to edit an existing one.
function ProfileForm({ initial, onDone, onCancel }) {
  const isEdit = Boolean(initial)
  const [form, setForm] = useState(() => {
    const blank = { name: '', bio: '', courses: '', skills_teach: '', skills_learn: '', interests: '', mode: 'either', energy: 'medium' }
    return isEdit ? Object.fromEntries(PROFILE_FIELDS.map((k) => [k, initial[k] ?? blank[k]])) : blank
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try { onDone(await (isEdit ? api.updateMe(form) : api.signup(form))) }
    catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  return (
    <form onSubmit={submit} style={{ maxWidth: 400, margin: '40px auto', fontFamily: 'sans-serif', display: 'grid', gap: 8 }}>
      <h2>{isEdit ? 'Edit your profile' : 'Create your profile'}</h2>
      <input placeholder="Name" value={form.name} onChange={set('name')} required />
      <textarea placeholder="Short bio" value={form.bio} onChange={set('bio')} rows={2} />
      <input placeholder="Courses (CPSC 213, BIOL 112)" value={form.courses} onChange={set('courses')} />
      <input placeholder="Interests (hiking, board games, anime)" value={form.interests} onChange={set('interests')} />
      <input placeholder="Skills I can teach" value={form.skills_teach} onChange={set('skills_teach')} />
      <input placeholder="Skills I want to learn" value={form.skills_learn} onChange={set('skills_learn')} />
      <label>
        Meet up{' '}
        <select value={form.mode} onChange={set('mode')}>
          {Object.entries(MODE_LABELS).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
        </select>
      </label>
      <label>
        Energy level{' '}
        <select value={form.energy} onChange={set('energy')}>
          {Object.entries(ENERGY_LABELS).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
        </select>
      </label>
      <button disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save changes' : 'Continue'}</button>
      {isEdit && <button type="button" onClick={onCancel}>Cancel</button>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </form>
  )
}

function ProfileSummary({ user }) {
  const row = (label, value) => value ? <div><b>{label}:</b> {value}</div> : null
  return (
    <section style={{ border: '1px solid #ccc', padding: 8 }}>
      <h3 style={{ marginTop: 0 }}>Your profile</h3>
      {row('Bio', user.bio)}
      {row('Courses', user.courses)}
      {row('Interests', user.interests)}
      {row('Teaches', user.skills_teach)}
      {row('Wants to learn', user.skills_learn)}
      {row('Meets', MODE_LABELS[user.mode])}
      {row('Energy', ENERGY_LABELS[user.energy])}
    </section>
  )
}

function Listings({ user, setUser, setError }) {
  const [category, setCategory] = useState('')
  const [listings, setListings] = useState([])
  const [form, setForm] = useState(emptyListing)
  const [aiText, setAiText] = useState('')
  const [matches, setMatches] = useState([])

  const load = () => api.getListings(category).then(setListings).catch((e) => setError(e.message))
  useEffect(() => { load() }, [category])

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const create = async (e) => {
    e.preventDefault()
    try {
      await api.createListing({ ...form, capacity: Number(form.capacity), })
      setForm(emptyListing); load()
    } catch (err) { setError(err.message) }
  }

  const join = async (id) => {
    try { await api.join(id); setUser({ ...user, xp: user.xp + 10 }); load() }
    catch (err) { setError(err.message) }
  }

  const draft = async () => {
    try { setForm({ ...emptyListing, ...(await api.aiDraft(aiText)) }) } catch (err) { setError(err.message) }
  }

  const match = async () => {
    try { setMatches(await api.aiMatch()) } catch (err) { setError(err.message) }
  }

  return (
    <>
      <section>
        <h3>✨ AI: paste a Reddit post or describe what you want</h3>
        <textarea rows={3} style={{ width: '100%' }} value={aiText} onChange={(e) => setAiText(e.target.value)} />
        <button onClick={draft}>Draft listing with Gemini</button>{' '}
        <button onClick={match}>Find my matches</button>
        {matches.length > 0 && (
          <ul>{matches.map((m) => <li key={m.listing_id}>Listing #{m.listing_id}: {m.reason}</li>)}</ul>
        )}
      </section>

      <section>
        <h3>Create listing</h3>
        <form onSubmit={create} style={{ display: 'grid', gap: 6 }}>
          <select value={form.category} onChange={set('category')}>
            <option value="study">Study buddy</option>
            <option value="skill">Skillshare</option>
            <option value="ride">Rideshare</option>
          </select>
          <input placeholder="Title" value={form.title} onChange={set('title')} required />
          <input placeholder="Course / skill / destination" value={form.tag} onChange={set('tag')} />
          <input placeholder="Location" value={form.location} onChange={set('location')} />
          <input placeholder="Time" value={form.time} onChange={set('time')} />
          <input type="number" min="1" placeholder="Capacity" value={form.capacity} onChange={set('capacity')} />
          <textarea placeholder="Description" value={form.description} onChange={set('description')} />
          <button>Post</button>
        </form>
      </section>

      <section>
        <h3>Listings</h3>
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setCategory(c)} disabled={category === c}>{c || 'all'}</button>
        ))}
        {listings.map((l) => (
          <div key={l.id} style={{ border: '1px solid #ccc', padding: 8, marginTop: 8 }}>
            <b>#{l.id} [{l.category}] {l.title}</b> — {l.tag}
            <div>{l.location} · {l.time} · {l.members.length}/{l.capacity} joined · by {l.owner.name}</div>
            <div>{l.description}</div>
            {!l.members.some((m) => m.id === user.id) && <button onClick={() => join(l.id)}>Join</button>}
          </div>
        ))}
      </section>
    </>
  )
}
