import { useState } from 'react'
import './profile.css'

export const PROFILE_FIELDS = ['name', 'bio', 'courses', 'skills_teach', 'skills_learn', 'interests', 'mode', 'energy', 'photo']

export const MODE_LABELS = { in_person: 'In person', online: 'Online', either: 'Either' }
export const ENERGY_LABELS = { low: 'Low-key', medium: 'Medium', high: 'High energy' }

const BLANK = {
  name: '',
  bio: '',
  courses: '',
  skills_teach: '',
  skills_learn: '',
  interests: '',
  mode: 'either',
  energy: 'medium',
  photo: '',
}

function chips(value) {
  return String(value || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')
}

export function ProfileScreen({ user, onSave, preview = false }) {
  const [editing, setEditing] = useState(!user)
  const [draft, setDraft] = useState(() => ({ ...BLANK, ...(user || {}) }))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const shown = user || BLANK
  const set = (key) => (event) => setDraft({ ...draft, [key]: event.target.value })

  const onPhoto = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError('')
    try {
      setDraft({ ...draft, photo: await shrinkPhoto(file) })
    } catch (err) {
      setError(err.message || 'Could not read that photo')
    }
  }

  const startEdit = () => {
    setDraft({ ...BLANK, ...shown })
    setError('')
    setEditing(true)
  }

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    const fields = Object.fromEntries(PROFILE_FIELDS.map((key) => [key, draft[key] ?? '']))
    try {
      await onSave(fields)
      setEditing(false)
    } catch (err) {
      setError(err.message || 'Could not save the profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="profile-page">
      <div className="profile-wrap">
        <p className="profile-kicker">{preview ? 'Profile preview' : 'Your profile'}</p>
        <h1>{editing ? (user ? 'Edit your profile' : 'Create your profile') : shown.name || 'Your profile'}</h1>
        {preview && <p className="profile-note">Sample student. Nothing on this page is saved.</p>}

        {editing ? (
          <form className="profile-card" onSubmit={submit}>
            <div className="profile-photo-row">
              <Avatar name={draft.name} photo={draft.photo} />
              <div>
                <label>
                  Profile photo
                  <input type="file" accept="image/*" onChange={onPhoto} />
                </label>
                {draft.photo && <button className="button button--outline" type="button" onClick={() => setDraft({ ...draft, photo: '' })}>Remove photo</button>}
              </div>
            </div>
            <label>
              Name
              <input value={draft.name} onChange={set('name')} required autoComplete="name" />
            </label>
            <label>
              Bio
              <textarea value={draft.bio} onChange={set('bio')} rows={3} placeholder="A sentence or two about you" />
            </label>
            <label>
              Courses
              <input value={draft.courses} onChange={set('courses')} placeholder="CPSC 210, STAT 200" />
            </label>
            <label>
              Interests
              <input value={draft.interests} onChange={set('interests')} placeholder="guitar, climbing, board games" />
            </label>
            <label>
              Skills you can teach
              <input value={draft.skills_teach} onChange={set('skills_teach')} placeholder="Beginner guitar" />
            </label>
            <label>
              Skills you want to learn
              <input value={draft.skills_learn} onChange={set('skills_learn')} placeholder="Statistics" />
            </label>
            <fieldset>
              <legend>Meet up</legend>
              <div className="profile-choices">
                {Object.entries(MODE_LABELS).map(([value, label]) => (
                  <label key={value} className={draft.mode === value ? 'is-selected' : ''}>
                    <input type="radio" name="mode" value={value} checked={draft.mode === value} onChange={set('mode')} />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>Energy level</legend>
              <div className="profile-choices">
                {Object.entries(ENERGY_LABELS).map(([value, label]) => (
                  <label key={value} className={draft.energy === value ? 'is-selected' : ''}>
                    <input type="radio" name="energy" value={value} checked={draft.energy === value} onChange={set('energy')} />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            {error && <p className="profile-error">{error}</p>}
            <div className="profile-actions">
              <button className="button button--primary" type="submit" disabled={saving}>{saving ? 'Saving…' : user ? 'Save profile' : 'Create profile'}</button>
              {user && <button className="button button--outline" type="button" onClick={() => setEditing(false)}>Cancel</button>}
            </div>
          </form>
        ) : (
          <article className="profile-card">
            <header className="profile-head">
              <Avatar name={shown.name} photo={shown.photo} />
              <div>
                <p className="profile-email">{shown.email}</p>
                <p className="profile-xp">{shown.xp ?? 0} XP</p>
              </div>
            </header>
            {shown.bio && <p className="profile-bio">{shown.bio}</p>}
            <dl>
              <div><dt>Meet up</dt><dd>{MODE_LABELS[shown.mode] || shown.mode}</dd></div>
              <div><dt>Energy</dt><dd>{ENERGY_LABELS[shown.energy] || shown.energy}</dd></div>
            </dl>
            <ChipGroup label="Courses" values={chips(shown.courses)} />
            <ChipGroup label="Interests" values={chips(shown.interests)} />
            <ChipGroup label="Can teach" values={chips(shown.skills_teach)} />
            <ChipGroup label="Wants to learn" values={chips(shown.skills_learn)} />
            <div className="profile-actions">
              <button className="button button--primary" type="button" onClick={startEdit}>Edit profile</button>
            </div>
          </article>
        )}
      </div>
    </main>
  )
}

function Avatar({ name, photo }) {
  if (photo) return <img className="profile-avatar" src={photo} alt="" />
  return <div className="profile-avatar" aria-hidden="true">{initials(name)}</div>
}

function shrinkPhoto(file) {
  if (!file.type.startsWith('image/')) return Promise.reject(new Error('Choose an image file'))
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      const size = 320
      const scale = Math.min(1, size / Math.max(image.width, image.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(image.width * scale))
      canvas.height = Math.max(1, Math.round(image.height * scale))
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      const data = canvas.toDataURL('image/jpeg', 0.82)
      if (data.length > 400_000) reject(new Error('That photo is still too large'))
      else resolve(data)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read that photo'))
    }
    image.src = url
  })
}

function ChipGroup({ label, values }) {
  if (!values.length) return null
  return (
    <section className="profile-group">
      <h2>{label}</h2>
      <ul>{values.map((value) => <li key={value}>{value}</li>)}</ul>
    </section>
  )
}
