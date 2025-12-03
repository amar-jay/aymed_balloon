import { app, BrowserWindow, dialog } from 'electron'
import { join } from 'path'
import Database from 'better-sqlite3'
import { Session, Weld, computeSessionStats } from './types/session'
import { generateSessionPDF as createPDFReport } from './pdf-generator'

// Database row types (how data is stored in SQLite)
interface SessionRow {
  id: number
  operator_name: string
  company_name: string
  created_at: string
  updated_at: string
  start_session: string
  end_session: string | null
  average_top_heater_temperature: number
  average_bottom_heater_temperature: number
  average_power_supply_voltage: number
  success_count: number
  failure_count: number
}

interface WeldRow {
  id: number
  session_id: number
  top_heater_temperature: number
  bottom_heater_temperature: number
  power_supply_voltage: number
  welding_duration: number
  cooling_duration: number
  is_successful: number // SQLite stores boolean as 0/1
  error: string | null
  created_at: string
}

function initializeDatabase(): Database.Database {
  // Initialize SQLite database
  const dbPath = join(app.getPath('userData'), 'aymed-balloon-makinesi.db')
  const db = new Database(dbPath)

  // Create sessions table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operator_name TEXT NOT NULL,
      company_name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      start_session DATETIME NOT NULL,
      end_session DATETIME,
      average_top_heater_temperature REAL DEFAULT 0,
      average_bottom_heater_temperature REAL DEFAULT 0,
      average_power_supply_voltage REAL DEFAULT 0,
      success_count INTEGER DEFAULT 0,
      failure_count INTEGER DEFAULT 0
    )
  `)

  // Create welds table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS welds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      top_heater_temperature REAL NOT NULL,
      bottom_heater_temperature REAL NOT NULL,
      power_supply_voltage REAL NOT NULL,
      welding_duration REAL NOT NULL,
      cooling_duration REAL NOT NULL,
      is_successful INTEGER NOT NULL DEFAULT 1,
      error TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    )
  `)

  // Migration: Check if old schema exists and migrate
  const tableInfo = db
    .prepare<{ name: string }[], { name: string }>('PRAGMA table_info(sessions)')
    .all()
  const hasOperatorNameColumn = tableInfo.some(
    (col: { name: string }) => col.name === 'operator_name'
  )

  // If using old schema (has 'name' column but not 'operator_name'), drop and recreate
  const hasOldNameColumn = tableInfo.some((col: { name: string }) => col.name === 'name')
  if (hasOldNameColumn && !hasOperatorNameColumn) {
    db.exec('DROP TABLE IF EXISTS welds')
    db.exec('DROP TABLE IF EXISTS sessions')
    db.exec(`
      CREATE TABLE sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        operator_name TEXT NOT NULL,
        company_name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        start_session DATETIME NOT NULL,
        end_session DATETIME,
        average_top_heater_temperature REAL DEFAULT 0,
        average_bottom_heater_temperature REAL DEFAULT 0,
        average_power_supply_voltage REAL DEFAULT 0,
        success_count INTEGER DEFAULT 0,
        failure_count INTEGER DEFAULT 0
      )
    `)
    db.exec(`
      CREATE TABLE welds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        top_heater_temperature REAL NOT NULL,
        bottom_heater_temperature REAL NOT NULL,
        power_supply_voltage REAL NOT NULL,
        welding_duration REAL NOT NULL,
        cooling_duration REAL NOT NULL,
        is_successful INTEGER NOT NULL DEFAULT 1,
        error TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      )
    `)
  }

  // Enable foreign keys
  db.exec('PRAGMA foreign_keys = ON')

  return db
}

function setupDatabaseHandlers(db: Database.Database) {
  // Helper to convert row to Session object
  const rowToSession = (row: SessionRow, welds: Weld[]): Session => ({
    id: row.id,
    operatorName: row.operator_name,
    companyName: row.company_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    startSession: row.start_session,
    endSession: row.end_session || undefined,
    welds,
    averageTopHeaterTemperature: row.average_top_heater_temperature,
    averageBottomHeaterTemperature: row.average_bottom_heater_temperature,
    averagePowerSupplyVoltage: row.average_power_supply_voltage,
    successCount: row.success_count,
    failureCount: row.failure_count
  })

  // Helper to convert weld row to Weld object
  const rowToWeld = (row: WeldRow): Weld => ({
    id: row.id,
    topHeaterTemperature: row.top_heater_temperature,
    bottomHeaterTemperature: row.bottom_heater_temperature,
    powerSupplyVoltage: row.power_supply_voltage,
    weldingDuration: row.welding_duration,
    coolingDuration: row.cooling_duration,
    isSuccessful: row.is_successful === 1,
    error: row.error || undefined,
    createdAt: row.created_at
  })

  // Prepare statements for session operations
  const insertSession = db.prepare<
    [string, string, string, string | null, number, number, number, number, number]
  >(
    `INSERT INTO sessions (operator_name, company_name, start_session, end_session, 
     average_top_heater_temperature, average_bottom_heater_temperature, 
     average_power_supply_voltage, success_count, failure_count) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )

  const getAllSessionRows = db.prepare<[], SessionRow>(
    'SELECT * FROM sessions ORDER BY created_at DESC'
  )

  const getSessionRowById = db.prepare<[number], SessionRow>('SELECT * FROM sessions WHERE id = ?')

  const updateSessionRow = db.prepare<
    [string, string, string, string | null, number, number, number, number, number, number]
  >(
    `UPDATE sessions SET operator_name = ?, company_name = ?, start_session = ?, end_session = ?,
     average_top_heater_temperature = ?, average_bottom_heater_temperature = ?,
     average_power_supply_voltage = ?, success_count = ?, failure_count = ?,
     updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  )

  const deleteSessionRow = db.prepare<[number]>('DELETE FROM sessions WHERE id = ?')

  // Prepare statements for weld operations
  const insertWeld = db.prepare<
    [number, number, number, number, number, number, number, string | null]
  >(
    `INSERT INTO welds (session_id, top_heater_temperature, bottom_heater_temperature,
     power_supply_voltage, welding_duration, cooling_duration, is_successful, error)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )

  const getWeldsBySessionId = db.prepare<[number], WeldRow>(
    'SELECT * FROM welds WHERE session_id = ? ORDER BY created_at ASC'
  )

  const deleteWeldsBySessionId = db.prepare<[number]>('DELETE FROM welds WHERE session_id = ?')

  // Get all sessions with their welds
  const getSessions = (): Session[] => {
    const sessionRows = getAllSessionRows.all()
    return sessionRows.map((row) => {
      const weldRows = getWeldsBySessionId.all(row.id)
      const welds = weldRows.map(rowToWeld)
      return rowToSession(row, welds)
    })
  }

  // Get a single session by ID with its welds
  const getSessionById = (id: number): Session | undefined => {
    const row = getSessionRowById.get(id)
    if (!row) return undefined
    const weldRows = getWeldsBySessionId.all(id)
    const welds = weldRows.map(rowToWeld)
    return rowToSession(row, welds)
  }

  // Create a new session with welds
  const createSession = (session: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>): number => {
    const stats = computeSessionStats(session.welds)

    const result = insertSession.run(
      session.operatorName,
      session.companyName,
      session.startSession,
      session.endSession || null,
      stats.averageTopHeaterTemperature,
      stats.averageBottomHeaterTemperature,
      stats.averagePowerSupplyVoltage,
      stats.successCount,
      stats.failureCount
    )

    const sessionId = result.lastInsertRowid as number

    // Insert all welds
    for (const weld of session.welds) {
      insertWeld.run(
        sessionId,
        weld.topHeaterTemperature,
        weld.bottomHeaterTemperature,
        weld.powerSupplyVoltage,
        weld.weldingDuration,
        weld.coolingDuration,
        weld.isSuccessful ? 1 : 0,
        weld.error || null
      )
    }

    return sessionId
  }

  // Update a session and its welds
  const updateSessionById = (
    id: number,
    session: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>
  ): boolean => {
    const stats = computeSessionStats(session.welds)
    console.log('Updating session:', id, session.operatorName, session.companyName)

    updateSessionRow.run(
      session.operatorName,
      session.companyName,
      session.startSession,
      session.endSession || null,
      stats.averageTopHeaterTemperature,
      stats.averageBottomHeaterTemperature,
      stats.averagePowerSupplyVoltage,
      stats.successCount,
      stats.failureCount,
      id
    )

    // Delete existing welds and re-insert
    deleteWeldsBySessionId.run(id)
    for (const weld of session.welds) {
      insertWeld.run(
        id,
        weld.topHeaterTemperature,
        weld.bottomHeaterTemperature,
        weld.powerSupplyVoltage,
        weld.weldingDuration,
        weld.coolingDuration,
        weld.isSuccessful ? 1 : 0,
        weld.error || null
      )
    }

    return true
  }

  // Add a single weld to an existing session
  const addWeldToSession = (sessionId: number, weld: Omit<Weld, 'id' | 'createdAt'>): number => {
    const result = insertWeld.run(
      sessionId,
      weld.topHeaterTemperature,
      weld.bottomHeaterTemperature,
      weld.powerSupplyVoltage,
      weld.weldingDuration,
      weld.coolingDuration,
      weld.isSuccessful ? 1 : 0,
      weld.error || null
    )

    // Update session statistics
    const weldRows = getWeldsBySessionId.all(sessionId)
    const welds = weldRows.map(rowToWeld)
    const stats = computeSessionStats(welds)
    const sessionRow = getSessionRowById.get(sessionId)

    if (sessionRow) {
      updateSessionRow.run(
        sessionRow.operator_name,
        sessionRow.company_name,
        sessionRow.start_session,
        sessionRow.end_session,
        stats.averageTopHeaterTemperature,
        stats.averageBottomHeaterTemperature,
        stats.averagePowerSupplyVoltage,
        stats.successCount,
        stats.failureCount,
        sessionId
      )
    }

    return result.lastInsertRowid as number
  }

  // End a session (set end time)
  const endSession = (sessionId: number): boolean => {
    const sessionRow = getSessionRowById.get(sessionId)
    if (!sessionRow) return false

    const weldRows = getWeldsBySessionId.all(sessionId)
    const welds = weldRows.map(rowToWeld)
    const stats = computeSessionStats(welds)

    updateSessionRow.run(
      sessionRow.operator_name,
      sessionRow.company_name,
      sessionRow.start_session,
      new Date().toISOString(),
      stats.averageTopHeaterTemperature,
      stats.averageBottomHeaterTemperature,
      stats.averagePowerSupplyVoltage,
      stats.successCount,
      stats.failureCount,
      sessionId
    )

    return true
  }

  const deleteSessionById = (id: number): boolean => {
    deleteSessionRow.run(id)
    return true
  }

  const generateSessionPDF = async (sessionId: number) => {
    const session = getSessionById(sessionId)
    if (!session) {
      throw new Error('Session not found')
    }
    if (!session.createdAt || !session.updatedAt) {
      throw new Error('Session is missing timestamp information')
    }

    const sessionName = `${session.operatorName}-${session.companyName}`.replace(
      /[^a-zA-Z0-9]/g,
      '_'
    )
    const { filePath } = await dialog.showSaveDialog(BrowserWindow.getFocusedWindow()!, {
      title: 'Save Session PDF',
      defaultPath: `session-${session.id}-${sessionName}.pdf`,
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    })

    if (!filePath) {
      return null // User cancelled
    }

    // Use the professional PDF generator
    await createPDFReport({
      filePath,
      session
    })

    return filePath
  }

  return {
    getSessions,
    getSessionById,
    createSession,
    updateSessionById,
    deleteSessionById,
    addWeldToSession,
    endSession,
    generateSessionPDF
  }
}

function closeDatabase(db: Database.Database) {
  db.close()
}

export { initializeDatabase, setupDatabaseHandlers, closeDatabase }
