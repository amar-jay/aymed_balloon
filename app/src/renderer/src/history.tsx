import React from 'react'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { useSessions } from './use-sessions'

export function History(): React.JSX.Element {
  const { sessions, goToSession, createSession, deleteSession } = useSessions()
  const [newSessionName, setNewSessionName] = React.useState('')
  const [companyName, setCompanyName] = React.useState('')

  const onCreateSession = async () => {
    await createSession({
      operatorName: newSessionName,
      companyName: companyName || 'Unknown',
      startSession: new Date().toISOString(),
      welds: [],
      averageTopHeaterTemperature: 0,
      averageBottomHeaterTemperature: 0,
      averagePowerSupplyVoltage: 0,
      successCount: 0,
      failureCount: 0
    })
    setNewSessionName('')
    setCompanyName('')
  }

  return (
    <div className="w-full px-6">
      <h2 className="text-2xl font-bold mb-4">Weld History</h2>
      {/* // create a session here */}
      <div className="mb-4 gap-4 flex flex-col w-full">
        <div className="flex gap-4 items-center">
          <Input
            placeholder="Operator Name"
            className="flex-1"
            value={newSessionName}
            onChange={(e) => setNewSessionName(e.target.value)}
          />
          <Input
            placeholder="Company Name"
            className="flex-1"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
          <Button onClick={onCreateSession}>Create Session</Button>
        </div>
      </div>

      <ul>
        {sessions.map((session) =>
          session.id == null ? null : (
            <li
              key={session.id}
              className="mb-2 p-4 border rounded cursor-pointer hover:bg-gray-50"
              onClick={() => goToSession(session.id!)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold">{session.operatorName}</h3>
                  <p className="text-gray-600">Company: {session.companyName}</p>
                  <p className="text-sm text-gray-500">Session ID: {session.id}</p>
                  <p className="text-sm text-gray-500">
                    Started: {session.startSession ? new Date(session.startSession).toLocaleString() : 'N/A'}
                  </p>
                  {session.endSession && (
                    <p className="text-sm text-gray-500">
                      Ended: {new Date(session.endSession).toLocaleString()}
                    </p>
                  )}
                  <div className="mt-2 text-sm">
                    <span className="text-green-600 mr-4">Success: {session.successCount}</span>
                    <span className="text-red-600">Failures: {session.failureCount}</span>
                    <span className="ml-4">Total Welds: {session.welds?.length || 0}</span>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={async (e) => {
                    e.stopPropagation()
                    await deleteSession(session.id!)
                  }}
                >
                  Delete Session
                </Button>
              </div>
            </li>
          )
        )}
      </ul>
    </div>
  )
}
