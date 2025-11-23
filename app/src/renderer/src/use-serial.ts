import * as React from 'react'
import { toast } from 'sonner'
export interface SerialDevice {
  path: string
  manufacturer?: string
  serialNumber?: string
  pnpId?: string
  locationId?: string
  productId?: string
  vendorId?: string
}

export const useSerial = () => {
  // Custom hook logic can be added here if needed in the future
  const [devices, setDevices] = React.useState<SerialDevice[]>([])
  const [connectionId, setConnectionId] = React.useState<string | null>(null)
  const [isConnected, setIsConnected] = React.useState(false)
  const [receivedData, setReceivedData] = React.useState<string[]>([])
  const [command, setCommand] = React.useState('')
  const [status, setStatus] = React.useState('Ready')
  const [loading, setLoading] = React.useState(false)
  const [baudrate] = React.useState(115200)

  // Function to add data to the received data list
  const addReceivedData = React.useCallback((data: string) => {
    setReceivedData((prev) => [...prev.slice(-49), data]) // Keep last 50 messages
  }, [])

  // regularly read latest data from port and add to receivedData
  React.useEffect(() => {
    if (!isConnected || !connectionId) return

    const interval = setInterval(async () => {
      try {
        // Read all buffered data (don't clear buffer yet)
        const bufferedData = await window.api.SerialreadData(connectionId, true)
        if (bufferedData && bufferedData.length > 0) {
          bufferedData.forEach((data) => {
            if (data.trim() === '') return
            if (data.startsWith('ERROR:')) {
              toast.error('Serial Error', { description: data })
            }
            if (data.startsWith('[LOG] Parsed config successfully')) {
              toast.success('MCU Config Updated', { description: data })
            }
            addReceivedData(`[${new Date().toLocaleTimeString()}] ${data}`)
          })
        }
      } catch (error) {
        console.error('Error reading data:', error)
      }
    }, 100) // Check every 100ms for smoother data reception

    return () => clearInterval(interval)
  }, [isConnected, connectionId, addReceivedData])

  // Load available USB devices
  const loadDevices = React.useCallback(async (): Promise<void> => {
    // setLoading(true)
    // setStatus('Loading devices...')
    try {
      const usbDevices = await window.api.SerialfindUSBDevices()
      setDevices(usbDevices)
      setStatus(`Found ${usbDevices.length} USB device(s)`)
    } catch (error) {
      setStatus('Error loading devices')
      addReceivedData(`Error: ${(error as Error).message}`)
    } finally {
      // setLoading(false)
    }
  }, [addReceivedData])

  // Connect to a device
  const connectToDevice = async (devicePath: string): Promise<void> => {
    setLoading(true)
    setStatus('Connecting...')
    const p = toast.promise(window.api.Serialconnect(devicePath, baudrate), {
      loading: 'Connecting to device...',
      success: 'Connected to device successfully',
      error: `Error connecting to device ${devicePath}`
    })
    try {
      // Don't pass callbacks - we'll use buffer reading instead
      const connId = await p.unwrap()
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
      // Don't pass callbacks - we'll use buffer reading instead
      const connId = await window.api.SerialconnectToFirstUSBDevice(baudrate)
      setConnectionId(connId)
      setIsConnected(true)
      setStatus('Connected to first available device')
      toast.success('Connected to device successfully', {
        description: `Connected to first available USB device successfully`
      })
      addReceivedData('Connected to first available USB device')
    } catch (error) {
      setStatus('Connection failed')
      toast.error('Connection failed', {
        description: `Connection error: ${(error as Error).message}`
      })
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
      toast.success('Device disconnected successfully')
      addReceivedData('Disconnected from device')
    } catch (error) {
      addReceivedData(`Disconnect error: ${(error as Error).message}`)
      toast.error('Device disconnected failed', {
        description: `Disconnect error: ${(error as Error).message}`
      })
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
  React.useEffect(() => {
    // Disable Ctrl+R reload and refresh devices instead
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.ctrlKey && event.key === 'r') {
        event.preventDefault()
        loadDevices()
      }
    }
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [loadDevices])

  return {
    devices,
    connectionId,
    isConnected,
    receivedData,
    command,
    status,
    loading,
    loadDevices,
    connectToDevice,
    connectToFirstDevice,
    sendCommand,
    disconnect,
    clearData,
    setCommand
  }
}
