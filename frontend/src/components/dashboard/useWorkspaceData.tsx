import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { WorkspaceData, WorkspaceSnapshot } from './types'
import { emptySnapshot, initialPreviewProfile } from './types'
import type { WorkspaceDataSource } from './dataSource'
import { PreviewWorkspaceDataSource } from './previewDataSource'
import type { SessionUser } from './session'

const WorkspaceContext = createContext<WorkspaceData | null>(null)

/**
 * State and concurrency only. Cards never depend on HTTP, storage, or a source
 * implementation. Supply an API source in home.tsx when the backend is ready.
 */
export function WorkspaceProvider({ children, source, user }: { children: ReactNode; source?: WorkspaceDataSource; user?: SessionUser | null }) {
  const initialUser = useRef(user)
  const sourceRef = useRef<WorkspaceDataSource | null>(null)
  if (!sourceRef.current) {
    sourceRef.current = source ?? new PreviewWorkspaceDataSource()
    const previewProfile = { ...initialPreviewProfile, imageUrl: initialUser.current?.imageUrl }
    sourceRef.current.setProfile?.(previewProfile)
  }
  const adapter = sourceRef.current
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot>(emptySnapshot)
  const selectPreviewMode = useCallback(async (isNewStudent: boolean) => {
    if (!adapter.setNewStudentMode) return
    const next = await adapter.setNewStudentMode(isNewStudent)
    if (mounted.current) setSnapshot(next)
  }, [adapter])
  const [status, setStatus] = useState<WorkspaceData['status']>('loading')
  const [error, setError] = useState('')
  const [busyKeys, setBusyKeys] = useState<string[]>([])
  const [editProfileOpen, setEditProfileOpen] = useState(false)
  const pending = useRef(new Set<string>())
  const mounted = useRef(true)

  const retry = useCallback(async () => {
    setStatus('loading'); setError('')
    try {
      const loaded = await adapter.load()
      if (!mounted.current) return
      setSnapshot(loaded)
      setStatus('ready')
    } catch (reason) {
      if (!mounted.current) return
      setStatus('error')
      setError(reason instanceof Error ? reason.message : 'The workspace could not be loaded.')
    }
  }, [adapter])

  useEffect(() => { mounted.current = true; void retry(); return () => { mounted.current = false } }, [retry])
  const perform = useCallback(async (key: string, mutation: () => Promise<unknown>, success: string): Promise<string> => {
    if (pending.current.has(key)) return success
    pending.current.add(key)
    setBusyKeys(Array.from(pending.current)); setError('')
    try {
      await mutation()
      if (!mounted.current) return success
      setSnapshot(await adapter.load())
      return success
    } catch (reason) {
      if (mounted.current) setError(reason instanceof Error ? reason.message : 'Something went wrong. Please try again.')
      throw reason
    } finally {
      pending.current.delete(key)
      if (mounted.current) setBusyKeys(Array.from(pending.current))
    }
  }, [adapter])
  const acceptRequest = useCallback((id: string) => perform(`request:${id}`, () => adapter.respondToRequest(id, 'accepted'), 'Preview request updated. No notification was delivered.'), [perform, adapter])
  const declineRequest = useCallback((id: string) => perform(`request:${id}`, () => adapter.respondToRequest(id, 'declined'), 'Preview request updated. No notification was delivered.'), [perform, adapter])
  const connect = useCallback((id: string) => perform(`person:${id}`, () => adapter.connectWithPerson(id), 'Preview connection saved. No request was sent.'), [perform, adapter])
  const sendExchange = useCallback((id: string) => perform(`exchange:${id}`, () => adapter.requestSkillExchange(id), 'Preview exchange saved. No request was sent.'), [perform, adapter])
  const markAllRead = useCallback(() => perform('activity:read', () => adapter.markAllActivityRead(), 'Preview activity marked as read.'), [perform, adapter])
  const updateProfile = useCallback((profile: WorkspaceSnapshot['profile']) => perform('profile:update', () => adapter.updateProfile(profile), 'Profile updated in this preview only. No server update was performed.'), [perform, adapter])
  const createSkillOffer = useCallback((offer: Parameters<WorkspaceDataSource['createSkillOffer']>[0]) => perform('offer:skill', () => adapter.createSkillOffer(offer), 'Skill offer saved in this preview only. Nothing was published or sent.'), [perform, adapter])
  const createProjectOffer = useCallback((offer: Parameters<WorkspaceDataSource['createProjectOffer']>[0]) => perform('offer:project', () => adapter.createProjectOffer(offer), 'Project idea saved in this preview only. Nothing was published or sent.'), [perform, adapter])

  const value = useMemo<WorkspaceData>(() => ({ kind: adapter.kind, sourceDescription: adapter.description, status, error, snapshot, retry, acceptRequest, declineRequest, connect, sendExchange, markAllRead, updateProfile, createSkillOffer, createProjectOffer, selectPreviewMode, isBusy: (key) => busyKeys.includes(key), editProfileOpen, setEditProfileOpen }), [adapter.kind, adapter.description, status, error, snapshot, retry, acceptRequest, declineRequest, connect, sendExchange, markAllRead, updateProfile, createSkillOffer, createProjectOffer, busyKeys, selectPreviewMode, editProfileOpen])
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}
export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (!context) throw new Error('Workspace requires its provider')
  return context
}
