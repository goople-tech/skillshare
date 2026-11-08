import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Send, X } from 'lucide-react'
import type { SwipeDataSource } from './swipeSource'
import type { MessageView, SwipeCardView } from './types'

const POLL_MS = 4000
const time = (iso: string) => {
  const date = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : `${iso}Z`)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

/** Chat with one matched student in a native modal dialog. Polls for new messages while open. */
export function ChatDialog({ person, source, onClose }: { person: SwipeCardView; source: SwipeDataSource; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const listRef = useRef<HTMLOListElement>(null)
  const lastId = useRef(0)
  const [messages, setMessages] = useState<MessageView[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
    return () => { if (dialog?.open) dialog.close() }
  }, [])

  const append = useCallback((incoming: MessageView[]) => {
    if (!incoming.length) return
    setMessages((current) => {
      const seen = new Set(current.map((m) => m.id))
      const merged = [...current, ...incoming.filter((m) => !seen.has(m.id))].sort((a, b) => a.id - b.id)
      lastId.current = merged[merged.length - 1]?.id ?? lastId.current
      return merged
    })
  }, [])

  const poll = useCallback(async () => {
    try {
      append(await source.loadMessages(person.id, lastId.current))
      setStatus('ready'); setError('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load messages.')
      setStatus((current) => current === 'loading' ? 'error' : current)
    }
  }, [append, person.id, source])

  useEffect(() => {
    void poll()
    const timer = window.setInterval(() => { if (!document.hidden) void poll() }, POLL_MS)
    return () => window.clearInterval(timer)
  }, [poll])

  useEffect(() => { listRef.current?.lastElementChild?.scrollIntoView({ block: 'end' }) }, [messages.length])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const body = draft.trim()
    if (!body || sending) return
    setSending(true); setError('')
    try {
      append([await source.sendMessage(person.id, body)]) // shown only after the server stores it
      setDraft('')
    } catch (reason) {
      setError(reason instanceof Error ? `Not sent: ${reason.message}` : 'Not sent. Try again.')
    } finally {
      setSending(false)
    }
  }

  return <dialog ref={dialogRef} className="chat-dialog" aria-labelledby="chat-title" onClose={onClose}>
    <header className="chat-header">
      <span className="match-tile-avatar match-tile-avatar--buddy" aria-hidden="true">{person.initials}</span>
      <div><h2 id="chat-title">{person.name}</h2><p>You both said yes · be kind, keep it on campus</p></div>
      <button type="button" className="swipe-close" onClick={() => dialogRef.current?.close()} aria-label="Close chat"><X size={18} /></button>
    </header>
    <div className="chat-body">
      {status === 'loading' && <p className="chat-empty">Loading messages…</p>}
      {status === 'error' && <p className="chat-empty" role="alert">{error}</p>}
      {status === 'ready' && !messages.length && <p className="chat-empty">Say hi! Suggest a course, a skill swap or a spot on campus to meet.</p>}
      <ol ref={listRef} className="chat-list" aria-live="polite">
        {messages.map((message) => <li key={message.id} className={`chat-bubble${message.mine ? ' chat-bubble--mine' : ''}`}>
          <span>{message.body}</span><time dateTime={message.sentAt}>{time(message.sentAt)}</time>
        </li>)}
      </ol>
    </div>
    {status === 'ready' && error && <p className="swipe-notice" role="alert">{error}</p>}
    <form className="chat-form" onSubmit={submit}>
      <label className="sr-only" htmlFor="chat-input">Message {person.name}</label>
      <input id="chat-input" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={1000} placeholder={`Message ${person.name.split(' ')[0]}…`} autoComplete="off" disabled={status === 'error'} autoFocus />
      <button type="submit" className="button" disabled={!draft.trim() || sending || status === 'error'}><Send size={16} /> {sending ? 'Sending…' : 'Send'}</button>
    </form>
  </dialog>
}
