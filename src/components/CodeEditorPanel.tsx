import { useEffect, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import { CodeEditorProps, Language } from '@/types'
import './CodeEditorPanel.css'

// Monaco language mappings
const getMonacoLanguage = (language: Language): string => {
  switch (language) {
    case 'py': return 'python'
    case 'js': return 'javascript'
    case 'ts': return 'typescript'
    case 'cpp': return 'cpp'
    default: return 'plaintext'
  }
}

// Editor configuration for each language
const getEditorOptions = (language: Language) => {
  const baseOptions = {
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    fontSize: 14,
    lineNumbers: 'on' as const,
    roundedSelection: false,
    scrollbar: {
      vertical: 'auto' as const,
      horizontal: 'auto' as const,
    },
    automaticLayout: true,
    tabSize: language === 'py' ? 4 : 2,
    insertSpaces: true,
    wordWrap: 'on' as const,
  }

  // Language-specific configurations
  switch (language) {
    case 'py':
      return {
        ...baseOptions,
        tabSize: 4,
        rulers: [79], // PEP 8 line length
      }
    case 'cpp':
      return {
        ...baseOptions,
        tabSize: 2,
        rulers: [100],
      }
    default:
      return baseOptions
  }
}

// Autosave service using LocalStorage
export class AutosaveService {
  private static getKey(kataId: string): string {
    return `kata-code-${kataId}`
  }

  static saveCode(kataId: string, code: string): void {
    try {
      localStorage.setItem(this.getKey(kataId), code)
    } catch (error) {
      console.warn('Failed to save code to localStorage:', error)
    }
  }

  static loadCode(kataId: string): string | null {
    try {
      return localStorage.getItem(this.getKey(kataId))
    } catch (error) {
      console.warn('Failed to load code from localStorage:', error)
      return null
    }
  }

  static clearCode(kataId: string): void {
    try {
      localStorage.removeItem(this.getKey(kataId))
    } catch (error) {
      console.warn('Failed to clear code from localStorage:', error)
    }
  }
}

export function CodeEditorPanel({ 
  language, 
  initialCode, 
  onChange, 
  onRun, 
  onSubmit,
  kataId
}: CodeEditorProps & { kataId?: string }) {
  const [code, setCode] = useState(initialCode)
  const [isEditorReady, setIsEditorReady] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const autosaveTimeoutRef = useRef<NodeJS.Timeout>()
  
  // Use provided kataId or fallback to generated one
  const effectiveKataId = kataId || `${language}-${initialCode.slice(0, 20).replace(/\W/g, '')}`

  // Load saved code on mount or when kata changes
  useEffect(() => {
    const loadSavedCode = async () => {
      if (window.electronAPI && effectiveKataId) {
        try {
          const savedCode = await window.electronAPI.loadCode(effectiveKataId)
          if (savedCode !== null && savedCode !== initialCode) {
            setCode(savedCode)
            onChange(savedCode)
          } else {
            setCode(initialCode)
          }
        } catch (error) {
          console.warn('Failed to load saved code, using initial code:', error)
          setCode(initialCode)
        }
      } else {
        // Fallback to localStorage for browser mode
        const savedCode = AutosaveService.loadCode(effectiveKataId)
        if (savedCode !== null && savedCode !== initialCode) {
          setCode(savedCode)
          onChange(savedCode)
        } else {
          setCode(initialCode)
        }
      }
    }

    loadSavedCode()
  }, [initialCode, effectiveKataId, onChange])

  // Handle code changes with autosave
  const handleCodeChange = (value: string | undefined) => {
    const newCode = value || ''
    setCode(newCode)
    onChange(newCode)

    // Debounced autosave
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current)
    }
    
    autosaveTimeoutRef.current = setTimeout(async () => {
      try {
        if (window.electronAPI && effectiveKataId) {
          // Save to database via IPC
          await window.electronAPI.saveCode(effectiveKataId, newCode)
        } else {
          // Fallback to localStorage for browser mode
          AutosaveService.saveCode(effectiveKataId, newCode)
        }
        setLastSaved(new Date())
      } catch (error) {
        console.warn('Failed to autosave code:', error)
        // Fallback to localStorage
        AutosaveService.saveCode(effectiveKataId, newCode)
        setLastSaved(new Date())
      }
    }, 1000) // Save after 1 second of inactivity
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current)
      }
    }
  }, [])

  const handleEditorDidMount = () => {
    setIsEditorReady(true)
  }

  return (
    <div className="code-editor-panel">
      <div className="editor-header">
        <div className="editor-info">
          <span className="editor-language">{language.toUpperCase()}</span>
          <span className="editor-status">
            {isEditorReady ? 'Ready' : 'Loading...'}
          </span>
        </div>
        <div className="editor-actions">
          <button 
            className="btn btn-secondary"
            onClick={onRun}
            title="Run public tests only"
            disabled={!isEditorReady}
          >
            Run
          </button>
          <button 
            className="btn btn-primary"
            onClick={onSubmit}
            title="Submit and run all tests"
            disabled={!isEditorReady}
          >
            Submit
          </button>
        </div>
      </div>
      
      <div className="editor-container">
        <Editor
          height="100%"
          language={getMonacoLanguage(language)}
          value={code}
          onChange={handleCodeChange}
          onMount={handleEditorDidMount}
          options={getEditorOptions(language)}
          theme="vs-dark"
          loading={<div className="editor-loading">Loading Monaco Editor...</div>}
        />
      </div>
      
      <div className="editor-footer">
        <span className="editor-hint">
          Auto-save enabled • {getMonacoLanguage(language)} syntax highlighting
          {lastSaved && (
            <span className="last-saved"> • Last saved: {lastSaved.toLocaleTimeString()}</span>
          )}
        </span>
      </div>
    </div>
  )
}