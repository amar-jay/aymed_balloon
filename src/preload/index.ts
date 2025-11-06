/* eslint-disable prettier/prettier */
import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { SerialPort as NodeSerialPort } from 'serialport'
import {
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
	isDeviceConnected,
} from '../lib/serial'

// Custom APIs for renderer
const api = {
	listSerialPorts: async (): Promise<string[]> => {
		return (await NodeSerialPort.list()).map((port) => port.path)
	},
	SeriallistUSBPorts : listUSBPorts,
	SeriallistPorts : listPorts,
	Serialconnect : connect,
	Serialdisconnect : disconnect,
	SerialsendCommand : sendCommand,
	SerialdisconnectAll : disconnectAll,
	SerialconnectToFirstUSBDevice : connectToFirstUSBDevice,
	SerialfindUSBDevices : findUSBDevices,
	SerialgetActiveConnections : getActiveConnections,
	SerialgetDevicePath : getDevicePath,
	SerialisDeviceConnected : isDeviceConnected,
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
