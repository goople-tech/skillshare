import { Check, ChevronRight, Laptop, MapPin, Pencil } from 'lucide-react'
import { forwardRef, useImperativeHandle, useState, type FormEvent } from 'react'
import type { ProfileDetails } from './types'

export type ProfileEditorHandle = { open: () => void }
type Props = { id?: string; name: string; initials: string; profile: ProfileDetails; onSave: (updated: ProfileDetails) => void }
export const ProfileSummary = forwardRef<ProfileEditorHandle, Props>(function ProfileSummary({ id = '', name, initials, profile, onSave }, ref) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(profile)
  const [saving, setSaving] = useState(false)
  useImperativeHandle(ref, () => ({ open: () => { setDraft(profile); setOpen(true) } }), [profile])
  const save = (event: FormEvent) => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    onSave(draft)
    setSaving(false)
    setOpen(false)
  }
  return <section id={id || undefined} className="dashboard-card profile-summary" aria-labelledby={`profile-title${id ? `-${id}` : ''}`}>
    <div className="profile-summary-top"><span className="profile-avatar" aria-hidden="true">{initials}</span><div><h2 id={`profile-title${id ? `-${id}` : ''}`}>{name}</h2><p>{[profile.program, profile.year].filter(Boolean).join(' · ') || 'Complete your student profile'}</p>{profile.verified && <span className="verified-label"><Check size={12} /> Verified student</span>}</div></div>
    <ProfileTags label="Courses" items={profile.courses} />
    <ProfileTags label="Interests" items={profile.interests} sand />
    <ProfileTags label="Teachable" items={profile.teach} />
    <ProfileTags label="Want to learn" items={profile.learn} />
    <p className="profile-preference">{profile.preference.includes('Online') ? <Laptop size={13} /> : <MapPin size={13} />}{profile.preference || 'Choose how you prefer to meet: online, in person, or either.'}</p>
    <div className="profile-editor"><button className="button button--text" onClick={() => { setDraft(profile); setOpen((previous) => !previous) }} aria-expanded={open} aria-controls={`profile-editor-fields${id ? `-${id}` : ''}`}><Pencil size={14} /> {open ? 'Close editor' : 'Edit profile'}<ChevronRight size={13} /></button>
      {open && <form id={`profile-editor-fields${id ? `-${id}` : ''}`} onSubmit={save}>
        <label htmlFor={`profile-program${id}`}>Program and year</label><input id={`profile-program${id}`} value={draft.year ? `${draft.program}, ${draft.year}` : draft.program} onChange={(event) => { const [program, ...year] = event.target.value.split(','); setDraft((current) => ({ ...current, program: program.trim(), year: year.join(',').trim() })) }} placeholder="Computer Science, Second year" />
        <ProfileField id={id} name="courses" label="Courses" value={draft.courses} onChange={(value) => setDraft((current) => ({ ...current, courses: value }))} />
        <ProfileField id={id} name="interests" label="Interests" value={draft.interests} onChange={(value) => setDraft((current) => ({ ...current, interests: value }))} />
        <ProfileField id={id} name="teach" label="I can teach" value={draft.teach} onChange={(value) => setDraft((current) => ({ ...current, teach: value }))} />
        <ProfileField id={id} name="learn" label="I want to learn" value={draft.learn} onChange={(value) => setDraft((current) => ({ ...current, learn: value }))} />
        <label htmlFor={`profile-preference${id}`}>Connection preference</label><input id={`profile-preference${id}`} value={draft.preference} onChange={(event) => setDraft((current) => ({ ...current, preference: event.target.value }))} placeholder="Quiet sessions · Online or in person" />
        <p className="profile-private">No email, exact location, or schedule is shown here.</p><button className="button button--primary" disabled={saving} type="submit">{saving ? 'Saving…' : 'Save preview profile'}</button><small>Local preview only; no server update is performed.</small>
      </form>}
    </div>
  </section>
})
function ProfileTags({ label, items, sand = false }: { label: string; items: string[]; sand?: boolean }) {
  return <div className="profile-tags"><span>{label}</span><div>{items.length ? items.map((item) => <span key={item} className={`workspace-tag ${sand ? 'workspace-tag--sand' : ''}`}>{item}</span>) : <span className="profile-add">Not added yet</span>}</div></div>
}
function ProfileField({ id, name, label, value, onChange }: { id: string; name: string; label: string; value: string[]; onChange: (value: string[]) => void }) {
  return <><label htmlFor={`profile-${name}${id}`}>{label}</label><input id={`profile-${name}${id}`} value={value.join(', ')} onChange={(event) => onChange(event.target.value.split(',').map((value) => value.trim()).filter(Boolean))} placeholder="Separate items with commas" /></>
}
