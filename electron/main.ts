import { app, BrowserWindow, ipcMain, dialog } from 'electron'
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
// Handle path resolution for both development and production
if (process.env.VITE_DEV_SERVER_URL) {
  // Development mode
  process.env.DIST = join(__dirname, '../dist')
  process.env.VITE_PUBLIC = join(__dirname, '../public')
} else {
  // Production mode - files are packaged together
  process.env.DIST = join(__dirname, '../dist')
  process.env.VITE_PUBLIC = join(__dirname, '../dist')
}

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
    // Open devTool only in development mode and when not packaged
    if (!app.isPackaged) {
      win.webContents.openDevTools()
    }
  } else {
    win.loadFile(indexHtml)
    // Production mode - no dev tools
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
  
  // Check dependencies on startup
  try {
    const { DependencyChecker } = await import('../src/services/dependency-checker')
    const checker = DependencyChecker.getInstance()
    const dependencies = await checker.checkAllDependencies()
    
    // Send dependency status to renderer process once it's ready
    if (win && win.webContents) {
      win.webContents.once('did-finish-load', () => {
        win?.webContents.send('dependency-status', dependencies)
      })
    }
  } catch (error: any) {
    console.error('Failed to check dependencies on startup:', error)
  }
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
    
    // Get AI API key from user settings or environment variable
    const { DatabaseService } = await import('../src/services/database')
    const dbService = await DatabaseService.getInstance()
    const settings = dbService.getAllSettings()
    const apiKey = settings.openai_api_key || process.env.OPENAI_API_KEY
    
    if (!apiKey) {
      throw new Error('OpenAI API key not configured. Please set it in Settings or as OPENAI_API_KEY environment variable.')
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
    
    // Get AI API key from user settings or environment variable
    const { DatabaseService } = await import('../src/services/database')
    const dbService = await DatabaseService.getInstance()
    const settings = dbService.getAllSettings()
    const apiKey = settings.openai_api_key || process.env.OPENAI_API_KEY
    
    if (!apiKey) {
      throw new Error('OpenAI API key not configured. Please set it in Settings or as OPENAI_API_KEY environment variable.')
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

// AI judging for codebase katas
ipcMain.handle('judge-codebase', async (_event, analysis: string, rubric: any, codebaseDescription?: string, context?: string) => {
  try {
    const { DatabaseService } = await import('../src/services/database')
    const dbService = await DatabaseService.getInstance()
    const settings = dbService.getAllSettings()
    const apiKey = settings.openai_api_key || process.env.OPENAI_API_KEY
    
    if (!apiKey) {
      throw new Error('OpenAI API key not configured. Please set it in Settings or as OPENAI_API_KEY environment variable.')
    }
    
    const { AIJudgeService } = await import('../src/services/ai-judge')
    const aiJudge = new AIJudgeService({
      apiKey,
      // Use default OpenAI settings
    })
    
    const judgment = await aiJudge.judgeCodebase({
      analysis,
      rubric,
      codebaseDescription,
      context
    })
    
    console.log('Codebase judgment completed:', {
      pass: judgment.pass,
      totalScore: judgment.totalScore,
      scores: judgment.scores
    })
    
    return judgment
  } catch (error: any) {
    console.error('Failed to judge codebase analysis:', error)
    
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
      autoSaveInterval: parseInt(settings.auto_save_interval) || 1000,
      openaiApiKey: settings.openai_api_key || ''
    }
  } catch (error: any) {
    console.error('Failed to get settings:', error)
    return { autoContinueEnabled: false, theme: 'auto', editorFontSize: 14, autoSaveInterval: 1000, openaiApiKey: '' }
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

ipcMain.handle('save-settings', async (_event, settings: any) => {
  try {
    const { DatabaseService } = await import('../src/services/database')
    const dbService = await DatabaseService.getInstance()
    
    // Save all settings
    dbService.setSetting('auto_continue_enabled', settings.autoContinueEnabled.toString())
    dbService.setSetting('theme', settings.theme)
    dbService.setSetting('editor_font_size', settings.editorFontSize.toString())
    dbService.setSetting('auto_save_interval', settings.autoSaveInterval.toString())
    dbService.setSetting('openai_api_key', settings.openaiApiKey || '')
    
    console.log('Saved all user settings')
  } catch (error: any) {
    console.error('Failed to save settings:', error)
    throw error
  }
})

ipcMain.handle('test-openai-key', async (_event, apiKey: string) => {
  try {
    console.log('Testing OpenAI API key...')
    
    // Make a simple API call to test the key
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      console.log('OpenAI API key is valid')
      return true
    } else {
      console.log('OpenAI API key is invalid:', response.status, response.statusText)
      return false
    }
  } catch (error: any) {
    console.error('Failed to test OpenAI API key:', error)
    return false
  }
})

ipcMain.handle('get-random-kata', async (_event, currentKataId: string, filters: any) => {
  try {
    console.log('Getting random kata:', { currentKataId, filters })
    
    const { KataManagerService } = await import('../src/services/kata-manager')
    const { AutoContinueService } = await import('../src/services/auto-continue')
    
    // Get all available katas
    const katasPath = process.env.VITE_DEV_SERVER_URL 
      ? join(process.cwd(), 'katas')  // Development: use project root
      : join(process.resourcesPath, 'katas')  // Production: use resources path
    
    const kataManager = KataManagerService.getInstance(katasPath)
    const allKatas = await kataManager.loadKatas()
    
    // Find current kata
    const currentKata = allKatas.find(kata => kata.slug === currentKataId)
    if (!currentKata) {
      console.warn('Current kata not found:', currentKataId)
      return null
    }
    
    // Get random kata using auto-continue service
    const autoContinueService = AutoContinueService.getInstance()
    const randomKata = autoContinueService.getRandomKataFromFiltered(allKatas, filters, currentKata)
    
    console.log('Random kata selected:', randomKata?.slug || 'none')
    return randomKata
  } catch (error: any) {
    console.error('Failed to get random kata:', error)
    return null
  }
})

ipcMain.handle('get-auto-continue-enabled', async () => {
  try {
    const { DatabaseService } = await import('../src/services/database')
    const dbService = await DatabaseService.getInstance()
    const setting = dbService.getSetting('auto_continue_enabled')
    const enabled = setting === 'true'
    console.log('Auto-continue enabled:', enabled)
    return enabled
  } catch (error: any) {
    console.error('Failed to get auto-continue setting:', error)
    return false
  }
})

ipcMain.handle('set-auto-continue-enabled', async (_event, enabled: boolean) => {
  try {
    const { DatabaseService } = await import('../src/services/database')
    const dbService = await DatabaseService.getInstance()
    dbService.setSetting('auto_continue_enabled', enabled.toString())
    console.log('Auto-continue setting updated:', enabled)
  } catch (error: any) {
    console.error('Failed to set auto-continue setting:', error)
    throw error
  }
})

ipcMain.handle('check-dependencies', async () => {
  try {
    console.log('Checking system dependencies...')
    
    const { DependencyChecker } = await import('../src/services/dependency-checker')
    const checker = DependencyChecker.getInstance()
    const dependencies = await checker.checkAllDependencies()
    
    console.log('Dependency check completed:', {
      python: dependencies.python.available,
      nodejs: dependencies.nodejs.available,
      cpp: dependencies.cpp.available,
      allAvailable: dependencies.allAvailable
    })
    
    return dependencies
  } catch (error: any) {
    console.error('Failed to check dependencies:', error)
    return {
      python: { name: 'Python', available: false, error: 'Check failed' },
      nodejs: { name: 'Node.js', available: false, error: 'Check failed' },
      cpp: { name: 'C++ Compiler', available: false, error: 'Check failed' },
      allAvailable: false
    }
  }
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

// Import/Export IPC handlers
ipcMain.handle('import-kata', async (_event, zipPath: string) => {
  try {
    console.log('Importing kata from:', zipPath)
    
    const { KataManagerService } = await import('../src/services/kata-manager')
    const katasPath = process.env.VITE_DEV_SERVER_URL 
      ? join(process.cwd(), 'katas')  // Development: use project root
      : join(process.resourcesPath, 'katas')  // Production: use resources path
    
    const kataManager = KataManagerService.getInstance(katasPath)
    await kataManager.importKata(zipPath)
    
    console.log('Kata imported successfully from:', zipPath)
    return { success: true }
  } catch (error: any) {
    console.error('Failed to import kata:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('export-kata', async (_event, slug: string) => {
  try {
    console.log('Exporting kata:', slug)
    
    const { KataManagerService } = await import('../src/services/kata-manager')
    const katasPath = process.env.VITE_DEV_SERVER_URL 
      ? join(process.cwd(), 'katas')  // Development: use project root
      : join(process.resourcesPath, 'katas')  // Production: use resources path
    
    const kataManager = KataManagerService.getInstance(katasPath)
    const outputPath = await kataManager.exportKata(slug)
    
    console.log('Kata exported successfully to:', outputPath)
    return { success: true, outputPath }
  } catch (error: any) {
    console.error('Failed to export kata:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('import-multiple-katas', async (_event, zipPaths: string[]) => {
  try {
    console.log('Importing multiple katas:', zipPaths.length, 'files')
    
    const { KataManagerService } = await import('../src/services/kata-manager')
    const katasPath = process.env.VITE_DEV_SERVER_URL 
      ? join(process.cwd(), 'katas')  // Development: use project root
      : join(process.resourcesPath, 'katas')  // Production: use resources path
    
    const kataManager = KataManagerService.getInstance(katasPath)
    const results = await kataManager.importMultipleKatas(zipPaths)
    
    console.log('Bulk import completed:', {
      success: results.success.length,
      failed: results.failed.length
    })
    
    return results
  } catch (error: any) {
    console.error('Failed to import multiple katas:', error)
    return { success: [], failed: zipPaths.map(path => ({ path, error: error.message })) }
  }
})

ipcMain.handle('export-multiple-katas', async (_event, slugs: string[]) => {
  try {
    console.log('Exporting multiple katas:', slugs.length, 'katas')
    
    const { KataManagerService } = await import('../src/services/kata-manager')
    const katasPath = process.env.VITE_DEV_SERVER_URL 
      ? join(process.cwd(), 'katas')  // Development: use project root
      : join(process.resourcesPath, 'katas')  // Production: use resources path
    
    const kataManager = KataManagerService.getInstance(katasPath)
    const results = await kataManager.exportMultipleKatas(slugs)
    
    console.log('Bulk export completed:', {
      success: results.success.length,
      failed: results.failed.length
    })
    
    return results
  } catch (error: any) {
    console.error('Failed to export multiple katas:', error)
    return { success: [], failed: slugs.map(slug => ({ slug, error: error.message })) }
  }
})

ipcMain.handle('refresh-katas', async () => {
  try {
    console.log('Refreshing kata list')
    
    const { KataManagerService } = await import('../src/services/kata-manager')
    const katasPath = process.env.VITE_DEV_SERVER_URL 
      ? join(process.cwd(), 'katas')  // Development: use project root
      : join(process.resourcesPath, 'katas')  // Production: use resources path
    
    const kataManager = KataManagerService.getInstance(katasPath)
    const katas = await kataManager.refreshKatas()
    
    console.log('Kata list refreshed:', katas.length, 'katas found')
    return katas
  } catch (error: any) {
    console.error('Failed to refresh katas:', error)
    return []
  }
})

// File dialog handlers
ipcMain.handle('open-file-dialog', async () => {
  try {
    const result = await dialog.showOpenDialog(win!, {
      title: 'Select Kata Zip Files to Import',
      filters: [
        { name: 'Zip Files', extensions: ['zip'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile', 'multiSelections']
    })
    
    if (result.canceled) {
      return []
    }
    
    return result.filePaths
  } catch (error: any) {
    console.error('Failed to open file dialog:', error)
    return []
  }
})

ipcMain.handle('save-file-dialog', async (_event, defaultName?: string) => {
  try {
    const result = await dialog.showSaveDialog(win!, {
      title: 'Save Kata Export',
      defaultPath: defaultName || 'kata-export.zip',
      filters: [
        { name: 'Zip Files', extensions: ['zip'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    
    if (result.canceled || !result.filePath) {
      return null
    }
    
    return result.filePath
  } catch (error: any) {
    console.error('Failed to open save dialog:', error)
    return null
  }
})

// AI Configuration IPC handlers
ipcMain.handle('get-ai-config', async () => {
  try {
    const { AIConfigService } = await import('../src/services/ai-config')
    const aiConfigService = AIConfigService.getInstance()
    const config = await aiConfigService.getConfig()
    console.log('Retrieved AI configuration')
    return config
  } catch (error: any) {
    console.error('Failed to get AI config:', error)
    // Return default config on error
    const { AIConfigService } = await import('../src/services/ai-config')
    const aiConfigService = AIConfigService.getInstance()
    return aiConfigService.getDefaultConfig()
  }
})

ipcMain.handle('save-ai-config', async (_event, config: any) => {
  try {
    const { AIConfigService } = await import('../src/services/ai-config')
    const aiConfigService = AIConfigService.getInstance()
    
    // Validate config before saving
    const validation = aiConfigService.validateConfig(config)
    if (!validation.isValid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`)
    }
    
    await aiConfigService.saveConfig(config)
    console.log('AI configuration saved successfully')
    return { success: true }
  } catch (error: any) {
    console.error('Failed to save AI config:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('test-openai-connection', async (_event, apiKey?: string) => {
  try {
    console.log('Testing OpenAI connection...')
    
    let keyToTest = apiKey
    if (!keyToTest) {
      // Get key from config if not provided
      const { AIConfigService } = await import('../src/services/ai-config')
      const aiConfigService = AIConfigService.getInstance()
      const config = await aiConfigService.getConfig()
      keyToTest = config.openaiApiKey
    }
    
    if (!keyToTest || keyToTest.trim().length === 0) {
      return { success: false, error: 'No API key provided' }
    }
    
    // Create OpenAI client with the key
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${keyToTest}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      const models = data.data?.map((model: any) => model.id) || []
      console.log('OpenAI connection test successful')
      return { success: true, models }
    } else {
      console.log('OpenAI connection test failed:', response.status, response.statusText)
      return { success: false, error: `API error: ${response.status} ${response.statusText}` }
    }
  } catch (error: any) {
    console.error('Failed to test OpenAI connection:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-available-models', async () => {
  try {
    const { AIConfigService } = await import('../src/services/ai-config')
    const aiConfigService = AIConfigService.getInstance()
    const config = await aiConfigService.getConfig()
    
    if (!config.openaiApiKey) {
      return []
    }
    
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.openaiApiKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      const models = data.data?.map((model: any) => model.id) || []
      return models.filter((model: string) => model.includes('gpt'))
    }
    
    return []
  } catch (error: any) {
    console.error('Failed to get available models:', error)
    return []
  }
})

ipcMain.handle('validate-ai-config', async (_event, config: any) => {
  try {
    const { AIConfigService } = await import('../src/services/ai-config')
    const aiConfigService = AIConfigService.getInstance()
    const validation = aiConfigService.validateConfig(config)
    return validation
  } catch (error: any) {
    console.error('Failed to validate AI config:', error)
    return { isValid: false, errors: [error.message] }
  }
})

// AI Kata Generation IPC handlers
ipcMain.handle('generate-kata', async (_event, request: any) => {
  try {
    console.log('Generating kata:', { 
      type: request.type, 
      language: request.language, 
      difficulty: request.difficulty 
    })
    
    const { AIAuthoringService } = await import('../src/services/ai-authoring')
    const aiAuthoringService = AIAuthoringService.getInstance()
    
    const generatedKata = await aiAuthoringService.generateKata(request)
    
    console.log('Kata generation completed:', {
      slug: generatedKata.slug,
      tokensUsed: generatedKata.generationMetadata.tokensUsed
    })
    
    return generatedKata
  } catch (error: any) {
    console.error('Failed to generate kata:', error)
    throw error
  }
})

ipcMain.handle('generate-variation', async (_event, sourceKata: any, options: any) => {
  try {
    console.log('Generating variation for kata:', sourceKata.slug, options)
    
    const { AIAuthoringService } = await import('../src/services/ai-authoring')
    const aiAuthoringService = AIAuthoringService.getInstance()
    
    const variation = await aiAuthoringService.generateVariation(sourceKata, options)
    
    console.log('Variation generation completed:', {
      slug: variation.slug,
      tokensUsed: variation.generationMetadata.tokensUsed
    })
    
    return variation
  } catch (error: any) {
    console.error('Failed to generate variation:', error)
    throw error
  }
})

ipcMain.handle('validate-generated-content', async (_event, content: any) => {
  try {
    const { AIAuthoringService } = await import('../src/services/ai-authoring')
    const aiAuthoringService = AIAuthoringService.getInstance()
    
    const validation = await aiAuthoringService.validateGeneration(content)
    return validation
  } catch (error: any) {
    console.error('Failed to validate generated content:', error)
    return { isValid: false, errors: [error.message], warnings: [] }
  }
})

ipcMain.handle('save-generated-kata', async (_event, content: any, conflictResolution?: any) => {
  try {
    console.log('Saving generated kata:', content.metadata?.slug)
    
    const { AIAuthoringService } = await import('../src/services/ai-authoring')
    const aiAuthoringService = AIAuthoringService.getInstance()
    
    const result = await aiAuthoringService.saveGeneratedKata(content, conflictResolution)
    
    console.log('Generated kata saved successfully:', {
      slug: result.slug,
      path: result.path,
      filesCreated: result.filesCreated.length
    })
    
    return result
  } catch (error: any) {
    console.error('Failed to save generated kata:', error)
    throw error
  }
})

ipcMain.handle('generate-and-save-kata', async (_event, request: any, conflictResolution?: any) => {
  try {
    console.log('Generating and saving kata:', { 
      type: request.type, 
      language: request.language, 
      difficulty: request.difficulty 
    })
    
    const { AIAuthoringService } = await import('../src/services/ai-authoring')
    const aiAuthoringService = AIAuthoringService.getInstance()
    
    const result = await aiAuthoringService.generateAndSaveKata(request, conflictResolution)
    
    console.log('Kata generated and saved successfully:', {
      slug: result.kata.slug,
      path: result.fileResult.path,
      tokensUsed: result.kata.generationMetadata.tokensUsed
    })
    
    return result
  } catch (error: any) {
    console.error('Failed to generate and save kata:', error)
    throw error
  }
})

ipcMain.handle('check-slug-exists', async (_event, slug: string) => {
  try {
    const { AIAuthoringService } = await import('../src/services/ai-authoring')
    const aiAuthoringService = AIAuthoringService.getInstance()
    
    const exists = aiAuthoringService.slugExists(slug)
    return exists
  } catch (error: any) {
    console.error('Failed to check slug existence:', error)
    return false
  }
})

ipcMain.handle('generate-unique-slug', async (_event, baseSlug: string) => {
  try {
    const { AIAuthoringService } = await import('../src/services/ai-authoring')
    const aiAuthoringService = AIAuthoringService.getInstance()
    
    const uniqueSlug = aiAuthoringService.generateUniqueSlug(baseSlug)
    return uniqueSlug
  } catch (error: any) {
    console.error('Failed to generate unique slug:', error)
    return baseSlug
  }
})

ipcMain.handle('get-generation-progress', async () => {
  try {
    const { AIAuthoringService } = await import('../src/services/ai-authoring')
    const aiAuthoringService = AIAuthoringService.getInstance()
    
    const progress = aiAuthoringService.getCurrentProgress()
    return progress
  } catch (error: any) {
    console.error('Failed to get generation progress:', error)
    return null
  }
})

ipcMain.handle('get-session-token-usage', async () => {
  try {
    const { AIAuthoringService } = await import('../src/services/ai-authoring')
    const aiAuthoringService = AIAuthoringService.getInstance()
    
    const usage = aiAuthoringService.getSessionTokenUsage()
    return usage
  } catch (error: any) {
    console.error('Failed to get session token usage:', error)
    return { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: 0 }
  }
})

ipcMain.handle('reset-session-token-usage', async () => {
  try {
    const { AIAuthoringService } = await import('../src/services/ai-authoring')
    const aiAuthoringService = AIAuthoringService.getInstance()
    
    aiAuthoringService.resetSessionTokenUsage()
    return true
  } catch (error: any) {
    console.error('Failed to reset session token usage:', error)
    return false
  }
})