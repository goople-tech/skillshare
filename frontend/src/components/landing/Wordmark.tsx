import { CampusMark } from './CampusMark'

export function Wordmark({ light = false, href = '#top' }: { light?: boolean; href?: string }) {
  return (
    <a className={`wordmark ${light ? 'wordmark--light' : ''}`} href={href} aria-label="UBC Ver. home">
      <span className="wordmark-symbol" aria-hidden="true"><CampusMark /></span>
      UBC Ver<span className="wordmark-dot">.</span>
    </a>
  )
}
