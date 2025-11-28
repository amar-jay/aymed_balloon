/**
 * Session Management System for Welding Operations
 * Tracks welding sessions, individual welds, and generates reports
 */

export interface WeldEvent {
  id: string
  timestamp: Date
  duration: number // welding time in seconds
  topTemp: number
  bottomTemp: number
  voltage: number
  coolingTime: number
  success: boolean
  notes?: string
}

export interface SessionData {
  id: string
  startTime: Date
  endTime?: Date
  operatorName?: string
  batchNumber?: string
  productType?: string
  welds: WeldEvent[]
  config: {
    opTime: number
    coTime: number
    topTempThreshold: number
    bottomTempThreshold: number
  }
  status: 'active' | 'completed' | 'aborted'
  totalWelds: number
  successfulWelds: number
  failedWelds: number
  notes?: string
}

export interface SessionSummary {
  id: string
  startTime: Date
  endTime?: Date
  operatorName?: string
  batchNumber?: string
  totalWelds: number
  duration: number // in minutes
  status: 'active' | 'completed' | 'aborted'
}

const SESSIONS_STORAGE_KEY = 'welding_sessions'
const PEDAL_DEBOUNCE_TIME = 3000 // 3 seconds between welds

export class SessionManager {
  private currentSession: SessionData | null = null
  private lastPedalPressTime: number = 0
  private weldStartTime: number = 0
  private isWelding: boolean = false

  /**
   * Start a new welding session
   */
  startSession(
    operatorName?: string,
    batchNumber?: string,
    productType?: string,
    config?: any
  ): SessionData {
    const session: SessionData = {
      id: this.generateSessionId(),
      startTime: new Date(),
      operatorName,
      batchNumber,
      productType,
      welds: [],
      config: config || {
        opTime: 0,
        coTime: 0,
        topTempThreshold: 0,
        bottomTempThreshold: 0
      },
      status: 'active',
      totalWelds: 0,
      successfulWelds: 0,
      failedWelds: 0
    }

    this.currentSession = session
    return session
  }

  /**
   * Process system data to detect and record welds
   */
  processSystemData(systemData: any): WeldEvent | null {
    if (!this.currentSession || this.currentSession.status !== 'active') {
      return null
    }

    const now = Date.now()
    const pedalActive = systemData.pedalActive

    // Detect weld start (pedal pressed)
    if (pedalActive && !this.isWelding) {
      // Check debounce time
      if (now - this.lastPedalPressTime > PEDAL_DEBOUNCE_TIME) {
        this.isWelding = true
        this.weldStartTime = now
        this.lastPedalPressTime = now
      }
    }

    // Detect weld end (pedal released or cooling started)
    if (this.isWelding && (!pedalActive || systemData.coolingFanActive)) {
      const weldDuration = (now - this.weldStartTime) / 1000 // Convert to seconds
      
      // Only record if weld was held for at least 0.5 seconds
      if (weldDuration >= 0.5) {
        const weldEvent = this.recordWeld(systemData, weldDuration)
        this.isWelding = false
        return weldEvent
      } else {
        this.isWelding = false
      }
    }

    return null
  }

  /**
   * Record a weld event
   */
  private recordWeld(systemData: any, duration: number): WeldEvent {
    const weld: WeldEvent = {
      id: this.generateWeldId(),
      timestamp: new Date(),
      duration,
      topTemp: systemData.topTemp,
      bottomTemp: systemData.bottomTemp,
      voltage: systemData.powerSupplyVoltage,
      coolingTime: systemData.coolingTime,
      success: this.evaluateWeldSuccess(systemData),
      notes: ''
    }

    if (this.currentSession) {
      this.currentSession.welds.push(weld)
      this.currentSession.totalWelds++
      if (weld.success) {
        this.currentSession.successfulWelds++
      } else {
        this.currentSession.failedWelds++
      }
    }

    return weld
  }

  /**
   * Evaluate if a weld was successful based on parameters
   */
  private evaluateWeldSuccess(systemData: any): boolean {
    // A weld is considered successful if:
    // 1. Both heaters reached acceptable temperature
    // 2. Voltage was stable
    // 3. Cooling completed
    
    const tempOk = 
      systemData.topTemp >= (this.currentSession?.config.topTempThreshold || 0) * 0.8 &&
      systemData.bottomTemp >= (this.currentSession?.config.bottomTempThreshold || 0) * 0.8

    const voltageOk = systemData.powerSupplyVoltage >= 20 && systemData.powerSupplyVoltage <= 30

    return tempOk && voltageOk
  }

  /**
   * End the current session
   */
  endSession(notes?: string): SessionData | null {
    if (!this.currentSession) return null

    this.currentSession.endTime = new Date()
    this.currentSession.status = 'completed'
    if (notes) {
      this.currentSession.notes = notes
    }

    // Save to storage
    this.saveSession(this.currentSession)

    const completedSession = this.currentSession
    this.currentSession = null
    this.isWelding = false

    return completedSession
  }

  /**
   * Abort the current session
   */
  abortSession(reason?: string): SessionData | null {
    if (!this.currentSession) return null

    this.currentSession.endTime = new Date()
    this.currentSession.status = 'aborted'
    this.currentSession.notes = reason || 'Session aborted'

    this.saveSession(this.currentSession)

    const abortedSession = this.currentSession
    this.currentSession = null
    this.isWelding = false

    return abortedSession
  }

  /**
   * Get current active session
   */
  getCurrentSession(): SessionData | null {
    return this.currentSession
  }

  /**
   * Save session to localStorage
   */
  private saveSession(session: SessionData): void {
    const sessions = this.getAllSessions()
    const existingIndex = sessions.findIndex(s => s.id === session.id)
    
    if (existingIndex >= 0) {
      sessions[existingIndex] = session
    } else {
      sessions.push(session)
    }

    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions))
  }

  /**
   * Get all sessions from localStorage
   */
  getAllSessions(): SessionData[] {
    const data = localStorage.getItem(SESSIONS_STORAGE_KEY)
    if (!data) return []

    const sessions = JSON.parse(data)
    // Convert date strings back to Date objects
    return sessions.map((s: any) => ({
      ...s,
      startTime: new Date(s.startTime),
      endTime: s.endTime ? new Date(s.endTime) : undefined,
      welds: s.welds.map((w: any) => ({
        ...w,
        timestamp: new Date(w.timestamp)
      }))
    }))
  }

  /**
   * Get session summaries for list view
   */
  getSessionSummaries(): SessionSummary[] {
    const sessions = this.getAllSessions()
    return sessions.map(s => ({
      id: s.id,
      startTime: s.startTime,
      endTime: s.endTime,
      operatorName: s.operatorName,
      batchNumber: s.batchNumber,
      totalWelds: s.totalWelds,
      duration: s.endTime 
        ? (s.endTime.getTime() - s.startTime.getTime()) / 60000 
        : (Date.now() - s.startTime.getTime()) / 60000,
      status: s.status
    }))
  }

  /**
   * Get a specific session by ID
   */
  getSession(id: string): SessionData | null {
    const sessions = this.getAllSessions()
    return sessions.find(s => s.id === id) || null
  }

  /**
   * Delete a session
   */
  deleteSession(id: string): boolean {
    const sessions = this.getAllSessions()
    const filtered = sessions.filter(s => s.id !== id)
    
    if (filtered.length < sessions.length) {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(filtered))
      return true
    }
    return false
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    const date = new Date()
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '')
    const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '')
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    return `SESSION-${dateStr}-${timeStr}-${random}`
  }

  /**
   * Generate unique weld ID
   */
  private generateWeldId(): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    return `WELD-${timestamp}-${random}`
  }

  /**
   * Export session data as JSON
   */
  exportSessionAsJSON(sessionId: string): string | null {
    const session = this.getSession(sessionId)
    if (!session) return null
    return JSON.stringify(session, null, 2)
  }

  /**
   * Clear all sessions (use with caution!)
   */
  clearAllSessions(): void {
    localStorage.removeItem(SESSIONS_STORAGE_KEY)
  }
}

// Singleton instance
export const sessionManager = new SessionManager()
