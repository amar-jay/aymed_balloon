import { Badge } from './components/ui/badge'
import { Gauge } from './components/ui/guage'
import { cn } from './lib/utils'
import { OperationState, ErrorCode, MenuState } from '../../preload/typings'
import { Card, CardHeader, CardTitle } from './components/ui/card'
import { useEffect, useRef, useState } from 'react'
import { Activity, Clock } from 'lucide-react'
import { SystemConfig, SystemData } from 'src/lib/types/minibuf'
import { TempGraph } from './components/temp-graph'

interface DashboardProps {
  isConnected: boolean
  receivedData: string[]
  connectionId: string | null
}

export function generateMockBalloonStatus() {
  return {
    data: {
      topTemp: Math.random() * 150,
      bottomTemp: Math.random() * 150,
      powerSupplyTemp: Math.random() * 80,
      topHeaterActive: Math.random() < 0.5,
      bottomHeaterActive: Math.random() < 0.5,
      weldingTime: Math.random() * 30,
      coolingTime: Math.random() * 15,
      pressureValveActive: Math.random() < 0.5,
      coolingFanActive: Math.random() < 0.5,
      pedalPressed: Math.random() < 0.5,
      proximityActive: Math.random() < 0.5,
      powerSupplyVoltage: Math.random() * 30
    },
    config: {
      opTime: Math.floor(Math.random() * 56) + 5,
      coTime: Math.floor(Math.random() * 28) + 3,
      topTempThreshold: 150,
      bottomTempThreshold: 140,
      topTempOffset: 128,
      bottomTempOffset: 128,
      menuResetDelay: 30,
      timeCalibration: 0,
      maxTempError: 150,
      vccVoltageError: 24,
      powerTempError: 60,
      powerVccErrorEnabled: true,
      sysErrorEnabled: Math.random() < 0.5,
      voltageCalibration: 0,
      heaterErrorEnable: 10,
      coolingDelay: 5,
      useInternalADC: true
    },
    firmwareVersion: '1.2.3'
  }
}

export default function VoltageCard({ power }: { power: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height
    if (ctx == null) return

    ctx.clearRect(0, 0, width, height)

    // Battery dimensions
    const bodyWidth = 80
    const bodyHeight = 130
    const bodyX = (width - bodyWidth) / 2
    const bodyY = 40
    const tipHeight = 5
    const tipWidth = 40
    const tipX = (width - tipWidth) / 2

    // Battery tip
    ctx.fillStyle = '#64748b'
    ctx.fillRect(tipX, bodyY - tipHeight, tipWidth, tipHeight)

    // Battery outline
    ctx.strokeStyle = '#64748b'
    ctx.lineWidth = 3
    ctx.strokeRect(bodyX - 2, bodyY - 2, bodyWidth + 4, bodyHeight + 4)

    // Fill level
    const percentage = power / 30
    const fillHeight = bodyHeight * percentage
    const fillY = bodyY + bodyHeight - fillHeight

    // Color based on range
    let fillColor
    if (percentage < 0.5) {
      fillColor = '#ef4444' // Red
    } else if (percentage < 0.75) {
      fillColor = '#eab308' // Yellow
    } else {
      fillColor = '#22c55e' // Green
    }

    ctx.fillStyle = fillColor
    ctx.fillRect(bodyX, fillY, bodyWidth, fillHeight)

    // Voltage text in center of battery
    ctx.fillStyle = '#1e293b'
    ctx.font = 'bold 20px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${power.toFixed(2)}V`, width / 2, bodyY + bodyHeight / 2)
  }, [power])

  return (
    <Card className="max-h-[300px] flex flex-col items-center gap-2 space-x-0 transition-colors shadow-none md:border-none">
      <p className="text-sm font-medium text-muted-foreground">Voltage</p>
      <div>
        <canvas ref={canvasRef} width={200} height={200} className="w-full" />
      </div>

      <Badge
        className={
          power > 0 && power < 24
            ? 'bg-green-600 text-white mx-auto'
            : 'bg-red-600 text-white mx-auto'
        }
      >
        {power > 0 && power < 24 ? 'OK' : 'Alert'}
      </Badge>
    </Card>
  )
}

const OperationCard = ({
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

export function Dashboard({ isConnected, receivedData, connectionId }: DashboardProps) {
  const [systemData, setSystemData] = useState<SystemData | null>(null)
  const [version, setVersion] = useState<string | null>(null)
  const [config, setConfig] = useState<SystemConfig | null>(null)
  const latestData = receivedData.length > 0 ? receivedData[receivedData.length - 1] : null

  // it is meant to be used in the temp graphs later
  const [pastSystemData, setPastSystemData] = useState<SystemData[]>([])

  // const systemStatus: BalloonStatus | null = latestData?.data || null
  // if in dev, use mock data
  // let systemStatus: BalloonStatus | null
  // try {
  //   systemStatus = (latestData && JSON.parse(latestData)) || null
  // } catch (e) {
  //   // use a much better error handling here, perhaps an alert or notification
  //   systemStatus = null
  // }

  // send GET STATUS command every half second if connected
  useEffect(() => {
    // if (!isConnected) return
    // if (!connectionId) return
    const interval = setInterval(async () => {
      console.log('Requesting system status...')
      const fake_status = generateMockBalloonStatus()
      setSystemData({
        bottomHeaterActive: fake_status.data.bottomHeaterActive,
        bottomTemp: fake_status.data.bottomTemp,
        pedalActive: fake_status.data.pedalPressed,
        powerSupplyTemp: fake_status.data.powerSupplyTemp,
        topHeaterActive: fake_status.data.topHeaterActive,
        topTemp: fake_status.data.topTemp,
        powerSupplyVoltage: fake_status.data.powerSupplyVoltage,
        proximityActive: fake_status.data.proximityActive,
        coolingFanActive: fake_status.data.coolingFanActive,
        pressureValveActive: fake_status.data.pressureValveActive,
        weldingTime: Math.floor(fake_status.data.weldingTime),
        coolingTime: Math.floor(fake_status.data.coolingTime)
      })
      setConfig(fake_status.config)
      setVersion(fake_status.firmwareVersion)
      if (!connectionId) return
      await window.api.SerialsendCommand(connectionId, 'GET STATUS')
      const status = window.api.SerialgetSystemStatus(connectionId)
      const config = window.api.SerialgetSystemConfig(connectionId)
      setConfig(config)
      const version = window.api.SerialgetSystemVersion(connectionId)
      setVersion(`${version?.major}.${version?.minor}.${version?.patch}`)
      console.log('Firmware Version:', version)
      if (status) setSystemData(status)
    }, 1000)
    return () => clearInterval(interval)
  }, [isConnected, connectionId])

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
        {version && (
          <div className="text-right text-sm text-muted-foreground">
            <div>Firmware: {version}</div>
          </div>
        )}
      </div>

      {!systemData ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <div className="text-lg mb-2">No data received</div>
            <div className="text-sm">Waiting for system status...</div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Temperature Gauges Section */}
          <div>
            {/* <h2 className="text-lg font-semibold mb-4 text-foreground">Temperature Monitoring</h2> */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
              {/* Top Heater */}
              <Card className="flex flex-col items-center transition-colors shadow-none md:border-none">
                <div className="text-sm font-medium text-muted-foreground">Top Heater</div>
                <Gauge
                  value={parseFloat(systemData?.topTemp.toFixed(2) ?? '88.88')}
                  min={0}
                  max={config?.topTempThreshold}
                  label="°C"
                  size={130}
                />
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Target:</span>
                  <span className="font-semibold">{config?.topTempThreshold}°C</span>
                </div>
                <Badge variant={systemData?.topHeaterActive ? 'destructive' : 'outline'}>
                  {systemData?.topHeaterActive ? 'HEATING' : 'IDLE'}
                </Badge>
              </Card>

              {/* Bottom Heater */}
              <Card className="flex flex-col items-center transition-colors shadow-none md:border-none">
                <div className="text-sm font-medium text-muted-foreground">Bottom Heater</div>
                <Gauge
                  value={parseFloat(systemData?.bottomTemp.toFixed(2) ?? '88.88')}
                  min={0}
                  max={config?.bottomTempThreshold}
                  label="°C"
                  size={130}
                />
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Target:</span>
                  <span className="font-semibold">{config?.bottomTempThreshold}°C</span>
                </div>
                <Badge variant={systemData?.bottomHeaterActive ? 'destructive' : 'outline'}>
                  {systemData?.bottomHeaterActive ? 'HEATING' : 'IDLE'}
                </Badge>
              </Card>

              {/* Power Supply Temperature */}
              <Card className="flex flex-col items-center transition-colors shadow-none md:border-none">
                <div className="text-sm font-medium text-muted-foreground">Power Supply</div>
                <Gauge
                  value={parseFloat(systemData?.powerSupplyTemp.toFixed(2) ?? '88.88')}
                  min={0}
                  max={config?.powerTempError || 0 + 20}
                  label="°C"
                  size={130}
                />
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Threshold:</span>
                  <span className="font-semibold">&lt; {config?.powerTempError}°C</span>
                </div>
                <Badge
                  variant={
                    (systemData?.powerSupplyTemp || 0) > (config?.powerTempError || 0)
                      ? 'destructive'
                      : 'outline'
                  }
                  className={cn(
                    systemData?.powerSupplyTemp &&
                      systemData.powerSupplyTemp <= (config?.powerTempError || 0) &&
                      'bg-green-600/80 text-white'
                  )}
                >
                  {systemData?.powerSupplyTemp &&
                  systemData.powerSupplyTemp > (config?.powerTempError || 0)
                    ? 'TOO HOT'
                    : 'NORMAL'}
                </Badge>
              </Card>
              <VoltageCard
                power={parseFloat(systemData?.powerSupplyVoltage.toFixed(2) ?? '29.99')}
              />
              {systemData && (
                <OperationCard
                  systemData={systemData}
                  coolingTimeTarget={15}
                  weldingTimeTarget={30}
                />
              )}
            </div>
          </div>

          {/* Power Status Section */}
          <div className="grid grid-cols-2 gap-4">
            <TempGraph name="Top" pastSystemData={pastSystemData} />
            <TempGraph name="Bottom" pastSystemData={pastSystemData} />
          </div>
          <div className="bg-card dark:bg-card rounded-lg border dark:border-border p-4 space-y-2 transition-colors">
            <h4 className="text-sm text-muted-foreground">System Status</h4>
            <Badge
              variant={config?.sysErrorEnabled ? 'destructive' : 'outline'}
              className={cn(!config?.sysErrorEnabled && 'bg-green-600/80 text-white text-lg')}
            >
              {config?.sysErrorEnabled ? 'ERROR' : 'OK'}
            </Badge>
            <h4 className="text-sm text-muted-foreground mt-2">System Data:</h4>
            <p>{JSON.stringify(systemData, null, 2)}</p>
            <h4 className="text-sm text-muted-foreground mt-2">System Config:</h4>
            <p>{JSON.stringify(config, null, 2)}</p>
            <h4 className="text-sm text-muted-foreground mt-2">Firmware Version:</h4>
            <div>{version}</div>
          </div>
        </div>
      )}
      {/* add more dashboard elements here later */}
      {/* {systemStatus && <p className="max-w-full text-wrap px-1">{JSON.stringify(systemStatus)}</p>} */}
    </main>
  )
}
