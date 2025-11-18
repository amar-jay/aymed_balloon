import { Badge } from './components/ui/badge'
import { Gauge } from './components/ui/guage'
import { cn } from './lib/utils'
import {
  SystemStatus,
  OperationState,
  ErrorCode,
  MenuState,
	OperationStatus
} from '../../preload/typings'
import { Card } from './components/ui/card'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Activity, Clock } from 'lucide-react';

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
      weldingTime: Math.random() * 30,	
      weldingTimeTarget: 30,
      coolingTime: Math.random() * 15,
      coolingTimeTarget: 15,
      pressureValveActive: Math.random() < 0.5,
      coolingFanActive: Math.random() < 0.5,
      pedalPressed: Math.random() < 0.5,
      proximityDetected: Math.random() < 0.5
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
      timestamp: Date.now(),
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


export default function VoltageCard({power}: {power: {
	voltage: number,
	voltageOk: boolean
}}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Battery dimensions
    const bodyWidth = 80;
    const bodyHeight = 130;
    const bodyX = (width - bodyWidth) / 2;
    const bodyY = 40;
    const tipHeight = 5;
    const tipWidth = 40;
    const tipX = (width - tipWidth) / 2;

    // Battery tip
    ctx.fillStyle = '#64748b';
    ctx.fillRect(tipX, bodyY - tipHeight, tipWidth, tipHeight);

    // Battery outline
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3;
    ctx.strokeRect(bodyX - 2, bodyY-2, bodyWidth+4, bodyHeight+4);

    // Fill level
    const percentage = power.voltage / 30;
    const fillHeight = bodyHeight * percentage;
    const fillY = bodyY + bodyHeight - fillHeight;

    // Color based on range
    let fillColor;
    if (percentage < 0.5) {
      fillColor = '#ef4444'; // Red
    } else if (percentage < 0.75) {
      fillColor = '#eab308'; // Yellow
    } else {
      fillColor = '#22c55e'; // Green
    }

    ctx.fillStyle = fillColor;
    ctx.fillRect(bodyX , fillY, bodyWidth, fillHeight );

    // Voltage text in center of battery
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${power.voltage.toFixed(2)}V`, width / 2, bodyY + bodyHeight / 2);

  }, [power]);

  return (
      <Card className="max-h-[300px] flex flex-col items-center gap-2 space-x-0 transition-colors shadow-none md:border-none">

        <p className="text-sm font-medium text-muted-foreground">
					Voltage
					</p>
				<div>
        <canvas
          ref={canvasRef}
          width={200}
          height={200}
          className="w-full"
        />
				</div>

        <Badge
          className={power.voltageOk ? 'bg-green-600 text-white mx-auto' : 'bg-red-600 text-white mx-auto'}
        >
          {power.voltageOk ? 'OK' : 'Alert'}
        </Badge>

    </Card>
  );
}

const OperationCard = ({operation}:{operation: OperationStatus}) => {

  const getStateColor = (state) => {
    switch (state) {
      case OperationState.READY:
        return 'bg-green-500';
      case OperationState.WELDING:
        return 'bg-blue-500';
      case OperationState.COOLING:
        return 'bg-amber-500';
      case OperationState.STANDBY:
        return 'bg-secondary';
      default:
        return 'bg-gray-500';
    }
  };

  const getProgressPercentage = (current, target) => {
    return Math.min((current / target) * 100, 100);
  };

  return (
    <Card className="p-0 flex flex-col items-center transition-colors shadow-none md:border-none">
        <div className="text-sm font-medium text-muted-foreground">Operation</div>

      {/* <CardHeader> */}
        {/* <div className="flex items-center justify-between"> */}
          {/* <CardTitle>Welding Operation</CardTitle> */}
          {/* <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${getStateColor(operation.state)} animate-pulse`}></div>
            <span className="text-sm font-semibold text-foreground">{operation.state}</span>
          </div>
        </div> */}
      {/* </CardHeader> */}
        {/* Time Progress Bars */}
        <div className="w-full">
          {/* Welding Time */}
          <div>
            <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-medium text-muted-foreground">Welding</span>
							<div className='inline-flex items-center gap-2 text-xs'>
                <Activity className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-muted-foreground">
                {operation.weldingTime.toFixed(1)}s / {operation.weldingTimeTarget.toFixed(1)}s
              </span>
							</div>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-200"
                style={{ width: `${getProgressPercentage(operation.weldingTime, operation.weldingTimeTarget)}%` }}
              ></div>
            </div>
          </div>
					<div className='h-5'></div>

          {/* Cooling Time */}
          <div>
            <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-medium text-muted-foreground">Cooling Time</span>

							<div className='inline-flex items-center gap-2 text-xs'>
                <Clock className="w-4 h-4 text-green-600" />
              <span className="text-xs text-muted-foreground">
                {operation.coolingTime.toFixed(1)}s / {operation.coolingTimeTarget.toFixed(1)}s
              </span>
							</div>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-cyan-500 h-2 rounded-full transition-all duration-200"
                style={{ width: `${getProgressPercentage(operation.coolingTime, operation.coolingTimeTarget)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Status Indicators Grid */}
        <div className="grid grid-cols-2 gap-3 w-full">
          <div className={`rounded-lg p-2 border transition-colors ${
            operation.pressureValveActive 
              ? 'bg-blue-50 border-blue-300' 
              : 'bg-muted border-border'
          }`}>
            <div className="flex items-center gap-2">
              {/* <Droplet className={`w-4 h-4 ${operation.pressureValveActive ? 'text-blue-600' : 'text-muted-foreground'}`} /> */}
              <span className="text-xs font-medium text-foreground">Pressure Valve</span>
            </div>
            <p className={`text-xs mt-1 ${operation.pressureValveActive ? 'text-blue-700' : 'text-muted-foreground'}`}>
              {operation.pressureValveActive ? 'Active' : 'Inactive'}
            </p>
          </div>

          <div className={`rounded-lg p-2 border transition-colors ${
            operation.coolingFanActive 
              ? 'bg-cyan-50 border-cyan-300' 
              : 'bg-muted border-border'
          }`}>
            <div className="flex items-center gap-2">
              {/* <Wind className={`w-4 h-4 ${operation.coolingFanActive ? 'text-cyan-600' : 'text-muted-foreground'}`} /> */}
              <span className="text-xs font-medium text-foreground">Cooling Fan</span>
            </div>
            <p className={`text-xs mt-1 ${operation.coolingFanActive ? 'text-cyan-700' : 'text-muted-foreground'}`}>
              {operation.coolingFanActive ? 'Active' : 'Inactive'}
            </p>
          </div>

          <div className={`rounded-lg p-3 border transition-colors ${
            operation.pedalPressed 
              ? 'bg-green-50 border-green-300' 
              : 'bg-muted border-border'
          }`}>
            <div className="flex items-center gap-2">
              {/* <div className={`w-4 h-4 rounded ${operation.pedalPressed ? 'bg-green-500' : 'bg-muted-foreground'}`}></div> */}
              <span className="text-xs font-medium text-foreground">Pedal</span>
            </div>
            <p className={`text-xs mt-1 ${operation.pedalPressed ? 'text-green-700' : 'text-muted-foreground'}`}>
              {operation.pedalPressed ? 'Pressed' : 'Released'}
            </p>
          </div>

          <div className={`rounded-lg p-3 border transition-colors ${
            operation.proximityDetected 
              ? 'bg-amber-50 border-amber-300' 
              : 'bg-muted border-border'
          }`}>
            <div className="flex items-center gap-2">
              {/* <div className={`w-4 h-4 rounded-full ${operation.proximityDetected ? 'bg-amber-500' : 'bg-muted-foreground'}`}></div> */}
              <span className="text-xs font-medium text-foreground">Proximity</span>
            </div>
            <p className={`text-xs mt-1 ${operation.proximityDetected ? 'text-amber-700' : 'text-muted-foreground'}`}>
              {operation.proximityDetected ? 'Detected' : 'Clear'}
            </p>
          </div>
        </div>
    </Card>
  );
};

export function Dashboard({ isConnected, receivedData }: DashboardProps) {
  // Get the latest system status from received data
  const latestData = receivedData.length > 0 ? receivedData[receivedData.length - 1] : null
  // const systemStatus: SystemStatus | null = latestData?.data || null
  // if in dev, use mock data
  const systemStatus: SystemStatus | null = generateMockSystemStatus()
  // let systemStatus: SystemStatus | null
  // try {
  //   systemStatus = (latestData && JSON.parse(latestData)) || null
  // } catch (e) {
  //   // use a much better error handling here, perhaps an alert or notification
  //   systemStatus = null
  // }

  // Error handling with toast notifications
  const previousErrorRef = useRef<ErrorCode | null>(null)
  
  useEffect(() => {
    if (systemStatus?.error.hasError && systemStatus.error.code !== previousErrorRef.current) {
      toast.error(systemStatus.error.message, {
        description: systemStatus.error.description,
        duration: 5000,
      })
      previousErrorRef.current = systemStatus.error.code
    } else if (!systemStatus?.error.hasError && previousErrorRef.current !== null) {
      previousErrorRef.current = null
    }
  }, [systemStatus?.error])

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
							<VoltageCard power={systemStatus.power} />
							<OperationCard operation={systemStatus.operation} />
            </div>
          </div>

          {/* Power Status Section */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* <div className="bg-card dark:bg-card rounded-lg border dark:border-border p-4 space-y-2 transition-colors">
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
              </div> */}
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
      )}
      {/* add more dashboard elements here later */}
      {/* {systemStatus && <p className="max-w-full text-wrap px-1">{JSON.stringify(systemStatus)}</p>} */}
    </main>
  )
}
