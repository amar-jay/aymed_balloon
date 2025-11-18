import * as React from 'react'
import { MainLayout, Main } from './serial_monitor'
import { useSerial } from './use-serial'
import { Dashboard } from './dashboard'
import { currentPathAtom} from './lib/jotai'
import { useAtom } from 'jotai/react'
import { Toaster } from './components/ui/sonner'

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
          <Dashboard isConnected={serial.isConnected} receivedData={serial.receivedData} />
        )}
        {/* <div></div> */}
      </MainLayout>
      <Toaster />
    </>
  )
}

export default App

