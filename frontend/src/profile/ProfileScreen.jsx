import { useState } from 'react'
import './profile.css'
import { STICKERS, stickerSrc } from './stickers.js'

export const PROFILE_FIELDS = ['name', 'bio', 'courses', 'skills_teach', 'skills_learn', 'interests', 'mode', 'energy', 'photo', 'sticker']

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
  sticker: '',
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

export function ProfileScreen({ user, onSave }) {
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

  const saveSticker = async (sticker) => {
    setSaving(true)
    setError('')
    const fields = Object.fromEntries(PROFILE_FIELDS.map((key) => [key, shown[key] ?? '']))
    fields.sticker = sticker
    try {
      await onSave(fields)
    } catch (err) {
      setError(err.message || 'Could not save the sticker')
    } finally {
      setSaving(false)
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
        <p className="profile-kicker">Your profile</p>
        <h1>{editing ? (user ? 'Edit your profile' : 'Create your profile') : shown.name || 'Your profile'}</h1>

        {editing ? (
          <form className="profile-card" onSubmit={submit}>
            <div className="profile-photo-row">
              <Avatar name={draft.name} photo={draft.photo} sticker={draft.sticker} />
              <StickerPalette value={draft.sticker} onChange={(sticker) => setDraft({ ...draft, sticker })} />
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
              <Avatar name={shown.name} photo={shown.photo} sticker={shown.sticker} />
              <StickerPalette value={shown.sticker} disabled={saving} onChange={(sticker) => saveSticker(sticker)} />
              <div>
                <p className="profile-email">{shown.email}</p>
                <p className="profile-xp">{shown.xp ?? 0} XP</p>
              </div>
            </header>
            {error && <p className="profile-error">{error}</p>}
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

function Avatar({ name, photo, sticker }) {
  const src = stickerSrc(sticker)
  return (
    <div className="profile-avatar-wrap">
      {photo ? <img className="profile-avatar" src={photo} alt="" /> : <div className="profile-avatar" aria-hidden="true">{initials(name)}</div>}
      {src && <img className="profile-sticker" src={src} alt="" />}
    </div>
  )
}

function PaletteIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 3.5c6.4 0 12 4.2 12 10.2 0 7.6-5.6 13.8-12.2 13.8-1.8 0-3.1-1.2-3.1-2.8 0-1.3.9-2.2 2.1-2.2h2.2c2.4 0 4-1.6 4-3.6s-1.7-3.5-4.2-3.5h-1.1C11.2 15.4 8 13.2 8 9.6 8 6 11.6 3.5 16 3.5Z" fill="currentColor" />
      <circle cx="11" cy="10" r="1.5" fill="#e07a5f" />
      <circle cx="15.5" cy="7.6" r="1.5" fill="#f2c14e" />
      <circle cx="20.2" cy="10" r="1.5" fill="#7d9a78" />
      <circle cx="21.6" cy="14.4" r="1.5" fill="#8eb4c9" />
    </svg>
  )
}

function StickerPalette({ value, onChange, disabled = false }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="sticker-palette">
      <button className="sticker-palette-button" type="button" aria-label={open ? 'Close stickers' : 'Choose a sticker'} aria-expanded={open} aria-controls="profile-stickers" disabled={disabled} onClick={() => setOpen((current) => !current)}>
        <PaletteIcon />
      </button>
      {open && (
        <div id="profile-stickers" className="sticker-choices" role="listbox" aria-label="Profile stickers">
          {STICKERS.map((sticker) => (
            <button
              key={sticker.id}
              type="button"
              role="option"
              aria-selected={value === sticker.id}
              aria-label={value === sticker.id ? `Remove ${sticker.label}` : `Add ${sticker.label}`}
              onClick={() => onChange(value === sticker.id ? '' : sticker.id)}
            >
              <img src={sticker.src} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
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
