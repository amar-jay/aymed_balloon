// jotai state managment funcs
import { atomWithStorage } from 'jotai/utils'
import { SystemConfig } from 'src/lib/types/minibuf'

// ============================================================================

// jotai persisted atoms

// These atoms are automatically synced with localStorage
// Storage key: 'currentPath', default: 'serial-monitor'
type currentPathType = 'serial-monitor' | 'dashboard'
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
export const settingsAtom = atomWithStorage<SystemConfig>('settings', defaultConfig)

// This controls how many past data points are stored for graphing
// Storage key: 'historyLimit', default: 240
export const historyLimitAtom = atomWithStorage<number>('historyLimit', 240)
