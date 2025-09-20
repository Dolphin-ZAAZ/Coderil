import { contextBridge, ipcRenderer } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
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
  importKata: (zipPath: string) => ipcRenderer.invoke('import-kata', zipPath),
  exportKata: (slug: string) => ipcRenderer.invoke('export-kata', slug),
  
  // Code execution
  executeCode: (language: string, code: string, testFile: string, hidden: boolean) =>
    ipcRenderer.invoke('execute-code', language, code, testFile, hidden),
  
  // Progress tracking
  saveAttempt: (attempt: any) => ipcRenderer.invoke('save-attempt', attempt),
  getProgress: (kataId: string) => ipcRenderer.invoke('get-progress', kataId),
  updateProgress: (kataId: string, progress: any) => ipcRenderer.invoke('update-progress', kataId, progress),
  
  // AI judging
  judgeExplanation: (explanation: string, rubric: any) => 
    ipcRenderer.invoke('judge-explanation', explanation, rubric),
  judgeTemplate: (templateContent: string, rubric: any, expectedStructure: any) =>
    ipcRenderer.invoke('judge-template', templateContent, rubric, expectedStructure),
  
  // File operations
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  saveFileDialog: () => ipcRenderer.invoke('save-file-dialog'),
  
  // System checks
  checkDependencies: () => ipcRenderer.invoke('check-dependencies'),
  
  // Settings and auto-continue
  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSetting: (key: string, value: any) => ipcRenderer.invoke('update-setting', key, value),
  getRandomKata: (currentKataId: string, filters: any) => ipcRenderer.invoke('get-random-kata', currentKataId, filters),
})

// Type definitions for the exposed API
export interface ElectronAPI {
  getKatas: () => Promise<any[]>
  loadKata: (slug: string) => Promise<any>
  importKata: (zipPath: string) => Promise<void>
  exportKata: (slug: string) => Promise<string>
  executeCode: (language: string, code: string, testFile: string, hidden: boolean) => Promise<any>
  saveAttempt: (attempt: any) => Promise<void>
  getProgress: (kataId: string) => Promise<any>
  updateProgress: (kataId: string, progress: any) => Promise<void>
  judgeExplanation: (explanation: string, rubric: any) => Promise<any>
  judgeTemplate: (templateContent: string, rubric: any, expectedStructure: any) => Promise<any>
  openFileDialog: () => Promise<string[]>
  saveFileDialog: () => Promise<string>
  checkDependencies: () => Promise<any>
  getSettings: () => Promise<any>
  updateSetting: (key: string, value: any) => Promise<void>
  getRandomKata: (currentKataId: string, filters: any) => Promise<any>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
    ipcRenderer: typeof ipcRenderer
  }
}