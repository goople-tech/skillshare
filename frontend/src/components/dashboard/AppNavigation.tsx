import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSession } from './useSession'
import { Bell, Check, CheckCheck, ChevronDown, FolderKanban, GraduationCap, Home, MapPin, Menu, Search, Settings, Settings2, UserRound, Users, X } from 'lucide-react'
import { Wordmark } from '../landing/Wordmark'
import { Avatar, AvatarFallback, AvatarImage, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui'
import type { Activity } from './types'

const links = [
  { id: 'dashboard-top', label: 'Dashboard', icon: Home },
  { id: 'buddies', label: 'Buddies', icon: Users },
  { id: 'skills-matches', label: 'SkillShare', icon: GraduationCap },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'campus-activity', label: 'Campus Activity', icon: MapPin },
]
export function AppNavigation({ activities, onFind, onEditProfile }: { activities: Activity[]; onFind: () => void; onEditProfile: () => void }) {
  const { isLoaded, isSignedIn, user, userLoading, signIn, signOut } = useSession()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const unread = activities.filter((activity) => activity.unread).length
  const name = user?.name ?? user?.email ?? 'Student'
  const initials = name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()

  useEffect(() => setMobileOpen(false), [location.pathname, location.hash])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key === 'k') { event.preventDefault(); setSearchOpen(true) } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])
  function navigateSection(id: string) {
    setMobileOpen(false)
    setNotificationOpen(false)
    if (id === 'dashboard-top') return navigate('/home')
    if (id === 'skills-matches' && location.pathname === '/skillshare') { document.getElementById('skill-category')?.focus(); return }
    if (id === 'skills-matches') return navigate('/skillshare')
    if (id === 'buddies' && location.pathname === '/buddies') { document.getElementById('swipe-decks')?.focus(); return }
    if (id === 'buddies') return navigate('/buddies')
    if (id === 'projects') return navigate('/projects')
    if (id === 'campus-activity') return navigate('/campus')
    if (location.pathname !== '/home') return navigate(`/home#${id}`)
    const section = document.getElementById(id)
    if (!section) return
    section.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
    section.focus({ preventScroll: true })
    navigate(`#${id}`)
  }

  return <>
    <header data-testid="app-navigation" className="workspace-header"><div className="workspace-header-inner"><Wordmark href="/" />
      <nav aria-label="Dashboard navigation" className="workspace-nav">{links.map((item) => { const current = item.id === 'skills-matches' ? location.pathname === '/skillshare' : item.id === 'buddies' ? location.pathname === '/buddies' : item.id === 'projects' ? location.pathname === '/projects' : item.id === 'campus-activity' ? location.pathname === '/campus' : (location.hash === `#${item.id}` || (!location.hash && item.id === 'dashboard-top' && location.pathname === '/home')); return <button key={item.id} className={`workspace-nav-item ${current ? 'workspace-nav-item--active' : ''}`} aria-current={current ? 'location' : undefined} onClick={() => navigateSection(item.id)}><item.icon size={16} />{item.label}</button> })}</nav>
      <button className="search-trigger" data-testid="workspace-search-trigger" onClick={() => setSearchOpen(true)}><Search size={16} /><span>Find people, courses, skills…</span><kbd>⌘ K</kbd></button>
      <button className="workspace-icon-btn notification-btn" onClick={() => setNotificationOpen(!notificationOpen)} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} aria-expanded={notificationOpen} aria-controls="notification-panel"><Bell size={19} />{unread > 0 && <span className="notification-count" aria-hidden="true">{unread}</span>}</button>
      {isLoaded && !isSignedIn && <button data-testid="nav-sign-in-button" className="button button--primary dashboard-signin" onClick={() => void signIn()}>Sign In<Check size={15} /> </button>}
      {isLoaded && isSignedIn && userLoading && <span className="skeleton skeleton-avatar" />}
      {isLoaded && isSignedIn && !userLoading && user && <DropdownMenu><DropdownMenuTrigger aria-label="Profile menu" className="profile-menu-trigger"><Avatar className="profile-nav-avatar">{user.imageUrl ? <AvatarImage src={user.imageUrl} referrerPolicy="no-referrer" /> : null}<AvatarFallback>{initials}</AvatarFallback></Avatar><ChevronDown size={14} /></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel><span data-testid="nav-user-name">{name}</span><small data-testid="nav-user-email">{user.email}</small></DropdownMenuLabel><DropdownMenuItem onClick={() => navigate('/profile')}><UserRound size={16} /> View profile</DropdownMenuItem><DropdownMenuItem onClick={onEditProfile}><Settings2 size={16} /> Edit profile</DropdownMenuItem><DropdownMenuItem onClick={() => navigate('/settings')}><Settings size={16} /> Settings</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onClick={() => signOut()}><span>Log Out</span></DropdownMenuItem></DropdownMenuContent></DropdownMenu>}
      <button className="workspace-nav-menu workspace-icon-btn" onClick={() => setMobileOpen(!mobileOpen)} aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileOpen} aria-controls="workspace-mobile-nav">{mobileOpen ? <X size={20} /> : <Menu size={20} />}</button>
    </div></header>
    {mobileOpen && <nav id="workspace-mobile-nav" className="workspace-mobile-nav" aria-label="Mobile dashboard navigation">{links.map((item) => <button key={item.id} className="workspace-mobile-item" aria-current={(item.id === 'skills-matches' && location.pathname === '/skillshare') || (item.id === 'buddies' && location.pathname === '/buddies') ? 'location' : undefined} onClick={() => navigateSection(item.id)}><item.icon size={16} />{item.label}</button>)}<button className="search-mobile" onClick={() => setSearchOpen(true)}><Search size={16} /> Find students, courses, or skills</button></nav>}
    {notificationOpen && <NotificationDialog activities={activities} onClose={() => setNotificationOpen(false)} onViewActivity={() => navigateSection('activity')} />}
    {searchOpen && <SearchDialog onClose={() => setSearchOpen(false)} onFind={onFind} />}
  </>
}
function SearchDialog({ onClose, onFind }: { onClose: () => void; onFind: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => { if (dialog?.open) dialog.close() } }, [])
  return <dialog ref={ref} className="dashboard-dialog dashboard-dialog--centered search-dialog" aria-labelledby="search-title" onClose={onClose} onCancel={(event) => { event.preventDefault(); ref.current?.close(); onClose() }} onClick={(event) => { if (event.target === event.currentTarget) onClose() }}><div className="dialog-body"><button className="dialog-close" onClick={onClose} aria-label="Close search">×</button><h2 id="search-title">Find people or a skill</h2><form onSubmit={(event) => { event.preventDefault(); onClose(); onFind() }}><label htmlFor="workspace-search">People, courses, skills, or projects</label><input id="workspace-search" name="search" type="search" required placeholder="e.g. CPSC 210, Python, photography" /><button className="button button--primary" type="submit"><Search size={16} /> Search</button></form></div></dialog>
}

function NotificationDialog({ activities, onClose, onViewActivity }: { activities: Activity[]; onClose: () => void; onViewActivity: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => { if (dialog?.open) dialog.close() } }, [])
  const unread = activities.filter((activity) => activity.unread)
  return <dialog ref={ref} className="dashboard-dialog dashboard-dialog--centered notification-dialog" aria-labelledby="notification-panel-title" onClose={onClose} onCancel={(event) => { event.preventDefault(); ref.current?.close(); onClose() }} onClick={(event) => { if (event.target === event.currentTarget) onClose() }}><div className="dialog-body"><div className="notification-head"><h2 id="notification-panel-title">Updates for you</h2><button aria-label="Close notifications" className="dialog-close" onClick={onClose}>×</button></div>{unread.length ? <div className="notification-preview-list">{unread.map((activity) => <article className="notification-preview" key={activity.id}><span className="activity-kind">{activity.kind}</span><p>{activity.text}</p><time>{activity.time}</time></article>)}</div> : <p className="notification-empty">No unread updates.</p>}<button className="button button--quiet" onClick={onViewActivity}><CheckCheck size={15} /> View recent activity</button></div></dialog>
}
