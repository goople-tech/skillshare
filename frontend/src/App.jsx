import { useEffect, useState } from 'react'
import { api } from './api'
import Skillshare from './Skillshare'

const CATEGORIES = ['', 'study', 'skill', 'ride']
const emptyListing = { category: 'study', title: '', description: '', tag: '', location: '', time: '', capacity: 4 }

export default function App() {
  const [user, setUser] = useState(null)
  const [error, setError] = useState('')

  if (!user) return <Signup onDone={setUser} />

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', fontFamily: 'sans-serif', padding: 16 }}>
      <h1>UBC Hub</h1>
      <p>Logged in as {user.name} ({user.email}) · XP: {user.xp}</p>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <Listings user={user} setUser={setUser} setError={setError} />
      <Skillshare user={user} />
    </div>
  )
}

function Signup({ onDone }) {
  const [form, setForm] = useState({ email: '', name: '', courses: '', skills_teach: '', skills_learn: '' })
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    try { onDone(await api.signup(form)) } catch (err) { setError(err.message) }
  }

  return (
    <form onSubmit={submit} style={{ maxWidth: 400, margin: '40px auto', fontFamily: 'sans-serif', display: 'grid', gap: 8 }}>
      <h2>Sign up / Log in</h2>
      <input placeholder="you@student.ubc.ca" value={form.email} onChange={set('email')} required />
      <input placeholder="Name" value={form.name} onChange={set('name')} required />
      <input placeholder="Courses (CPSC 213, BIOL 112)" value={form.courses} onChange={set('courses')} />
      <input placeholder="Skills I can teach" value={form.skills_teach} onChange={set('skills_teach')} />
      <input placeholder="Skills I want to learn" value={form.skills_learn} onChange={set('skills_learn')} />
      <button>Continue</button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </form>
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
      await api.createListing({ ...form, capacity: Number(form.capacity), owner_id: user.id })
      setForm(emptyListing); load()
    } catch (err) { setError(err.message) }
  }

  const join = async (id) => {
    try { await api.join(id, user.id); setUser({ ...user, xp: user.xp + 10 }); load() }
    catch (err) { setError(err.message) }
  }

  const draft = async () => {
    try { setForm({ ...emptyListing, ...(await api.aiDraft(aiText)) }) } catch (err) { setError(err.message) }
  }

  const match = async () => {
    try { setMatches(await api.aiMatch(user.id)) } catch (err) { setError(err.message) }
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
