// jotai state managment funcs
import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { SystemConfig, SystemVersion } from 'src/lib/types/minibuf'

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

// const defaultVersion = {
//   major: 0,
//   minor: 0,
//   patch: 0
// } as SystemVersion
export const versionAtom = atomWithStorage<SystemVersion | null>('version', null)

// This controls how many past data points are stored for graphing
// Storage key: 'historyLimit', default: 240
export const historyLimitAtom = atomWithStorage<number>('historyLimit', 240)

// I want an atom to store a list of firware version (files) downloaded, with one being the latest
// but I also want to limit it to make sure it can fit in localStorage
// versions are indexed by version string, e.g. 'v1.0.0'

interface FirmwareEntry {
  data: string // base64 encoded firmware file
  downloadedAt: string // ISO date string
  isLatest?: boolean
}

const _firmwareVersionsAtom = atomWithStorage<Record<string, FirmwareEntry>>('firmwareVersions', {})

// Writable atom that enforces a limit of 5 firmware versions to prevent localStorage overflow
export const firmwareVersionsAtom = atom(
  (get) => {
		const versions = get(_firmwareVersionsAtom)
		if (Object.keys(versions).length === 0) {
			const fromStoreVersions = window.api.UpdategetVersionsNames()
			// update _
			return
		}
	},
  (get, set, update: { action: 'add'; version: string; data?: File }) => {
    const current = get(_firmwareVersionsAtom)
    if (update.action === 'add' && update.data) {
      const base64 = btoa(String.fromCharCode(...new Uint8Array(update.data)))
      const newEntry: FirmwareEntry = {
        data: base64,
        downloadedAt: new Date().toISOString(),
        isLatest: update.isLatest
      }
      const newVersions = { ...current, [update.version]: newEntry }
      // Limit to 5 entries, removing oldest first (but preserve latest if marked)
      const keys = Object.keys(newVersions)
      if (keys.length > 5) {
        const sorted = keys
          .filter((k) => !newVersions[k].isLatest) // Don't remove latest
          .sort(
            (a, b) =>
              new Date(newVersions[a].downloadedAt).getTime() -
              new Date(newVersions[b].downloadedAt).getTime()
          )
        const toRemove = sorted.slice(0, keys.length - 5)
        toRemove.forEach((k) => delete newVersions[k])
        // If still over, remove more including latest if necessary
        if (Object.keys(newVersions).length > 5) {
          const allSorted = Object.keys(newVersions).sort(
            (a, b) =>
              new Date(newVersions[a].downloadedAt).getTime() -
              new Date(newVersions[b].downloadedAt).getTime()
          )
          const excess = allSorted.slice(0, Object.keys(newVersions).length - 5)
          excess.forEach((k) => delete newVersions[k])
        }
      }
      set(_firmwareVersionsAtom, newVersions)
    } else if (update.action === 'remove') {
      const newVersions = { ...current }
      delete newVersions[update.version]
      set(_firmwareVersionsAtom, newVersions)
    }
  }
)
