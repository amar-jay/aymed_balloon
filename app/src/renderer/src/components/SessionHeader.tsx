import { Button } from './ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
import { ChevronLeft, Power, FileDown, Trash2, PowerOff, Edit } from 'lucide-react'

interface SessionHeaderProps {
  children?: React.ReactNode
  isActive: boolean
  onGoToAllSessions: () => void
  onEndSession: () => void
  onGeneratePDF: () => void
  onDelete: () => void
  onEdit: () => void
  operatorName: string
  companyName: string
}

export function SessionHeader({
  children,
  isActive,
  onGoToAllSessions,
  onEndSession,
  onGeneratePDF,
  onDelete,
  onEdit,
  operatorName,
  companyName
}: SessionHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-8 backdrop-blur-sm w-full">
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onGoToAllSessions}
                  className="h-15 w-15 hover:bg-primary/10"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Back to all sessions</TooltipContent>
            </Tooltip>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Welding Session
                </h1>
                {isActive && (
                  <div className="h-2 w-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
                )}
              </div>
              <div className="flex gap-2">
                <p className="text-muted-foreground text-sm font-medium pb-3 gap-2">
                  Operator Name:{' '}
                  <span className="font-mono text-foreground/80">{operatorName}</span>
                  <br />
                  Company Name: <span className="font-mono text-foreground/80">{companyName}</span>
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onEdit}
                  className="h-6 w-6 p-0 text-muted-foreground"
                >
                  <Edit className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="secondary" onClick={onEndSession} disabled={!isActive}>
                  {isActive ? (
                    <Power className="h-4 w-4 mr-2" />
                  ) : (
                    <PowerOff className="h-4 w-4 mr-2" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>End Session</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" onClick={onGeneratePDF}>
                  <FileDown className="h-4 w-4 mr-2" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export PDF report</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="destructive" onClick={onDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete this session</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
      {children}
    </div>
  )
}
