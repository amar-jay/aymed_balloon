import React, { useCallback, useMemo } from 'react'
import { currentPathAtom } from './lib/jotai'
import { useAtom } from 'jotai/react'
import { toast } from 'sonner'
import type { Session, Weld } from '../../preload/index.d'

/**
 * This hook provides session data and actions for all sessions. It includes
 * functions to create, delete, update sessions, generate PDFs, and navigate
 * to specific session details.
 * @returns \{ sessions, createSession, deleteSession, updateSession, generatePDF, goToSession \}
 */
export function useSessions() {
  const [, setCurrentPath] = useAtom(currentPathAtom)
  const [sessions, setSessions] = React.useState<Session[]>([])

  const fetchSessions = React.useCallback(async () => {
    const fetchedSessions = await window.api.DBgetSessions()
    if (fetchedSessions) {
      setSessions(fetchedSessions)
    }
  }, [])

  // load once
  React.useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const handleGoToSession = useCallback(
    (sessionId: number) => {
      setCurrentPath(`sessions/${sessionId}`)
    },
    [setCurrentPath]
  )

  const handleCreateSession = React.useCallback(
    async (session: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        const newSessionId = await window.api.DBcreateSession(session)

        toast.success('Session created successfully')

        // refresh list after creation
        await fetchSessions()

        // handleGoToSession(newSessionId as number)
        return newSessionId
      } catch (error) {
        toast.error('Failed to create session')
        throw error
      }
    },
    [fetchSessions]
  )

  const handleDeleteSession = React.useCallback(
    async (sessionId: number) => {
      try {
        await window.api.DBdeleteSession(sessionId)
        toast.success('Session deleted successfully')

        await fetchSessions()
      } catch {
        toast.error('Failed to delete session')
      }
    },
    [fetchSessions]
  )

  const handleUpdateSession = React.useCallback(
    async (sessionId: number, session: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        const result = await window.api.DBupdateSession(sessionId, session)
        toast.success('Session updated successfully')

        // refresh whole list so UI stays in sync
        await fetchSessions()

        return result
      } catch (error) {
        toast.error('Failed to update session')
        throw error
      }
    },
    [fetchSessions]
  )

  const handleGeneratePDF = React.useCallback(async (sessionId: number) => {
    try {
      const result = await window.api.DBgenerateSessionPDF(sessionId)
      toast.success('PDF generated successfully')
      return result
    } catch (error) {
      toast.error('Failed to generate PDF')
      throw error
    }
  }, [])

  return {
    sessions,
    createSession: handleCreateSession,
    deleteSession: handleDeleteSession,
    updateSession: handleUpdateSession,
    refreshSession: fetchSessions,
    generatePDF: handleGeneratePDF,
    goToSession: handleGoToSession
  }
}

type RemoveUndefined<T> = T extends undefined ? never : T | null

export function useSessionById(sessionId: number) {
  const [, setCurrentPath] = useAtom(currentPathAtom)

  type SafeSession = RemoveUndefined<Session>

  const [session, setSession] = React.useState<SafeSession>(null)

  const fetchSession = useCallback(async () => {
    const fetched = await window.api.DBgetSession(sessionId)
    if (fetched) setSession(fetched)
  }, [sessionId])

  React.useEffect(() => {
    fetchSession()
  }, [fetchSession])

  // PDF generation
  const generatePDF = useCallback(async () => {
    try {
      const filePath = await window.api.DBgenerateSessionPDF(sessionId)
      if (filePath) {
        toast.success('PDF saved successfully')
      } else {
        toast.info('PDF generation cancelled')
      }
    } catch {
      toast.error('Failed to generate PDF')
    }
  }, [sessionId])

  // Update session
  const updateSession = useCallback(
    async (session: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        const success = await window.api.DBupdateSession(sessionId, session)
        if (success) {
          await fetchSession()
          toast.success('Session updated successfully')
        }
        return success
      } catch {
        toast.error('Failed to update session')
        return false
      }
    },
    [sessionId, fetchSession]
  )

  // Add weld to session
  const addWeld = useCallback(
    async (weld: Omit<Weld, 'id' | 'createdAt'>) => {
      try {
        const weldId = await window.api.DBaddWeldToSession(sessionId, weld)
        await fetchSession()
        toast.success('Weld added successfully')
        return weldId
      } catch {
        toast.error('Failed to add weld')
        return null
      }
    },
    [sessionId, fetchSession]
  )

  // End session
  const endSession = useCallback(async () => {
    try {
      const success = await window.api.DBendSession(sessionId)
      if (success) {
        await fetchSession()
        toast.success('Session ended successfully')
      }
      return success
    } catch {
      toast.error('Failed to end session')
      return false
    }
  }, [sessionId, fetchSession])

  // Delete
  const deleteSession = useCallback(async () => {
    try {
      await window.api.DBdeleteSession(sessionId)
      toast.success('Session deleted successfully')
      setCurrentPath('sessions')
    } catch {
      toast.error('Failed to delete session')
    }
  }, [sessionId, setCurrentPath])

  const goToAllSessions = useCallback(() => {
    setCurrentPath('sessions')
  }, [setCurrentPath])

  const memoizedSession = useMemo(() => session, [session])


  return {
    session: memoizedSession,
    refresh: fetchSession,
    generatePDF,
    updateSession,
    addWeld,
    endSession,
    deleteSession,
    goToAllSessions
  }
}
