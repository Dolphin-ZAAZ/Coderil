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
      // Load kata details (placeholder - will be implemented in later tasks)
      const details: KataDetails = {
        ...kata,
        statement: `# ${kata.title}\n\nThis is a placeholder statement for the ${kata.title} kata.\n\nThe actual statement will be loaded from the kata's statement.md file in later tasks.`,
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
      
      setKataDetails(details)
      setCurrentCode(details.starterCode)
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
    if (!kataDetails) return
    
    setIsExecuting(true)
    setExecutionResults(null)
    setAiJudgment(null)
    
    try {
      // Placeholder for code execution - will be implemented in later tasks
      const mockResult: ExecutionResult = {
        success: true,
        output: 'Mock execution output\nThis will be replaced with actual execution in later tasks.',
        errors: '',
        testResults: [
          { name: 'Test 1', passed: true, message: 'Mock test passed' },
          { name: 'Test 2', passed: false, message: 'Mock test failed', expected: 'expected', actual: 'actual' }
        ],
        score: 50,
        duration: 123
      }
      
      setTimeout(() => {
        setExecutionResults(mockResult)
        setIsExecuting(false)
      }, 1000)
    } catch (error) {
      console.error('Failed to run code:', error)
      setIsExecuting(false)
    }
  }

  const handleSubmit = async () => {
    if (!kataDetails) return
    
    setIsExecuting(true)
    setExecutionResults(null)
    setAiJudgment(null)
    
    try {
      // Placeholder for code execution and AI judging - will be implemented in later tasks
      if (kataDetails.type === 'explain') {
        const mockAiJudgment: AIJudgment = {
          scores: { clarity: 80, correctness: 70, completeness: 60 },
          feedback: 'Mock AI feedback: Your explanation shows good understanding but could be more detailed.',
          pass: false,
          totalScore: 70
        }
        
        setTimeout(() => {
          setAiJudgment(mockAiJudgment)
          setIsExecuting(false)
        }, 2000)
      } else {
        const mockResult: ExecutionResult = {
          success: false,
          output: 'Mock submission output\nThis will be replaced with actual execution in later tasks.',
          errors: 'Mock error message',
          testResults: [
            { name: 'Public Test 1', passed: true },
            { name: 'Public Test 2', passed: true },
            { name: 'Hidden Test 1', passed: false, message: 'Hidden test failed' },
            { name: 'Hidden Test 2', passed: true }
          ],
          score: 75,
          duration: 234
        }
        
        setTimeout(() => {
          setExecutionResults(mockResult)
          setIsExecuting(false)
        }, 2000)
      }
    } catch (error) {
      console.error('Failed to submit code:', error)
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