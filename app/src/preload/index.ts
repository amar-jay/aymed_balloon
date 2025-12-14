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
  getSystemVersion,
  setSystemConfig,
  resetSystemConfig,
  uploadFirmware
} from '../lib/serial'
import { Session, Weld } from '../lib/types/session'
import './index.d'
import type { VersionInfo, DownloadedVersion } from '../lib/update'

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
  SerialsetSystemConfig: setSystemConfig,
  SerialresetSystemConfig: resetSystemConfig,
  SerialclearDataBuffer: clearBuffer,
  SerialdisconnectAll: disconnectAll,
  SerialconnectToFirstUSBDevice: connectToFirstUSBDevice,
  SerialfindUSBDevices: findUSBDevices,
  SerialgetActiveConnections: getActiveConnections,
  SerialgetDevicePath: getDevicePath,
  SerialisDeviceConnected: isDeviceConnected,
  SerialuploadFirmware: uploadFirmware,

  // Session APIs
  DBgetSessions: (): Promise<Session[]> => ipcRenderer.invoke('db:sessions:getAll'),
  DBgetSession: (id: number): Promise<Session | undefined> =>
    ipcRenderer.invoke('db:sessions:get', id),
  DBcreateSession: (session: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> =>
    ipcRenderer.invoke('db:sessions:create', session),
  DBupdateSession: (
    id: number,
    session: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<boolean> => ipcRenderer.invoke('db:sessions:update', id, session),
  DBdeleteSession: (id: number): Promise<boolean> => ipcRenderer.invoke('db:sessions:delete', id),
  DBaddWeldToSession: (sessionId: number, weld: Omit<Weld, 'id' | 'createdAt'>): Promise<number> =>
    ipcRenderer.invoke('db:sessions:addWeld', sessionId, weld),
  DBendSession: (sessionId: number): Promise<boolean> =>
    ipcRenderer.invoke('db:sessions:end', sessionId),
  DBgenerateSessionPDF: (sessionId: number): Promise<string | null> =>
    ipcRenderer.invoke('db:sessions:generatePDF', sessionId),

  // Update APIs
  UpdategetOnlineVersions: (): Promise<VersionInfo[]> =>
    ipcRenderer.invoke('update:get-online-versions'),
  UpdatedownloadVersion: (version: string): Promise<void> =>
    ipcRenderer.invoke('update:download-version', version),
  UpdategetDownloadedVersions: (): Promise<DownloadedVersion[]> =>
    ipcRenderer.invoke('update:get-downloaded-versions'),
  UpdategetVersion: (versionTag: string): Promise<DownloadedVersion> =>
    ipcRenderer.invoke('update:get-version', versionTag),
  UpdatedeleteVersion: (versionTag: string): Promise<void> =>
    ipcRenderer.invoke('update:delete-version', versionTag),
  UpdateisVersionDownloaded: (tag: string): Promise<boolean> =>
    ipcRenderer.invoke('update:is-version-downloaded', tag),
  UpdategetLatestVersion: (): Promise<VersionInfo | null> =>
    ipcRenderer.invoke('update:get-latest-version')
} satisfies Window['api']

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
