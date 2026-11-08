import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { ArrowLeft, ArrowUp, Inbox, RefreshCw, Send, UsersRound } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../ui'
import { apiMessagingSource, mergeMessages, type MessagingSource } from './messagingSource'
import type { Conversation, ConversationKind, Message, MessagePage } from './types'
import './messaging.css'

const COPY = {
  buddy: { title: 'Messages', context: 'Buddies connections', empty: 'Your Buddies connections will appear here after you both like each other.', hint: 'Plan a study break, a café meet-up, or something you both enjoy.' },
  skill: { title: 'SkillShare exchanges', context: 'SkillShare messages', empty: 'Your SkillShare connections will appear here after you both like each other.', hint: 'Start planning what you would like to learn and share.' },
} as const
const timestamp = (value: string) => new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value))
const initials = (name: string) => name.split(/\s+/).filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase()
const rootFor = (kind: ConversationKind) => kind === 'buddy' ? '/buddies/messages' : '/skillshare/messages'


export function MessagingPage({ kind, source = apiMessagingSource }: { kind: ConversationKind; source?: MessagingSource }) {
  const navigate = useNavigate()
  const [parameters] = useSearchParams()
  const rawId = parameters.get('conversation')
  const selected = rawId && /^[1-9]\d*$/.test(rawId) ? Number(rawId) : null
  const participant = parameters.get('participant')
  const participantId = participant && /^[1-9]\d*$/.test(participant) ? Number(participant) : null
  const [threads, setThreads] = useState<Conversation[]>([])
  const [view, setView] = useState<MessagePage | null>(null)
  const [draft, setDraft] = useState('')
  const [loadingList, setLoadingList] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)
  const [loadingEarlier, setLoadingEarlier] = useState(false)
  const [sending, setSending] = useState(false)
  const [listError, setListError] = useState('')
  const [threadError, setThreadError] = useState('')
  const [sendError, setSendError] = useState('')
  const [readNotice, setReadNotice] = useState('')
  const [lastFetched, setLastFetched] = useState<Date | null>(null)
  const mounted = useRef(true)
  const listController = useRef<AbortController | null>(null)
  const historyController = useRef<AbortController | null>(null)
  const earlierController = useRef<AbortController | null>(null)
  const sendOperation = useRef(0)
  const readGuard = useRef('')
  const drafts = useRef<Record<number, string>>({})
  const draftRef = useRef<HTMLTextAreaElement>(null)
  const threadButton = useRef<HTMLButtonElement>(null)
  const previouslySelected = useRef<number | null>(null)
  const backButton = useRef<HTMLButtonElement>(null)
  const active = threads.find(thread => thread.id === selected)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; sendOperation.current += 1 }
  }, [])

  const loadList = useCallback(async () => {
    listController.current?.abort()
    const controller = new AbortController()
    listController.current = controller
    setLoadingList(true)
    setListError('')
    try {
      const loaded = await source.list(kind, controller.signal)
      if (controller.signal.aborted || !mounted.current) return
      setThreads(loaded)
      setReadNotice('')
      setLastFetched(new Date())
    } catch (error) {
      if (!controller.signal.aborted && mounted.current) setListError((error as Error).message)
    } finally {
      if (!controller.signal.aborted && mounted.current) setLoadingList(false)
    }
  }, [kind, source])

  const loadThread = useCallback(async () => {
    historyController.current?.abort()
    const controller = new AbortController()
    historyController.current = controller
    readGuard.current = ''
    setLoadingThread(Boolean(selected))
    setThreadError('')
    if (!selected) { setView(null); return }
    try {
      const loaded = await source.history(selected, undefined, controller.signal)
      if (controller.signal.aborted || !mounted.current || loaded.conversation_id !== selected) return
      setView(loaded)
      setLastFetched(new Date())
    } catch (error) {
      if (!controller.signal.aborted && mounted.current) setThreadError((error as Error).message)
    } finally {
      if (!controller.signal.aborted && mounted.current) setLoadingThread(false)
    }
  }, [selected, source])

  useEffect(() => {
    void loadList()
    return () => { listController.current?.abort() }
  }, [loadList])

  useEffect(() => {
    void loadThread()
    return () => { historyController.current?.abort() }
  }, [loadThread])

  useEffect(() => {
    if (selected || participantId === null || loadingList || listError) return
    const thread = threads.find(row => row.participant.id === participantId && row.kind === kind)
    if (thread) void navigate(`${rootFor(kind)}?conversation=${thread.id}`, { replace: true })
    else setListError('This connection is no longer available. Try a mutual connection instead.')
  }, [kind, participantId, selected, threads, loadingList, listError, navigate])

  useEffect(() => {
    if (selected && window.matchMedia?.('(max-width: 720px)').matches) {
      const frame = requestAnimationFrame(() => backButton.current?.focus())
      return () => cancelAnimationFrame(frame)
    }
  }, [selected])
  useEffect(() => {
    if (previouslySelected.current !== null && rawId === null) {
      const frame = requestAnimationFrame(() => threadButton.current?.focus())
      previouslySelected.current = null
      return () => cancelAnimationFrame(frame)
    }
    previouslySelected.current = selected
  }, [selected, rawId])

  useEffect(() => {
    if (!view || sending || document.hidden || document.activeElement === draftRef.current) return
    const latest = view.messages.at(-1)
    if (!latest) return
    const proof = `${view.conversation_id}:${latest.id}`
    if (readGuard.current === proof) return
    readGuard.current = proof
    void source.markRead(view.conversation_id).then(state => {
      if (!mounted.current) return
      setThreads(rows => rows.map(row => row.id === state.conversation_id ? { ...row, unread_count: state.unread_count } : row))
      setReadNotice('')
    }).catch((error: Error) => {
      if (mounted.current) setReadNotice(`Could not update your read position: ${error.message}`)
    })
  }, [view, sending, source])

  useEffect(() => {
    const visible = () => {
      if (!draft && view && !document.hidden) readGuard.current = ''
    }
    document.addEventListener('visibilitychange', visible)
    return () => document.removeEventListener('visibilitychange', visible)
  }, [draft, view])

  async function send(event?: FormEvent) {
    event?.preventDefault()
    if (!selected || !view || sending || !draft.trim()) return
    const operation = ++sendOperation.current
    const submittedDraft = draft
    setSending(true)
    setSendError('')
    try {
      const saved = await source.send(selected, submittedDraft)
      if (operation !== sendOperation.current || !mounted.current) return
      setView(current => current ? { ...current, messages: mergeMessages(current.messages, [saved]) } : current)
      setThreads(rows => rows.map(row => row.id === selected ? { ...row, last_message_id: saved.id, latest_message_preview: saved.body.slice(0, 100), last_message_at: saved.created_at } : row))
      setDraft('')
      drafts.current[selected] = ''
      setLastFetched(new Date())
      draftRef.current?.focus()
      try {
        const state = await source.markRead(selected)
        if (operation !== sendOperation.current || !mounted.current) return
        setThreads(rows => rows.map(row => row.id === selected ? { ...row, unread_count: state.unread_count } : row))
        setReadNotice('')
      } catch (error) {
        if (operation === sendOperation.current && mounted.current) setReadNotice(`Message saved. Could not update your read position: ${(error as Error).message}`)
      }
    } catch (error) {
      if (operation === sendOperation.current && mounted.current) setSendError(`${(error as Error).message} Your draft has been kept; try sending again.`)
    } finally {
      if (operation === sendOperation.current && mounted.current) setSending(false)
    }
  }

  async function refresh() {
    setLoadingList(true)
    setThreadError('')
    await Promise.all([loadList(), loadThread()])
  }

  async function loadEarlier() {
    if (!view?.next_before || loadingEarlier) return
    setLoadingEarlier(true)
    try {
      earlierController.current?.abort()
    const controller = new AbortController()
    earlierController.current = controller
    const earlier = await source.history(selected!, view.next_before, controller.signal)
      setView(current => current ? { ...earlier, messages: mergeMessages(earlier.messages, current.messages) } : earlier)
      setThreadError('')
    } catch (error) { setThreadError((error as Error).message) }
    finally { if (mounted.current) setLoadingEarlier(false) }
  }

  function select(id: number) {
    if (selected) drafts.current[selected] = draft
    setDraft(drafts.current[id] ?? '')
    setView(null)
    setThreadError('')
    setSendError('')
    setReadNotice('')
    sendOperation.current += 1
    earlierController.current?.abort()
    historyController.current?.abort()
    setSending(false)
    setLoadingThread(false)
    void navigate(`${rootFor(kind)}?conversation=${id}`)
  }
  function back() {
    if (selected) drafts.current[selected] = draft
    sendOperation.current += 1
    earlierController.current?.abort()
    historyController.current?.abort()
    setSending(false)
    setLoadingThread(false)
    void navigate(rootFor(kind))
    requestAnimationFrame(() => threadButton.current?.focus())
  }
  function keySubmit(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Escape') { event.preventDefault(); back(); return }
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') { event.preventDefault(); void send() }
  }
  const copy = COPY[kind]
  const otherPath = kind === 'buddy' ? '/skillshare/messages' : '/buddies/messages'
  const person = view ?? active

  return <div className={`messaging-page messaging-page--${kind}`}>
    <title>{`${copy.title} — UBC Ver.`}</title>
    <section className="messaging-heading" aria-labelledby="messages-title">
      <div><span className="messaging-eyebrow">{copy.context}</span><h1 id="messages-title">{copy.title}</h1><p>Private conversations with your mutual connections.</p></div>
      <div className="messaging-heading-actions"><Link className="messaging-other-inbox" to={otherPath}>{kind === 'buddy' ? 'SkillShare exchanges' : 'Buddies messages'}</Link><Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loadingList || loadingThread}><RefreshCw aria-hidden />Refresh</Button></div>
    </section>
    <div className="messaging-status" role="status">{lastFetched ? `Last fetched ${lastFetched.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : loadingList ? 'Loading your private conversations…' : 'Not yet refreshed'}{readNotice && <span> · {readNotice}</span>}</div>
    {listError && <div className="messaging-error" role="alert">{listError}<Button variant="outline" size="sm" onClick={() => void refresh()}>Retry</Button></div>}
    {rawId && !selected && <div className="messaging-error" role="alert">That conversation link is not valid.<Button variant="outline" size="sm" onClick={back}>Back to inbox</Button></div>}
    <div className={`messaging-layout ${selected ? 'messaging-layout--selected' : ''}`}>
      <aside className="messaging-inbox" aria-label={`${copy.context} inbox`}>
        <h2><Inbox size={18} aria-hidden />Connections<span>{loadingList ? 'Loading' : threads.length}</span></h2>
        {loadingList && threads.length === 0 ? <div className="messaging-skeleton" aria-busy="true" aria-label="Loading conversations"><span /><span /><span /></div>
          : threads.length === 0 && !listError ? <div className="messaging-empty"><UsersRound size={28} aria-hidden /><h3>No connections yet</h3><p>{copy.empty}</p><Link to="/home#skills-matches">Find connections</Link></div>
          : <ul className="messaging-thread-list">{threads.map(thread => <li key={thread.id}><button ref={threadButton} className={`messaging-thread ${selected === thread.id ? 'messaging-thread--active' : ''}`} aria-current={selected === thread.id ? 'page' : undefined} onClick={() => select(thread.id)}>
            <span className="messaging-avatar" aria-hidden>{initials(thread.participant.name)}</span><span className="messaging-thread-copy"><span className="messaging-thread-name"><strong>{thread.participant.name}</strong>{thread.last_message_at && <time dateTime={thread.last_message_at}>{timestamp(thread.last_message_at)}</time>}</span><span className="messaging-preview">{thread.latest_message_preview ?? 'Connection ready to message'}</span></span>{thread.unread_count > 0 && <span className="messaging-unread" aria-label={`${thread.unread_count} unread message${thread.unread_count === 1 ? '' : 's'}`}>{thread.unread_count}</span>}
          </button></li>)}</ul>}
      </aside>
      <section className="messaging-conversation" aria-label="Conversation">
        {!selected ? <div className="messaging-empty messaging-empty--panel"><ArrowLeft size={25} aria-hidden /><h2>{threads.length ? 'Choose a connection' : 'Nothing to open yet'}</h2><p>{threads.length ? 'Select a conversation to plan together. Only the two of you can read it.' : 'Messages can begin once you have a mutual connection.'}</p></div>
          : <><header className="messaging-conversation-header"><button ref={backButton} className="messaging-back" onClick={back}><ArrowLeft size={18} aria-hidden />Back to connections</button><span className="messaging-avatar" aria-hidden>{initials(person?.participant.name ?? '')}</span><div><h2>{person?.participant.name ?? 'Connection'}</h2><p>{kind === 'skill' ? 'SkillShare connection' : 'Buddies connection'}</p></div></header>
            {threadError && !view && <div className="messaging-error" role="alert">{threadError}<Button variant="outline" size="sm" onClick={() => void loadThread()}>Retry</Button></div>}
            {loadingThread && !view && <div className="messaging-skeleton messaging-skeleton--thread" role="status">Loading messages…</div>}
            {view ? <>
              <div className="messaging-history" role="group" aria-label={`Message history with ${view.participant.name}`} aria-busy={loadingThread}>
                {view.has_earlier && <Button className="messaging-earlier" variant="outline" size="sm" loading={loadingEarlier} onClick={() => void loadEarlier()}><ArrowUp size={14} aria-hidden />Load earlier messages</Button>}
                {threadError && <div className="messaging-error" role="alert">{threadError}<Button variant="outline" size="sm" onClick={() => void loadThread()}>Retry</Button></div>}
                {view.messages.length === 0 && <div className="messaging-empty"><h3>No messages yet</h3><p>{copy.hint} Your message is saved only after the server accepts it.</p></div>}
                <ol className="messaging-messages">{view.messages.map(item => <li className={`messaging-message ${item.mine ? 'messaging-message--mine' : 'messaging-message--theirs'}`} key={item.id}><span className="messaging-message-label">{item.mine ? 'You' : item.sender.name}</span><p>{item.body}</p><time dateTime={item.created_at} aria-label={`${item.mine ? 'Sent by you' : `Sent by ${item.sender.name}`} ${timestamp(item.created_at)}`}>{timestamp(item.created_at)}</time></li>)}</ol>
              </div>
              <form className="messaging-composer" onSubmit={event => void send(event)}><label htmlFor="message-draft">Message {view.participant.name}</label><div><textarea ref={draftRef} id="message-draft" value={draft} maxLength={2000} onChange={event => { setDraft(event.target.value); setSendError('') }} onKeyDown={keySubmit} placeholder="Write a plain-text message…" aria-describedby="composer-hint message-error" disabled={sending} /><Button type="submit" disabled={!draft.trim() || sending} aria-busy={sending}>Send<Send size={15} aria-hidden /></Button></div><div className="messaging-composer-meta"><span id="composer-hint">Ctrl/⌘ + Enter to send · Esc for inbox</span><span>{draft.length} / 2,000</span></div>{sendError && <p className="messaging-send-error" id="message-error" role="alert">{sendError}</p>}</form>
            </> : null}
          </>}
      </section>
    </div>
  </div>
}
