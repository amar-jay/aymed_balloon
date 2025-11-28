import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  listUSBPorts,
  listPorts,
  connect,
  disconnect,
  sendCommand,
  readData,
  readLatestData,
  getSystemConfig,
  getSystemStatus,
  clearBuffer,
  disconnectAll,
  connectToFirstUSBDevice,
  findUSBDevices,
  getActiveConnections,
  getDevicePath,
  isDeviceConnected,
  getSystemVersion
} from '../lib/serial'

export interface SystemConfig {
  /** Operation/welding time (seconds, 5-60) */
  opTime: number

  /** Cooling time (seconds, 3-30) */
  coTime: number

  /** Top heater temperature setpoint (°C, 20-150)
   *
   * This is defined for the user UI and represents the maximum gauge
   */
  topTempThreshold: number

  /** Bottom heater temperature setpoint (°C, 20-150)
   *
   * This is defined for the user UI and represents the maximum gauge
   */
  bottomTempThreshold: number

  /** Temperature sensor 1 offset calibration (100-255)
   * TODO: remove not necessary
   */
  topTempOffset: number

  /** Temperature sensor 2 offset calibration (100-255)
   * TODO: remove not necessary
   */
  bottomTempOffset: number

  /** Menu auto-reset delay (seconds, 10-60) */
  menuResetDelay: number

  /** Time calibration offset (0-255) */
  timeCalibration: number

  /** Maximum temperature error threshold (°C, 125-175) */
  maxTempError: number

  /** VCC voltage error threshold (V, 12-32) */
  vccVoltageError: number

  /** Power temperature error threshold (°C, 25-75) */
  powerTempError: number

  /** Power VCC error checking enabled */
  powerVccErrorEnabled: boolean

  /** System error checking enabled */
  sysErrorEnabled: boolean

  /** Voltage calibration value (0-250) */
  voltageCalibration: number

  /** Heater differential error threshold (°C, 5-50) */
  heaterErrorEnable: number

  /** Cooling delay (0-250) */
  coolingDelay: number
}

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
      SerialreadData: typeof readData
      SerialreadLatestData: typeof readLatestData
      SerialgetSystemStatus: typeof getSystemStatus
      SerialgetSystemConfig: typeof getSystemConfig
      SerialgetSystemVersion: typeof getSystemVersion
      SerialclearDataBuffer: typeof clearBuffer
      SerialdisconnectAll: typeof disconnectAll
      SerialconnectToFirstUSBDevice: typeof connectToFirstUSBDevice
      SerialfindUSBDevices: typeof findUSBDevices
      SerialgetActiveConnections: typeof getActiveConnections
      SerialgetDevicePath: typeof getDevicePath
      SerialisDeviceConnected: typeof isDeviceConnected
    }
  }
}
