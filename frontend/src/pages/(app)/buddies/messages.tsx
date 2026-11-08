import { useNavigate } from 'react-router-dom'
import { MessagingPage } from '../../../components/messaging/MessagingPage'
import { AppNavigation } from '../../../components/dashboard/AppNavigation'
import { SessionProvider } from '../../../components/dashboard/useSession'
import '../../../components/dashboard/dashboard.css'

export default function BuddiesMessages() { return <SessionProvider><Shell /></SessionProvider> }
function Shell() {
  const navigate = useNavigate()
  return <><AppNavigation activities={[]} onFind={() => navigate('/buddies')} onEditProfile={() => navigate('/profile')} /><MessagingPage kind="buddy" /></>
}
