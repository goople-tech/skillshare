import { apiRequest } from '../../api'
import type { Conversation, ConversationKind, Message, MessagePage, ReadState } from './types'

export type MessagingSource = {
  list(kind: ConversationKind, signal?: AbortSignal): Promise<Conversation[]>
  history(id: number, before?: number, signal?: AbortSignal): Promise<MessagePage>
  send(id: number, body: string): Promise<Message>
  markRead(id: number): Promise<ReadState>
}

export const apiMessagingSource: MessagingSource = {
  list: (kind, signal) => apiRequest(`/conversations?kind=${kind}`, { signal, cache: 'no-store' }),
  history: (id, before, signal) => apiRequest(`/conversations/${id}/messages?limit=50${before ? `&before=${before}` : ''}`, { signal, cache: 'no-store' }),
  send: (id, body) => apiRequest(`/conversations/${id}/messages`, { method: 'POST', body: JSON.stringify({ body }), cache: 'no-store' }),
  markRead: (id) => apiRequest(`/conversations/${id}/read`, { method: 'POST', cache: 'no-store' }),
}

/** Merge by durable identity, never by array position; oldest first. */
export function mergeMessages(current: Message[], incoming: Message[]): Message[] {
  const byId = new Map<number, Message>()
  for (const message of [...current, ...incoming]) byId.set(message.id, message)
  return [...byId.values()].sort((a, b) => a.id - b.id)
}
