export type ConversationKind = 'buddy' | 'skill'
export type ChatPerson = { id: number; name: string }
export type Conversation = {
  id: number; kind: ConversationKind; participant: ChatPerson
  last_message_id: number | null; latest_message_preview: string | null
  last_message_at: string | null; unread_count: number
}
export type Message = {
  id: number; conversation_id: number; kind: ConversationKind; body: string
  created_at: string; mine: boolean; sender: ChatPerson
}
export type MessagePage = {
  conversation_id: number; kind: ConversationKind; participant: ChatPerson
  messages: Message[]; has_earlier: boolean; next_before: number | null
}
export type ReadState = { conversation_id: number; last_read_message_id: number | null; read_at: string | null; unread_count: number }
