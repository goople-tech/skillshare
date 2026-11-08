import { MessagingPage } from '../../../components/messaging/MessagingPage'
import { SessionProvider } from '../../../components/dashboard/useSession'
export default function BuddiesMessages() { return <SessionProvider><MessagingPage kind="buddy" /></SessionProvider> }
