import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { CheckCircle2, Sparkles, XCircle } from 'lucide-react'

interface PerformanceOverviewProps {
  successCount: number
  failureCount: number
  successRate: number
  failureRate: number
}

export function PerformanceOverview({
  successCount,
  failureCount,
  successRate,
  failureRate
}: PerformanceOverviewProps) {
  return (
    <Card className="border-2 shadow-xl shadow-black/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Performance Overview
        </CardTitle>
        <CardDescription>Success and failure breakdown</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-sm font-semibold">Successful Welds</span>
              </div>
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {successCount || 0}
              </span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500"
                style={{ width: `${successRate}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {successRate.toFixed(1)}% of total
            </p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <span className="text-sm font-semibold">Failed Welds</span>
              </div>
              <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                {failureCount || 0}
              </span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-500"
                style={{ width: `${failureRate}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {failureRate.toFixed(1)}% of total
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}