import { MapPin } from 'lucide-react'
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
    </section>
  )
}
