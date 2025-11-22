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
import { ErrorCode, SystemConfig, SystemStatus } from '../preload/typings'

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
  status?: Partial<SystemStatus>
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

// Extra helper
const castConfigValue = (value: string) => {
  return value == 'T' ? true : value == 'F' ? false : isNaN(Number(value)) ? value : Number(value)
}
/**
 * Within a config string, it is structured as such:
 * CONFIG: key1=value1;key2=value2;...
 * Values can be strings, numbers(float) or booleans (true/false)
 * @param configString
 * @returns
 */
function parseConfig(connection: ConnectionInfo) {
  const KEYS = [
    'opTime',
    'coTime',
    'topTempThreshold',
    'bottomTempThreshold',
    'temp1Offset',
    'temp2Offset',
    'menuResetDelay',
    'timeCalibration',
    'maxTempError',
    'vccVoltageError',
    'powerTempError',
    'powerVccErrorEnabled',
    'sysErrorEnabled',
    'voltageCalibration',
    'heaterErrorEnable',
    'coolingDelay'
  ]

  // find string starting with CONFIG:
  const configLine = connection.dataBuffer.find((str) => str.startsWith('CONFIG:'))
  let configString

  if (configLine) {
    const config: Partial<SystemConfig> = {}
    configString = configLine.replace('CONFIG:', '').trim()
    const pairs = configString.split(';')
    for (const pair of pairs) {
      if (pair.includes('=')) {
        const [key, value] = pair.split('=').map((s) => s.trim())
        // Determine type
        const v = castConfigValue(value)
        if (!KEYS.includes(key)) continue
        config[key] = v
      }
    }
    if (Object.keys(config).length === KEYS.length) {
      connection.config = config as SystemConfig
    } else {
      console.warn(
        '[Serial] Incomplete config received:',
        configString,
        'It must have ',
        KEYS.length,
        'keys but received ',
        Object.keys(config).length
      )
    }
    connection.dataBuffer.shift()
  }
}
/**
 * Within the config string parse the status, structured as
 * STATUS: TEMP:topTemp=val;bottomTemp=val; OPERATIONS: ...
 */
function parseStatus(connection: ConnectionInfo) {
  //
  const statusLine = connection.dataBuffer[0].trim()
  let statusString = ''
  if (statusLine.startsWith('STATUS:')) {
    const status: Partial<SystemStatus> = {}
    statusString = statusLine.replace('STATUS:', '').trim()
    const statusPartitions = statusString.trim().split(' ')
    for (const partition of statusPartitions) {
      // work on the temp partition first
      if (partition.startsWith('TEMP:')) {
        const pairs = partition.replace('TEMP:', '').split(';')
        pairs.map((pair) => {
          if (pair.includes('=')) {
            const [key, value] = pair.split('=').map((s) => s.trim())
            // Determine type
            if (
              ![
                'topTemp',
                'bottomTemp',
                'powerSupplyTemp',
                'topTempSetpoint',
                'bottomTempSetpoint',
                'topHeaterActive',
                'bottomHeaterActive'
              ].includes(key)
            )
              return
            status.temperature = {} as SystemStatus['temperature']
            status.temperature[key] = castConfigValue(value)
          }
        })
      }

      if (partition.startsWith('OPERATIONS:')) {
        const pairs = partition.replace('TEMP:', '').split(';')
        pairs.map((pair) => {
          if (pair.includes('=')) {
            const [key, value] = pair.split('=').map((s) => s.trim())
            // Determine type
            if (
              ![
                'weldingTime',
                'weldingTimeTarget',
                'coolingTime',
                'coolingTimeTarget',
                'pressureValveActive',
                'coolingFanActive',
                'pedalPressed',
                'proximityDetected'
              ].includes(key)
            )
              return
            status.operation = {} as SystemStatus['operation']
            status.operation[key] = castConfigValue(value)
          }
        })
      }

      if (partition.startsWith('POWER:')) {
        const value = partition.replace('POWER:', '').trim()
        status.power = {} as SystemStatus['power']
        if (isNaN(Number(value))) {
          status.error = {
            code: ErrorCode.POWER_SUPPLY_NTC,
            message: 'Invalid voltage value',
            description: 'Invalid voltage value received from device',
            timestamp: Date.now(),
            hasError: true
          }
          status.power.powerTempOk = false
        } else if (Number(value) < 0) {
          status.power.voltageOk = false
        } else {
          status.power.voltage = Number(value)
        }
      }

      if (partition.startsWith('ERROR:')) {
        const pairs = partition.replace('ERROR:', '').split(';')
        pairs.map((pair) => {
          if (pair.includes(':')) {
            const [key, value] = pair.split(':').map((s) => s.trim())
            // Determine type
            if (key.length > 0 && value.length > 0) {
              status.error = {
                code: Number(key),
                message: value,
                description: value,
                timestamp: Date.now(),
                hasError: true
              } as SystemStatus['error']
            }
          }
        })
      }
    }
    connection.status = status
    connection.dataBuffer.shift()
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

  console.log('[Serial] Reading buffer, current size:', connection.dataBuffer.length) // Debug log
  try {
    parseConfig(connection) // try to parse config before reading data
    parseStatus(connection)
  } catch (error) {
    console.error('[Serial] Error parsing data:', error)
  }

  const data = [...connection.dataBuffer]
  if (clearBuffer) {
    connection.dataBuffer = []
    console.log('[Serial] Buffer cleared') // Debug log
  }
  return data
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
