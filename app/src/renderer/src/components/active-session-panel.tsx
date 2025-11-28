import * as React from 'react'
import { Card } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { SessionData, sessionManager } from '../lib/session-manager'
import { PDFGenerator } from '../lib/pdf-generator'
import { Play, StopCircle, XCircle, FileText, Users, Package } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@renderer/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Input } from './ui/input'
import { Field, FieldContent, FieldLabel } from './ui/field'

interface ActiveSessionPanelProps {
  session: SessionData | null
  onEndSession: () => void
}

export function ActiveSessionPanel({ session, onEndSession }: ActiveSessionPanelProps) {
  const [showEndDialog, setShowEndDialog] = React.useState(false)
  const [notes, setNotes] = React.useState('')
  const [elapsedTime, setElapsedTime] = React.useState(0)

  // Update elapsed time every second
  React.useEffect(() => {
    if (!session) return

    const interval = setInterval(() => {
      const elapsed = (Date.now() - session.startTime.getTime()) / 1000
      setElapsedTime(elapsed)
    }, 1000)

    return () => clearInterval(interval)
  }, [session])

  if (!session) {
    return null
  }

  const handleEndSession = () => {
    const completedSession = sessionManager.endSession(notes.trim() || undefined)
    if (completedSession) {
      toast.success('Session Ended', {
        description: `Session completed with ${completedSession.totalWelds} welds`
      })
      onEndSession()
      setShowEndDialog(false)
      setNotes('')
    }
  }

  const handleAbortSession = () => {
    if (confirm('Are you sure you want to abort this session? All data will be saved.')) {
      const abortedSession = sessionManager.abortSession('Manually aborted by operator')
      if (abortedSession) {
        toast.warning('Session Aborted')
        onEndSession()
      }
    }
  }

  const handleGeneratePDF = async () => {
    try {
      await PDFGenerator.generateSessionReport(session)
      toast.success('PDF Report Generated')
    } catch (error) {
      toast.error('Failed to generate PDF', {
        description: (error as Error).message
      })
    }
  }

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const successRate =
    session.totalWelds > 0 ? ((session.successfulWelds / session.totalWelds) * 100).toFixed(1) : '0.0'

  return (
    <>
      <Card className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border-blue-200 dark:border-blue-800">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <div>
              <h3 className="font-semibold text-lg">Active Session</h3>
              <p className="text-sm text-muted-foreground">{session.id}</p>
            </div>
          </div>
          <Badge variant="default" className="bg-green-600">
            RECORDING
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <div className="text-xs text-muted-foreground mb-1">
              <Users className="w-3 h-3 inline mr-1" />
              Operator
            </div>
            <div className="font-medium">{session.operatorName}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">
              <Package className="w-3 h-3 inline mr-1" />
              Batch
            </div>
            <div className="font-medium">{session.batchNumber || 'N/A'}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Elapsed Time</div>
            <div className="font-mono font-semibold text-lg">{formatTime(elapsedTime)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Start Time</div>
            <div className="font-medium text-sm">
              {session.startTime.toLocaleTimeString()}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600">{session.totalWelds}</div>
            <div className="text-xs text-muted-foreground">Total Welds</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">{session.successfulWelds}</div>
            <div className="text-xs text-muted-foreground">Successful</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-600">{session.failedWelds}</div>
            <div className="text-xs text-muted-foreground">Failed</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-600">{successRate}%</div>
            <div className="text-xs text-muted-foreground">Success Rate</div>
          </div>
        </div>

        {/* Recent Welds */}
        {session.welds.length > 0 && (
          <div className="mb-4">
            <div className="text-xs text-muted-foreground mb-2">Recent Welds</div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-2 max-h-32 overflow-y-auto">
              <div className="space-y-1">
                {session.welds.slice(-5).reverse().map((weld, index) => (
                  <div
                    key={weld.id}
                    className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-muted"
                  >
                    <span className="text-muted-foreground">
                      #{session.welds.length - index}
                    </span>
                    <span>{weld.timestamp.toLocaleTimeString()}</span>
                    <span>{weld.duration.toFixed(1)}s</span>
                    <span>{weld.topTemp.toFixed(0)}°C / {weld.bottomTemp.toFixed(0)}°C</span>
                    <Badge
                      variant={weld.success ? 'default' : 'destructive'}
                      className={cn(
                        'text-xs px-1 py-0',
                        weld.success && 'bg-green-600 hover:bg-green-700'
                      )}
                    >
                      {weld.success ? 'PASS' : 'FAIL'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => setShowEndDialog(true)}
            className="flex-1"
          >
            <StopCircle className="w-4 h-4 mr-2" />
            End Session
          </Button>
          <Button variant="outline" size="sm" onClick={handleGeneratePDF}>
            <FileText className="w-4 h-4 mr-2" />
            PDF
          </Button>
          <Button variant="destructive" size="sm" onClick={handleAbortSession}>
            <XCircle className="w-4 h-4" />
          </Button>
        </div>
      </Card>

      {/* End Session Dialog */}
      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>End Welding Session</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-muted p-3 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Welds:</span>
                <span className="font-semibold">{session.totalWelds}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Successful:</span>
                <span className="font-semibold text-green-600">{session.successfulWelds}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Failed:</span>
                <span className="font-semibold text-red-600">{session.failedWelds}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Success Rate:</span>
                <span className="font-semibold">{successRate}%</span>
              </div>
            </div>

            <Field>
              <FieldLabel>Session Notes (Optional)</FieldLabel>
              <FieldContent>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this session..."
                />
              </FieldContent>
            </Field>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowEndDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEndSession}>Complete Session</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
