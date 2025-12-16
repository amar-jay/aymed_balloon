// jotai state managment funcs
import { atomWithStorage } from 'jotai/utils'
import { SystemConfig, SystemVersion } from 'src/lib/types/minibuf'
import { atom } from 'jotai'

// ============================================================================

// jotai persisted atoms

// These atoms are automatically synced with localStorage
// Storage key: 'currentPath', default: 'serial-monitor'
export type currentPathType = 'serial-monitor' | 'dashboard' | `sessions/${number}` | 'sessions'
export const currentPathAtom = atomWithStorage<currentPathType>('currentPath', 'serial-monitor')

// Storage key: 'baudRate', default: 115200
export const baudRateAtom = atomWithStorage<number>('baudRate', 115200)

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
export const defaultConfig: SystemConfig = {
  opTime: 10, // 10 seconds default operation time
  coTime: 5, // 5 seconds cooling time
  topTempThreshold: 180, // 180°C typical welding temperature
  bottomTempThreshold: 170, // 170°C slightly lower
  topTempOffset: 128, // 0 offset (128 = 0 for signed byte)
  bottomTempOffset: 128, // 0 offset
  menuResetDelay: 30, // 30 seconds
  timeCalibration: 100, // 100ms calibration
  maxTempError: 10, // 10°C error tolerance
  vccVoltageError: 1.0, // 1V error tolerance
  powerTempError: 5, // 5°C power temp error
  powerVccErrorEnabled: true, // power VCC error enabled
  sysErrorEnabled: true, // system error enabled
  voltageCalibration: 50, // 50mV calibration
  heaterErrorEnable: 1, // Heater error checking enabled
  coolingDelay: 2, // 2 seconds cooling delay
  useInternalADC: true // Use internal ADC
} satisfies SystemConfig

// Storage key: 'settings', default: {}
// regularly fetch settings from device and update this atom
export const settingsAtom = atomWithStorage<SystemConfig | null>('settings', null)

// update available atom
export const updateAvailableAtom = atomWithStorage<boolean>('updateAvailable', false)

// const defaultVersion = {
//   major: 0,
//   minor: 0,
//   patch: 0
// } as SystemVersion
export const versionAtom = atomWithStorage<SystemVersion | null>('version', null)

// This controls how many past data points are stored for graphing
// Storage key: 'historyLimit', default: 240
export const historyLimitAtom = atomWithStorage<number>('historyLimit', 240)

// error atom.
// if the last encounted error is longer than a minute ago, clear it
// Storage key: 'lastError', default: null
export interface ErrorInfo {
  message: string
  timestamp: number
}

const _lastErrorAtom = atom<ErrorInfo | null>(null)

export const lastErrorAtom = atom(
  (get) => {
    const lastError = get(_lastErrorAtom)
    if (!lastError) return null

    // if error is older than 3 seconds, clear it
    if (Date.now() - lastError.timestamp > 3000) {
      return null
    }

    return lastError
  },
  (_get, set, newError: ErrorInfo | null) => {
    set(_lastErrorAtom, newError)
  }
)
