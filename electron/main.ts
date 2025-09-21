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

app.whenReady().then(async () => {
  createWindow()
})

app.on('window-all-closed', async () => {
  win = null
  // Close database connection when app is closing
  try {
    const { DatabaseService } = await import('../src/services/database')
    const dbService = await DatabaseService.getInstance()
    dbService.close()
  } catch (error: any) {
    console.error('Error closing database:', error)
  }
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

// Kata management IPC handlers
ipcMain.handle('get-katas', async () => {
  try {
    console.log('=== GET-KATAS HANDLER CALLED ===')
    console.log('Environment:', {
      VITE_DEV_SERVER_URL: process.env.VITE_DEV_SERVER_URL,
      cwd: process.cwd(),
      __dirname: __dirname
    })
    
    const { KataManagerService } = await import('../src/services/kata-manager')
    console.log('KataManagerService imported successfully')
    
    // In development, use project root; in production, use app directory
    const katasPath = process.env.VITE_DEV_SERVER_URL 
      ? join(process.cwd(), 'katas')  // Development: use project root
      : join(process.resourcesPath, 'katas')  // Production: use resources path
    
    console.log('Looking for katas in:', katasPath)
    console.log('Current working directory:', process.cwd())
    
    const kataManager = KataManagerService.getInstance(katasPath)
    console.log('KataManager instance created')
    
    const katas = await kataManager.loadKatas()
    console.log(`Loaded ${katas.length} katas:`, katas.map((k: any) => k.slug))
    
    return katas
  } catch (error: any) {
    console.error('Failed to load katas - FULL ERROR:', error)
    console.error('Error stack:', error.stack)
    return []
  }
})

ipcMain.handle('load-kata', async (_event, slug: string) => {
  try {
    const { KataManagerService } = await import('../src/services/kata-manager')
    // Use the same path logic as get-katas
    const katasPath = process.env.VITE_DEV_SERVER_URL 
      ? join(process.cwd(), 'katas')  // Development: use project root
      : join(process.resourcesPath, 'katas')  // Production: use resources path
    
    const kataManager = KataManagerService.getInstance(katasPath)
    const kata = await kataManager.loadKata(slug)
    console.log('Loaded kata details:', slug)
    return kata
  } catch (error: any) {
    console.error('Failed to load kata:', slug, error)
    return null
  }
})

ipcMain.handle('execute-code', async (_event, language: string, code: string, kataPath: string, hidden: boolean, timeoutMs: number = 5000) => {
  try {
    console.log('Executing code:', { language, hidden, kataPath, timeoutMs })
    
    const { CodeExecutionService } = await import('../src/services/code-execution')
    const executionService = CodeExecutionService.getInstance()
    
    const result = await executionService.executeCode(
      language as any, // Type assertion since we validate in the service
      code,
      '', // testFilePath is determined internally
      kataPath,
      hidden,
      timeoutMs
    )
    
    console.log('Execution completed:', { 
      success: result.success, 
      testCount: result.testResults.length,
      score: result.score,
      duration: result.duration
    })
    
    return result
  } catch (error: any) {
    console.error('Failed to execute code:', error)
    return {
      success: false,
      output: '',
      errors: `Execution failed: ${error.message}`,
      testResults: [],
      duration: 0
    }
  }
})

ipcMain.handle('save-attempt', async (_event, attempt: any) => {
  try {
    const { ProgressService } = await import('../src/services/progress')
    const progressService = new ProgressService()
    await progressService.saveAttempt({
      kataId: attempt.kataId,
      timestamp: new Date(attempt.timestamp),
      language: attempt.language,
      status: attempt.status,
      score: attempt.score,
      durationMs: attempt.durationMs,
      code: attempt.code
    })
    console.log('Attempt saved successfully:', attempt.kataId)
  } catch (error: any) {
    console.error('Failed to save attempt:', error)
    throw error
  }
})

ipcMain.handle('get-progress', async (_event, kataId: string) => {
  try {
    const { ProgressService } = await import('../src/services/progress')
    const progressService = new ProgressService()
    const progress = await progressService.getProgress(kataId)
    console.log('Retrieved progress for:', kataId, progress ? 'found' : 'not found')
    return progress
  } catch (error: any) {
    console.error('Failed to get progress:', error)
    return null
  }
})

ipcMain.handle('judge-explanation', async (_event, explanation: string, rubric: any, topic?: string, context?: string) => {
  try {
    console.log('Judging explanation:', { 
      explanationLength: explanation.length, 
      rubric: rubric.keys,
      topic,
      hasContext: !!context
    })
    
    // Get AI API key from environment variable
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.')
    }
    
    const { AIJudgeService } = await import('../src/services/ai-judge')
    const aiJudge = new AIJudgeService({
      apiKey,
      // Use default OpenAI settings
    })
    
    const judgment = await aiJudge.judgeExplanation({
      explanation,
      rubric,
      topic,
      context
    })
    
    console.log('Explanation judgment completed:', {
      pass: judgment.pass,
      totalScore: judgment.totalScore,
      scores: judgment.scores
    })
    
    return judgment
  } catch (error: any) {
    console.error('Failed to judge explanation:', error)
    
    // Return a structured error response that matches AIJudgment interface
    return {
      scores: rubric.keys.reduce((acc: any, key: string) => {
        acc[key] = 0
        return acc
      }, {}),
      feedback: `AI judging failed: ${error.message}. Please check your OpenAI API configuration and try again.`,
      pass: false,
      totalScore: 0
    }
  }
})

ipcMain.handle('judge-template', async (_event, templateContent: string, rubric: any, expectedStructure?: any, templateType?: string, context?: string) => {
  try {
    console.log('Judging template:', { 
      templateLength: templateContent.length, 
      rubric: rubric.keys,
      templateType,
      hasExpectedStructure: !!expectedStructure,
      hasContext: !!context
    })
    
    // Get AI API key from environment variable
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.')
    }
    
    const { AIJudgeService } = await import('../src/services/ai-judge')
    const aiJudge = new AIJudgeService({
      apiKey,
      // Use default OpenAI settings
    })
    
    const judgment = await aiJudge.judgeTemplate({
      templateContent,
      rubric,
      expectedStructure,
      templateType,
      context
    })
    
    console.log('Template judgment completed:', {
      pass: judgment.pass,
      totalScore: judgment.totalScore,
      scores: judgment.scores
    })
    
    return judgment
  } catch (error: any) {
    console.error('Failed to judge template:', error)
    
    // Return a structured error response that matches AIJudgment interface
    return {
      scores: rubric.keys.reduce((acc: any, key: string) => {
        acc[key] = 0
        return acc
      }, {}),
      feedback: `AI judging failed: ${error.message}. Please check your OpenAI API configuration and try again.`,
      pass: false,
      totalScore: 0
    }
  }
})

ipcMain.handle('get-settings', async () => {
  try {
    const { DatabaseService } = await import('../src/services/database')
    const dbService = await DatabaseService.getInstance()
    const settings = dbService.getAllSettings()
    console.log('Retrieved user settings')
    return {
      autoContinueEnabled: settings.auto_continue_enabled === 'true',
      theme: settings.theme || 'auto',
      editorFontSize: parseInt(settings.editor_font_size) || 14,
      autoSaveInterval: parseInt(settings.auto_save_interval) || 1000
    }
  } catch (error: any) {
    console.error('Failed to get settings:', error)
    return { autoContinueEnabled: false, theme: 'auto', editorFontSize: 14, autoSaveInterval: 1000 }
  }
})

ipcMain.handle('update-setting', async (_event, key: string, value: any) => {
  try {
    const { DatabaseService } = await import('../src/services/database')
    const dbService = await DatabaseService.getInstance()
    
    // Convert setting key to database format
    const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase()
    const dbValue = typeof value === 'boolean' ? value.toString() : value.toString()
    
    dbService.setSetting(dbKey, dbValue)
    console.log('Updated setting:', { key: dbKey, value: dbValue })
  } catch (error: any) {
    console.error('Failed to update setting:', error)
    throw error
  }
})

ipcMain.handle('get-random-kata', async (_event, currentKataId: string, filters: any) => {
  // TODO: Implement in task 20
  console.log('Getting random kata:', { currentKataId, filters })
  return null
})

// Additional database-related IPC handlers
ipcMain.handle('save-code', async (_event, kataId: string, code: string) => {
  try {
    const { ProgressService } = await import('../src/services/progress')
    const progressService = new ProgressService()
    await progressService.saveCode(kataId, code)
    console.log('Code saved for kata:', kataId)
  } catch (error: any) {
    console.error('Failed to save code:', error)
    throw error
  }
})

ipcMain.handle('load-code', async (_event, kataId: string) => {
  try {
    const { ProgressService } = await import('../src/services/progress')
    const progressService = new ProgressService()
    const code = await progressService.loadCode(kataId)
    console.log('Code loaded for kata:', kataId, code ? 'found' : 'not found')
    return code
  } catch (error: any) {
    console.error('Failed to load code:', error)
    return null
  }
})

ipcMain.handle('get-attempt-history', async (_event, kataId: string) => {
  try {
    const { ProgressService } = await import('../src/services/progress')
    const progressService = new ProgressService()
    const history = await progressService.getAttemptHistory(kataId)
    console.log('Retrieved attempt history for:', kataId, `${history.length} attempts`)
    return history
  } catch (error: any) {
    console.error('Failed to get attempt history:', error)
    return []
  }
})

ipcMain.handle('get-all-progress', async () => {
  try {
    const { ProgressService } = await import('../src/services/progress')
    const progressService = new ProgressService()
    const allProgress = await progressService.getAllProgress()
    console.log('Retrieved all progress:', `${allProgress.length} katas`)
    return allProgress
  } catch (error: any) {
    console.error('Failed to get all progress:', error)
    return []
  }
})

ipcMain.handle('get-kata-stats', async (_event, kataId: string) => {
  try {
    const { ProgressService } = await import('../src/services/progress')
    const progressService = new ProgressService()
    const stats = await progressService.getKataStats(kataId)
    console.log('Retrieved kata stats for:', kataId)
    return stats
  } catch (error: any) {
    console.error('Failed to get kata stats:', error)
    return {
      totalAttempts: 0,
      bestScore: 0,
      lastStatus: 'not_attempted',
      averageScore: 0,
      passedAttempts: 0
    }
  }
})