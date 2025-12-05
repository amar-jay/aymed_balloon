import { Badge } from './components/ui/badge'
import { Gauge } from './components/ui/guage'
import { cn } from './lib/utils'
import { Card } from './components/ui/card'
import { useCallback, useEffect, useState, useRef } from 'react'
import { SystemConfig, SystemData } from 'src/lib/types/minibuf'
import { TempGraph } from './components/temp-graph'
import { useAtom } from 'jotai/react'
import { historyLimitAtom } from './lib/jotai'
import VoltageCard from './components/voltage-card'
import { OperationCard } from './components/operation-card'
import { CreateSessionForm } from './components/CreateSessionForm'
import { ActiveSessionPanel } from './components/ActiveSessionPanel'
import { toast } from 'sonner'
import { useSessionById } from './use-sessions'

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

export function Dashboard({ isConnected, receivedData, connectionId }: DashboardProps) {
  const [systemData, setSystemData] = useState<SystemData | null>(null)
  const [version, setVersion] = useState<string | null>(null)
  const [config, setConfig] = useState<SystemConfig | null>(null)
  const [HISTORY_LIMIT] = useAtom(historyLimitAtom)
  // if (connectionId) {
  //   const latestData = window.api.SerialgetSystemStatus(connectionId)
  //   if (latestData) setSystemData(latestData)
  // }
  const [sessionId, setSessionId] = useState<number | null>(null)
  const { session, addWeld, endSession, deleteSession, generatePDF } = useSessionById(sessionId)

  // it is meant to be used in the temp graphs later
  const [pastSystemData, setPastSystemData] = useState<SystemData[]>([])

  // Use refs to track the latest values without causing re-renders
  const systemDataRef = useRef<SystemData | null>(null)
  const configRef = useRef<SystemConfig | null>(null)
  const lastPedalStateRef = useRef<boolean>(false)

  // Update refs when state changes
  useEffect(() => {
    systemDataRef.current = systemData
  }, [systemData])

  useEffect(() => {
    configRef.current = config
  }, [config])

  const pushSystemSnapshot = useCallback(
    (next: SystemData) => {
      setSystemData(next)
      setPastSystemData((prev) => {
        const updated = [...prev, { ...next }]
        return updated.length > HISTORY_LIMIT
          ? updated.slice(updated.length - HISTORY_LIMIT)
          : updated
      })
    },
    [HISTORY_LIMIT]
  )

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
      if (!connectionId) return
      // if in dev mode, use mock data
      if (process.env.NODE_ENV !== 'development') {
        console.log('Requesting FAKE system status...')
        const fake_status = generateMockBalloonStatus()
        const mockData: SystemData = {
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
        }
        pushSystemSnapshot(mockData)
        setConfig(fake_status.config)
        setVersion(fake_status.firmwareVersion)
      }
      await window.api.SerialsendCommand(connectionId, 'GET STATUS')
      const status = window.api.SerialgetSystemStatus(connectionId)
      if (status) {
        pushSystemSnapshot({ ...status })
      }

      const version = window.api.SerialgetSystemVersion(connectionId)
      setVersion(`${version?.major}.${version?.minor}.${version?.patch}`)

      // if (!config) {
      //   const c = window.api.SerialgetSystemConfig(connectionId)
      //   setConfig(c)
      // }
    }, 1000)

    // config fetching interval
    const configInterval = setInterval(() => {
      if (!isConnected) return
      if (!connectionId) return
      const c = window.api.SerialgetSystemConfig(connectionId)
      if (c) setConfig(c)
    }, 10000)

    return () => {
      clearInterval(interval)
      clearInterval(configInterval)
    }
  }, [isConnected, connectionId, pushSystemSnapshot])

  const handleAddWeld = useCallback(
    async (notify = false) => {
      const currentSystemData = systemDataRef.current
      const currentConfig = configRef.current

      if (currentSystemData?.pedalActive) {
        // Prevent duplicate welds - only add when pedal transitions from inactive to active
        if (lastPedalStateRef.current === true) {
          return
        }
        lastPedalStateRef.current = true

        const newWeld = {
          topHeaterTemperature: currentSystemData.topTemp,
          bottomHeaterTemperature: currentSystemData.bottomTemp,
          powerSupplyVoltage: currentSystemData.powerSupplyVoltage,
          weldingDuration: currentSystemData.weldingTime,
          coolingDuration: currentSystemData.coolingTime,
          isSuccessful:
            currentSystemData.topTemp <= (currentConfig?.topTempThreshold || 110) &&
            currentSystemData.bottomTemp <= (currentConfig?.bottomTempThreshold || 140),
          error:
            currentSystemData.topTemp < (currentConfig?.topTempThreshold || 110)
              ? 'Top heater too low temperature'
              : currentSystemData.bottomTemp < (currentConfig?.bottomTempThreshold || 140)
                ? 'Bottom heater too low temperature'
                : undefined
        }
        await addWeld(newWeld, notify)
        console.log('Added weld:', newWeld)
      } else {
        // Reset the pedal state when pedal is released
        lastPedalStateRef.current = false
      }
    },
    [addWeld]
  )

  // timer to add welds every second when pedal is pressed
  useEffect(() => {
    if (!isConnected) return
    if (!sessionId) return

    console.log('Setting up weld checker interval...')
    const interval = setInterval(() => {
      handleAddWeld(true)
    }, 1000)

    return () => {
      console.log('Clearing weld checker interval...')
      clearInterval(interval)
    }
  }, [isConnected, sessionId, handleAddWeld])

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
          {/* if its in dev mode, show the raw system data and config */}
          {process.env.NODE_ENV === 'development' && (
            <>
              {/* Temperature Graphs Section */}
              <TempGraph pastSystemData={pastSystemData} />

              <div className="grid grid-cols-2 gap-2">
                {sessionId ? (
                  <ActiveSessionPanel
                    session={session}
                    resetSessionId={() => setSessionId(null)}
                    deleteSession={deleteSession}
                    addWeld={handleAddWeld}
                    endSession={endSession}
                    generatePDF={generatePDF}
                  />
                ) : (
                  <CreateSessionForm setSessionId={setSessionId} />
                )}
                <div className="rounded-lg border dark:border-border p-4 space-y-2 transition-colors">
                  <h4 className="text-sm text-muted-foreground">System Status</h4>
                  <Badge
                    variant={config?.sysErrorEnabled ? 'destructive' : 'outline'}
                    className={cn(
                      !config?.sysErrorEnabled && 'bg-green-600/80 text-white',
                      'w-[50px]'
                    )}
                  >
                    {config?.sysErrorEnabled ? 'ERROR' : 'OK'}
                  </Badge>
                  <h4 className="text-sm text-muted-foreground mt-2">System Data:</h4>
                  <p className="text-xs">{JSON.stringify(systemData, null, 2)}</p>
                  <h4 className="text-sm text-muted-foreground mt-2">System Config:</h4>
                  <p className="text-xs">{JSON.stringify(config, null, 2)}</p>
                </div>
              </div>
            </>
          )}

          {/* if its in production, show interface for normal using, by that I mean for a welding session for a user blah blah blah */}
          {process.env.NODE_ENV === 'production' && <></>}
        </div>
      )}
    </main>
  )
}
