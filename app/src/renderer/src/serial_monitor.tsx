import { Badge } from './components/ui/badge'
import { cn } from './lib/utils'

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
          className="bg-[#222] rounded-lg p-4 pb-12 font-mono text-sm h-full overflow-y-auto overflow-x-hidden border border-[#333]"
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
