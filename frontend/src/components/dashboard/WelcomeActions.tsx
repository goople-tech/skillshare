import { ArrowRight, FolderKanban, GraduationCap, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSession } from './useSession'

export function WelcomeActions({ onFind, onOffer, onProjects, onTour, reading = false }: { onFind: () => void; onOffer: () => void; onProjects: () => void; onTour?: () => void; reading?: boolean }) {
  const { user } = useSession()
  const [greeting, setGreeting] = useState('Hey')
  useEffect(() => { const hour = new Date().getHours(); setGreeting(hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening') }, [])
  const name = user?.name?.trim().split(/\s+/)[0] ?? 'Student'
  return <section id="dashboard-top" tabIndex={-1} className="dashboard-welcome"><div><h1>{reading ? 'Welcome, ' : `${greeting}, `}{name}.</h1><p>{reading ? 'Let’s find your people.' : 'Ready to study or share a skill?'}</p>{onTour && <button type="button" className="tour-replay" onClick={onTour}>Take the tour</button>}</div><div className="welcome-actions"><button className="button button--primary button--large" onClick={onFind}><Users size={17} /> Find a buddy <ArrowRight size={15} /></button><button className="button button--outline button--large" onClick={onOffer}><GraduationCap size={17} /> Share a skill <ArrowRight size={15} /></button><button className="button button--quiet projects-action" onClick={onProjects}><FolderKanban size={16} />Projects</button></div></section>
}
