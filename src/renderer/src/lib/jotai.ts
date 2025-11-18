// jotai state managment funcs
import { atomWithStorage } from 'jotai/utils'
import { SystemConfig } from '../../../preload/typings'

// ============================================================================

// jotai persisted atoms

// These atoms are automatically synced with localStorage
// Storage key: 'currentPath', default: 'serial-monitor'
type currentPathType = 'serial-monitor' | 'dashboard'
export const currentPathAtom = atomWithStorage<currentPathType>('currentPath', 'serial-monitor')

// Storage key: 'baudRate', default: 9600
export const baudRateAtom = atomWithStorage<number>('baudRate', 9600)

// export interface SystemConfig {
//   optime: number
//   cotime: number
//   top_temp_threshold: number
//   bottom_temp_threshold: number
//   temp1_offset: number
//   temp2_offset: number
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
  temp1Offset: 128, // 0 offset (128 = 0 for signed byte)
  temp2Offset: 128, // 0 offset
  menuResetDelay: 30, // 30 seconds
  timeCalibration: 100, // 100ms calibration
  maxTempError: 10, // 10°C error tolerance
  vccVoltageError: 1.0, // 1V error tolerance
  powerTempError: 5, // 5°C power temp error
	powerVccErrorEnabled: true, // power VCC error enabled
	sysErrorEnabled: true, // system error enabled
  voltageCalibration: 50, // 50mV calibration
  heaterErrorEnable: 1, // Heater error checking enabled
  coolingDelay: 2 // 2 seconds cooling delay
}
// Storage key: 'settings', default: {}
export const settingsAtom = atomWithStorage<SystemConfig>('settings', defaultConfig)