import * as React from 'react'
import { Button } from '@renderer/components/ui/button'
import { Badge } from '@renderer/components/ui/badge'
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@renderer/components/ui/empty'
import { Label } from '@renderer/components/ui/label'
import { cn } from './lib/utils'
// import logo
import logo from '@renderer/assets/logo.jpeg?asset'
// get sync icon from lucide-react
import { RefreshCcw } from 'lucide-react'

interface SerialDevice {
  path: string
  manufacturer?: string
  serialNumber?: string
  pnpId?: string
  locationId?: string
  productId?: string
  vendorId?: string
}

export function SerialPortMonitor(): React.JSX.Element {
  const [devices, setDevices] = React.useState<SerialDevice[]>([])
  const [connectionId, setConnectionId] = React.useState<string | null>(null)
  const [isConnected, setIsConnected] = React.useState(false)
  const [receivedData, setReceivedData] = React.useState<string[]>([])
  const [command, setCommand] = React.useState('')
  const [status, setStatus] = React.useState('Ready')
  const [loading, setLoading] = React.useState(false)

  // Function to add data to the received data list
  const addReceivedData = React.useCallback((data: string) => {
    setReceivedData((prev) => [...prev.slice(-49), data]) // Keep last 50 messages
  }, [])

  // Function to handle serial data reception
  const handleSerialData = React.useCallback(
    (data: string) => {
      addReceivedData(`[${new Date().toLocaleTimeString()}] ${data}`)
    },
    [addReceivedData]
  )

  // Function to handle serial errors
  const handleSerialError = React.useCallback(
    (error: Error) => {
      addReceivedData(`[ERROR] ${error.message}`)
    },
    [addReceivedData]
  )

  // Load available USB devices
  const loadDevices = React.useCallback(async (): Promise<void> => {
    setLoading(true)
    // setStatus('Loading devices...')
    try {
      const usbDevices = await window.api.SerialfindUSBDevices()
      setDevices(usbDevices)
      setStatus(`Found ${usbDevices.length} USB device(s)`)
    } catch (error) {
      setStatus('Error loading devices')
      addReceivedData(`Error: ${(error as Error).message}`)
    } finally {
      setLoading(false)
    }
  }, [addReceivedData])

  // Connect to a device
  const connectToDevice = async (devicePath: string): Promise<void> => {
    setLoading(true)
    setStatus('Connecting...')
    try {
      const connId = await window.api.Serialconnect(
        devicePath,
        9600,
        handleSerialData,
        handleSerialError
      )
      setConnectionId(connId)
      setIsConnected(true)
      setStatus(`Connected to ${devicePath}`)
      addReceivedData(`Connected to ${devicePath}`)
    } catch (error) {
      setStatus('Connection failed')
      addReceivedData(`Connection error: ${(error as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  // Connect to first available device
  const connectToFirstDevice = async (): Promise<void> => {
    setLoading(true)
    setStatus('Connecting to first device...')
    try {
      const connId = await window.api.SerialconnectToFirstUSBDevice(
        9600,
        handleSerialData,
        handleSerialError
      )
      setConnectionId(connId)
      setIsConnected(true)
      setStatus('Connected to first available device')
      addReceivedData('Connected to first available USB device')
    } catch (error) {
      setStatus('Connection failed')
      addReceivedData(`Connection error: ${(error as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  // Send command
  const sendCommand = async (): Promise<void> => {
    if (!connectionId || !command.trim()) return

    setLoading(true)
    try {
      await window.api.SerialsendCommand(connectionId, command)
      addReceivedData(`> ${command}`)
      setCommand('')
    } catch (error) {
      addReceivedData(`Send error: ${(error as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  // Disconnect
  const disconnect = async (): Promise<void> => {
    if (!connectionId) return

    setLoading(true)
    setStatus('Disconnecting...')
    try {
      await window.api.Serialdisconnect(connectionId)
      setConnectionId(null)
      setIsConnected(false)
      setStatus(`Found ${devices.length} USB device(s)`)
      addReceivedData('Disconnected from device')
    } catch (error) {
      addReceivedData(`Disconnect error: ${(error as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  // Clear received data
  const clearData = (): void => {
    setReceivedData([])
  }

  // Load devices on component mount and
  // refresh devices every 5 seconds
  React.useEffect(() => {
    loadDevices()
    const interval = setInterval(() => {
      loadDevices()
    }, 5000)
    return () => clearInterval(interval)
  }, [loadDevices])
  return (
    <div className="h-screen w-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="px-6 py-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-10">
            <img
              src={logo}
              alt="Aymed Medikal Teknoloji Logo"
              className="h-10 w-10 rounded-full object-cover"
            />
            {/* <h1 className="text-2xl font-bold text-gray-900">Serial Port Monitor</h1> */}
            <div>
              <span className="text-sm text-gray-600">{status}</span>
              <div className="flex items-center gap-3">
                {/* <Badge variant={isConnected ? 'default' : 'secondary'}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </Badge> */}
                <span className="text-xs text-gray-500 font-mono">
                  {connectionId ? `ID: ${connectionId.slice(-8)}` : 'No Connected Device'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {devices.length > 0 && (
              <Button
                onClick={isConnected ? disconnect : connectToFirstDevice}
                className={cn(
                  'text-white',
                  isConnected ? 'bg-red-700 hover:bg-red-800' : 'bg-green-700 hover:bg-green-800'
                )}
                size="sm"
              >
                {isConnected ? 'Disconnect' : 'Quick Connect'}
              </Button>
            )}

            <Button onClick={loadDevices} disabled={loading} variant="outline" size="sm">
              <RefreshCcw className={cn('size-4', loading ? 'animate-spin text-gray-500' : '')} />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 flex flex-col">
          {/* Device List */}
          <div className="p-4 flex-1 border-b border-gray-200">
            <h2 className="text-lg font-semibold mb-3 text-gray-900">USB Devices</h2>
            <div className="space-y-2">
              {devices.length === 0 ? (
                <Empty>
                  <EmptyMedia variant="icon">🔌</EmptyMedia>
                  <EmptyTitle>No USB devices found</EmptyTitle>
                  <EmptyDescription>Connect a serial device and refresh</EmptyDescription>
                </Empty>
              ) : (
                devices.map((device, index) => (
                  <div
                    key={index}
                    className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-sm font-medium text-gray-900 truncate">
                          {device.path}
                        </div>
                        {device.manufacturer && (
                          <div className="text-xs text-gray-600 mt-1">{device.manufacturer}</div>
                        )}
                        {device.serialNumber && (
                          <div className="text-xs text-gray-500 font-mono">
                            SN: {device.serialNumber}
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={() => connectToDevice(device.path)}
                        disabled={isConnected}
                        size="sm"
                        variant="default"
                        className="shrink-0"
                      >
                        Connect
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Command Interface */}
          <div className="p-4 flex flex-col pb-10">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Command Interface</h3>
              {isConnected && <Badge variant="outline">Active</Badge>}
            </div>

            <div className="space-y-4 flex-1 flex flex-col">
              {/* Command Input */}
              <div className="space-y-3">
                <Label htmlFor="command-input" className="text-sm font-medium">
                  Send Command
                </Label>
                <div className="flex gap-2 px-0.5 relative">
                  <input
                    id="command-input"
                    type="text"
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendCommand()}
                    placeholder="Enter command to send..."
                    className="flex-1 px-1 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    disabled={!isConnected || loading}
                  />
                  <Button
                    onClick={sendCommand}
                    disabled={!isConnected || loading || !command.trim()}
                    size="sm"
                    variant="default"
                  >
                    Send
                  </Button>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex gap-3 py-2">
                <Button
                  onClick={clearData}
                  disabled={receivedData.length === 0}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  Clear Console
                </Button>
              </div>

              {/* Quick Commands */}
              <div className="border-t border-gray-200 pt-4 mt-2">
                <h4 className="text-lg font-extrabold text-gray-700 pb-1 ">Quick Commands</h4>
                <div className="grid grid-cols-2 gap-2">
                  {['status', 'help', 'reset', 'version', 'ping', 'info'].map((cmd) => (
                    <Button
                      key={cmd}
                      onClick={() => {
                        setCommand(cmd)
                        setTimeout(() => sendCommand(), 0)
                      }}
                      disabled={!isConnected || loading}
                      size="sm"
                      variant="outline"
                      className="text-xs h-8"
                    >
                      {cmd}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Console Area */}
        <main className="flex-1 flex flex-col bg-[#1a1a1a] rounded-tl-2xl">
          {/* Console Header */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-green-400 font-mono text-sm">
                  <span className="text-gray-400 pr-3">Serial Console</span>
                  {isConnected && (
                    <Badge
                      variant="secondary"
                      className={cn(
                        'ml-6 text-xs',
                        isConnected ? 'bg-green-500/60' : 'bg-green-900/30'
                      )}
                    >
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-xs text-gray-400">
                {receivedData.length} lines • Auto-scroll enabled
              </div>
            </div>
          </div>

          {/* Console Output */}
          <div className="flex-1 p-4 overflow-hidden">
            <div
              className="bg-[#222] rounded-lg p-4 font-mono text-sm h-full overflow-y-auto border border-[#333]"
              style={{ minHeight: '400px' }}
            >
              {receivedData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <p className="text-lg">Serial Console Output</p>
                    <p className="text-sm mt-2">Connect to a device to start receiving data</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  {receivedData.map((data, index) => (
                    <div
                      key={index}
                      className={`whitespace-pre-wrap leading-relaxed ${
                        data.includes('[ERROR]') || data.includes('error') || data.includes('Error')
                          ? 'text-red-400'
                          : data.startsWith('>')
                            ? 'text-blue-400'
                            : 'text-gray-300'
                      }`}
                    >
                      {data}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default SerialPortMonitor
