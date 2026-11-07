import { BookOpen, Check, Coffee, MapPin } from 'lucide-react'

export function BuddiesPreview() {
  return (
    <div className="mini-interface buddies-preview" aria-label="Example study buddy with a shared course and interest" role="img">
      <div className="buddy-profile">
        <div className="profile-avatar" aria-hidden="true">JL</div>
        <div className="profile-copy"><strong>Saturday study & coffee</strong><span><MapPin size={13} />In person · Quiet energy</span></div>
        <span className="small-check"><Check size={17} /></span>
      </div>
      <div className="match-detail"><BookOpen size={18} /><span>CPSC 210<small>Shared course</small></span><span className="match-line" /><Coffee size={18} /><span>Good coffee<small>Shared interest</small></span></div>
    </div>
  )
}
