import { UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'

/** The product profile field contract is still being connected by the backend/auth owners. */
export default function ProfilePage() {
  return <div className="profile-page"><Link to="/home" className="button button--text">← Back to dashboard</Link><h1>Your profile</h1><div className="private-profile-note"><UserRound size={19} /><p>Your account identity is available, but the shared profile service is not connected to this page yet. <Link to="/home">Edit a clearly labelled preview on your dashboard.</Link></p></div></div>
}
