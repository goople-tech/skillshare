/** Public product landing UI. No auth-library calls belong in this file.
 * Auth0 integration / verified identity belongs to the app/backend owner.
 * The shared transition boundary is documented in AUTH_TRANSITION.md.
 */
import { useEffect, useState } from 'react'
import { ArrowDown, ArrowRight, ArrowUpRight, ChevronRight, GraduationCap, Heart, Menu, MoveHorizontal, ShieldCheck, Users, X } from 'lucide-react'
import { Seo } from '../components/Seo'
import { seo } from '../seo'
import { useSignedIn } from '../components/landing/useSignedIn'
import { Wordmark } from '../components/landing/Wordmark'
import { BuddiesPreview } from '../components/landing/BuddiesPreview'
import { SkillPreview } from '../components/landing/SkillPreview'
import { CampusMap } from '../components/landing/CampusMap'
import { CampusMark } from '../components/landing/CampusMark'
import '../decor.css'

const navigation = [
  { label: 'Buddies', href: '#buddies' },
  { label: 'SkillShare', href: '#skillshare' },
  { label: 'Campus Activity', href: '#campus-activity' },
  { label: 'How It Works', href: '#how-it-works' },
]
const buddyTags = ['Shared courses', 'Similar interests', 'Study sessions', 'Hangouts']
const skillTags = ['Peer tutoring', 'Skill swaps', 'Project teammates', 'Experience ratings']
const steps = [
  { number: '01', title: 'Verify you’re a student', text: 'Use your university email to join.', symbol: 'verification' },
  { number: '02', title: 'Create your profile', text: 'Add your courses, interests, and skills.', symbol: 'profile' },
  { number: '03', title: 'Start connecting', text: 'Match, message, and meet at your pace.', symbol: 'connection' },
]

function StepGraphic({ kind }: { kind: string }) {
  if (kind === 'verification') return <ShieldCheck className="step-symbol" size={29} strokeWidth={1.5} aria-hidden="true" />
  if (kind === 'profile') return <Users className="step-symbol" size={29} strokeWidth={1.5} aria-hidden="true" />
  return <Heart className="step-symbol" size={28} strokeWidth={1.5} aria-hidden="true" />
}

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false)
  const signedIn = useSignedIn()
  // Timeline cards pop in from their side when they enter the screen and fade out when they leave it.
  useEffect(() => {
    const timeline = document.querySelector('.timeline')
    if (!timeline || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const items = Array.from(timeline.querySelectorAll<HTMLElement>('.timeline-item'))
    const update = () => {
      const viewport = window.innerHeight
      for (const item of items) {
        const { top, bottom, height } = item.getBoundingClientRect()
        const overlap = Math.min(bottom, viewport * 0.94) - Math.max(top, 0)
        item.classList.toggle('is-visible', overlap >= Math.min(height * 0.12, 140))
      }
    }
    timeline.classList.add('timeline--animate')
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      timeline.classList.remove('timeline--animate')
    }
  }, [])
  // Signed in: go straight to the dashboard. Otherwise real Auth0 login (see src/pages/auth.tsx).
  const openLogin = () => { window.location.assign(signedIn ? '/home' : '/auth') }
  const loginLabel = signedIn ? 'Enter Dashboard' : 'Log In / Sign Up'

  return (
    <>
      <Seo {...seo} path="/" />
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <div className="site" id="top">
        <div className="hero-sky" aria-hidden="true">
          <img className="cloud cloud-puff cloud-puff-left" src="/clouds/cloud-pastel.png" alt="" />
          <img className="cloud cloud-puff cloud-puff-mid" src="/clouds/cloud-pastel.png" alt="" />
          <img className="cloud cloud-puff cloud-puff-right" src="/clouds/cloud-pastel.png" alt="" />
          <img className="cloud cloud-bank" src="/clouds/cloud-cream.png" alt="" />
        </div>
        <header className="site-header">
          <div className="header-inner container">
            <Wordmark />
            <nav className="desktop-nav" aria-label="Main navigation">{navigation.map((link) => <a key={link.label} href={link.href}>{link.label}</a>)}</nav>
            <div className="header-actions"><button className="button button--primary header-join" onClick={openLogin}>{loginLabel}</button></div>
            <button className="menu-button" type="button" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={24} /> : <Menu size={24} />}</button>
          </div>
          <div id="mobile-navigation" className={`mobile-navigation ${menuOpen ? 'mobile-navigation--open' : ''}`} hidden={!menuOpen}>
            <nav aria-label="Mobile navigation">{navigation.map((link) => <a key={link.label} href={link.href} onClick={() => setMenuOpen(false)}>{link.label}<ChevronRight size={17} /></a>)}<button className="button button--primary" onClick={openLogin}>{loginLabel}</button></nav>
          </div>
        </header>

        <main id="main-content">
          <section className="hero container" aria-labelledby="hero-title">
            <div className="hero-copy">
              <div className="eyebrow">A student community beyond the classroom</div>
              <h1 id="hero-title">Make Campus<br />feel like <em>home</em></h1>
              <p className="hero-description">Meet students who share your courses, interests, and energy. Exchange skills, start projects, and turn everyday campus moments into lasting connections.</p>
              <div className="hero-reassurance"><ShieldCheck size={17} /><span>Student email required <i>·</i> Connect in person or online</span></div>
            </div>
            <div className="hero-visual">
              <div className="hero-campus-seal" aria-hidden="true"><CampusMark /><span>Rhythms of campus.<br />Room for you.</span></div>
              <div className="hero-photo-frame"><img src="/campus-community.jpg" alt="Students studying and spending time together around a table" width="1600" height="1067" fetchPriority="high" /></div>
              <div className="hero-match-card floating-card"><div className="match-card-top"><strong>Study buddy matched</strong></div><div className="match-card-session"><span className="course-pill">CPSC 210</span><span>·</span>Quiet study session</div></div>
              <div className="hero-swap-card floating-card"><span className="swap-label">SKILL FOR SKILL</span><div><span>Python tutoring</span><MoveHorizontal size={19} /><span>Portfolio design</span></div></div>

            </div>
            <a className="scroll-cue" href="#buddies" aria-label="Scroll down to explore"><ArrowDown size={26} strokeWidth={2} aria-hidden="true" /></a>
          </section>

          <section className="journey-section section" aria-labelledby="pathways-title">
            <div className="container">
              <div className="journey-heading reveal"><h2 id="pathways-title">Many ways to turn campus <br />into <em>community.</em></h2></div>
              <ol className="timeline">
                {steps.map((step, index) => (
                  <li className={`timeline-item timeline-item--${index % 2 === 0 ? 'left' : 'right'} reveal`} key={step.number} id={index === 0 ? 'how-it-works' : undefined}>
                    <span className="timeline-node" aria-hidden="true" />
                    <article className="timeline-card timeline-card--step"><StepGraphic kind={step.symbol} /><div><h3>{step.title}</h3><p>{step.text}</p></div></article>
                  </li>
                ))}
                <li className="timeline-item timeline-item--right reveal">
                  <span className="timeline-node" aria-hidden="true" />
                <article className="timeline-card timeline-card--pathway pathway-card pathway-card--buddies" id="buddies">
                  <div className="pathway-top"><span className="pathway-number">Buddies</span><span className="pathway-icon"><Users size={23} /></span></div>
                  <h3>Meet people you’ll<br /><em>actually click with.</em></h3>
                  <p>Discover study partners and potential friends through shared interests, courses, and energy—online or in person.</p>
                  <ul className="tag-list" aria-label="Buddies features">{buddyTags.map((tag) => <li key={tag}>{tag}</li>)}</ul>
                  <BuddiesPreview />
                </article>
                </li>
                <li className="timeline-item timeline-item--left reveal">
                  <span className="timeline-node" aria-hidden="true" />
                <article className="timeline-card timeline-card--pathway pathway-card pathway-card--skills" id="skillshare">
                  <div className="pathway-top"><span className="pathway-number">SkillShare</span><span className="pathway-icon"><GraduationCap size={23} /></span></div>
                  <h3>Trade what you know.<br /><em>Learn what you love.</em></h3>
                  <p>Exchange skills, find peer tutoring, or meet collaborators for your next project.</p>
                  <ul className="tag-list" aria-label="SkillShare features">{skillTags.map((tag) => <li key={tag}>{tag}</li>)}</ul>
                  <SkillPreview />
                </article>
                </li>
                <li className="timeline-item timeline-item--right reveal" id="campus-activity">
                  <span className="timeline-node" aria-hidden="true" />
                  <article className="timeline-card timeline-card--wide" aria-labelledby="activity-title">
                    <div className="activity-copy"><span className="eyebrow">Campus activity</span><h2 id="activity-title">See where campus<br />is <em>happening.</em></h2><p>Find active study spaces and social areas through an activity heatmap.</p><div className="activity-points"><span><span className="point-icon"><Users size={17} /></span>Find your kind of space</span><span><span className="point-icon"><ShieldCheck size={17} /></span>Connect with privacy in mind</span></div><p className="privacy-note">Illustrative preview. Activity is aggregated by area; individual locations are not shown.</p></div>
                    <div><CampusMap /></div>
                  </article>
                </li>
                <li className="timeline-item timeline-item--left reveal" id="skillshare-highlight">
                  <span className="timeline-node" aria-hidden="true" />
                  <article className="timeline-card timeline-card--wide" aria-labelledby="exchange-title">
                    <div className="exchange-card-copy"><span className="eyebrow">SkillShare in practice</span><h2 id="exchange-title">A little knowledge<br />goes <em>both ways.</em></h2><p>Share what you know. Learn something new.</p></div>
                    <div className="exchange-example"><div className="example-skill"><span className="example-label">I CAN TEACH</span><strong>Beginner guitar</strong><span className="example-reaction" aria-hidden="true">♫</span></div><div className="example-swap"><ArrowRight size={23} /><span>LET’S SWAP</span></div><div className="example-skill example-skill--learn"><span className="example-label">I’D LOVE HELP WITH</span><strong>Statistics</strong><span className="example-reaction" aria-hidden="true">∑</span></div></div>
                    <div className="exchange-card-footer"><span><Users size={18} />Find teammates for projects that matter.</span><span><ShieldCheck size={18} />Post-session ratings build confidence.</span></div>
                  </article>
                </li>
              </ol>
            </div>
          </section>

        </main>

        <footer className="site-footer">
          <div className="container"><div className="footer-main"><div className="footer-brand"><Wordmark /><p>Learn, create, and spend time together.</p></div><nav className="footer-links" aria-label="Footer navigation"><div><h3>Product</h3><a href="#buddies">Buddies</a><a href="#skillshare">SkillShare</a><a href="#campus-activity">Campus Activity</a></div><div><h3>Community</h3><a href="#how-it-works">How It Works</a><a href="#skillshare-highlight">Project Collaboration</a><a href="https://github.com/goople-tech/skillshare" target="_blank" rel="noreferrer">Our Open Project <ArrowUpRight size={12} /></a></div><div><h3>A safe start</h3><a href="#how-it-works">Student Verification</a><a href="#campus-activity">Privacy by Design</a><a href="https://github.com/goople-tech/skillshare/issues" target="_blank" rel="noreferrer">Contact the Team <ArrowUpRight size={12} /></a></div></nav></div><div className="footer-bottom"><p>UBC Ver. is an independent student project and is not affiliated with the University of British Columbia.</p><span>HackCamp 2026 <i>·</i> Vancouver, BC</span></div></div>
        </footer>
      </div>
    </>
  )
}
