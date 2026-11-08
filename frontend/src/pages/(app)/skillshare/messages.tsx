import { MessagingPage } from '../../../components/messaging/MessagingPage'
import { SessionProvider } from '../../../components/dashboard/useSession'
export default function SkillShareMessages() { return <SessionProvider><MessagingPage kind="skill" /></SessionProvider> }
