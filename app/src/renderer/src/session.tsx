// page to manage welding sessions
// export PDF downloads typeshit

import { useCallback, useLayoutEffect, useState } from 'react'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { useSessionById } from './use-sessions'
import { ChevronLeft } from 'lucide-react'

export function WeldSession({ sessionId }: { sessionId: string }) {
  const {
    session,
    goToAllSessions,
    updateSession,
    deleteSession,
    endSession,
    generatePDF
    // addWeld - available for future use when adding welds from UI
  } = useSessionById(Number(sessionId))

  const [operatorName, setOperatorName] = useState('')
  const [companyName, setCompanyName] = useState('')

  // sync name when session changes
  useLayoutEffect(() => {
    if (!session) return
    setOperatorName(session.operatorName || '')
    setCompanyName(session.companyName || '')
  }, [session])

  const handleSave = useCallback(async () => {
    if (!session) return
    await updateSession({
      operatorName,
      companyName,
      startSession: session.startSession,
      endSession: session.endSession,
      welds: session.welds,
      averageTopHeaterTemperature: session.averageTopHeaterTemperature,
      averageBottomHeaterTemperature: session.averageBottomHeaterTemperature,
      averagePowerSupplyVoltage: session.averagePowerSupplyVoltage,
      successCount: session.successCount,
      failureCount: session.failureCount
    })
  }, [session, operatorName, companyName, updateSession])

  return (
    <div className="w-full p-6">
      <Button variant="outline" size="icon" onClick={goToAllSessions}>
        <ChevronLeft />
      </Button>

      <h2 className="text-2xl font-bold mb-4 mt-4">Welding Session Details</h2>
      <p className="text-gray-500 mb-4">Session ID: {sessionId}</p>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1">Operator Name</label>
          <Input
            value={operatorName}
            onChange={(e) => setOperatorName(e.target.value)}
            placeholder="Operator Name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Company Name</label>
          <Input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Company Name"
          />
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <Button onClick={handleSave}>Save Changes</Button>
        {!session?.endSession && (
          <Button variant="secondary" onClick={endSession}>
            End Session
          </Button>
        )}
        <Button variant="outline" onClick={generatePDF}>
          Generate PDF
        </Button>
        <Button variant="destructive" onClick={deleteSession}>
          Delete Session
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded">
        <div>
          <p className="text-sm text-gray-500">Started</p>
          <p>{session?.startSession ? new Date(session.startSession).toLocaleString() : 'N/A'}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Ended</p>
          <p>
            {session?.endSession ? new Date(session.endSession).toLocaleString() : 'In Progress'}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Created At</p>
          <p>{session?.createdAt ? new Date(session.createdAt).toLocaleString() : 'N/A'}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Updated At</p>
          <p>{session?.updatedAt ? new Date(session.updatedAt).toLocaleString() : 'N/A'}</p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-6 p-4 bg-blue-50 rounded">
        <div className="text-center">
          <p className="text-sm text-gray-500">Avg Top Temp</p>
          <p className="text-lg font-semibold">
            {session?.averageTopHeaterTemperature?.toFixed(1) || 0}°C
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500">Avg Bottom Temp</p>
          <p className="text-lg font-semibold">
            {session?.averageBottomHeaterTemperature?.toFixed(1) || 0}°C
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500">Avg Voltage</p>
          <p className="text-lg font-semibold">
            {session?.averagePowerSupplyVoltage?.toFixed(1) || 0}V
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500">Success</p>
          <p className="text-lg font-semibold text-green-600">{session?.successCount || 0}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500">Failures</p>
          <p className="text-lg font-semibold text-red-600">{session?.failureCount || 0}</p>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-xl font-semibold mb-4">
          Welds ({session?.welds?.length || 0})
        </h3>
        {session?.welds && session.welds.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">Top Temp (°C)</th>
                  <th className="px-4 py-2 text-left">Bottom Temp (°C)</th>
                  <th className="px-4 py-2 text-left">Voltage (V)</th>
                  <th className="px-4 py-2 text-left">Welding (s)</th>
                  <th className="px-4 py-2 text-left">Cooling (s)</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Error</th>
                </tr>
              </thead>
              <tbody>
                {session.welds.map((weld, index) => (
                  <tr key={weld.id || index} className="border-t">
                    <td className="px-4 py-2">{index + 1}</td>
                    <td className="px-4 py-2">{weld.topHeaterTemperature}</td>
                    <td className="px-4 py-2">{weld.bottomHeaterTemperature}</td>
                    <td className="px-4 py-2">{weld.powerSupplyVoltage}</td>
                    <td className="px-4 py-2">{weld.weldingDuration}</td>
                    <td className="px-4 py-2">{weld.coolingDuration}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`px-2 py-1 rounded text-sm ${
                          weld.isSuccessful
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {weld.isSuccessful ? 'Success' : 'Failed'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-red-600">{weld.error || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No welds recorded yet.</p>
        )}
      </div>
    </div>
  )
}
