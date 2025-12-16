import * as React from 'react'
import { Main } from './serial_monitor'
import { useSerial } from './hooks/use-serial'
import { Dashboard } from './dashboard'
import { currentPathAtom } from './lib/jotai'
import { useAtom } from 'jotai/react'
import { Toaster } from './components/ui/sonner'
import { MainLayout } from './layout'
import { History } from './history'
import { WeldSession } from './session'
import { SystemUpdateToast } from './components/systemUpdateToast'

function App(): React.JSX.Element {
  const serial = useSerial()
  const [currentPath, setCurrentPath] = useAtom(currentPathAtom)

  return (
    <>
      <MainLayout {...serial} setSelectedPage={setCurrentPath} selectedPage={currentPath}>
        {currentPath === 'serial-monitor' && (
          <Main isConnected={serial.isConnected} receivedData={serial.receivedData} />
        )}
        {currentPath === 'dashboard' && (
          <Dashboard isConnected={serial.isConnected} connectionId={serial.connectionId} />
        )}
        {currentPath === 'sessions' && <History />}
        {currentPath.startsWith('sessions/') && (
          <WeldSession sessionId={currentPath.split('/')[1]} />
        )}
      </MainLayout>
      <Toaster />
      <SystemUpdateToast />
    </>
  )
}

export default App
