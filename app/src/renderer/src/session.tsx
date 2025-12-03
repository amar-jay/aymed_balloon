// page to manage welding sessions
// export PDF downloads typeshit

import { useCallback, useEffect, useState } from 'react'
import { useSessionById } from './use-sessions'
import { SessionHeader } from './components/SessionHeader'
import { QuickStats } from './components/QuickStats'
import { WeldsTable } from './components/WeldsTable'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from './components/ui/dialog'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { Label } from './components/ui/label'

export function WeldSession({ sessionId }: { sessionId: string }) {
  const { session, goToAllSessions, updateSession, deleteSession, endSession, generatePDF } =
    useSessionById(Number(sessionId))

  const [operatorName, setOperatorName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  // sync name when session changes
  useEffect(() => {
    if (!session) return
    setOperatorName(session.operatorName || '')
    setCompanyName(session.companyName || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.operatorName, session?.companyName])

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
    console.log('Saved session changes:', operatorName, companyName)
  }, [session, updateSession, operatorName, companyName])

  const handleOpenEditDialog = useCallback(() => {}, [])

  const handleSaveEditDialog = useCallback(async () => {
    setOperatorName(operatorName)
    setCompanyName(companyName)
    setIsEditDialogOpen(false)
    handleSave()
    // The actual save will happen when the user clicks the Save button in the header
  }, [operatorName, companyName, handleSave])
  const handleCancelEditDialog = useCallback(() => {
    setIsEditDialogOpen(false)
  }, [])
  if (!session) {
    return (
      <div className="min-h-screen flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Loading session data...</p>
      </div>
    )
  }

  const isActive = !session.endSession
  const totalWelds = session.welds?.length || 0
  const successRate = totalWelds > 0 ? ((session.successCount || 0) / totalWelds) * 100 : 0

  // Calculate session duration
  const startTime = session.startSession ? new Date(session.startSession).getTime() : 0
  const endTime = session.endSession ? new Date(session.endSession).getTime() : Date.now()
  const durationMs = endTime - startTime
  const durationHours = Math.floor(durationMs / (1000 * 60 * 60))
  const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))

  return (
    <div className="min-h-screen flex-1 grow bg-accent-foreground/5 rounded-l-2xl">
      <div className="px-8 py-8 space-y-8 mx-auto">
        {/* Hero Header Section */}
        <SessionHeader
          isActive={isActive}
          onGoToAllSessions={goToAllSessions}
          onEndSession={endSession}
          onGeneratePDF={generatePDF}
          onDelete={deleteSession}
          onEdit={() => setIsEditDialogOpen(true)}
          operatorName={operatorName}
          companyName={companyName}
        >
          <QuickStats
            averageTopHeaterTemperature={session.averageTopHeaterTemperature}
            averageBottomHeaterTemperature={session.averageBottomHeaterTemperature}
            averagePowerSupplyVoltage={session.averagePowerSupplyVoltage}
            durationHours={durationHours}
            durationMinutes={durationMinutes}
            totalWelds={totalWelds}
            successRate={successRate}
            startSession={session.startSession}
          />
        </SessionHeader>

        {/* Dialog to edit company and operator name */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Session Details</DialogTitle>
              <DialogDescription>
                Update the operator name and company name for this welding session.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="operator-name" className="text-right">
                  Operator Name
                </Label>
                <Input
                  id="operator-name"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  className="col-span-3"
                  placeholder="Enter operator name"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="company-name" className="text-right">
                  Company Name
                </Label>
                <Input
                  id="company-name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="col-span-3"
                  placeholder="Enter company name"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCancelEditDialog}>
                Cancel
              </Button>
              <Button onClick={handleSaveEditDialog}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <WeldsTable welds={session.welds || []} totalWelds={totalWelds} />
      </div>
    </div>
  )
}
