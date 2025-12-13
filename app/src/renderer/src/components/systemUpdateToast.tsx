// this is a system update toast component,
// it doesnt use "sonner" at all, since it is just occurs once, that is on app start
// and shows whether a system update is available or not
// with a button to open settings dialog to upgrade firmware

import * as React from 'react'
import { X, Download, Sparkles } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'
import { useAtom, useAtomValue } from 'jotai/react'
import { updateAvailableAtom, versionAtom } from '@renderer/lib/jotai'

export function SystemUpdateToast() {
  const [isVisible, setIsVisible] = React.useState(true)
  const [isClosing, setIsClosing] = React.useState(false)
  const [latestVersion, setLatestVersion] = React.useState<string | null>(null)
  const currentVersion = useAtomValue(versionAtom)
  const [, setUpdateAvailable] = useAtom(updateAvailableAtom)

  React.useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const latest = await window.api.UpdategetLatestVersion()
        if (latest && currentVersion) {
          const currentVersionStr = `v${currentVersion.major}.${currentVersion.minor}.${currentVersion.patch}`
          if (latest.version !== currentVersionStr) {
            setLatestVersion(latest.version)
            setIsVisible(true)
          }
        }
      } catch (error) {
        console.error('Failed to check for updates:', error)
      }
    }

    // Check for updates on mount with a small delay
    const timer = setTimeout(checkForUpdates, 2000)
    return () => clearTimeout(timer)
  }, [currentVersion])

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsVisible(false)
      setIsClosing(false)
    }, 300)
  }

  const handleOpenSettings = () => {
    handleClose()
    setUpdateAvailable(true)
  }

  if (!isVisible) return null

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 w-[360px]',
        'animate-in slide-in-from-bottom-5 fade-in duration-300',
        isClosing && 'animate-out slide-out-to-bottom-5 fade-out'
      )}
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-lg bg-background shadow-lg',
          ' border-1 border-blue-950/50 backdrop-blur-sm'
        )}
      >
        {/* Gradient accent bar */}
        {/* <div className="absolute top-0 left-0 right-0 h-[2px] border-blue-900 to-slate-400" /> */}

        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-500/10 border border-blue-500/20">
              <Sparkles className="h-4 w-4 text-slate-500" />
            </div>

            {/* Content */}
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground">Firmware Update Available</h4>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 -mr-1 -mt-1 text-muted-foreground hover:text-foreground"
                  onClick={handleClose}
                >
                  <X className="h-4 w-4 text-black" />
                  <span className="sr-only">Close</span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                A new firmware version{' '}
                <span className="font-medium text-foreground">{latestVersion}</span> is available.
                Update to get the latest features and improvements.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-3 flex items-center gap-2 pl-12 pt-5 justify-around">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleClose}
            >
              Later
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-blue-950 hover:bg-blue-950/90 text-white border-0"
              onClick={handleOpenSettings}
            >
              <Download className="mr-1.5 h-3 w-3" />
              Update Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
