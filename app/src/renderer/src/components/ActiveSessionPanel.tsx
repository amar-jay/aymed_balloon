import { useSessionById } from '../use-sessions'
import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Plus, Power, FileDown, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export function ActiveSessionPanel({
  sessionId,
  setSessionId
}: {
  sessionId: number
  setSessionId: (sessionId: number | null) => void
}) {
  const {
    session,
    deleteSession,
    addWeld,
    endSession,
    generatePDF,
    goToAllSessions,
    refresh,
    updateSession
  } = useSessionById(sessionId)
  const resetSessionId = () => setSessionId(null)

  const handleEndSession = async () => {
    const success = await endSession()
    if (success) {
      resetSessionId()
    }
  }

  const handleDeleteSession = async () => {
    await deleteSession()
    resetSessionId()
  }

  const handleAddWeld = async () => {
    // For demo purposes, add a mock weld
    const mockWeld = {
      topHeaterTemperature: Math.random() * 50 + 100,
      bottomHeaterTemperature: Math.random() * 50 + 100,
      powerSupplyVoltage: Math.random() * 5 + 25,
      weldingDuration: Math.floor(Math.random() * 20) + 10,
      coolingDuration: Math.floor(Math.random() * 10) + 5,
      isSuccessful: Math.random() > 0.2, // 80% success rate
      error: Math.random() > 0.8 ? 'Temperature out of range' : undefined
    }
    await addWeld(mockWeld)
  }

  if (!session) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Loading session...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const totalWelds = session.welds.length
  const successCount = session.successCount || 0
  const isActive = !session.endSession

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              Active Session
              {isActive && <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />}
            </CardTitle>
            <CardDescription>
              {session.operatorName} • {session.companyName}
            </CardDescription>
          </div>
          <Badge variant={isActive ? 'default' : 'secondary'}>
            {isActive ? 'Active' : 'Ended'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Total Welds</div>
            <div className="font-semibold">{totalWelds}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Success Rate</div>
            <div className="font-semibold text-green-600">
              {totalWelds > 0 ? `${((successCount / totalWelds) * 100).toFixed(0)}%` : '0%'}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleAddWeld} size="sm" className="flex-1">
            <Plus className="h-4 w-4 mr-1" />
            Add Weld
          </Button>
          <Button onClick={generatePDF} variant="outline" size="sm">
            <FileDown className="h-4 w-4" />
          </Button>
          <Button onClick={handleEndSession} variant="outline" size="sm" disabled={!isActive}>
            <Power className="h-4 w-4" />
          </Button>
          <Button onClick={handleDeleteSession} variant="destructive" size="sm">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
