import { RotateCcw } from 'lucide-react'
import { CATEGORIES, type Filters } from './discoverySource'

export function DiscoveryFilters({ value, options, onChange, onReset, busy }: {
  value: Filters; options: string[]; onChange: (next: Filters) => void; onReset: () => void; busy: boolean
}) {
  const update = (field: keyof Filters, next: string) => onChange({ ...value, [field]: next })
  const active = Object.values(value).some(Boolean)
  return <section className="discovery-filters" aria-labelledby="filters-title" aria-busy={busy}>
    <div className="discovery-section-heading"><div><h2 id="filters-title">Find a useful exchange</h2><p>Narrow by skills and how you’d like to meet.</p></div>
      {active && <button type="button" className="button button--quiet" onClick={onReset} disabled={busy}><RotateCcw size={15} /> Clear filters</button>}</div>
    <fieldset className="discovery-filter-fields">
      <legend className="sr-only">SkillShare match filters</legend>
      <label htmlFor="skill-category">Broad category<select id="skill-category" value={value.category} onChange={(event) => update('category', event.target.value)} disabled={busy}>
        <option value="">Any category</option>{CATEGORIES.map(category => <option key={category.id} value={category.id}>{category.label}</option>)}
      </select></label>
      <label htmlFor="skill-seeking">Skill they can teach<input id="skill-seeking" list="skill-catalog" value={value.seeking} maxLength={100} onChange={(event) => update('seeking', event.target.value)} placeholder="e.g. Python" autoComplete="off" disabled={busy} /></label>
      <label htmlFor="skill-offering">Skill you can offer<input id="skill-offering" list="skill-catalog" value={value.offering} maxLength={100} onChange={(event) => update('offering', event.target.value)} placeholder="e.g. Guitar" autoComplete="off" disabled={busy} /></label>
      <label htmlFor="skill-meeting">Meeting preference<select id="skill-meeting" value={value.meeting} onChange={(event) => update('meeting', event.target.value)} disabled={busy}>
        <option value="">Any meeting preference</option><option value="online">Online</option><option value="in_person">In person</option><option value="either">Either</option>
      </select></label>
      <label htmlFor="skill-rating">Completed-session rating<select id="skill-rating" value={value.minimumRating} onChange={(event) => update('minimumRating', event.target.value)} disabled={busy}>
        <option value="">Any rating, including no ratings</option><option value="3">3.0 or higher</option><option value="4">4.0 or higher</option><option value="5">5.0 only</option>
      </select></label>
    </fieldset>
    <datalist id="skill-catalog">{options.map(skill => <option key={skill} value={skill} />)}</datalist>
    <p className="discovery-filter-note">Ratings reflect completed exchanges only. Students without feedback stay discoverable.</p>
  </section>
}
