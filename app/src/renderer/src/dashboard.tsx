import { Badge } from './components/ui/badge'
import { Gauge } from './components/ui/guage'
import { cn } from './lib/utils'
import { Card } from './components/ui/card'
import { useCallback, useEffect, useState, useRef } from 'react'
import { SystemConfig, SystemData } from 'src/lib/types/minibuf'
import { TempGraph } from './components/temp-graph-v3'
import { useAtom } from 'jotai/react'
import { historyLimitAtom, settingsAtom, versionAtom } from './lib/jotai'
import VoltageCard from './components/voltage-card'
import { OperationCard } from './components/operation-card'
import { CreateSessionForm } from './components/CreateSessionForm'
import { ActiveSessionPanel } from './components/ActiveSessionPanel'
import { useSessionById } from './hooks/use-sessions'

interface DashboardProps {
  isConnected: boolean
  connectionId: string | null
}

const generateMockSystemData = (): SystemData => {
  return {
    topTemp: Math.random() * 150,
    bottomTemp: Math.random() * 150,
    powerSupplyTemp: Math.random() * 100,
    powerSupplyVoltage: 24 + Math.random() * 6,
    weldingTime: Math.floor(Math.random() * 60),
    coolingTime: Math.floor(Math.random() * 60),
    pedalActive: Math.random() < 0.5,
    topHeaterActive: Math.random() < 0.5,
    bottomHeaterActive: Math.random() < 0.5,
    sysError: Math.random() < 0.1 ? 'Overheat' : undefined
  }
}

const generateMockSystemConfig = (): SystemConfig => {
  return {
    opTime: 30,
    coTime: 15, // cooling time
    topTempThreshold: 120,
    bottomTempThreshold: 140,
    powerTempError: 80,
    topTempOffset: 0,
    bottomTempOffset: 0,
    sysErrorEnabled: true,
    menuResetDelay: 0,
    timeCalibration: 0,
    maxTempError: 0,
    vccVoltageError: 0,
    powerVccErrorEnabled: false,
    voltageCalibration: 0,
    heaterErrorEnable: 120,
    coolingDelay: 0,
    useInternalADC: false
  }
}
export function Dashboard({ isConnected, connectionId }: DashboardProps) {
  const [systemData, setSystemData] = useState<SystemData | null>(null)
  // const [version, setVersion] = useState<string | null>(null)
  // const [config, setConfig] = useState<SystemConfig | null>(null)
  const [HISTORY_LIMIT] = useAtom(historyLimitAtom)
  const [config, setConfig] = useAtom(settingsAtom)
  const [version, setVersion] = useAtom(versionAtom)

  const [sessionId, setSessionId] = useState<number | null>(null)
  const { session, addWeld, endSession, deleteSession, generatePDF } = useSessionById(sessionId)

  const [pastSystemData, setPastSystemData] = useState<SystemData[]>([]) // it is meant to be used in the temp graphs later

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

  // ring-buffer style
  const pushSystemSnapshot = useCallback(
    (next: SystemData) => {
      setSystemData(next)
      setPastSystemData((prev) => {
        if (prev.length >= HISTORY_LIMIT) {
          // drop the first
          return [...prev.slice(1), next]
        }
        return [...prev, next]
      })
    },
    [HISTORY_LIMIT]
  )

  const createWeld = (currentSystemData, currentConfig) => {
    const newWeld = {
      topHeaterTemperature: currentSystemData.topTemp,
      bottomHeaterTemperature: currentSystemData.bottomTemp,
      powerSupplyVoltage: currentSystemData.powerSupplyVoltage,
      weldingDuration: currentSystemData.weldingTime,
      coolingDuration: currentSystemData.coolingTime,
      isSuccessful:
        currentSystemData.topTemp > (currentConfig?.topTempThreshold || 120) * 0.9 &&
        currentSystemData.bottomTemp > (currentConfig?.bottomTempThreshold || 120) * 0.9,
      error:
        currentSystemData.topTemp < (currentConfig?.topTempThreshold || 120) * 0.9
          ? 'Top heater too low temperature'
          : currentSystemData.bottomTemp < (currentConfig?.bottomTempThreshold || 120) * 0.9
            ? 'Bottom heater too low temperature'
            : undefined
    }

    console.log('Created weld:', newWeld, currentSystemData, currentConfig)
    return newWeld
  }

  const handleAddWeld = useCallback(
    async (notify = false) => {
      const currentSystemData = systemDataRef.current
      const currentConfig = configRef.current

      if (currentSystemData) {
        const newWeld = createWeld(currentSystemData, currentConfig)
        await addWeld(newWeld, notify)
      }
    },
    [addWeld]
  )

  useEffect(() => {
    // if (!isConnected) return
    // if (!connectionId) return
    const interval = setInterval(async () => {
      // if (!isConnected) return
      if (!connectionId) {
        // Currently not connected, so using mock data temporarily for testing
        if (process.env.NODE_ENV === 'development') {
          const status = generateMockSystemData()
          pushSystemSnapshot(status)
          const isPedalActive = status?.pedalActive ?? false
          if (isPedalActive && !lastPedalStateRef.current) {
            const newWeld = createWeld(status, configRef.current)
            await addWeld(newWeld, false)
          }
          lastPedalStateRef.current = isPedalActive
          // setConfig(generateMockSystemConfig())
        }
        return
      }

      await window.api.SerialsendCommand(connectionId, 'GET STATUS')
      const status = window.api.SerialgetSystemStatus(connectionId)
      if (status) {
        pushSystemSnapshot({ ...status })
      }

      // request version and config frequently if not present already
      // especially useful on initial connect
      if (!version) {
        await window.api.SerialsendCommand(connectionId, 'GET VERSION')
      }

      if (!configRef.current) {
        await window.api.SerialsendCommand(connectionId, 'GET CONFIG')
      }

      const v = window.api.SerialgetSystemVersion(connectionId)
      if (v && v?.major && v?.minor && v?.patch) setVersion(v)

      const c = window.api.SerialgetSystemConfig(connectionId)
      if (c) setConfig(c)

      // to handle whenever the pedal is pressed
      // this is used to add welds automatically when the pedal is pressed
      // and avoid debouncing when held down
      const isPedalActive = status?.pedalActive ?? false
      if (isPedalActive && !lastPedalStateRef.current) {
        const newWeld = createWeld(status, c)
        await addWeld(newWeld, false)
      }
      lastPedalStateRef.current = isPedalActive
    }, 1000)

    const configInterval = setInterval(async () => {
      if (!isConnected) return
      if (!connectionId) return
      await window.api.SerialsendCommand(connectionId, 'GET CONFIG')
      await window.api.SerialsendCommand(connectionId, 'GET VERSION')
      // this way to ensure that config and version are updated less frequently
      // especially useful when connection is stable and we don't need to spam requests
      /// reduces load on the MCU
    }, 10000)

    return () => {
      clearInterval(interval)
      clearInterval(configInterval)
    }
  }, [isConnected, connectionId, pushSystemSnapshot, version, addWeld, setVersion, setConfig])

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
            <div>
              Firmware: {version.major}.{version.minor}.{version.patch}
            </div>
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
                  max={1.2 * (config?.topTempThreshold || 120)}
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
                  max={1.2 * (config?.bottomTempThreshold || 120)}
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
                {process.env.NODE_ENV === 'development' && (
                  <>
                    <h4 className="text-sm text-muted-foreground mt-2">System Data:</h4>
                    <p className="text-xs">{JSON.stringify(systemData, null, 2)}</p>
                    <h4 className="text-sm text-muted-foreground mt-2">System Config:</h4>
                    <p className="text-xs">{JSON.stringify(config, null, 2)}</p>
                  </>
                )}
              </div>
            </div>
          </>

          {/* if its in production, show interface for normal using, by that I mean for a welding session for a user blah blah blah */}
          {process.env.NODE_ENV === 'production' && <></>}
        </div>
      )}
    </main>
  )
}
