import { ArrowUpRight, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { LiveHeatmap } from './LiveHeatmap'

export function CampusPreview() {
  return (
    <section id="campus-activity" className="dashboard-card campus-compact" tabIndex={-1}>
      <div className="card-heading">
        <div>
          <h2>Campus activity</h2>
        </div>
        <MapPin size={18} />
      </div>
      <LiveHeatmap />
      <Link className="button button--text" to="/campus">Open full campus map <ArrowUpRight size={14} /></Link>
    </section>
  )
}
