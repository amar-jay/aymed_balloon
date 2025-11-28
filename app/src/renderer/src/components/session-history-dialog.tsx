import * as React from 'react'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Badge } from './ui/badge'
import { SessionData, SessionSummary, sessionManager } from '../lib/session-manager'
import { PDFGenerator } from '../lib/pdf-generator'
import { FileText, Download, Trash2, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@renderer/lib/utils'

interface SessionHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SessionHistoryDialog({ open, onOpenChange }: SessionHistoryDialogProps) {
  const [sessions, setSessions] = React.useState<SessionSummary[]>([])
  const [selectedSession, setSelectedSession] = React.useState<SessionData | null>(null)
  const [showDetails, setShowDetails] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      loadSessions()
    }
  }, [open])

  const loadSessions = () => {
    const summaries = sessionManager.getSessionSummaries()
    // Sort by start time, most recent first
    summaries.sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
    setSessions(summaries)
  }

  const handleViewDetails = (sessionId: string) => {
    const session = sessionManager.getSession(sessionId)
    if (session) {
      setSelectedSession(session)
      setShowDetails(true)
    }
  }

  const handleGeneratePDF = async (sessionId: string) => {
    const session = sessionManager.getSession(sessionId)
    if (!session) {
      toast.error('Session not found')
      return
    }

    try {
      await PDFGenerator.generateSessionReport(session)
      toast.success('PDF Report Generated', {
        description: 'Print dialog opened'
      })
    } catch (error) {
      toast.error('Failed to generate PDF', {
        description: (error as Error).message
      })
    }
  }

  const handleDownloadJSON = (sessionId: string) => {
    const session = sessionManager.getSession(sessionId)
    if (!session) {
      toast.error('Session not found')
      return
    }

    PDFGenerator.downloadSessionJSON(session)
    toast.success('JSON Downloaded')
  }

  const handleDelete = (sessionId: string) => {
    if (confirm('Are you sure you want to delete this session? This cannot be undone.')) {
      if (sessionManager.deleteSession(sessionId)) {
        toast.success('Session Deleted')
        loadSessions()
      } else {
        toast.error('Failed to delete session')
      }
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <>
      <Dialog open={open && !showDetails} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Session History</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {sessions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No sessions recorded yet</p>
                <p className="text-sm mt-1">Start a new session to begin tracking welds</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{session.id}</h3>
                          <Badge
                            variant={
                              session.status === 'completed'
                                ? 'default'
                                : session.status === 'active'
                                  ? 'secondary'
                                  : 'destructive'
                            }
                          >
                            {session.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-muted-foreground">
                          <div>
                            <div className="text-xs">Operator</div>
                            <div className="font-medium text-foreground">
                              {session.operatorName || 'N/A'}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs">Batch</div>
                            <div className="font-medium text-foreground">
                              {session.batchNumber || 'N/A'}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs">Total Welds</div>
                            <div className="font-medium text-foreground">{session.totalWelds}</div>
                          </div>
                          <div>
                            <div className="text-xs">Duration</div>
                            <div className="font-medium text-foreground">
                              {session.duration.toFixed(1)} min
                            </div>
                          </div>
                        </div>

                        <div className="text-xs text-muted-foreground mt-2">
                          {formatDate(session.startTime)}
                          {session.endTime && ` - ${formatDate(session.endTime)}`}
                        </div>
                      </div>

                      <div className="flex gap-1 ml-4">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewDetails(session.id)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleGeneratePDF(session.id)}
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDownloadJSON(session.id)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(session.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Session Details Dialog */}
      {selectedSession && (
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Session Details - {selectedSession.id}</DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-4">
              {/* Session Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">Operator</div>
                  <div className="font-medium">{selectedSession.operatorName || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Batch Number</div>
                  <div className="font-medium">{selectedSession.batchNumber || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Product Type</div>
                  <div className="font-medium">{selectedSession.productType || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Status</div>
                  <Badge
                    variant={
                      selectedSession.status === 'completed'
                        ? 'default'
                        : selectedSession.status === 'active'
                          ? 'secondary'
                          : 'destructive'
                    }
                  >
                    {selectedSession.status}
                  </Badge>
                </div>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-muted p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold">{selectedSession.totalWelds}</div>
                  <div className="text-xs text-muted-foreground">Total Welds</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {selectedSession.successfulWelds}
                  </div>
                  <div className="text-xs text-muted-foreground">Successful</div>
                </div>
                <div className="bg-red-50 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {selectedSession.failedWelds}
                  </div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                </div>
              </div>

              {/* Welds List */}
              <div>
                <h4 className="font-semibold mb-2">Weld Records ({selectedSession.welds.length})</h4>
                <div className="border rounded-lg max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="text-left p-2">#</th>
                        <th className="text-left p-2">Time</th>
                        <th className="text-left p-2">Duration</th>
                        <th className="text-left p-2">Top Temp</th>
                        <th className="text-left p-2">Bottom Temp</th>
                        <th className="text-left p-2">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSession.welds.map((weld, index) => (
                        <tr key={weld.id} className="border-t">
                          <td className="p-2">{index + 1}</td>
                          <td className="p-2">
                            {weld.timestamp.toLocaleTimeString()}
                          </td>
                          <td className="p-2">{weld.duration.toFixed(1)}s</td>
                          <td className="p-2">{weld.topTemp.toFixed(1)}°C</td>
                          <td className="p-2">{weld.bottomTemp.toFixed(1)}°C</td>
                          <td className="p-2">
                            <Badge
                              variant={weld.success ? 'default' : 'destructive'}
                              className={cn(
                                weld.success && 'bg-green-600 hover:bg-green-700'
                              )}
                            >
                              {weld.success ? 'PASS' : 'FAIL'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedSession.notes && (
                <div>
                  <h4 className="font-semibold mb-2">Notes</h4>
                  <div className="bg-muted p-3 rounded-lg text-sm">
                    {selectedSession.notes}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowDetails(false)}>
                Back
              </Button>
              <Button onClick={() => handleGeneratePDF(selectedSession.id)}>
                <FileText className="w-4 h-4 mr-2" />
                Generate PDF
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
