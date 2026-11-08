import { CampusMark } from './CampusMark'

export function Wordmark({ light = false, href = '#top' }: { light?: boolean; href?: string }) {
  return (
    <a className={`wordmark ${light ? 'wordmark--light' : ''}`} href={href} aria-label="Flockwork home">
      <span className="wordmark-symbol" aria-hidden="true"><CampusMark /></span>
      Flockwork
    </a>
  )
}
