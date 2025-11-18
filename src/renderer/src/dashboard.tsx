import { Badge } from './components/ui/badge'
import { Gauge } from './components/ui/guage'
import { cn } from './lib/utils'
import {
  SystemStatus,
  OperationState,
  ERROR_DESCRIPTIONS,
  ErrorCode,
  MenuState
} from '../../preload/typings'
import { Card } from './components/ui/card'

interface DashboardProps {
  isConnected: boolean
  receivedData: string[]
}

export function generateMockSystemStatus(): SystemStatus {
  return {
    temperature: {
      topTemp: Math.random() * 150,
      bottomTemp: Math.random() * 150,
      powerSupplyTemp: Math.random() * 80,
      topTempSetpoint: 150,
      bottomTempSetpoint: 150,
      topHeaterActive: Math.random() < 0.5,
      bottomHeaterActive: Math.random() < 0.5
    },
    operation: {
      state: OperationState.READY,
      weldingTime: 0,
      weldingTimeTarget: Math.random() * 30,
      coolingTime: 0,
      coolingTimeTarget: Math.random() * 15,
      pressureValveActive: false,
      coolingFanActive: false,
      pedalPressed: false,
      proximityDetected: false
    },
    power: {
      voltage: Math.random() * 30,
      voltageOk: true,
      powerTempOk: true
    },
    error: {
      code: ErrorCode.NONE,
      message: 'System operating normally',
      description: 'No errors detected',
      timestamp: new Date(),
      hasError: false
    },
    menu: {
      active: false,
      currentMenu: MenuState.MAIN,
      selectionIndex: 0,
      timeoutRemaining: 0
    },
    config: {
      opTime: 30,
      coTime: 15,
      topTempThreshold: 150,
      bottomTempThreshold: 140,
      temp1Offset: 128,
      temp2Offset: 125,
      menuResetDelay: 30,
      timeCalibration: 128,
      maxTempError: 160,
      vccVoltageError: 20,
      powerTempError: 60,
      powerVccErrorEnabled: true,
      sysErrorEnabled: true,
      voltageCalibration: 128,
      heaterErrorEnable: 25,
      coolingDelay: 128
    },
    uptime: 3600, // 1 hour
    firmwareVersion: '1.2.3',
    hardwareRevision: 'A1',
    lastUpdate: new Date()
  }
}

const getOperationStateColor = (state: OperationState) => {
  switch (state) {
    case OperationState.STANDBY:
      return 'secondary'
    case OperationState.READY:
      return 'default'
    case OperationState.WELDING:
      return 'destructive'
    case OperationState.COOLING:
      return 'outline'
    default:
      return 'secondary'
  }
}

const getOperationStateText = (state: OperationState) => {
  switch (state) {
    case OperationState.STANDBY:
      return 'STANDBY'
    case OperationState.READY:
      return 'READY'
    case OperationState.WELDING:
      return 'WELDING'
    case OperationState.COOLING:
      return 'COOLING'
    default:
      return 'UNKNOWN'
  }
}
export function Dashboard({ isConnected, receivedData }: DashboardProps) {
  // Get the latest system status from received data
  const latestData = receivedData.length > 0 ? receivedData[receivedData.length - 1] : null
  // const systemStatus: SystemStatus | null = latestData?.data || null
  // if in dev, use mock data
  // const systemStatus: SystemStatus | null = generateMockSystemStatus()
  let systemStatus: SystemStatus | null
  try {
    systemStatus = (latestData && JSON.parse(latestData)) || null
  } catch (e) {
    // use a much better error handling here, perhaps an alert or notification
    systemStatus = null
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <main className="flex-1 flex flex-col rounded-tl-2xl p-6 overflow-auto bg-background">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Balloon Welding Machine Dashboard</h1>
          <Badge variant={isConnected ? 'default' : 'destructive'}>
            {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
          </Badge>
        </div>
        {systemStatus && (
          <div className="text-right text-sm text-muted-foreground">
            <div>Uptime: {formatTime(systemStatus.uptime)}</div>
            <div>Firmware: {systemStatus.firmwareVersion}</div>
          </div>
        )}
      </div>
      {!systemStatus ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <div className="text-lg mb-2">No data received</div>
            <div className="text-sm">Waiting for system status...</div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Operation Status Section */}
          {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card dark:bg-card rounded-lg border dark:border-border p-4 space-y-2 transition-colors">
              <div className="text-sm text-muted-foreground">Operation State</div>
              <Badge
                variant={getOperationStateColor(systemStatus.operation.state)}
                className="text-lg px-4 py-1"
              >
                {getOperationStateText(systemStatus.operation.state)}
              </Badge>
            </div>
            <div className="bg-card dark:bg-card rounded-lg border dark:border-border p-4 space-y-2 transition-colors">
              <div className="text-sm text-muted-foreground">Welding Timer</div>
              <div className="text-2xl font-bold">
                {systemStatus.operation.weldingTime}s / {systemStatus.operation.weldingTimeTarget}s
              </div>
            </div>
            <div className="bg-card dark:bg-card rounded-lg border dark:border-border p-4 space-y-2 transition-colors">
              <div className="text-sm text-muted-foreground">Cooling Timer</div>
              <div className="text-2xl font-bold">
                {systemStatus.operation.coolingTime}s / {systemStatus.operation.coolingTimeTarget}s
              </div>
            </div>
          </div> */}

          {/* Temperature Gauges Section */}
          <div>
            {/* <h2 className="text-lg font-semibold mb-4 text-foreground">Temperature Monitoring</h2> */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
              {/* Top Heater */}
              <Card className="flex flex-col items-center transition-colors shadow-none md:border-none">
                <div className="text-sm font-medium text-muted-foreground">Top Heater</div>
                <Gauge
                  value={parseFloat(systemStatus.temperature.topTemp.toFixed(2))}
                  min={0}
                  max={systemStatus.config.topTempThreshold}
                  label="°C"
                  size={130}
                />
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Target:</span>
                  <span className="font-semibold">
                    {systemStatus.temperature.topTempSetpoint}°C
                  </span>
                </div>
                <Badge
                  variant={systemStatus.temperature.topHeaterActive ? 'destructive' : 'outline'}
                >
                  {systemStatus.temperature.topHeaterActive ? 'HEATING' : 'IDLE'}
                </Badge>
              </Card>

              {/* Bottom Heater */}
              <Card className="flex flex-col items-center transition-colors shadow-none md:border-none">
                <div className="text-sm font-medium text-muted-foreground">Bottom Heater</div>
                <Gauge
                  value={parseFloat(systemStatus.temperature.bottomTemp.toFixed(2))}
                  min={0}
                  max={systemStatus.config.bottomTempThreshold}
                  label="°C"
                  size={130}
                />
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Target:</span>
                  <span className="font-semibold">
                    {systemStatus.temperature.bottomTempSetpoint}°C
                  </span>
                </div>
                <Badge
                  variant={systemStatus.temperature.bottomHeaterActive ? 'destructive' : 'outline'}
                >
                  {systemStatus.temperature.bottomHeaterActive ? 'HEATING' : 'IDLE'}
                </Badge>
              </Card>

              {/* Power Supply Temperature */}
              <Card className="flex flex-col items-center transition-colors shadow-none md:border-none">
                <div className="text-sm font-medium text-muted-foreground">Power Supply</div>
                <Gauge
                  value={parseFloat(systemStatus.temperature.powerSupplyTemp.toFixed(2))}
                  min={0}
                  max={systemStatus.config.powerTempError + 20}
                  label="°C"
                  size={130}
                />
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Threshold:</span>
                  <span className="font-semibold">&lt; {systemStatus.config.powerTempError}°C</span>
                </div>
                <Badge
                  variant={
                    systemStatus.temperature.powerSupplyTemp > systemStatus.config.powerTempError
                      ? 'destructive'
                      : 'outline'
                  }
                  className={cn(
                    systemStatus.temperature.powerSupplyTemp <=
                      systemStatus.config.powerTempError && 'bg-green-600/80 text-white'
                  )}
                >
                  {systemStatus.temperature.powerSupplyTemp > systemStatus.config.powerTempError
                    ? 'TOO HOT'
                    : 'NORMAL'}
                </Badge>
              </Card>
            </div>
          </div>

          {/* Power Status Section */}
          <div>
            <h2 className="text-lg font-semibold mb-4 text-foreground">Power & System Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-card dark:bg-card rounded-lg border dark:border-border p-4 space-y-2 transition-colors">
                <div className="text-sm text-muted-foreground">Voltage</div>
                <div className="text-2xl font-bold">{systemStatus.power.voltage.toFixed(2)}V</div>
                <Badge
                  variant={systemStatus.power.voltageOk ? 'outline' : 'destructive'}
                  className={cn(systemStatus.power.voltageOk && 'bg-green-600/80 text-white')}
                >
                  {systemStatus.power.voltageOk ? 'OK' : 'ERROR'}
                </Badge>
              </div>
              <div className="bg-card dark:bg-card rounded-lg border dark:border-border p-4 space-y-2 transition-colors">
                <div className="text-sm text-muted-foreground">Pedal</div>
                <Badge
                  variant={systemStatus.operation.pedalPressed ? 'default' : 'outline'}
                  className="text-lg"
                >
                  {systemStatus.operation.pedalPressed ? 'PRESSED' : 'RELEASED'}
                </Badge>
              </div>
              <div className="bg-card dark:bg-card rounded-lg border dark:border-border p-4 space-y-2 transition-colors">
                <div className="text-sm text-muted-foreground">Proximity</div>
                <Badge
                  variant={systemStatus.operation.proximityDetected ? 'default' : 'outline'}
                  className="text-lg"
                >
                  {systemStatus.operation.proximityDetected ? 'DETECTED' : 'CLEAR'}
                </Badge>
              </div>
              <div className="bg-card dark:bg-card rounded-lg border dark:border-border p-4 space-y-2 transition-colors">
                <div className="text-sm text-muted-foreground">System Status</div>
                <Badge
                  variant={systemStatus.error.hasError ? 'destructive' : 'outline'}
                  className={cn(
                    !systemStatus.error.hasError && 'bg-green-600/80 text-white text-lg'
                  )}
                >
                  {systemStatus.error.hasError ? 'ERROR' : 'OK'}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* add more dashboard elements here later */}
      {systemStatus && <p className="max-w-full text-wrap px-1">{JSON.stringify(systemStatus)}</p>}
    </main>
  )
}
