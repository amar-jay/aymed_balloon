import { useSessionById } from '../hooks/use-sessions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Plus, Power, FileDown, Trash2 } from 'lucide-react'

export function ActiveSessionPanel({
  session,
  resetSessionId,
  deleteSession,
  addWeld: handleAddWeld,
  endSession,
  generatePDF
}: {
  session: ReturnType<typeof useSessionById>['session']
  resetSessionId: () => void
  deleteSession: () => Promise<void>
  addWeld: (notify?: boolean) => Promise<void>
  endSession: () => Promise<boolean>
  generatePDF: () => Promise<void>
}) {
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
          <div className="flex-1"></div>
          <Button onClick={() => handleAddWeld()} size="sm">
            {/* // className="flex-1"> */}
            <Plus className="h-4 w-4 mr-1" />
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
