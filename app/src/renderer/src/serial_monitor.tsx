import * as React from 'react'
import { Button, buttonVariants } from '@renderer/components/ui/button'
import { Badge } from '@renderer/components/ui/badge'
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@renderer/components/ui/empty'
import { Input } from '@renderer/components/ui/input'
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
  command: string
  loading: boolean
  status: string
  selectedPage: 'serial-monitor' | 'dashboard'
  clearData: () => void
  connectToDevice: (devicePath: string) => Promise<void>
  connectToFirstDevice: () => Promise<void>
  disconnect: () => Promise<void>
  loadDevices: () => Promise<void>
  sendCommand: (command?: string) => Promise<void>
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
      <div className="flex-1 flex overflow-hidden relative">
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
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Quick Commands</h3>
              {isConnected && <Badge variant="outline">Active</Badge>}
            </div>

            <div className="space-y-4 flex-1 flex flex-col">
              {/* All Commands in 2-Column Grid */}
              <div className="grid grid-cols-2 gap-2">
                {['status', 'config', 'version', 'error'].map((cmd) => (
                  <Button
                    key={cmd}
                    onClick={async () => {
                      // slight delay to ensure command state is updated before sending
                      await sendCommand('GET ' + cmd.toUpperCase())
                    }}
                    disabled={!isConnected || loading}
                    size="sm"
                    variant="outline"
                    className={cn(
                      'text-xs h-8 capitalize',
                      !isConnected || loading ? 'cursor-not-allowed' : ''
                    )}
                  >
                    {cmd}
                  </Button>
                ))}

                {/* Manual ON/OFF Controls */}
                {[
                  { name: 'Pedal', cmd: 'MANUAL_PEDAL', default: false },
                  { name: 'Proximity', cmd: 'MANUAL_PROXIMITY', default: false },
                  { name: 'Cooling', cmd: 'MANUAL_COOLING', default: true },
                  { name: 'Pressure', cmd: 'MANUAL_PRESSURE', default: true },
                  { name: 'Top Heater', cmd: 'MANUAL_TOP_HEATER', default: true },
                  { name: 'Bottom Heater', cmd: 'MANUAL_BOTTOM_HEATER', default: true }
                ].map((control) => (
                  <div
                    key={control.cmd}
                    className={
                      (buttonVariants({
                        variant: 'default',
                        size: 'sm'
                      }),
                      'text-xs text-gray-700 flex items-center justify-around px-2 py-1.5 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50')
                    }
                    //flex items-center justify-between px-2 py-1.5 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50')
                  >
                    <button
                      className={cn(
                        'border-r border-gray-300 flex-1 text-center text-black hover:text-gray-700 cursor-pointer',
                        !isConnected || loading ? 'text-gray-500 cursor-not-allowed' : ''
                      )}
                      disabled={!isConnected || loading}
                      onClick={async () => {
                        // slight delay to ensure command state is updated before sending
                        await sendCommand(`SET ${control.cmd} ON`)
                      }}
                    >
                      {control.name} <br /> ON
                    </button>
                    <button
                      className={cn(
                        'border-gray-300 flex-1 text-center text-black hover:text-gray-700 cursor-pointer',

                        !isConnected || loading ? 'text-gray-500 cursor-not-allowed' : ''
                      )}
                      disabled={!isConnected || loading}
                      onClick={async () => {
                        await sendCommand(`SET ${control.cmd} OFF`)
                      }}
                    >
                      {control.name}
                      <br /> OFF
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
        {children}
        {selectedPage === 'serial-monitor' && (
          <div className="absolute bottom-5 right-7 left-87 inline-flex gap-2">
            <Input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendCommand()}
              placeholder="Enter command..."
              disabled={!isConnected}
              className="w-full bottom-4 bg-[#222] focus-visible:ring-0 focus-visible:border-[#444] border-[#333] border-2 text-gray-300 placeholder-gray-500"
            />

            <button
              onClick={() => sendCommand()}
              className={buttonVariants({ variant: 'default', size: 'sm' })}
            >
              Send
            </button>
            <button
              onClick={() => clearData()}
              className={buttonVariants({ variant: 'default', size: 'sm' })}
            >
              Clear
            </button>
          </div>
        )}
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
}): React.JSX.Element {
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
