import * as React from 'react'
import { Button } from '@renderer/components/ui/button'
import { Badge } from '@renderer/components/ui/badge'
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@renderer/components/ui/empty'
import { Label } from '@renderer/components/ui/label'
import { cn } from './lib/utils'
// import logo
import logo from '@renderer/assets/logo.jpeg?asset'
import usb from '@renderer/assets/usb2.svg?asset'
// get sync icon from lucide-react
import { RefreshCcw } from 'lucide-react'
import { SerialDevice } from './use-serial'
import { Profile } from './components/profile'

function MainLayout({
  children,
  connectionId,
  command,
  devices,
  isConnected,
  loading,
  receivedData,
  status,
  selectedPage,
  clearData,
  connectToDevice,
  connectToFirstDevice,
  disconnect,
  loadDevices,
  sendCommand,
  setCommand,
  setSelectedPage
}: {
  children: React.ReactNode
  devices: SerialDevice[]
  connectionId: string | null
  isConnected: boolean
  receivedData: string[]
  command: string
  loading: boolean
  status: string
  selectedPage: 'serial-monitor' | 'dashboard'
  clearData: () => void
  connectToDevice: (devicePath: string) => Promise<void>
  connectToFirstDevice: () => Promise<void>
  disconnect: () => Promise<void>
  loadDevices: () => Promise<void>
  sendCommand: () => Promise<void>
  setCommand: React.Dispatch<React.SetStateAction<string>>
  setSelectedPage: React.Dispatch<React.SetStateAction<'serial-monitor' | 'dashboard'>>
}): React.JSX.Element {
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
          <div className="flex gap-3 items-center">
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

            <Profile selectedPage={selectedPage} setSelectedPage={setSelectedPage} />
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
                  <EmptyMedia variant="icon">
                    <img
                      src={usb}
                      alt="Aymed Medikal Teknoloji Logo"
                      className="h-6 w-6 rounded-full object-cover opacity-25"
                    />
                  </EmptyMedia>
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
                  {['status', 'config', 'error', 'help', 'reset', 'version', 'ping'].map((cmd) => (
                    <Button
                      key={cmd}
                      onClick={() => {
                        setCommand('GET ' + cmd.toUpperCase())
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
        {children}
      </div>
    </div>
  )
}

export function Main({
  isConnected,
  receivedData
}: {
  isConnected: boolean
  receivedData: string[]
}) {
  return (
    <main className="flex-1 flex flex-col bg-[#1a1a1a] rounded-tl-2xl">
      {/* Main Console Area */}
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
          className="bg-[#222] rounded-lg p-4 font-mono text-sm h-full overflow-y-auto overflow-x-hidden border border-[#333]"
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
                  className={`break-all whitespace-pre-wrap leading-relaxed ${
                    data.includes('error') || data.includes('Error ') || data.includes('ERROR:')
                      ? 'text-red-400'
                      : data.includes('[WARN]') ||
                          data.includes('warn') ||
                          data.includes('Warn') ||
                          data.includes('<wrn>')
                        ? 'text-yellow-400'
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
  )
}

export { MainLayout }
