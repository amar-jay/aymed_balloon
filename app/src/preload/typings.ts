/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * TypeScript Types for Balloon Welding Machine Dashboard
 * Serial Communication Data Structures
 */

// NEVER DELETE THIS TYPE HERE!!!!!
export interface Session {
  id?: string
  name: string
  created_at?: string
  updated_at?: string
  data: unknown
}
// ============================================================================
// ENUMS
// ============================================================================

export enum ErrorCode {
  NONE = 0,
  TOP_HEATER_NTC = 1,
  BOTTOM_HEATER_NTC = 2,
  POWER_SUPPLY_NTC = 3,
  POWER_SUPPLY_HIGH_TEMP = 4,
  LOW_VOLTAGE = 5,
  HIGH_VOLTAGE = 6,
  TOP_HEATER_HIGH_TEMP = 7,
  BOTTOM_HEATER_HIGH_TEMP = 8,
  TOP_HEATER_HEATING = 9,
  BOTTOM_HEATER_HEATING = 10,
  PEDAL_LOCKED = 11
}

export enum OperationState {
  STANDBY = 0,
  READY = 1,
  WELDING = 2,
  COOLING = 3
}

export enum MenuState {
  MAIN = 0,
  HEATER_TEMP = 1,
  FACTORY_SETTINGS = 2,
  SYSTEM_ERROR = 3,
  SYSTEM_SETTINGS4 = 4,
  SYSTEM_SETTINGS = 6,
  SYSTEM_SETTINGS2 = 7
}

// ============================================================================
// TEMPERATURE DATA
// ============================================================================

export interface TemperatureData {
  /** Top heater current temperature (°C) */
  topTemp: number

  /** Bottom heater current temperature (°C) */
  bottomTemp: number

  /** Power supply temperature (°C) */
  powerSupplyTemp: number

  /** Top heater setpoint temperature (°C) */
  topTempSetpoint: number

  /** Bottom heater setpoint temperature (°C) */
  bottomTempSetpoint: number

  /** Is top heater actively heating */
  topHeaterActive: boolean

  /** Is bottom heater actively heating */
  bottomHeaterActive: boolean
}

// ============================================================================
// OPERATION STATUS
// ============================================================================

export interface OperationStatus {
  /** Current operation state */
  state: OperationState

  /** Current welding time (seconds) */
  weldingTime: number

  /** Target welding time (seconds) */
  weldingTimeTarget: number

  /** Current cooling time (seconds) */
  coolingTime: number

  /** Target cooling time (seconds) */
  coolingTimeTarget: number

  /** Is pressure valve active */
  pressureValveActive: boolean

  /** Is cooling fan active */
  coolingFanActive: boolean

  /** Is pedal pressed */
  pedalPressed: boolean

  /** Is proximity sensor triggered */
  proximityDetected: boolean
}

// ============================================================================
// POWER STATUS
// ============================================================================

export interface PowerStatus {
  /** Supply voltage (V) */
  voltage: number

  /** Is voltage within acceptable range */
  voltageOk: boolean

  /** Power supply temperature OK */
  powerTempOk: boolean
}

// ============================================================================
// ERROR STATUS
// ============================================================================

export interface ErrorStatus {
  /** Current error code */
  code: ErrorCode

  /** Error message */
  message: string

  /** Error description */
  description: string

  /** Timestamp of error occurrence */
  timestamp: number

  /** Is system currently in error state */
  hasError: boolean
}

export interface ErrorInfo {
  code: ErrorCode
  name: string
  message: string
  description: string
  severity: 'critical' | 'warning' | 'info'
}

// ============================================================================
// SYSTEM CONFIGURATION
// ============================================================================

// export interface SystemConfig {
//   /** Operation/welding time (seconds, 5-60) */
//   opTime: number

//   /** Cooling time (seconds, 3-30) */
//   coTime: number

//   /** Top heater temperature setpoint (°C, 20-150)
//    *
//    * This is defined for the user UI and represents the maximum gauge
//    */
//   topTempThreshold: number

//   /** Bottom heater temperature setpoint (°C, 20-150)
//    *
//    * This is defined for the user UI and represents the maximum gauge
//    */
//   bottomTempThreshold: number

//   /** Temperature sensor 1 offset calibration (100-255)
//    * TODO: remove not necessary
//    */
//   topTempOffset: number

//   /** Temperature sensor 2 offset calibration (100-255)
//    * TODO: remove not necessary
//    */
//   bottomTempOffset: number

//   /** Menu auto-reset delay (seconds, 10-60) */
//   menuResetDelay: number

//   /** Time calibration offset (0-255) */
//   timeCalibration: number

//   /** Maximum temperature error threshold (°C, 125-175) */
//   maxTempError: number

//   /** VCC voltage error threshold (V, 12-32) */
//   vccVoltageError: number

//   /** Power temperature error threshold (°C, 25-75) */
//   powerTempError: number

//   /** Power VCC error checking enabled */
//   powerVccErrorEnabled: boolean

//   /** System error checking enabled */
//   sysErrorEnabled: boolean

//   /** Voltage calibration value (0-250) */
//   voltageCalibration: number

//   /** Heater differential error threshold (°C, 5-50) */
//   heaterErrorEnable: number

//   /** Cooling delay (0-250) */
//   coolingDelay: number
// }
// export interface SystemConfig {
//   optime: number
//   cotime: number
//   top_temp_threshold: number
//   bottom_temp_threshold: number
//   top_temp_offset: number
//   bottom_temp_offset: number
//   menu_reset_delay: number
//   time_calibration: number
//   max_temp_error: number
//   vcc_voltage_error: number
//   power_temp_error: number
//   power_vcc_error: number
//   sys_error: number
//   voltage_calibration: number
//   heater_error_enable: number
//   cooling_delay: number
//   first_boot: number
// }

// ============================================================================
// MENU STATUS
// ============================================================================

export interface MenuStatus {
  /** Is menu currently active */
  active: boolean

  /** Current menu state */
  currentMenu: MenuState

  /** Current selection index within menu */
  selectionIndex: number

  /** Time remaining before menu auto-close (seconds) */
  timeoutRemaining: number
}

// ============================================================================
// SYSTEM STATUS (Complete State)
// ============================================================================

export interface BalloonStatus {
  /** Temperature data */
  temperature: TemperatureData

  /** Operation status */
  operation: OperationStatus

  /** Power status */
  power: PowerStatus

  /** Error status */
  error: ErrorStatus

  /** Menu status */
  menu: MenuStatus

  /** System configuration */
  // config: SystemConfig

  /** System uptime (seconds) */
  uptime: number

  /** Firmware version */
  firmwareVersion: string

  /** Hardware revision */
  hardwareRevision: string

  /** Last update timestamp */
  lastUpdate: Date
}

// ============================================================================
// COMMANDS (Dashboard → Device)
// ============================================================================

export enum CommandType {
  // Operation Commands
  START = 'START',
  STOP = 'STOP',
  RESET = 'RESET',
  EMERGENCY_STOP = 'EMERGENCY_STOP',

  // Configuration Commands
  SET_OP_TIME = 'SET_OP_TIME',
  SET_COOLING_TIME = 'SET_COOLING_TIME',
  SET_TOP_TEMP = 'SET_TOP_TEMP',
  SET_BOTTOM_TEMP = 'SET_BOTTOM_TEMP',

  // System Commands
  FACTORY_RESET = 'FACTORY_RESET',
  CLEAR_ERROR = 'CLEAR_ERROR',
  SAVE_CONFIG = 'SAVE_CONFIG',
  LOAD_CONFIG = 'LOAD_CONFIG',

  // Calibration Commands
  CALIBRATE_TEMP1 = 'CALIBRATE_TEMP1',
  CALIBRATE_TEMP2 = 'CALIBRATE_TEMP2',
  CALIBRATE_VOLTAGE = 'CALIBRATE_VOLTAGE',
  CALIBRATE_TIME = 'CALIBRATE_TIME',

  // Query Commands
  GET_STATUS = 'GET_STATUS',
  GET_CONFIG = 'GET_CONFIG',
  GET_ERRORS = 'GET_ERRORS'
}

export interface Command {
  /** Command type */
  type: CommandType

  /** Command payload (optional) */
  payload?: number | string | boolean | object

  /** Command timestamp */
  timestamp: Date

  /** Command ID for tracking responses */
  commandId?: string
}

export interface CommandResponse {
  /** Original command ID */
  commandId: string

  /** Success status */
  success: boolean

  /** Response message */
  message: string

  /** Response data (optional) */
  data?: any

  /** Response timestamp */
  timestamp: Date
}

// ============================================================================
// TELEMETRY DATA (Device → Dashboard)
// ============================================================================

export interface TelemetryPacket {
  /** Packet type identifier */
  type: 'status' | 'config' | 'error' | 'event'

  /** Packet sequence number */
  sequence: number

  /** Data payload */
  data: BalloonStatus | ErrorStatus | SystemEvent

  /** Timestamp */
  timestamp: Date

  /** Checksum for data integrity */
  checksum?: string
}

// ============================================================================
// SYSTEM EVENTS
// ============================================================================

export enum EventType {
  SYSTEM_START = 'SYSTEM_START',
  SYSTEM_STOP = 'SYSTEM_STOP',
  WELDING_START = 'WELDING_START',
  WELDING_COMPLETE = 'WELDING_COMPLETE',
  COOLING_START = 'COOLING_START',
  COOLING_COMPLETE = 'COOLING_COMPLETE',
  ERROR_OCCURRED = 'ERROR_OCCURRED',
  ERROR_CLEARED = 'ERROR_CLEARED',
  CONFIG_CHANGED = 'CONFIG_CHANGED',
  MENU_OPENED = 'MENU_OPENED',
  MENU_CLOSED = 'MENU_CLOSED',
  PEDAL_PRESSED = 'PEDAL_PRESSED',
  PEDAL_RELEASED = 'PEDAL_RELEASED',
  BUTTON_PRESSED = 'BUTTON_PRESSED',
  TEMPERATURE_THRESHOLD = 'TEMPERATURE_THRESHOLD',
  VOLTAGE_THRESHOLD = 'VOLTAGE_THRESHOLD'
}

export interface SystemEvent {
  /** Event type */
  type: EventType

  /** Event description */
  description: string

  /** Event timestamp */
  timestamp: Date

  /** Additional event data */

  data?: any

  /** Event severity */
  severity: 'info' | 'warning' | 'error' | 'critical'
}

// ============================================================================
// STATISTICS & HISTORY
// ============================================================================

export interface Statistics {
  /** Total number of welding cycles */
  totalCycles: number

  /** Total welding time (seconds) */
  totalWeldingTime: number

  /** Total cooling time (seconds) */
  totalCoolingTime: number

  /** Average welding time per cycle (seconds) */
  avgWeldingTime: number

  /** Average cooling time per cycle (seconds) */
  avgCoolingTime: number

  /** Total errors encountered */
  totalErrors: number

  /** Most common error code */
  mostCommonError: ErrorCode

  /** System uptime (seconds) */
  systemUptime: number

  /** Last maintenance date */
  lastMaintenance?: Date
}

export interface HistoryRecord {
  /** Record ID */
  id: string

  /** Record timestamp */
  timestamp: Date

  /** Operation state at time of record */
  operationState: OperationState

  /** Temperature snapshot */
  temperatures: {
    top: number
    bottom: number
    powerSupply: number
  }

  /** Voltage snapshot */
  voltage: number

  /** Any errors at time of record */
  error?: ErrorCode

  /** Cycle information if applicable */
  cycleInfo?: {
    weldingTime: number
    coolingTime: number
    completed: boolean
  }
}

// ============================================================================
// DASHBOARD UI STATE
// ============================================================================

export interface DashboardState {
  /** Current system status */
  BalloonStatus: BalloonStatus

  /** Connection status */
  connected: boolean

  /** Last connection timestamp */
  lastConnection?: Date

  /** Statistics */
  statistics: Statistics

  /** Event history (recent events) */
  eventHistory: SystemEvent[]

  /** Operation history */
  operationHistory: HistoryRecord[]

  /** Active alerts/notifications */
  alerts: Alert[]

  /** User preferences */
  preferences: DashboardPreferences
}

export interface Alert {
  /** Alert ID */
  id: string

  /** Alert type */
  type: 'info' | 'warning' | 'error' | 'success'

  /** Alert title */
  title: string

  /** Alert message */
  message: string

  /** Alert timestamp */
  timestamp: Date

  /** Is alert dismissed */
  dismissed: boolean

  /** Auto-dismiss timeout (ms) */
  autoDismiss?: number
}

export interface DashboardPreferences {
  /** Temperature unit (C/F) */
  temperatureUnit: 'C' | 'F'

  /** Auto-refresh interval (ms) */
  refreshInterval: number

  /** Show advanced settings */
  showAdvancedSettings: boolean

  /** Enable sound notifications */
  soundEnabled: boolean

  /** Theme (light/dark) */
  theme: 'light' | 'dark'

  /** Chart update rate (ms) */
  chartUpdateRate: number
}

// ============================================================================
// SERIAL COMMUNICATION PROTOCOL
// ============================================================================

export interface SerialMessage {
  /** Message start delimiter */
  startDelimiter: string // e.g., ">>>"

  /** Message type */
  messageType: 'CMD' | 'RSP' | 'TLM' | 'EVT'

  /** Message payload (JSON string) */
  payload: string

  /** Message end delimiter */
  endDelimiter: string // e.g., "<<<"

  /** Checksum */
  checksum: string
}

export interface SerialConfig {
  /** Baud rate */
  baudRate: number

  /** Data bits */
  dataBits: 8 | 7 | 6 | 5

  /** Stop bits */
  stopBits: 1 | 2

  /** Parity */
  parity: 'none' | 'even' | 'odd'

  /** Flow control */
  flowControl: 'none' | 'hardware' | 'software'

  /** Port name */
  portName: string
}

export interface TelemetryData {
  data: BalloonStatus
  timestamp: Date
}

// ============================================================================
// ERROR DESCRIPTIONS MAP
// ============================================================================

export const ERROR_DESCRIPTIONS: Record<ErrorCode, ErrorInfo> = {
  [ErrorCode.NONE]: {
    code: ErrorCode.NONE,
    name: 'No Error',
    message: 'System operating normally',
    description: 'No errors detected',
    severity: 'info'
  },
  [ErrorCode.TOP_HEATER_NTC]: {
    code: ErrorCode.TOP_HEATER_NTC,
    name: 'Top Heater NTC Error',
    message: 'Top heater temperature sensor malfunction',
    description: 'The NTC thermistor for the top heater is not responding or has failed',
    severity: 'critical'
  },
  [ErrorCode.BOTTOM_HEATER_NTC]: {
    code: ErrorCode.BOTTOM_HEATER_NTC,
    name: 'Bottom Heater NTC Error',
    message: 'Bottom heater temperature sensor malfunction',
    description: 'The NTC thermistor for the bottom heater is not responding or has failed',
    severity: 'critical'
  },
  [ErrorCode.POWER_SUPPLY_NTC]: {
    code: ErrorCode.POWER_SUPPLY_NTC,
    name: 'Power Supply NTC Error',
    message: 'Power supply temperature sensor malfunction',
    description: 'The NTC thermistor for the power supply is not responding or has failed',
    severity: 'critical'
  },
  [ErrorCode.POWER_SUPPLY_HIGH_TEMP]: {
    code: ErrorCode.POWER_SUPPLY_HIGH_TEMP,
    name: 'Power Supply Overheating',
    message: 'Power supply temperature too high',
    description: 'The power supply has exceeded safe operating temperature',
    severity: 'critical'
  },
  [ErrorCode.LOW_VOLTAGE]: {
    code: ErrorCode.LOW_VOLTAGE,
    name: 'Low Voltage',
    message: 'Supply voltage below threshold',
    description: 'Input voltage is below the minimum required for safe operation',
    severity: 'warning'
  },
  [ErrorCode.HIGH_VOLTAGE]: {
    code: ErrorCode.HIGH_VOLTAGE,
    name: 'High Voltage',
    message: 'Supply voltage above threshold',
    description: 'Input voltage exceeds maximum safe operating voltage',
    severity: 'critical'
  },
  [ErrorCode.TOP_HEATER_HIGH_TEMP]: {
    code: ErrorCode.TOP_HEATER_HIGH_TEMP,
    name: 'Top Heater Overheating',
    message: 'Top heater temperature exceeded limit',
    description: 'Top heater temperature has exceeded the maximum safe threshold',
    severity: 'critical'
  },
  [ErrorCode.BOTTOM_HEATER_HIGH_TEMP]: {
    code: ErrorCode.BOTTOM_HEATER_HIGH_TEMP,
    name: 'Bottom Heater Overheating',
    message: 'Bottom heater temperature exceeded limit',
    description: 'Bottom heater temperature has exceeded the maximum safe threshold',
    severity: 'critical'
  },
  [ErrorCode.TOP_HEATER_HEATING]: {
    code: ErrorCode.TOP_HEATER_HEATING,
    name: 'Top Heater Malfunction',
    message: 'Top heater not heating properly',
    description: 'Top heater temperature differential indicates heating malfunction',
    severity: 'warning'
  },
  [ErrorCode.BOTTOM_HEATER_HEATING]: {
    code: ErrorCode.BOTTOM_HEATER_HEATING,
    name: 'Bottom Heater Malfunction',
    message: 'Bottom heater not heating properly',
    description: 'Bottom heater temperature differential indicates heating malfunction',
    severity: 'warning'
  },
  [ErrorCode.PEDAL_LOCKED]: {
    code: ErrorCode.PEDAL_LOCKED,
    name: 'Pedal Locked',
    message: 'Mechanical error - pedal stuck',
    description: 'The foot pedal appears to be mechanically locked or jammed',
    severity: 'critical'
  }
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/** Type guard for checking if a value is an ErrorCode */
export function isErrorCode(value: string | ErrorCode): value is ErrorCode {
  return Object.values(ErrorCode).includes(value)
}

/** Type guard for checking if a value is an OperationState */
export function isOperationState(value: string | OperationState): value is OperationState {
  return Object.values(OperationState).includes(value)
}
