import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.js
// │
process.env.DIST = join(__dirname, '../')
process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? join(process.env.DIST, '../public')
  : process.env.DIST

// Disable GPU Acceleration for Windows 7
if (process.platform === 'win32') app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let win: BrowserWindow | null = null
const preload = join(__dirname, './preload.js')
const url = process.env.VITE_DEV_SERVER_URL
const indexHtml = join(process.env.DIST, 'index.html')

async function createWindow() {
  win = new BrowserWindow({
    title: 'Code Kata App',
    icon: join(process.env.VITE_PUBLIC || '', 'favicon.ico'),
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (url) { // electron-vite-vue#298
    win.loadURL(url)
    // Open devTool if the app is not packaged
    win.webContents.openDevTools()
  } else {
    win.loadFile(indexHtml)
  }

  // Test actively push message to the Electron-Renderer
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('electron').shell.openExternal(url)
    }
    return { action: 'deny' }
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  win = null
  if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createWindow()
  }
})

// New window example arg: new windows url
ipcMain.handle('open-win', (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${url}#${arg}`)
  } else {
    childWindow.loadFile(indexHtml, { hash: arg })
  }
})

// Placeholder IPC handlers - will be implemented in later tasks
ipcMain.handle('get-katas', async () => {
  // TODO: Implement in task 4
  return []
})

ipcMain.handle('load-kata', async (_event, slug: string) => {
  // TODO: Implement in task 4
  console.log('Loading kata:', slug)
  return null
})

ipcMain.handle('execute-code', async (_event, language: string, _code: string, _testFile: string, hidden: boolean) => {
  // TODO: Implement in tasks 9-11
  console.log('Executing code:', { language, hidden })
  return { success: false, output: '', errors: 'Not implemented yet', testResults: [], duration: 0 }
})

ipcMain.handle('save-attempt', async (_event, attempt: any) => {
  // TODO: Implement in task 3
  console.log('Saving attempt:', attempt)
})

ipcMain.handle('get-progress', async (_event, kataId: string) => {
  // TODO: Implement in task 3
  console.log('Getting progress for:', kataId)
  return null
})

ipcMain.handle('judge-explanation', async (_event, explanation: string, rubric: any) => {
  // TODO: Implement in task 13
  console.log('Judging explanation:', { explanation: explanation.substring(0, 50) + '...', rubric })
  return { scores: {}, feedback: 'Not implemented yet', pass: false, totalScore: 0 }
})

ipcMain.handle('judge-template', async (_event, templateContent: string, rubric: any, expectedStructure: any) => {
  // TODO: Implement in task 13.1
  console.log('Judging template:', { templateLength: templateContent.length, rubric, expectedStructure })
  return { scores: {}, feedback: 'Not implemented yet', pass: false, totalScore: 0 }
})

ipcMain.handle('get-settings', async () => {
  // TODO: Implement in task 20
  console.log('Getting user settings')
  return { autoContinueEnabled: false, theme: 'auto', editorFontSize: 14, autoSaveInterval: 1000 }
})

ipcMain.handle('update-setting', async (_event, key: string, value: any) => {
  // TODO: Implement in task 20
  console.log('Updating setting:', { key, value })
})

ipcMain.handle('get-random-kata', async (_event, currentKataId: string, filters: any) => {
  // TODO: Implement in task 20
  console.log('Getting random kata:', { currentKataId, filters })
  return null
})