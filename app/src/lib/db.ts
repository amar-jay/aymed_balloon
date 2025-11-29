import { app, BrowserWindow, dialog } from 'electron'
import { join } from 'path'
import Database from 'better-sqlite3'
import PDFDocument from 'pdfkit'
import fs from 'fs'
import { Session } from './types/session'

// Initialize SQLite database
const dbPath = join(app.getPath('userData'), 'aymed-balloon-makinesi.db')
const db = new Database(dbPath)
function initializeDatabase() {
  // Create sessions table if it doesn't exist
  db.exec(`
	  CREATE TABLE IF NOT EXISTS sessions (
	    id INTEGER PRIMARY KEY AUTOINCREMENT,
	    name TEXT NOT NULL,
	    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	    data TEXT
	  )
	`)

  // Check if name column exists, if not drop and recreate table
  const tableInfo = db
    .prepare<{ name: string }[], { name: string }>('PRAGMA table_info(sessions)')
    .all()
  const hasNameColumn = tableInfo.some((col: { name: string }) => col.name === 'name')
  if (!hasNameColumn) {
    db.exec('DROP TABLE sessions')
    db.exec(`
	    CREATE TABLE sessions (
	      id INTEGER PRIMARY KEY AUTOINCREMENT,
	      name TEXT NOT NULL,
	      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	      data TEXT
	    )
	  `)
  }
}

// Prepare statements for CRUD operations
const insertSession = db.prepare<[string, string]>(
  'INSERT INTO sessions (name, data) VALUES (?, ?)'
)
const getAllSessions = db.prepare<[], Session>('SELECT * FROM sessions ORDER BY created_at DESC') // type may be Session[]
const _getSessionById = db.prepare<[number], Session>('SELECT * FROM sessions WHERE id = ?')
const updateSession = db.prepare<[string, string, number], Session>(
  'UPDATE sessions SET name = ?, data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
)
const deleteSession = db.prepare<[number]>('DELETE FROM sessions WHERE id = ?')

const getSessions = () => {
  return getAllSessions.all()
}

const getSessionById = (id: number): Session | undefined => {
  return _getSessionById.get(id)
}

const createSession = (name: string, data: unknown) => {
  const result = insertSession.run(name, JSON.stringify(data))
  return result.lastInsertRowid
}

const updateSessionById = (id: number, name: string, data: unknown) => {
  updateSession.run(name, JSON.stringify(data), id)
  return true
}

const deleteSessionById = (id: number) => {
  deleteSession.run(id)
  return true
}

const generateSessionPDF = async (sessionId: number) => {
  const session = getSessionById(sessionId)
  if (!session) {
    throw new Error('Session not found')
  }
  if (!session.data) {
    throw new Error('Session has no data')
  }
	if (!session.created_at || !session.updated_at) {
		throw new Error('Session is missing timestamp information')
	}

  const { filePath } = await dialog.showSaveDialog(BrowserWindow.getFocusedWindow()!, {
    title: 'Save Session PDF',
    defaultPath: `session-${session.id}-${session.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
  })

  if (!filePath) {
    return null // User cancelled
  }

  const doc = new PDFDocument()
  const stream = fs.createWriteStream(filePath)
  doc.pipe(stream)

  // PDF content
  doc.fontSize(20).text('Session Report', { align: 'center' })
  doc.moveDown()

  doc.fontSize(14).text(`Session Name: ${session.name}`)
  doc.text(`Created: ${new Date(session.created_at).toLocaleString()}`)
  doc.text(`Last Updated: ${new Date(session.updated_at).toLocaleString()}`)
  doc.moveDown()

  doc.fontSize(16).text('Session Data:')
  doc.moveDown()

  // Format the data nicely
  const data = JSON.parse(session.data)
  if (typeof data === 'object' && data !== null) {
    Object.entries(data).forEach(([key, value]) => {
      doc.fontSize(12).text(`${key}: ${JSON.stringify(value, null, 2)}`)
      doc.moveDown(0.5)
    })
  } else {
    doc.fontSize(12).text(JSON.stringify(data, null, 2))
  }

  doc.end()

  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(filePath))
    stream.on('error', reject)
  })
}

const closeDatabase = () => {
  db.close()
}

export {
  initializeDatabase,
  getSessions,
  getSessionById,
  createSession,
  updateSessionById,
  deleteSessionById,
  generateSessionPDF,
  closeDatabase
}
