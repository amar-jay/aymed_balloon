import { app, shell, BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initializeDatabase, closeDatabase, setupDatabaseHandlers } from '../lib/db'
import { Session, Weld } from '../lib/types/session'

import icon from '../../resources/logo.jpeg?asset'

function createWindow(): void {
  const scaleFactor = screen.getPrimaryDisplay().scaleFactor
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    title: 'Aymed Balloon Welder',
    width: 900 / scaleFactor,
    height: 670 / scaleFactor,
    show: false,
    autoHideMenuBar: true,
    minWidth: 1280 / scaleFactor,
    minHeight: 720 / scaleFactor,
    icon: join(app.getAppPath(), 'resources', 'logo.jpeg'),
    // frame: false,
    // titleBarStyle: 'hidden',
    // expose window controls in Windows/Linux
    // ...(process.platform !== 'darwin' ? { titleBarOverlay: true } : {}),
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      // Enable persistent storage for localStorage
      partition: 'persist:main',
      zoomFactor: 1 / scaleFactor // Compensate for display scaling
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

let db: ReturnType<typeof initializeDatabase>

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Initialize the database
  db = initializeDatabase()

  if (is.dev) {
    // Default open or close DevTools by F12 in development
    // and ignore CommandOrControl + R in production.
    // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })
  }

  // IPC test
  ipcMain.on('ping', () => 'pong')

  const {
    createSession,
    deleteSessionById,
    getSessionById,
    getSessions,
    updateSessionById,
    addWeldToSession,
    endSession,
    generateSessionPDF
  } = setupDatabaseHandlers(db)

  ipcMain.handle('db:sessions:getAll', async () => getSessions())
  ipcMain.handle('db:sessions:get', async (_, id: number) => getSessionById(id))
  ipcMain.handle(
    'db:sessions:create',
    async (_, session: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>) => createSession(session)
  )
  ipcMain.handle(
    'db:sessions:update',
    async (_, id: number, session: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>) =>
      updateSessionById(id, session)
  )
  ipcMain.handle('db:sessions:delete', async (_, id: number) => deleteSessionById(id))
  ipcMain.handle(
    'db:sessions:addWeld',
    async (_, sessionId: number, weld: Omit<Weld, 'id' | 'createdAt'>) =>
      addWeldToSession(sessionId, weld)
  )
  ipcMain.handle('db:sessions:end', async (_, sessionId: number) => endSession(sessionId))
  ipcMain.handle('db:sessions:generatePDF', async (_, sessionId: number) =>
    generateSessionPDF(sessionId)
  )
  // IPC handlers for sessions PDF generation
  // ipcMain.handle('generate-session-pdf', async (event, sessionId) => {
  //   return generateSessionPDF(sessionId)
  // })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  if (db) return closeDatabase(db)
  else return Promise.resolve()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
