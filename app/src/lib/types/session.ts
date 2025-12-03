export interface Weld {
  id?: number
  topHeaterTemperature: number
  bottomHeaterTemperature: number
  powerSupplyVoltage: number
  weldingDuration: number // in seconds
  coolingDuration: number // in seconds
  isSuccessful: boolean
  error?: string // error message if weld failed
  createdAt?: string
}

export interface Session {
  id?: number
  operatorName: string
  companyName: string
  createdAt?: string
  updatedAt?: string
  welds: Weld[]
  startSession: string // ISO date string
  endSession?: string // ISO date string
  averageTopHeaterTemperature: number // computed from welds
  averageBottomHeaterTemperature: number // computed from welds
  averagePowerSupplyVoltage: number // computed from welds
  successCount: number // computed from welds
  failureCount: number // computed from welds
}

// Helper function to compute session statistics from welds
export function computeSessionStats(
  welds: Weld[]
): Pick<
  Session,
  | 'averageTopHeaterTemperature'
  | 'averageBottomHeaterTemperature'
  | 'averagePowerSupplyVoltage'
  | 'successCount'
  | 'failureCount'
> {
  if (welds.length === 0) {
    return {
      averageTopHeaterTemperature: 0,
      averageBottomHeaterTemperature: 0,
      averagePowerSupplyVoltage: 0,
      successCount: 0,
      failureCount: 0
    }
  }

  const successCount = welds.filter((w) => w.isSuccessful).length
  const failureCount = welds.length - successCount
  const avgTopTemp = welds.reduce((sum, w) => sum + w.topHeaterTemperature, 0) / welds.length
  const avgBottomTemp = welds.reduce((sum, w) => sum + w.bottomHeaterTemperature, 0) / welds.length
  const avgVoltage = welds.reduce((sum, w) => sum + w.powerSupplyVoltage, 0) / welds.length

  return {
    averageTopHeaterTemperature: avgTopTemp,
    averageBottomHeaterTemperature: avgBottomTemp,
    averagePowerSupplyVoltage: avgVoltage,
    successCount,
    failureCount
  }
}
