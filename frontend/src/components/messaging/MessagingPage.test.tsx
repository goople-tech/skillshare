// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { MessagingPage } from './MessagingPage'
import type { MessagingSource } from './messagingSource'
import type { Conversation, ConversationKind, Message, MessagePage } from './types'

const person = { id: 2, name: 'Jamie Example' }
const message = (id: number, body: string, mine = false): Message => ({ id, conversation_id: 7, kind: 'buddy', body, created_at: '2026-11-01T10:00:00Z', mine, sender: mine ? { id: 1, name: 'Current Student' } : person })
const thread: Conversation = { id: 7, kind: 'buddy', participant: person, last_message_id: 8, latest_message_preview: 'Library later?', last_message_at: '2026-11-01T10:00:00Z', unread_count: 1 }
const page = (...messages: Message[]): MessagePage => ({ conversation_id: 7, kind: 'buddy', participant: person, messages, has_earlier: false, next_before: null })
const source = (overrides: Partial<MessagingSource> = {}): MessagingSource => ({
  list: vi.fn(async () => [thread]), history: vi.fn(async () => page(message(8, '<script>not HTML</script>'))),
  send: vi.fn(async (_id, body) => message(9, body, true)),
  markRead: vi.fn(async () => ({ conversation_id: 7, last_read_message_id: 8, read_at: '2026-11-01T10:30:00Z', unread_count: 0 })),
  ...overrides,
})
function display(api: MessagingSource, kind: ConversationKind = 'buddy', query = '') {
  const prefix = kind === 'buddy' ? '/buddies/messages' : '/skillshare/messages'
  const router = createMemoryRouter([{ path: prefix, element: <MessagingPage kind={kind} source={api} /> }, { path: '/home', element: <p>Dashboard</p> }], { initialEntries: [prefix + query] })
  const view = render(<RouterProvider router={router} />)
  return { router, ...view }
}
afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('shared messaging UI', () => {
  it('navigates both route kinds and returns from a selected mobile thread', async () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as MediaQueryList)
    const api = source()
    const displayResult = display(api, 'skill')
    expect(await screen.findByRole('heading', { name: 'SkillShare exchanges' })).toBeVisible()
    await userEvent.click(await screen.findByRole('button', { name: /Jamie Example/ }))
    expect(displayResult.router.state.location.search).toBe('?conversation=7')
    expect(await screen.findByRole('group', { name: 'Message history with Jamie Example' })).toBeVisible()
    expect(screen.getByText('<script>not HTML</script>')).toBeVisible()
    expect(document.querySelector('script')).toBeNull()
    expect(api.list).toHaveBeenCalledWith('skill', expect.any(AbortSignal))
    const back = screen.getByRole('button', { name: 'Back to connections' })
    await waitFor(() => expect(back).toHaveFocus())
    await userEvent.click(back)
    expect(displayResult.router.state.location.search).toBe('')
    await waitFor(() => expect(document.activeElement).toHaveClass('messaging-thread'))
    displayResult.unmount()
    const buddy = display(source())
    expect(await screen.findByRole('heading', { name: 'Messages' })).toBeVisible()
    await userEvent.click(await screen.findByRole('button', { name: /Jamie Example/ }))
    expect(buddy.router.state.location.pathname).toBe('/buddies/messages')
  })

  it('keeps failed drafts and retries until the server acknowledges once', async () => {
    const api = source({ send: vi.fn().mockRejectedValueOnce(new Error('Service offline')).mockResolvedValueOnce(message(9, 'A planned study break', true)), history: vi.fn(async () => page()), markRead: vi.fn(async () => ({ conversation_id: 7, last_read_message_id: 9, read_at: null, unread_count: 0 })) })
    display(api, 'buddy', '?conversation=7')
    const composer = await screen.findByLabelText('Message Jamie Example')
    await userEvent.type(composer, 'A planned study break')
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Service offline')
    expect(composer).toHaveValue('A planned study break')
    expect(document.querySelector('.messaging-messages li')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))
    await waitFor(() => expect(document.querySelector('.messaging-message--mine p')).toHaveTextContent('A planned study break'))
    expect(composer).toHaveValue('')
    expect(api.send).toHaveBeenCalledTimes(2)
  })

  it('uses keyboard send and confirms unread state only through the server', async () => {
    const api = source({ send: vi.fn(async (_id, body) => message(9, body, true)) })
    display(api)
    expect(await screen.findByLabelText('1 unread message')).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: /Jamie Example/ }))
    const composer = await screen.findByLabelText('Message Jamie Example')
    await userEvent.type(composer, 'Message text')
    await userEvent.keyboard('{Control>}{Enter}{/Control}')
    await waitFor(() => expect(api.send).toHaveBeenCalledWith(7, 'Message text'))
    await waitFor(() => expect(document.querySelector('.messaging-message--mine p')).toHaveTextContent('Message text'))
    expect(api.markRead).toHaveBeenCalled()
    expect(screen.queryByText('Delivered')).toBeNull()
  })

  it('shows explicit empty and recoverable error states instead of sample messages', async () => {
    const api = source({ list: vi.fn().mockRejectedValueOnce(new Error('Service unavailable')).mockResolvedValue([]) })
    display(api)
    expect(await screen.findByRole('alert')).toHaveTextContent('Service unavailable')
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('heading', { name: 'No connections yet' })).toBeVisible()
    expect(document.querySelector('.messaging-messages li')).toBeNull()
    expect(screen.queryByText('Live now')).toBeNull()
  })

  it('deduplicates refreshed/earlier history by server ID', async () => {
    const api = source({ history: vi.fn(async (_id, before) => before ? page(message(2, 'Earlier'), message(8, 'Existing')) : { ...page(message(8, 'Existing')), has_earlier: true, next_before: 8 }) })
    display(api, 'buddy', '?conversation=7')
    expect(await screen.findByText('Existing')).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Load earlier messages' }))
    expect(await screen.findByText('Earlier')).toBeVisible()
    expect(screen.getAllByText('Existing')).toHaveLength(1)
    const composer = screen.getByLabelText('Message Jamie Example')
    await userEvent.type(composer, 'Draft')
    api.list = vi.fn(async () => { await new Promise(resolve => setTimeout(resolve, 25)); throw new Error('Refresh unavailable') })
    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Refresh unavailable'))
    expect(composer).toHaveValue('Draft')
  })

  it('prevents concurrent submissions and respects hidden documents', async () => {
    let resolve = (_value: Message) => {}
    const pending = new Promise<Message>(done => { resolve = done })
    const api = source({ history: vi.fn(async () => page(message(8, 'One message'))), markRead: vi.fn(async () => { throw new Error('No read confirmation') }), send: vi.fn(() => pending) })
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    display(api, 'buddy', '?conversation=7')
    await screen.findByText('One message')
    expect(api.markRead).not.toHaveBeenCalled()
    const composer = await screen.findByLabelText('Message Jamie Example')
    await userEvent.type(composer, 'Send only once')
    fireEvent.submit(composer.closest('form')!)
    expect(api.send).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
    resolve(message(9, 'Send only once', true))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Message saved. Could not update your read position'))
  }, 20_000)
}, 25_000)
