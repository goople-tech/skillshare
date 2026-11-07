import { CampusMark } from './CampusMark'

export function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <a className={`wordmark ${light ? 'wordmark--light' : ''}`} href="#top" aria-label="UBC Ver. home">
      <span className="wordmark-symbol" aria-hidden="true"><CampusMark /></span>
      UBC Ver<span className="wordmark-dot">.</span>
    </a>
  )
}
