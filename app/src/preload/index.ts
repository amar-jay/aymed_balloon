import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { SerialPort as NodeSerialPort } from 'serialport'
import {
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
import {
  createSession,
  deleteSessionById,
  getSessionById,
  getSessions,
  updateSessionById
} from '../lib/db'

// Custom APIs for renderer
const api = {
  listSerialPorts: async (): Promise<string[]> => {
    return (await NodeSerialPort.list()).map((port) => port.path)
  },
  SeriallistUSBPorts: listUSBPorts,
  SeriallistPorts: listPorts,
  Serialconnect: connect,
  Serialdisconnect: disconnect,
  SerialsendCommand: sendCommand,
  SerialreadData: readData,
  SerialreadLatestData: readLatestData,
  SerialgetSystemStatus: getSystemStatus,
  SerialgetSystemConfig: getSystemConfig,
  SerialgetSystemVersion: getSystemVersion,
  SerialclearDataBuffer: clearBuffer,
  SerialdisconnectAll: disconnectAll,
  SerialconnectToFirstUSBDevice: connectToFirstUSBDevice,
  SerialfindUSBDevices: findUSBDevices,
  SerialgetActiveConnections: getActiveConnections,
  SerialgetDevicePath: getDevicePath,
  SerialisDeviceConnected: isDeviceConnected,

  // Session APIs
  DBgetSessions: () => Promise.resolve(getSessions()),
  DBgetSession: (id: number) => Promise.resolve(getSessionById(id)),
  DBcreateSession: (session: { name: string; data: unknown }) => Promise.resolve(createSession(session.name, session.data)),
  DBupdateSession: (id: number, name: string, data: unknown) => Promise.resolve(updateSessionById(id, name, data)),
  DBdeleteSession: (id: number) => Promise.resolve(deleteSessionById(id)),
  DBgenerateSessionPDF: (sessionId: number) => ipcRenderer.invoke('generate-session-pdf', sessionId)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
