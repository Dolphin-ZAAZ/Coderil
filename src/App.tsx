import { useState, useEffect } from 'react'
import { Kata, KataDetails, ExecutionResult, AIJudgment, Language } from '@/types'
import { StatementPanel, CodeEditorPanel, ResultsPanel, KataSelector } from '@/components'
import './App.css'

function App() {
  const [katas, setKatas] = useState<Kata[]>([])
  const [selectedKata, setSelectedKata] = useState<Kata | null>(null)
  const [kataDetails, setKataDetails] = useState<KataDetails | null>(null)
  const [currentCode, setCurrentCode] = useState<string>('')
  const [executionResults, setExecutionResults] = useState<ExecutionResult | null>(null)
  const [aiJudgment, setAiJudgment] = useState<AIJudgment | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isExecuting, setIsExecuting] = useState(false)
  const [autoContinueEnabled, setAutoContinueEnabled] = useState(false)

  useEffect(() => {
    // Load katas and settings on app start
    loadKatas()
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const settings = await window.electronAPI.getSettings()
      setAutoContinueEnabled(settings.autoContinueEnabled)
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  const loadKatas = async () => {
    try {
      console.log('=== LOADING KATAS FROM RENDERER ===')
      setIsLoading(true)
      
      if (!window.electronAPI) {
        console.error('electronAPI not available - running in browser mode?')
        setKatas([])
        return
      }
      
      console.log('Calling window.electronAPI.getKatas()')
      const loadedKatas = await window.electronAPI.getKatas()
      console.log('Received katas from main process:', loadedKatas)
      setKatas(loadedKatas)
    } catch (error: any) {
      console.error('Failed to load katas:', error)
      console.error('Error details:', error.message, error.stack)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKataSelect = async (kata: Kata) => {
    setSelectedKata(kata)
    setExecutionResults(null)
    setAiJudgment(null)
    
    try {
      // Load actual kata details from the main process
      const details = await window.electronAPI.loadKata(kata.slug)
      if (details) {
        setKataDetails(details)
        
        // Try to load saved code first, otherwise use starter code
        const savedCode = await window.electronAPI.loadCode(kata.slug)
        setCurrentCode(savedCode || details.starterCode)
      } else {
        // Fallback to placeholder if loading fails
        const fallbackDetails: KataDetails = {
          ...kata,
          statement: `# ${kata.title}\n\nFailed to load kata details. Please check the kata files.`,
          metadata: {
            slug: kata.slug,
            title: kata.title,
            language: kata.language as Language,
            type: kata.type as any,
            difficulty: kata.difficulty as any,
            tags: kata.tags,
            entry: `entry.${kata.language}`,
            test: { kind: 'programmatic', file: `tests.${kata.language}` },
            timeout_ms: 5000
          },
          starterCode: getStarterCodePlaceholder(kata.language as Language),
          testConfig: {
            kind: 'programmatic',
            publicTestFile: `tests.${kata.language}`,
            timeoutMs: 5000
          }
        }
        
        setKataDetails(fallbackDetails)
        setCurrentCode(fallbackDetails.starterCode)
      }
    } catch (error) {
      console.error('Failed to load kata details:', error)
    }
  }

  const getStarterCodePlaceholder = (language: Language): string => {
    switch (language) {
      case 'py':
        return '# Write your Python solution here\n\ndef solution():\n    pass\n'
      case 'js':
        return '// Write your JavaScript solution here\n\nfunction solution() {\n    // Your code here\n}\n\nmodule.exports = { solution };\n'
      case 'ts':
        return '// Write your TypeScript solution here\n\nfunction solution(): any {\n    // Your code here\n}\n\nexport { solution };\n'
      case 'cpp':
        return '#include <iostream>\n#include <vector>\n#include <string>\n\nusing namespace std;\n\n// Write your C++ solution here\nint main() {\n    // Your code here\n    return 0;\n}\n'
      default:
        return '// Write your code here\n'
    }
  }

  const handleAutoContinueToggle = async () => {
    const newValue = !autoContinueEnabled
    setAutoContinueEnabled(newValue)
    try {
      if (window.electronAPI) {
        await window.electronAPI.updateSetting('auto_continue_enabled', newValue.toString())
      } else {
        // Browser mode - just update local state
        console.log('Browser mode: auto-continue setting changed to', newValue)
      }
    } catch (error) {
      console.error('Failed to update auto-continue setting:', error)
    }
  }

  const handleCodeChange = (code: string) => {
    setCurrentCode(code)
    // Auto-save will be implemented in later tasks
  }

  const handleRun = async () => {
    if (!kataDetails || !selectedKata) return
    
    setIsExecuting(true)
    setExecutionResults(null)
    setAiJudgment(null)
    
    try {
      // Save current code before execution
      await window.electronAPI.saveCode(selectedKata.slug, currentCode)
      
      // Execute code with public tests only
      const result = await window.electronAPI.executeCode(
        kataDetails.language,
        currentCode,
        selectedKata.path,
        false, // hidden = false for public tests
        kataDetails.metadata.timeout_ms
      )
      
      setExecutionResults(result)
    } catch (error) {
      console.error('Failed to run code:', error)
      setExecutionResults({
        success: false,
        output: '',
        errors: `Execution failed: ${error}`,
        testResults: [],
        duration: 0
      })
    } finally {
      setIsExecuting(false)
    }
  }

  const handleSubmit = async () => {
    if (!kataDetails || !selectedKata) return
    
    setIsExecuting(true)
    setExecutionResults(null)
    setAiJudgment(null)
    
    try {
      // Save current code before execution
      await window.electronAPI.saveCode(selectedKata.slug, currentCode)
      
      if (kataDetails.type === 'explain') {
        // AI judging for explanation katas (placeholder - will be implemented in task 13)
        const mockAiJudgment: AIJudgment = {
          scores: { clarity: 80, correctness: 70, completeness: 60 },
          feedback: 'AI judging not implemented yet. This is a placeholder response.',
          pass: false,
          totalScore: 70
        }
        
        setAiJudgment(mockAiJudgment)
      } else if (kataDetails.type === 'template') {
        // AI judging for template katas (placeholder - will be implemented in task 13.1)
        const mockAiJudgment: AIJudgment = {
          scores: { structure: 75, completeness: 80, best_practices: 70 },
          feedback: 'Template judging not implemented yet. This is a placeholder response.',
          pass: false,
          totalScore: 75
        }
        
        setAiJudgment(mockAiJudgment)
      } else {
        // Code execution for code katas - run both public and hidden tests
        const publicResult = await window.electronAPI.executeCode(
          kataDetails.language,
          currentCode,
          selectedKata.path,
          false, // public tests
          kataDetails.metadata.timeout_ms
        )
        
        const hiddenResult = await window.electronAPI.executeCode(
          kataDetails.language,
          currentCode,
          selectedKata.path,
          true, // hidden tests
          kataDetails.metadata.timeout_ms
        )
        
        // Combine results with weighted scoring (30% public, 70% hidden)
        const publicScore = publicResult.score || 0
        const hiddenScore = hiddenResult.score || 0
        const finalScore = (publicScore * 0.3) + (hiddenScore * 0.7)
        
        const combinedResult: ExecutionResult = {
          success: publicResult.success && hiddenResult.success,
          output: publicResult.output + '\n--- Hidden Tests ---\n' + hiddenResult.output,
          errors: publicResult.errors + (hiddenResult.errors ? '\n' + hiddenResult.errors : ''),
          testResults: [...publicResult.testResults, ...hiddenResult.testResults],
          score: finalScore,
          duration: publicResult.duration + hiddenResult.duration
        }
        
        setExecutionResults(combinedResult)
        
        // Save attempt to database
        await window.electronAPI.saveAttempt({
          kataId: selectedKata.slug,
          timestamp: new Date().toISOString(),
          language: kataDetails.language,
          status: combinedResult.success ? 'passed' : 'failed',
          score: finalScore,
          durationMs: combinedResult.duration,
          code: currentCode
        })
      }
    } catch (error) {
      console.error('Failed to submit code:', error)
      setExecutionResults({
        success: false,
        output: '',
        errors: `Submission failed: ${error}`,
        testResults: [],
        duration: 0
      })
    } finally {
      setIsExecuting(false)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="header-title">
            <h1>Code Kata App</h1>
            <p>Practice coding challenges with local execution and AI-powered judging</p>
          </div>
          <div className="header-controls">
            <label className="auto-continue-toggle">
              <input
                type="checkbox"
                checked={autoContinueEnabled}
                onChange={handleAutoContinueToggle}
              />
              <span className="toggle-text">Auto-continue</span>
            </label>
          </div>
        </div>
      </header>
      
      <main className="app-main">
        <div className="kata-selector-container">
          <KataSelector
            katas={katas}
            selectedKata={selectedKata}
            onKataSelect={handleKataSelect}
            isLoading={isLoading}
          />
        </div>

        <div className="kata-workspace">
          {selectedKata && kataDetails ? (
            <div className="workspace-panels">
              <div className="statement-panel-container">
                <StatementPanel 
                  statement={kataDetails.statement}
                  metadata={kataDetails.metadata}
                />
              </div>
              
              <div className="code-editor-panel-container">
                <CodeEditorPanel
                  language={kataDetails.language}
                  initialCode={currentCode}
                  onChange={handleCodeChange}
                  onRun={handleRun}
                  onSubmit={handleSubmit}
                />
              </div>
              
              <div className="results-panel-container">
                <ResultsPanel
                  results={executionResults}
                  aiJudgment={aiJudgment}
                  isLoading={isExecuting}
                />
              </div>
            </div>
          ) : (
            <div className="workspace-placeholder">
              <h2>Select a Kata</h2>
              <p>Choose a kata from the list to start coding.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default App