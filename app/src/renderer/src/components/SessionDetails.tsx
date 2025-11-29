import { Input } from './ui/input'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Building2, Calendar, Clock, Info, User } from 'lucide-react'

interface SessionDetailsProps {
  operatorName: string
  companyName: string
  onOperatorNameChange: (value: string) => void
  onCompanyNameChange: (value: string) => void
  startSession: string | null
  endSession: string | null
  createdAt: string | null
  isActive: boolean
}

export function SessionDetails({
  operatorName,
  companyName,
  onOperatorNameChange,
  onCompanyNameChange,
  startSession,
  endSession,
  createdAt,
  isActive
}: SessionDetailsProps) {
  return (
    <Card className="border-2 shadow-xl shadow-black/5">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-2 rounded-lg bg-primary/10">
            <Info className="h-4 w-4 text-primary" />
          </div>
          Session Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              Operator Name
            </label>
            <Input
              value={operatorName}
              onChange={(e) => onOperatorNameChange(e.target.value)}
              placeholder="Enter operator name"
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-4 w-4" />
              Company Name
            </label>
            <Input
              value={companyName}
              onChange={(e) => onCompanyNameChange(e.target.value)}
              placeholder="Enter company name"
              className="h-10"
            />
          </div>
        </div>

        <div className="pt-4 border-t space-y-4">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Started</span>
            </div>
            <p className="text-sm font-semibold text-right">
              {startSession
                ? new Date(startSession).toLocaleString()
                : 'N/A'}
            </p>
          </div>
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{isActive ? 'Status' : 'Ended'}</span>
            </div>
            <p className="text-sm font-semibold text-right">
              {isActive
                ? 'In Progress'
                : endSession
                  ? new Date(endSession).toLocaleString()
                  : 'N/A'}
            </p>
          </div>
          {createdAt && (
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Created</span>
              </div>
              <p className="text-sm font-semibold text-right">
                {new Date(createdAt).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}