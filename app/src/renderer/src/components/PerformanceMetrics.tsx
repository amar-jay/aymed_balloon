import { Card, CardContent } from './ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
import { CheckCircle2, Info, Thermometer, Zap } from 'lucide-react'

interface PerformanceMetricsProps {
  averageTopHeaterTemperature: number | null
  averageBottomHeaterTemperature: number | null
  averagePowerSupplyVoltage: number | null
  successRate: number
  successCount: number
  totalWelds: number
}

export function PerformanceMetrics({
  averageTopHeaterTemperature,
  averageBottomHeaterTemperature,
  averagePowerSupplyVoltage,
  successRate,
  successCount,
  totalWelds
}: PerformanceMetricsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="border-2 shadow-xl shadow-black/5 overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <CardContent className="pt-6 relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Average Top Temperature
              </p>
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-1">
                {averageTopHeaterTemperature?.toFixed(1) || 0}°C
              </p>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/20">
              <Thermometer className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-xs text-muted-foreground flex items-center gap-1 cursor-help">
                <Info className="h-3 w-3" />
                Average across all welds
              </div>
            </TooltipTrigger>
            <TooltipContent>
              Average top heater temperature across all welds in this session
            </TooltipContent>
          </Tooltip>
        </CardContent>
      </Card>

      <Card className="border-2 shadow-xl shadow-black/5 overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <CardContent className="pt-6 relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Average Bottom Temperature
              </p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                {averageBottomHeaterTemperature?.toFixed(1) || 0}°C
              </p>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/20">
              <Thermometer className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-xs text-muted-foreground flex items-center gap-1 cursor-help">
                <Info className="h-3 w-3" />
                Average across all welds
              </div>
            </TooltipTrigger>
            <TooltipContent>
              Average bottom heater temperature across all welds in this session
            </TooltipContent>
          </Tooltip>
        </CardContent>
      </Card>

      <Card className="border-2 shadow-xl shadow-black/5 overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <CardContent className="pt-6 relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Average Voltage
              </p>
              <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mb-1">
                {averagePowerSupplyVoltage?.toFixed(1) || 0}V
              </p>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border border-yellow-500/20">
              <Zap className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-xs text-muted-foreground flex items-center gap-1 cursor-help">
                <Info className="h-3 w-3" />
                Average across all welds
              </div>
            </TooltipTrigger>
            <TooltipContent>
              Average power supply voltage across all welds in this session
            </TooltipContent>
          </Tooltip>
        </CardContent>
      </Card>

      <Card className="border-2 shadow-xl shadow-black/5 overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <CardContent className="pt-6 relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Success Rate
              </p>
              <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                {successRate.toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {successCount || 0} of {totalWelds} welds
              </p>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/20">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500"
              style={{ width: `${successRate}%` }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}