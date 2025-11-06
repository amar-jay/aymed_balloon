import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  listUSBPorts,
  listPorts,
  connect,
  disconnect,
  sendCommand,
  disconnectAll,
  connectToFirstUSBDevice,
  findUSBDevices,
  getActiveConnections,
  getDevicePath,
  isDeviceConnected
} from '../lib/serial'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      listSerialPorts: () => Promise<string[]>
      SeriallistUSBPorts: typeof listUSBPorts
      SeriallistPorts: typeof listPorts
      Serialconnect: typeof connect
      Serialdisconnect: typeof disconnect
      SerialsendCommand: typeof sendCommand
      SerialdisconnectAll: typeof disconnectAll
      SerialconnectToFirstUSBDevice: typeof connectToFirstUSBDevice
      SerialfindUSBDevices: typeof findUSBDevices
      SerialgetActiveConnections: typeof getActiveConnections
      SerialgetDevicePath: typeof getDevicePath
      SerialisDeviceConnected: typeof isDeviceConnected
    }
  }
}
