import { Activity, Calendar, ThermometerIcon, Timer, TrendingUp } from 'lucide-react'

interface QuickStatsProps {
  averageTopHeaterTemperature?: number
  averageBottomHeaterTemperature?: number
  averagePowerSupplyVoltage?: number
  durationHours: number
  durationMinutes: number
  totalWelds: number
  successRate: number
  startSession: string | null
}

export function QuickStats({
  averageTopHeaterTemperature,
  averageBottomHeaterTemperature,
  averagePowerSupplyVoltage,
  durationHours,
  durationMinutes,
  totalWelds,
  successRate,
  startSession
}: QuickStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-6">
      <div className="bg-background/60 backdrop-blur-sm rounded-lg p-4 border border-border/50">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <Timer className="h-3.5 w-3.5" />
          Duration
        </div>
        <p className="text-lg font-bold">
          {durationHours}h {durationMinutes}m
        </p>
      </div>
      <div className="bg-background/60 backdrop-blur-sm rounded-lg p-4 border border-border/50">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <Activity className="h-3.5 w-3.5" />
          Total Welds
        </div>
        <p className="text-lg font-bold">{totalWelds}</p>
      </div>
      <div className="bg-background/60 backdrop-blur-sm rounded-lg p-4 border border-border/50">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <TrendingUp className="h-3.5 w-3.5" />
          Success Rate
        </div>
        <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
          {successRate.toFixed(1)}%
        </p>
      </div>

      <div className="bg-background/60 backdrop-blur-sm rounded-lg p-4 border border-border/50">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <ThermometerIcon className="h-3.5 w-3.5" />
          Avg Temp
        </div>
        <p className="text-lg font-bold text-muted-foreground">
          <span className="text-[#FF6B6B]" aria-label="Top Temp">
            {averageTopHeaterTemperature?.toFixed(1) || 0}°C
          </span>{' '}
          /{' '}
          <span className="text-cyan-600" aria-label="Bottom Temp">
            {averageBottomHeaterTemperature?.toFixed(1) || 0}°C
          </span>
        </p>
      </div>

      <div className="bg-background/60 backdrop-blur-sm rounded-lg p-4 border border-border/50">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <TrendingUp className="h-3.5 w-3.5" />
          Voltage
        </div>
        <p className="text-lg font-bold">{averagePowerSupplyVoltage?.toFixed(1) || 0}V</p>
      </div>

      <div className="bg-background/60 backdrop-blur-sm rounded-lg p-3 border border-border/50">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <Calendar className="h-3.5 w-3.5" />
          Started
        </div>
        <p className="text-sm font-semibold">
          {startSession
            ? new Date(startSession).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })
            : 'N/A'}
        </p>
      </div>
    </div>
  )
}
