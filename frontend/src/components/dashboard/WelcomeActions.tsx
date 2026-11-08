import { ArrowRight, FolderKanban, GraduationCap, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuthProfileReady } from 'deepspace'

export function WelcomeActions({ onFind, onOffer, onProjects, reading = false }: { onFind: () => void; onOffer: () => void; onProjects: () => void; reading?: boolean }) {
  const { user } = useAuthProfileReady({ requireUser: true })
  const [greeting, setGreeting] = useState('Good afternoon')
  useEffect(() => { const hour = new Date().getHours(); setGreeting(`Good ${hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'}`) }, [])
  const name = user?.name?.trim().split(/\s+/)[0] ?? 'Student'
  return <section id="dashboard-top" tabIndex={-1} className="dashboard-welcome"><div><span className="workspace-eyebrow">YOUR CAMPUS COMMUNITY</span><h1>{greeting}, {name}</h1><p>{reading ? 'Let’s fill in your profile and find your people next.' : 'Here’s what’s happening in your campus community.'}</p></div><div className="welcome-actions"><button className="button button--primary button--large" onClick={onFind}><Users size={18} /> Find a buddy <ArrowRight size={16} /></button><button className="button button--outline button--large" onClick={onOffer}><GraduationCap size={18} /> Offer a skill <ArrowRight size={16} /></button><button className="button button--quiet projects-action" onClick={onProjects}><FolderKanban size={16} />Explore projects</button></div></section>
}
