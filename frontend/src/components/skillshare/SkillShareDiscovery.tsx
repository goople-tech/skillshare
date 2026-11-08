import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarCheck, CheckCircle2, RotateCcw, Search } from 'lucide-react'
import { apiRequest } from '../../api'
import { SwipeLauncher } from '../swipe/SwipeLauncher'
import type { Request } from '../swipe/swipeSource'
import { DiscoveryFilters } from './DiscoveryFilters'
import { MatchGrid } from './MatchGrid'
import { ReviewDialog, ScheduleDialog } from './ExchangeDialogs'
import {
  ApiDiscoverySource, emptyFilters, REVIEW_LABELS,
  type DiscoveryPage, type DiscoveryResult, type Exchange, type Filters, type ReviewInput,
} from './discoverySource'
import './skillshare.css'

export function SkillShareDiscovery() {
  const source = useMemo(() => new ApiDiscoverySource(apiRequest as Request), [])
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [data, setData] = useState<DiscoveryPage>()
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [options, setOptions] = useState<string[]>([])
  const [exchanges, setExchanges] = useState<Exchange[]>([])
  const [confirmedIds, setConfirmedIds] = useState<number[]>([])
  const [exchangeError, setExchangeError] = useState('')
  const [schedule, setSchedule] = useState<DiscoveryResult>()
  const [review, setReview] = useState<Exchange>()
  const [busyId, setBusyId] = useState<number | null>(null)
  const [notice, setNotice] = useState('')
  const [deckDismissed, setDeckDismissed] = useState(false)

  const search = useCallback(async () => {
    setStatus('loading'); setError('')
    try { setData(await source.search(filters)); setStatus('ready') }
    catch (reason) { setStatus('error'); setError(reason instanceof Error ? reason.message : 'The discovery service is unavailable.') }
  }, [source, filters])
  const loadExchanges = useCallback(async () => {
    setExchangeError('')
    try {
      const [loaded, matches] = await Promise.all([source.exchanges(), source.confirmedMatches()])
      setExchanges(loaded)
      setConfirmedIds(matches.map(match => match.profile.id))
    } catch (reason) { setExchangeError(reason instanceof Error ? reason.message : 'Your exchanges are unavailable.') }
  }, [source])
  useEffect(() => { void search() }, [search])
  useEffect(() => {
    let mounted = true
    source.catalog().then(result => { if (mounted) setOptions(result.skills) }).catch(() => { /* free-text filters remain usable */ })
    return () => { mounted = false }
  }, [source])
  useEffect(() => { void loadExchanges() }, [loadExchanges])

  const saveSchedule = async (scheduled_for: string) => {
    if (!schedule) return
    await source.schedule({ partner_id: schedule.profile.id, scheduled_for })
    setNotice('Lesson time saved. Both participants can confirm completion after that time.')
    await loadExchanges()
  }
  const acknowledge = async (exchange: Exchange) => {
    setBusyId(exchange.id); setNotice('')
    try { await source.acknowledgeCompletion(exchange.id); await Promise.all([loadExchanges(), search()]); setNotice('Completion confirmed. Rating is available once both participants have confirmed.') }
    catch (reason) { setNotice(reason instanceof Error ? reason.message : 'Could not confirm this exchange.') } finally { setBusyId(null) }
  }
  const submitReview = async (input: ReviewInput) => {
    if (!review) return
    await source.submitReview(review.id, input)
    setNotice('Rating submitted. Your completed-exchange aggregate has been refreshed.')
    await Promise.all([loadExchanges(), search()])
  }
  const ratingName = (exchange: Exchange) => `${exchange.partner.name} · ${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(exchange.scheduled_for))} UTC`

  return <>
    <div className="discovery-page-heading"><span className="workspace-eyebrow">SkillShare search</span><h1>Find someone to learn with</h1><p>Discover students with a skill to share, then arrange an exchange that works both ways.</p></div>
    {deckDismissed ? <section className="discovery-restore" aria-label="Swipe discovery is hidden"><span>Prefer to browse one card at a time?</span><button type="button" className="button button--outline" onClick={() => setDeckDismissed(false)}><RotateCcw size={15} /> Restore swipe discovery</button></section> : <SwipeLauncher skillOnly cardProps={{ id: 'skillshare-swipe', titleId: 'skillshare-swipe-title' }} onDismiss={() => setDeckDismissed(true)} />}
    <DiscoveryFilters value={filters} options={options} onChange={setFilters} onReset={() => setFilters(emptyFilters)} busy={status === 'loading'} />
    <MatchGrid data={data} status={status} error={error} busy={status === 'loading'} confirmedIds={confirmedIds} onRetry={() => void search()} onSchedule={setSchedule} />
    <section id="skillshare-exchanges" className="discovery-exchanges" aria-labelledby="exchange-title"><div className="discovery-section-heading"><div><span className="workspace-eyebrow">After you connect</span><h2 id="exchange-title">Your exchanges</h2><p>Only mutually acknowledged lessons can be rated. Your filters and searches stay here when you hide swiping.</p></div><CalendarCheck size={24} aria-hidden="true" /></div>
      {exchangeError && <div className="discovery-inline-error" role="alert">{exchangeError}<button type="button" className="button button--quiet" onClick={() => void loadExchanges()}>Try again</button></div>}
      {!exchangeError && exchanges.length === 0 && <p className="discovery-empty-exchanges">No scheduled exchanges yet. Use a confirmed SkillShare match to schedule a lesson; both participants must confirm it before rating.</p>}
      <ul className="discovery-exchange-list">{exchanges.map(exchange => <li key={exchange.id}><div><h3>{ratingName(exchange)}</h3><p>{REVIEW_LABELS[exchange.review.status]}</p></div>
        {exchange.review.can_confirm_completion && <button type="button" className="button button--outline" onClick={() => void acknowledge(exchange)} disabled={busyId === exchange.id}>{busyId === exchange.id ? 'Confirming…' : 'Confirm lesson completed'}</button>}
        {exchange.review.can_rate && <button type="button" className="button button--outline" onClick={() => setReview(exchange)}>{exchange.review.status === 'submitted' ? 'Edit rating' : 'Rate this exchange'}</button>}</li>)}</ul>
    </section>
    {notice && <div className="discovery-notice" role="status"><CheckCircle2 size={17} />{notice}<button type="button" aria-label="Dismiss status message" onClick={() => setNotice('')}>×</button></div>}
    {schedule && <ScheduleDialog person={schedule} onClose={() => setSchedule(undefined)} onSave={saveSchedule} />}
    {review && <ReviewDialog exchange={review} onClose={() => setReview(undefined)} onSave={submitReview} />}
  </>
}

export function SignedOutSkillShare({ onSignIn }: { onSignIn: () => void }) {
  return <div className="discovery-signin"><Search size={25} /><h1>Find someone to learn with</h1><p>Sign in to search SkillShare exchanges and manage your completed lessons.</p><button type="button" className="button button--primary" onClick={onSignIn}>Sign in to SkillShare</button></div>
}
