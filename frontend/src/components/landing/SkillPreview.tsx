import { ArrowDownUp, Code2, PenTool } from 'lucide-react'

export function SkillPreview() {
  return (
    <div className="mini-interface skill-preview" aria-label="Example exchange of Python tutoring for portfolio design" role="img">
      <div className="exchange-row"><span className="skill-symbol"><Code2 size={22} /></span><div><small>I CAN TEACH</small><strong>Python for beginners</strong></div></div>
      <div className="exchange-divider"><span /><span className="exchange-icon"><ArrowDownUp size={17} /></span><span /></div>
      <div className="exchange-row"><span className="skill-symbol skill-symbol--sand"><PenTool size={22} /></span><div><small>I WANT TO LEARN</small><strong>Portfolio design</strong></div></div>
    </div>
  )
}
