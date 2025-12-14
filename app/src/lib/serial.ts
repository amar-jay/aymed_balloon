/**
 * Serial communication module for connecting to USB devices (microcontrollers)
 *
 * This module provides functionality to:
 * - List available serial ports
 * - Connect to USB serial devices (ACM*, USB*, ttyUSB*, ttyACM*)
 * - Read console data from microcontrollers
 * - Send commands to microcontrollers
 *
 * Designed for IPC usage in Electron apps.
 *
 * Usage example:
 *
 * ```typescript
 * import { listPorts, connect, sendCommand, disconnect } from './lib/serial'
 *
 * // List available USB devices
 * const devices = await findUSBDevices()
 * console.log('Available devices:', devices)
 *
 * // Connect to first device
 * const connectionId = await connect(devices[0].path, 115200,
 *   (data) => console.log('Received:', data), // onData callback
 *   (error) => console.error('Error:', error)  // onError callback
 * )
 *
 * // Send a command
 * await sendCommand(connectionId, 'hello')
 *
 * // Disconnect
 * await disconnect(connectionId)
 * ```
 */

import { SerialPort, ReadlineParser } from 'serialport'
import {
  SystemConfig,
  SystemDataParse,
  SystemData,
  SystemConfigParse,
  SystemVersion,
  SystemConfigSerialize
} from './types/minibuf'
import { open } from 'fs/promises'

export interface SerialDevice {
  path: string
  manufacturer?: string
  serialNumber?: string
  pnpId?: string
  locationId?: string
  productId?: string
  vendorId?: string
}

interface ConnectionInfo {
  port: SerialPort
  parser: ReadlineParser
  devicePath: string
  onData?: (data: string) => void
  onError?: (error: Error) => void
  dataBuffer: string[] // Buffer to store received data
  config?: SystemConfig
  status?: SystemData
  version?: SystemVersion
}

// Store active connections
const activeConnections = new Map<string, ConnectionInfo>()

/**
 * Generate a unique connection ID
 */
function generateConnectionId(): string {
  return `serial_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * List all available serial ports
 */
export async function listPorts(): Promise<SerialDevice[]> {
  try {
    const ports = await SerialPort.list()
    return ports.map((port) => ({
      path: port.path,
      manufacturer: port.manufacturer,
      serialNumber: port.serialNumber,
      pnpId: port.pnpId,
      locationId: port.locationId,
      productId: port.productId,
      vendorId: port.vendorId
    }))
  } catch (error) {
    throw new Error(`Failed to list serial ports: ${error}`)
  }
}

/**
 * Find serial devices (USB on Linux/macOS, COM on Windows)
 */
export async function findUSBDevices(): Promise<SerialDevice[]> {
  const ports = await listPorts()
  return ports.filter(
    (port) =>
      port.path.includes('ACM') ||
      port.path.includes('USB') ||
      port.path.includes('ttyUSB') ||
      port.path.includes('ttyACM') ||
      port.path.includes('COM')
  )
}

/**
 * Connect to a serial device
 * @param devicePath Path to the serial device (e.g., '/dev/ttyACM0')
 * @param baudRate Baud rate for communication (default: 115200)
 * @param onData Callback for incoming data
 * @param onError Callback for errors
 * @returns Connection ID for use with other functions
 */
export async function connect(
  devicePath: string,
  baudRate: number = 115200,
  onData?: (data: string) => void,
  onError?: (error: Error) => void
): Promise<string> {
  try {
    const port = new SerialPort({
      path: devicePath,
      baudRate: baudRate,
      autoOpen: false
    })

    const parser = new ReadlineParser({ delimiter: '\n' })

    await new Promise<void>((resolve, reject) => {
      port.open((error) => {
        if (error) {
          reject(new Error(`Failed to open serial port: ${error.message}`))
        } else {
          resolve()
        }
      })
    })

    // Set up data parsing
    port.pipe(parser)

    const connectionId = generateConnectionId()

    const connectionInfo: ConnectionInfo = {
      port,
      parser,
      devicePath,
      onData,
      onError,
      dataBuffer: []
    }

    activeConnections.set(connectionId, connectionInfo)

    // Set up event listeners
    parser.on('data', (data: string) => {
      const trimmedData = data.trim()
      console.log('[Serial] Received data:', trimmedData) // Debug log
      // Add to buffer
      connectionInfo.dataBuffer.push(trimmedData)
      console.log('[Serial] Buffer size:', connectionInfo.dataBuffer.length) // Debug log
      // Also call the callback if provided
      if (connectionInfo.onData) {
        connectionInfo.onData(trimmedData)
      }
    })

    port.on('error', (error: Error) => {
      console.error('[Serial] Port error:', error) // Debug log
      if (connectionInfo.onError) {
        connectionInfo.onError(error)
      }
    })

    port.on('open', () => {
      console.log('[Serial] Port opened successfully:', devicePath) // Debug log
    })

    port.on('close', () => {
      console.log('[Serial] Port closed:', devicePath) // Debug log
    })

    console.log('[Serial] Connection established:', connectionId, 'to', devicePath) // Debug log
    return connectionId
  } catch (error) {
    throw new Error(`Failed to connect to serial device: ${error}`)
  }
}

/**
 * Send a command to the microcontroller
 * @param connectionId The connection ID returned by connect()
 * @param command The command string to send
 */
export async function sendCommand(connectionId: string, command: string): Promise<void> {
  const connection = activeConnections.get(connectionId)
  if (!connection) {
    throw new Error(`Connection ${connectionId} not found`)
  }

  return new Promise((resolve, reject) => {
    // Add newline if not present
    const commandWithNewline = command.endsWith('\n') ? command : command + '\n'

    connection.port.write(commandWithNewline, (error) => {
      if (error) {
        reject(new Error(`Failed to send command: ${error.message}`))
      } else {
        resolve()
      }
    })
  })
}

/**
 * Disconnect from the serial device
 * @param connectionId The connection ID returned by connect()
 */
export async function disconnect(connectionId: string): Promise<void> {
  const connection = activeConnections.get(connectionId)
  if (!connection) {
    return // Already disconnected or never existed
  }

  return new Promise((resolve) => {
    connection.port.close((error) => {
      activeConnections.delete(connectionId)

      if (error) {
        console.warn('Error closing serial port:', error)
      }

      resolve()
    })
  })
}

/**
 * Check if a connection is active
 * @param connectionId The connection ID returned by connect()
 */
export function isDeviceConnected(connectionId: string): boolean {
  return activeConnections.has(connectionId)
}

/**
 * Within a config string, it is structured as such:
 * CONFIG: key1=value1;key2=value2;...
 * Values can be strings, numbers(float) or booleans (true/false)
 * @param configString
 * @returns
 */
function parseConfig(connection: ConnectionInfo) {
  // find string starting with CONFIG:
  const configLine = connection.dataBuffer.find((str) => str.startsWith('CONFIG:'))
  if (configLine) {
    const configString = configLine.replace('CONFIG:', '').trim()
    try {
      connection.config = SystemConfigParse(configString)
      connection.dataBuffer.shift()
      connection.dataBuffer.unshift(
        '[LOG] Parsed config successfully, ' // + JSON.stringify(connection.config)
      )
    } catch (error) {
      connection.dataBuffer.shift()
      connection.dataBuffer.unshift(
        'ERROR: Failed to parse config data. ' + (error as Error).message
      )
    }
  }
}
/**
 * Within the config string parse the status, structured as
 * STATUS: TEMP:topTemp=val;bottomTemp=val; OPERATIONS: ...
 */
function parseStatus(connection: ConnectionInfo) {
  //
  const statusLine = connection.dataBuffer.find((str) => str.startsWith('STATUS:'))
  if (statusLine) {
    const statusString = statusLine.replace('STATUS:', '').trim()
    try {
      const systemData = SystemDataParse(statusString)
      connection.status = systemData
      connection.dataBuffer.shift()
      // add log of fetching status success
      connection.dataBuffer.unshift(
        '[LOG] Parsed status successfully, ' + JSON.stringify(systemData)
      )
    } catch (error) {
      connection.dataBuffer.shift()
      connection.dataBuffer.unshift(
        'ERROR: Failed to parse status data. ' + (error as Error).message
      )
    }
  }
}
/**
 * Read all buffered data from a connection
 * @param connectionId The connection ID returned by connect()
 * @param clearBuffer Whether to clear the buffer after reading (default: true)
 * @returns Array of received data strings
 */
export function readData(connectionId: string, clearBuffer: boolean = true): string[] {
  const connection = activeConnections.get(connectionId)
  if (!connection) {
    throw new Error(`Connection ${connectionId} not found`)
  }

  // console.log('[Serial] Reading buffer, current size:', connection.dataBuffer.length) // Debug log
  try {
    parseConfig(connection) // try to parse config before reading data
    parseStatus(connection)
  } catch (error) {
    console.error('[Serial] Error parsing data:', error)
  }

  const data = [...connection.dataBuffer]
  if (clearBuffer) {
    connection.dataBuffer = []
    // console.log('[Serial] Buffer cleared') // Debug log
  }
  return data
}

/**
 * Get the latest system status from a connection
 * @param connectionId The connection ID returned by connect()
 * @returns The most recent SystemData object, or null if not available
 */
export function getSystemStatus(connectionId: string): SystemData | null {
  const connection = activeConnections.get(connectionId)
  if (!connection) {
    throw new Error(`Connection ${connectionId} not found`)
  }
  return connection.status || null
}

/**
 * Get the latest system version from a connection
 * @param connectionId The connection ID returned by connect()
 * @returns The most recent SystemVersion object, or null if not available
 */
export function getSystemVersion(connectionId: string): SystemVersion | null {
  const connection = activeConnections.get(connectionId)
  if (!connection) {
    throw new Error(`Connection ${connectionId} not found`)
  }
  return connection.version || null
}

/**
 * Read the latest data from a connection
 * @param connectionId The connection ID returned by connect()
 * @returns The most recent data string, or null if no data available
 */
export function readLatestData(connectionId: string): string | null {
  const connection = activeConnections.get(connectionId)
  if (!connection) {
    throw new Error(`Connection ${connectionId} not found`)
  }

  return connection.dataBuffer.length > 0
    ? connection.dataBuffer[connection.dataBuffer.length - 1]
    : null
}

/**
 * Clear the data buffer for a connection
 * @param connectionId The connection ID returned by connect()
 */
export function clearBuffer(connectionId: string): void {
  const connection = activeConnections.get(connectionId)
  if (!connection) {
    throw new Error(`Connection ${connectionId} not found`)
  }
  connection.dataBuffer = []
}

/**
 * get the system config from a connection
 * @param connectionId The connection ID returned by connect()
 */
export function getSystemConfig(connectionId: string): SystemConfig | null {
  const connection = activeConnections.get(connectionId)
  if (!connection) {
    throw new Error(`Connection ${connectionId} not found`)
  }
  return connection.config || null
}

/**
 * Set the system config for a connection
 * @param connectionId The connection ID returned by connect()
 * @param config The SystemConfig object to set
 */
export function setSystemConfig(connectionId: string, config: SystemConfig) {
  const connection = activeConnections.get(connectionId)
  if (!connection) {
    throw new Error(`Connection ${connectionId} not found`)
  }
  connection.config = config

  try {
    const serialized = SystemConfigSerialize(config) // just to validate
    sendCommand(connectionId, `SET CONFIG ${serialized}`) // send to device
  } catch (error) {
    connection.dataBuffer.unshift(
      'ERROR: Failed to serialize and send config. ' + (error as Error).message
    )
  }
}

/**
 * Reset the system config on the device to defaults
 * @param connectionId The connection ID returned by connect()
 */
export function resetSystemConfig(connectionId: string) {
  const connection = activeConnections.get(connectionId)
  if (!connection) {
    throw new Error(`Connection ${connectionId} not found`)
  }
  connection.config = undefined
  sendCommand(connectionId, `GET RESET`)
}

/**
 * Get the device path for a connection
 * @param connectionId The connection ID returned by connect()
 */
export function getDevicePath(connectionId: string): string | null {
  const connection = activeConnections.get(connectionId)
  return connection ? connection.devicePath : null
}

/**
 * Get all active connection IDs
 */
export function getActiveConnections(): string[] {
  return Array.from(activeConnections.keys())
}

/**
 * Disconnect all active connections
 */
export async function disconnectAll(): Promise<void> {
  const promises = Array.from(activeConnections.keys()).map((id) => disconnect(id))
  await Promise.all(promises)
}

/**
 * Connect to the first available USB serial device
 * @param baudRate Baud rate for communication (default: 115200)
 * @param onData Callback for incoming data
 * @param onError Callback for errors
 * @returns Connection ID for use with other functions
 */
export async function connectToFirstUSBDevice(
  baudRate: number = 115200,
  onData?: (data: string) => void,
  onError?: (error: Error) => void
): Promise<string> {
  const devices = await findUSBDevices()

  if (devices.length === 0) {
    throw new Error('No USB serial devices found')
  }

  return await connect(devices[0].path, baudRate, onData, onError)
}

/**
 * Get a list of available USB serial port paths
 */
export async function listUSBPorts(): Promise<string[]> {
  const devices = await findUSBDevices()
  return devices.map((device) => device.path)
}

/**
 * Helper to wait for a specific string in the data buffer
 */
async function waitForResponse(
  connectionId: string,
  match: string,
  timeoutMs: number
): Promise<void> {
  const connection = activeConnections.get(connectionId)
  if (!connection) throw new Error(`Connection ${connectionId} not found`)

  const startTime = Date.now()
  while (Date.now() - startTime < timeoutMs) {
    // Check if the response is in the buffer
    for (let i = connection.dataBuffer.length - 1; i >= 0; i--) {
      if (connection.dataBuffer[i].includes(match)) {
        return
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(`Timeout waiting for response: "${match}"`)
}

export async function uploadFirmware(
  connectionId: string,
  filepath: string,
  file_type: 'hex' | 'bin' = 'hex'
): Promise<void> {
  if (file_type === 'bin') {
    console.log(
      'BINARY FIRMWARE IS MUCH DIFFICUT TO UPLOAD OVER SERIAL. ITS SUPPORT IS EXPERIMENTAL AND MAY NOT WORK RELIABLY.'
    )
  }

  const connection = activeConnections.get(connectionId)
  if (!connection) {
    throw new Error(`Connection ${connectionId} not found`)
  }

  // 1. Read the firmware file
  let fileData: Buffer
  try {
    // check if file type is binary or hex
    const ext = filepath.split('.').pop()?.toLowerCase()
    if (file_type != ext) {
      throw new Error(`File extension .${ext} does not match specified file type ${file_type}`)
    }
    const fileHandle = await open(filepath, 'r')
    fileData = await fileHandle.readFile()
    await fileHandle.close()
  } catch (error) {
    throw new Error(`Failed to read firmware file: ${(error as Error).message}`)
  }

  // 2. Enter bootloader mode
  // Clear buffer to avoid false positives
  connection.dataBuffer = []

  console.log('[Firmware] Sending start command...')
  // Corrected typo from FIRWARE to FIRMWARE
  await sendCommand(connectionId, 'SET FIRMWARE_UPDATE START')

  // 3. Wait for device to be ready
  console.log('[Firmware] Waiting for device...')
  try {
    await waitForResponse(connectionId, 'UPDATE READY', 10000)
  } catch {
    throw new Error('Device did not enter bootloader mode. Check connection and try again.')
  }

  console.log('[Firmware] Device ready. Starting upload...')

  // 4. Send firmware data
  if (file_type === 'hex') {
    // Send line by line
    const content = fileData.toString('utf-8')
    const lines = content.split(/\r?\n/)

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim() // perhaps there is no need to trim?
      if (!line) continue

      await sendCommand(connectionId, line)

      // Small delay to prevent buffer overflow on device
      await new Promise((resolve) => setTimeout(resolve, 20))
    }
  } else {
    // Send binary chunks
    const chunkSize = 256

    for (let i = 0; i < fileData.length; i += chunkSize) {
      const chunk = fileData.subarray(i, i + chunkSize)

      await new Promise<void>((resolve, reject) => {
        connection.port.write(chunk, (error) => {
          if (error) reject(error)
          else resolve()
        })
      })

      // Small delay
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
  }

  console.log('[Firmware] Upload complete.')

  // 5. Exit bootloader / Reset
  await sendCommand(connectionId, 'SET FIRMWARE_UPDATE END')

  // 6. Wait for completion confirmation
  console.log('[Firmware] Waiting for completion confirmation...')
  await waitForResponse(connectionId, 'UPDATE COMPLETE', 10000)

  console.log('[Firmware] Firmware update successful.')
}
