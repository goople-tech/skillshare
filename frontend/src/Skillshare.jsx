import { useEffect, useState } from 'react'
import { api } from './api'

export default function Skillshare({ user }) {
  const [matches, setMatches] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    api.skillMatches(user.id).then(setMatches).catch((e) => setError(e.message))
  }, [user.id])

  return (
    <section>
      <h3>Skill matches</h3>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {matches.length === 0 && <p>No matches yet. Add skills to your profile!</p>}
      {matches.map((m) => (
        <div key={m.user.id} style={{ border: '1px solid #ccc', padding: 8, marginTop: 8 }}>
          <b>{m.user.name}</b> {m.mutual && '🔁 Skill swap!'}
          <div>Can teach you: {m.they_teach_me.join(', ')}</div>
          {m.mutual && <div>You can teach them: {m.i_teach_them.join(', ')}</div>}
        </div>
      ))}
    </section>
  )
}