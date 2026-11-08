export function CampusMap() {
  return (
    <figure className="campus-map-card">
      <div className="map-card-header"><span className="map-eyebrow"><span className="status-dot" /> Illustrative preview</span><span className="map-badge">Illustrative map</span></div>
      <svg className="campus-map" viewBox="0 0 740 425" role="img" aria-labelledby="map-title map-description">
        <title id="map-title">Illustrative campus activity map</title>
        <desc id="map-description">A simplified, fictional campus map with labeled aggregate activity areas: I.K. Barber Library, Koerner Library, The Nest, and Main Mall. This preview does not show real activity or student locations.</desc>
        <defs>
          <radialGradient id="busy-hotspot"><stop offset="0%" stopColor="#B96745" stopOpacity=".28"/><stop offset="100%" stopColor="#B96745" stopOpacity="0"/></radialGradient>
          <radialGradient id="medium-hotspot"><stop offset="0%" stopColor="#B96745" stopOpacity=".16"/><stop offset="100%" stopColor="#E9D6B8" stopOpacity="0"/></radialGradient>
          <pattern id="map-grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="#5A859A" strokeOpacity=".09" strokeWidth="1"/></pattern>
        </defs>
        <rect width="740" height="425" fill="#E7EDE8"/><rect width="740" height="425" fill="url(#map-grid)"/>
        <path d="M-20 180C133 185 164 138 305 151S500 218 766 172M296 -10C305 85 343 179 326 443M87 442C91 345 164 260 267 164S470 47 473 -10M550 444C547 359 502 309 480 232S494 95 585 -20" fill="none" stroke="#FFFDF8" strokeWidth="18"/>
        <path d="M-20 180C133 185 164 138 305 151S500 218 766 172M296 -10C305 85 343 179 326 443M87 442C91 345 164 260 267 164S470 47 473 -10M550 444C547 359 502 309 480 232S494 95 585 -20" fill="none" stroke="#B8C6C6" strokeWidth="1.5" strokeDasharray="5 5"/>
        <g fill="#D0DCD6" stroke="#9EB5AA" strokeWidth="1">
          <rect x="41" y="62" width="101" height="61" rx="5"/><rect x="182" y="29" width="56" height="71" rx="4"/><rect x="405" y="51" width="88" height="56" rx="4"/><rect x="582" y="72" width="90" height="62" rx="5"/>
          <rect x="40" y="248" width="92" height="62" rx="4"/><rect x="181" y="268" width="58" height="79" rx="4"/><rect x="400" y="282" width="105" height="76" rx="5"/><rect x="598" y="237" width="80" height="69" rx="4"/>
        </g>
        <g fill="#D8DFDF" stroke="#5A859A" strokeWidth="1.3"><rect x="207" y="178" width="72" height="50" rx="4" transform="rotate(-6 207 178)"/><rect x="380" y="194" width="78" height="62" rx="5" transform="rotate(9 380 194)"/><rect x="523" y="151" width="67" height="43" rx="4"/></g>
        <circle cx="231" cy="190" r="115" fill="url(#busy-hotspot)"/><circle cx="412" cy="223" r="94" fill="url(#medium-hotspot)"/><circle cx="555" cy="165" r="81" fill="url(#medium-hotspot)"/>
        <g stroke="#173B5E" strokeWidth="2" fill="#FFFDF8"><circle cx="231" cy="190" r="6"/><circle cx="412" cy="223" r="6"/><circle cx="555" cy="165" r="6"/></g>
        <g className="map-labels" fontFamily="Arial, sans-serif" fill="#173B5E" fontSize="12" fontWeight="600"><g transform="translate(118 96)"><rect width="196" height="46" rx="6" fill="#FFFDF8" stroke="#D8DFDF"/><text x="12" y="18">I.K. Barber Library</text><text x="12" y="36" fontSize="11" fontWeight="500" fill="#52656d">12 students · study area</text></g><g transform="translate(348 268)"><rect width="176" height="46" rx="6" fill="#FFFDF8" stroke="#D8DFDF"/><text x="12" y="18">Koerner Library</text><text x="12" y="36" fontSize="11" fontWeight="500" fill="#52656d">7 students · quieter</text></g><g transform="translate(508 92)"><rect width="150" height="46" rx="6" fill="#FFFDF8" stroke="#D8DFDF"/><text x="12" y="18">The Nest</text><text x="12" y="36" fontSize="11" fontWeight="500" fill="#52656d">5 students · social</text></g></g>
        <text x="295" y="327" transform="rotate(81 295 327)" fill="#5A859A" fontSize="12" letterSpacing="3">MAIN MALL</text>
        <g transform="translate(667 365)" stroke="#173B5E" fill="none" strokeWidth="1.5"><circle r="23"/><path d="M0-17V17M-17 0H17" opacity=".4"/><path d="M0-15L6 7 0 4-6 7Z" fill="#173B5E"/></g><text x="667" y="333" textAnchor="middle" fill="#173B5E" fontSize="11" fontWeight="bold">N</text>
      </svg>
      <figcaption><span className="legend"><i className="legend-dot legend-dot--busy" /> More active <i className="legend-dot legend-dot--calm" /> Less active</span><span>Areas, not individual locations</span></figcaption>
    </figure>
  )
}
