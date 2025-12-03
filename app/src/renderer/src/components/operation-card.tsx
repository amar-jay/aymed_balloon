import { Activity, Clock } from 'lucide-react'
import { Card } from './ui/card'

export const OperationCard = ({
  systemData,
  coolingTimeTarget,
  weldingTimeTarget
}: {
  systemData: NonNullable<ReturnType<typeof window.api.SerialgetSystemStatus>>
  coolingTimeTarget: number
  weldingTimeTarget: number
}) => {
  const getProgressPercentage = (current, target) => {
    return Math.min((current / target) * 100, 100)
  }

  return (
    <Card className="p-0 flex flex-col items-center transition-colors shadow-none md:border-none pt-6">
      <div className="text-sm font-medium text-muted-foreground">Operation</div>

      {/* Time Progress Bars */}
      <div className="w-full">
        {/* Welding Time */}
        <div>
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-medium text-muted-foreground">Welding</span>
            <div className="inline-flex items-center gap-2 text-xs">
              <Activity className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-muted-foreground">
                {String(Math.floor(systemData.weldingTime)).padStart(2, '0')}s /{' '}
                {weldingTimeTarget.toFixed(1)}s
              </span>
            </div>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-200"
              style={{
                width: `${getProgressPercentage(systemData.weldingTime, weldingTimeTarget)}%`
              }}
            ></div>
          </div>
        </div>
        <div className="h-5"></div>

        {/* Cooling Time */}
        <div>
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-medium text-muted-foreground">Cooling Time</span>

            <div className="inline-flex items-center gap-1 text-xs">
              <Clock className="w-4 h-4 text-green-600" />
              <span className="text-xs text-muted-foreground">
                {String(Math.floor(systemData.coolingTime)).padStart(2, '0')}s /{' '}
                {coolingTimeTarget.toFixed(1)}s
              </span>
            </div>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className="bg-cyan-500 h-2 rounded-full transition-all duration-200"
              style={{
                width: `${getProgressPercentage(systemData.coolingTime, coolingTimeTarget)}%`
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* Status Indicators Grid */}
      <div className="grid grid-cols-2 gap-3 w-full">
        <div
          className={`rounded-lg p-2 border transition-colors ${
            systemData.pressureValveActive ? 'bg-blue-50 border-blue-300' : 'bg-muted border-border'
          }`}
        >
          <div className="flex items-center gap-2">
            {/* <Droplet className={`w-4 h-4 ${systemData.pressureValveActive ? 'text-blue-600' : 'text-muted-foreground'}`} /> */}
            <span className="text-xs font-medium text-foreground">Pressure Valve</span>
          </div>
          <p
            className={`text-xs mt-1 ${systemData.pressureValveActive ? 'text-blue-700' : 'text-muted-foreground'}`}
          >
            {systemData.pressureValveActive ? 'Active' : 'Inactive'}
          </p>
        </div>

        <div
          className={`rounded-lg p-2 border transition-colors ${
            systemData.coolingFanActive ? 'bg-cyan-50 border-cyan-300' : 'bg-muted border-border'
          }`}
        >
          <div className="flex items-center gap-2">
            {/* <Wind className={`w-4 h-4 ${systemData.coolingFanActive ? 'text-cyan-600' : 'text-muted-foreground'}`} /> */}
            <span className="text-xs font-medium text-foreground">Cooling Fan</span>
          </div>
          <p
            className={`text-xs mt-1 ${systemData.coolingFanActive ? 'text-cyan-700' : 'text-muted-foreground'}`}
          >
            {systemData.coolingFanActive ? 'Active' : 'Inactive'}
          </p>
        </div>

        <div
          className={`rounded-lg p-3 border transition-colors ${
            systemData?.pedalActive ? 'bg-green-50 border-green-300' : 'bg-muted border-border'
          }`}
        >
          <div className="flex items-center gap-2">
            {/* <div className={`w-4 h-4 rounded ${operation.pedalPressed ? 'bg-green-500' : 'bg-muted-foreground'}`}></div> */}
            <span className="text-xs font-medium text-foreground">Pedal</span>
          </div>
          <p
            className={`text-xs mt-1 ${systemData?.pedalActive ? 'text-green-700' : 'text-muted-foreground'}`}
          >
            {systemData?.pedalActive ? 'Pressed' : 'Released'}
          </p>
        </div>

        <div
          className={`rounded-lg p-3 border transition-colors ${
            systemData?.proximityActive ? 'bg-amber-50 border-amber-300' : 'bg-muted border-border'
          }`}
        >
          <div className="flex items-center gap-2">
            {/* <div className={`w-4 h-4 rounded-full ${operation.proximityDetected ? 'bg-amber-500' : 'bg-muted-foreground'}`}></div> */}
            <span className="text-xs font-medium text-foreground">Proximity</span>
          </div>
          <p
            className={`text-xs mt-1 ${systemData?.proximityActive ? 'text-amber-700' : 'text-muted-foreground'}`}
          >
            {systemData?.proximityActive ? 'Detected' : 'Clear'}
          </p>
        </div>
      </div>
    </Card>
  )
}
