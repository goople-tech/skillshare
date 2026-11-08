import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { WorkspaceData, WorkspaceSnapshot } from './types'
import { emptySnapshot } from './types'
import { sampleSnapshot } from './sampleData'

const WorkspaceContext = createContext<WorkspaceData | null>(null)

/** Local-only preview adapter. Production must enforce data and eligibility server-side. */
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot>(emptySnapshot)
  const [status, setStatus] = useState<WorkspaceData['status']>('loading')
  const [editProfileOpen, setEditProfileOpen] = useState(false)
  const [busyActions, setBusyActions] = useState<string[]>([])
  const pending = useRef(new Set<string>())
  const mounted = useRef(true)

  const retry = useCallback(async () => {
    setStatus('loading')
    await new Promise((resolve) => setTimeout(resolve, 100))
    if (!mounted.current) return
    setSnapshot((current) => ({ ...sampleSnapshot, profile: current.profile }))
    setStatus('ready')
  }, [])
  useEffect(() => { mounted.current = true; void retry(); return () => { mounted.current = false } }, [retry])

  const perform = useCallback(async (key: string, update: (current: WorkspaceSnapshot) => WorkspaceSnapshot) => {
    if (pending.current.has(key)) return
    pending.current.add(key)
    setBusyActions(Array.from(pending.current))
    await new Promise((resolve) => setTimeout(resolve, 150))
    if (mounted.current) setSnapshot(update)
    pending.current.delete(key)
    if (mounted.current) setBusyActions(Array.from(pending.current))
  }, [])
  const acceptRequest = useCallback(async (id: string) => {
    await perform(`request:${id}`, (current) => ({ ...current, requests: current.requests.map((entry) => entry.id === id ? { ...entry, status: 'accepted' } : entry) }))
  }, [perform])
  const declineRequest = useCallback(async (id: string) => {
    await perform(`request:${id}`, (current) => ({ ...current, requests: current.requests.map((entry) => entry.id === id ? { ...entry, status: 'declined' } : entry) }))
  }, [perform])
  const connect = useCallback(async (personId: string) => {
    await perform(`person:${personId}`, (current) => ({ ...current, people: current.people.map((person) => person.id === personId ? { ...person, invited: true } : person) }))
  }, [perform])
  const sendExchange = useCallback(async (exchangeId: string) => {
    await perform(`exchange:${exchangeId}`, (current) => ({ ...current, matches: current.matches.map((match) => match.id === exchangeId ? { ...match, invited: true } : match) }))
  }, [perform])
  const markAllRead = useCallback(async () => {
    await perform('activity:read', (current) => ({ ...current, activities: current.activities.map((activity) => ({ ...activity, unread: false })) }))
  }, [perform])
  const setDemoMode: WorkspaceData['setDemoMode'] = useCallback(async (mode) => {
    setSnapshot((previous) => mode === 'empty' ? { ...emptySnapshot, profile: previous.profile } : { ...sampleSnapshot, profile: previous.profile })
  }, [])

  const value = useMemo<WorkspaceData>(() => ({ status, snapshot, retry, acceptRequest, declineRequest, connect, sendExchange, markAllRead, setDemoMode, busyActions, editProfileOpen, setEditProfileOpen }), [status, snapshot, retry, acceptRequest, declineRequest, connect, sendExchange, markAllRead, setDemoMode, busyActions, editProfileOpen])
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}
export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (!context) throw new Error('Workspace requires its provider')
  return context
}
