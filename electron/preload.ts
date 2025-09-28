import { contextBridge, ipcRenderer } from 'electron'

console.log('Preload script starting...')

// --------- Expose some API to the Renderer process ---------
try {
  contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event: any, ...args: any[]) => (listener as any)(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },
})

// Expose API for the Code Kata App
contextBridge.exposeInMainWorld('electronAPI', {
  // Kata management
  getKatas: () => ipcRenderer.invoke('get-katas'),
  loadKata: (slug: string) => ipcRenderer.invoke('load-kata', slug),
  refreshKatas: () => ipcRenderer.invoke('refresh-katas'),
  
  // Import/Export
  importKata: (zipPath: string) => ipcRenderer.invoke('import-kata', zipPath),
  exportKata: (slug: string) => ipcRenderer.invoke('export-kata', slug),
  importMultipleKatas: (zipPaths: string[]) => ipcRenderer.invoke('import-multiple-katas', zipPaths),
  exportMultipleKatas: (slugs: string[]) => ipcRenderer.invoke('export-multiple-katas', slugs),
  
  // Code execution
  executeCode: (language: string, code: string, kataPath: string, hidden: boolean, timeoutMs?: number) =>
    ipcRenderer.invoke('execute-code', language, code, kataPath, hidden, timeoutMs),
  
  // Progress tracking
  saveAttempt: (attempt: any) => ipcRenderer.invoke('save-attempt', attempt),
  getProgress: (kataId: string) => ipcRenderer.invoke('get-progress', kataId),
  updateProgress: (kataId: string, progress: any) => ipcRenderer.invoke('update-progress', kataId, progress),
  saveCode: (kataId: string, code: string) => ipcRenderer.invoke('save-code', kataId, code),
  loadCode: (kataId: string) => ipcRenderer.invoke('load-code', kataId),
  getAttemptHistory: (kataId: string) => ipcRenderer.invoke('get-attempt-history', kataId),
  getAllProgress: () => ipcRenderer.invoke('get-all-progress'),
  getKataStats: (kataId: string) => ipcRenderer.invoke('get-kata-stats', kataId),
  
  // AI judging
  judgeExplanation: (explanation: string, rubric: any, topic?: string, context?: string) => 
    ipcRenderer.invoke('judge-explanation', explanation, rubric, topic, context),
  judgeTemplate: (templateContent: string, rubric: any, expectedStructure?: any, templateType?: string, context?: string) =>
    ipcRenderer.invoke('judge-template', templateContent, rubric, expectedStructure, templateType, context),
  judgeCodebase: (analysis: string, rubric: any, codebaseDescription?: string, context?: string) =>
    ipcRenderer.invoke('judge-codebase', analysis, rubric, codebaseDescription, context),
  
  // File operations
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  saveFileDialog: (defaultName?: string) => ipcRenderer.invoke('save-file-dialog', defaultName),
  
  // System checks
  checkDependencies: () => ipcRenderer.invoke('check-dependencies'),
  
  // Settings and auto-continue
  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSetting: (key: string, value: any) => ipcRenderer.invoke('update-setting', key, value),
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),
  testOpenAIKey: (apiKey: string) => ipcRenderer.invoke('test-openai-key', apiKey),
  getRandomKata: (currentKataId: string, filters: any) => ipcRenderer.invoke('get-random-kata', currentKataId, filters),
  getAutoContinueEnabled: () => ipcRenderer.invoke('get-auto-continue-enabled'),
  setAutoContinueEnabled: (enabled: boolean) => ipcRenderer.invoke('set-auto-continue-enabled', enabled),
  
  // AI Configuration
  getAiConfig: () => ipcRenderer.invoke('get-ai-config'),
  saveAiConfig: (config: any) => ipcRenderer.invoke('save-ai-config', config),
  testOpenAIConnection: (apiKey?: string) => ipcRenderer.invoke('test-openai-connection', apiKey),
  getAvailableModels: () => ipcRenderer.invoke('get-available-models'),
  validateAiConfig: (config: any) => ipcRenderer.invoke('validate-ai-config', config),
})

console.log('Preload script completed successfully')
} catch (error) {
  console.error('Error in preload script:', error)
}

// Type definitions for the exposed API
interface ElectronAPI {
  getKatas: () => Promise<any[]>
  loadKata: (slug: string) => Promise<any>
  refreshKatas: () => Promise<any[]>
  importKata: (zipPath: string) => Promise<{ success: boolean, error?: string }>
  exportKata: (slug: string) => Promise<{ success: boolean, outputPath?: string, error?: string }>
  importMultipleKatas: (zipPaths: string[]) => Promise<{ success: string[], failed: { path: string, error: string }[] }>
  exportMultipleKatas: (slugs: string[]) => Promise<{ success: string[], failed: { slug: string, error: string }[] }>
  executeCode: (language: string, code: string, kataPath: string, hidden: boolean, timeoutMs?: number) => Promise<any>
  saveAttempt: (attempt: any) => Promise<void>
  getProgress: (kataId: string) => Promise<any>
  updateProgress: (kataId: string, progress: any) => Promise<void>
  saveCode: (kataId: string, code: string) => Promise<void>
  loadCode: (kataId: string) => Promise<string | null>
  getAttemptHistory: (kataId: string) => Promise<any[]>
  getAllProgress: () => Promise<any[]>
  getKataStats: (kataId: string) => Promise<any>
  judgeExplanation: (explanation: string, rubric: any, topic?: string, context?: string) => Promise<any>
  judgeTemplate: (templateContent: string, rubric: any, expectedStructure?: any, templateType?: string, context?: string) => Promise<any>
  judgeCodebase: (analysis: string, rubric: any, codebaseDescription?: string, context?: string) => Promise<any>
  openFileDialog: () => Promise<string[]>
  saveFileDialog: (defaultName?: string) => Promise<string | null>
  checkDependencies: () => Promise<any>
  getSettings: () => Promise<any>
  updateSetting: (key: string, value: any) => Promise<void>
  saveSettings: (settings: any) => Promise<void>
  testOpenAIKey: (apiKey: string) => Promise<boolean>
  getRandomKata: (currentKataId: string, filters: any) => Promise<any>
  getAutoContinueEnabled: () => Promise<boolean>
  setAutoContinueEnabled: (enabled: boolean) => Promise<void>
  getAiConfig: () => Promise<any>
  saveAiConfig: (config: any) => Promise<{ success: boolean, error?: string }>
  testOpenAIConnection: (apiKey?: string) => Promise<{ success: boolean, error?: string, models?: string[] }>
  getAvailableModels: () => Promise<string[]>
  validateAiConfig: (config: any) => Promise<{ isValid: boolean, errors: string[] }>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
    ipcRenderer: typeof ipcRenderer
  }
}