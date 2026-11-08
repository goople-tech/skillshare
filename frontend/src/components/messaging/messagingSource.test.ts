import { describe, expect, it } from 'vitest'
import { mergeMessages } from './messagingSource'
import type { Message } from './types'

const message = (id: number, body: string): Message => ({ id, conversation_id: 1, kind: 'buddy', body, created_at: '2026-01-01T00:00:00', mine: false, sender: { id: 2, name: 'Test' } })
describe('message history merging', () => {
  it('deduplicates by server ID and sorts oldest to newest', () => {
    expect(mergeMessages([message(5, 'latest'), message(2, 'old')], [message(5,'latest'), message(1, 'first'), message(9, 'new')]).map(row => row.id)).toEqual([1, 2, 5, 9])
  })
})
