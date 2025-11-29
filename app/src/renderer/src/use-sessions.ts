import React, { useCallback, useMemo } from 'react'
import { currentPathAtom } from './lib/jotai'
import { useAtom } from 'jotai/react'
// use the session-related APIs exposed in the preload script
export function useSessions() {
  const [, setCurrentPath] = useAtom(currentPathAtom)
  const [sessions, setSessions] = React.useState<
    NonNullable<Awaited<ReturnType<typeof window.api.DBgetSessions>>>
  >([])

  React.useEffect(() => {
    const fetchSession = async () => {
      const fetchedSessions = await window.api.DBgetSessions()
      if (fetchedSessions) {
        setSessions(fetchedSessions)
      }
    }
    fetchSession()
  }, [])

  const handleGoToSession = useCallback(
    (sessionId: number) => {
      // Implement navigation to session detail view
      console.log(`Navigating to session with ID: ${sessionId}`)
      setCurrentPath(`sessions/${sessionId}`)
      // Example: navigate(`/sessions/${sessionId}`);
    },
    [setCurrentPath]
  )

  const handleCreateSession = React.useCallback(
    async (sessionId: number) => {
      // Implement save session logic here
      const newSessionId = await window.api.DBcreateSession(`Session ${sessionId}`, {})
      handleGoToSession(newSessionId as number)
      return newSessionId
    },
    [handleGoToSession]
  )

  const handleDeleteSession = React.useCallback(
    async (sessionId: number) => {
      // Implement delete session logic here
      window.api.DBdeleteSession(sessionId)
      setCurrentPath('sessions')
    },
    [setCurrentPath]
  )

  const handleUpdateSession = React.useCallback(
    async (sessionId: number, name: string, data: unknown) => {
      return window.api.DBupdateSession(sessionId, name, data)
    },
    []
  )

  const handleGeneratePDF = React.useCallback(async (sessionId: number) => {
    return window.api.DBgenerateSessionPDF(sessionId)
  }, [])

  const memoizedSessions = useMemo(() => sessions, [sessions])

  return {
    sessions: memoizedSessions,
    createSession: handleCreateSession,
    deleteSession: handleDeleteSession,
    updateSession: handleUpdateSession,
    generatePDF: handleGeneratePDF,
    goToSession: handleGoToSession
  }
}

type RemoveUndefined<T> = T extends undefined ? never : T | null
export function useSessionsById(sessionId: number) {
  const [session, setSession] =
    React.useState<RemoveUndefined<Awaited<ReturnType<typeof window.api.DBgetSession>>>>(null)
  React.useEffect(() => {
    const fetchSession = async () => {
      const fetchedSession = await window.api.DBgetSession(sessionId)
      if (fetchedSession) {
        setSession(fetchedSession)
      }
    }
    fetchSession()
  }, [sessionId])
  // Generate PDF for a session
  const generatePDF = async () => {
    try {
      const filePath = await window.api.DBgenerateSessionPDF(sessionId)
      if (filePath) {
        console.log('PDF saved to:', filePath)
        // Optionally show a success message or open the PDF
      } else {
        console.log('PDF generation cancelled')
      }
    } catch (error) {
      console.error('Failed to generate PDF:', error)
    }
  }

  const updateSession = async (name: string, data: unknown) => {
    try {
      const success = await window.api.DBupdateSession(sessionId, name, data)
      if (success) {
        const updatedSession = await window.api.DBgetSession(sessionId)
        if (updatedSession) {
          setSession(updatedSession)
        }
      }
      return success
    } catch (error) {
      console.error('Failed to update session:', error)
      return false
    }
  }
  const memoizedSession = useMemo(() => session, [session])
  return { session: memoizedSession, generatePDF, updateSession }
}
