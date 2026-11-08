import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { AuthShell } from '../../components/AuthShell'
import { api, setTokenGetter } from '../../api'
// @ts-expect-error profile screen is a JS module shared with the account flow
import { ProfileScreen } from '../../profile/ProfileScreen.jsx'

type Profile = {
  name: string
  email?: string
  bio?: string
  courses?: string
  skills_teach?: string
  skills_learn?: string
  interests?: string
  mode?: string
  energy?: string
  photo?: string
  xp?: number
}

/** Signed-in profile. Loads and saves the real account; there is no sample student. */
function ProfileGate() {
  const { isAuthenticated, getAccessTokenSilently, logout } = useAuth0()
  const [user, setUser] = useState<Profile | null>(null)
  const [needsProfile, setNeedsProfile] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { setTokenGetter(() => getAccessTokenSilently()) }, [getAccessTokenSilently])

  useEffect(() => {
    if (!isAuthenticated) return
    let cancelled = false
    api.me<Profile>().then((loaded: Profile) => {
      if (!cancelled) setUser(loaded)
    }).catch((err: Error) => {
      if (cancelled) return
      if (err.message === 'Profile not found') setNeedsProfile(true)
      else setError(err.message)
    })
    return () => { cancelled = true }
  }, [isAuthenticated])

  const signOut = () => logout({ logoutParams: { returnTo: window.location.origin } })

  if (error) {
    return <p className="profile-error" style={{ padding: 16 }}>{error} <button className="button button--outline" onClick={signOut}>Log out</button></p>
  }
  if (!user && !needsProfile) return <p style={{ padding: 16 }}>Loading profile…</p>

  const save = async (fields: Profile) => {
    const saved = needsProfile ? await api.signup<Profile>(fields) : await api.updateMe<Profile>(fields)
    setUser(saved)
    setNeedsProfile(false)
    return saved
  }

  return (
    <>
      <div className="profile-toolbar container">
        <Link to="/home" className="button button--text">← Dashboard</Link>
        <button className="button button--outline" type="button" onClick={signOut}>Log out</button>
      </div>
      <ProfileScreen user={needsProfile ? null : user} onSave={save} />
    </>
  )
}

export default function ProfilePage() {
  return (
    <AuthShell title="Your profile · Flockwork">
      <ProfileGate />
    </AuthShell>
  )
}
