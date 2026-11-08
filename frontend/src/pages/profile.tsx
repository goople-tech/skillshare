import { useState } from 'react'
import { ProfileScreen } from '../profile/ProfileScreen.jsx'

const sample = {
  name: 'Jordan Lee',
  email: 'jordan.lee@student.ubc.ca',
  bio: 'Second-year cognitive systems. Looking for a quiet study partner, and someone to trade guitar lessons for stats help.',
  courses: 'CPSC 210, STAT 200, COGS 200',
  interests: 'guitar, climbing, board games',
  skills_teach: 'Beginner guitar',
  skills_learn: 'Statistics',
  mode: 'either',
  energy: 'low',
  xp: 40,
}

/** Visual preview of the profile screen. Sample data only; the API is not called. */
export default function ProfilePreview() {
  const [user, setUser] = useState(sample)
  return (
    <ProfileScreen
      user={user}
      preview
      onSave={async (fields) => {
        const next = { ...user, ...fields }
        setUser(next)
        return next
      }}
    />
  )
}
