import { useState, useEffect, useCallback } from 'react'
import { Kata, KataDetails, ExecutionResult, AIJudgment, Language, KataFilters, AutoContinueNotification as AutoContinueNotificationType } from '@/types'
import { StatementPanel, CodeEditorPanel, ResultsPanel, KataSelector, ProgressDisplay, ResizablePanel, SettingsPanel, ShortformAnswerPanel, MultiQuestionPanel } from '@/components'
import { DependencyWarning } from '@/components/DependencyWarning'
import { AutoContinueNotification } from '@/components/AutoContinueNotification'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ErrorNotificationContainer } from '@/components/ErrorNotification'
import { ScoringService } from '@/services/scoring'
import { AutoContinueService } from '@/services/auto-continue'
import { ShortformEvaluatorService } from '@/services/shortform-evaluator'
import { useMediaQuery, useElectronAPI } from '@/hooks'
import { useDependencyChecker } from '@/hooks/useDependencyChecker'
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
  const [filters, setFilters] = useState<KataFilters>({})
  const [autoContinueNotification, setAutoContinueNotification] = useState<AutoContinueNotificationType | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [shortformAnswer, setShortformAnswer] = useState<string | string[]>('')
  const [multiQuestionAnswers, setMultiQuestionAnswers] = useState<Record<string, string | string[]>>({})

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  
  const scoringService = ScoringService.getInstance()
  const autoContinueService = AutoContinueService.getInstance()
  const shortformEvaluator = ShortformEvaluatorService.getInstance()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const isTablet = useMediaQuery('(max-width: 1200px)')
  const { isAvailable: isElectronAPIAvailable, isLoading: isElectronAPILoading } = useElectronAPI()

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    setIsSidebarCollapsed(isMobile)
  }, [isMobile])

  // Trigger submission when shortform answer is set
  useEffect(() => {
    if (shortformAnswer && selectedKata && kataDetails && ['shortform', 'one-liner'].includes(kataDetails.type)) {
      handleSubmit()
    }
  }, [shortformAnswer, selectedKata, kataDetails])

  // Trigger submission when multi-question answers are set
  useEffect(() => {
    if (Object.keys(multiQuestionAnswers).length > 0 && selectedKata && kataDetails && kataDetails.type === 'multi-question') {
      handleSubmit()
    }
  }, [multiQuestionAnswers, selectedKata, kataDetails])
  const { 
    dependencies, 
    shouldShowWarning, 
    refreshDependencies, 
    dismissWarning 
  } = useDependencyChecker()

  const loadSettings = useCallback(async () => {
    try {
      if (!window.electronAPI) {
        console.warn('ElectronAPI not available for loading settings');
        return;
      }
      
      const settings = await window.electronAPI.getSettings()
      setAutoContinueEnabled(settings.autoContinueEnabled)
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }, [])

  const loadKatas = useCallback(async () => {
    console.log('=== LOADING KATAS FROM RENDERER ===')
    setIsLoading(true)
    
    try {
      if (!window.electronAPI) {
        console.warn('ElectronAPI not available - running in browser mode')
        setKatas([])
        return
      }
      
      console.log('Calling window.electronAPI.getKatas()')
      const loadedKatas = await window.electronAPI.getKatas()
      console.log('Received katas from main process:', loadedKatas)
      setKatas(loadedKatas)
    } catch (error) {
      console.error('Failed to load katas:', error)
      setKatas([]) // Set empty array as fallback
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // Load data once electronAPI availability is determined
    if (!isElectronAPILoading) {
      if (isElectronAPIAvailable) {
        loadKatas()
        loadSettings()
      } else {
        console.warn('Running in browser mode - limited functionality available')
        setIsLoading(false)
      }
    }
  }, [isElectronAPIAvailable, isElectronAPILoading, loadKatas, loadSettings])

  const handleKataSelect = async (kata: Kata) => {
    setSelectedKata(kata)
    setExecutionResults(null)
    setAiJudgment(null)
    
    if (!isElectronAPIAvailable) {
      // Create fallback details for browser mode
      const fallbackDetails: KataDetails = {
        ...kata,
        statement: `# ${kata.title}\n\nRunning in browser mode - kata details not available.`,
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
      return
    }
    
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
        await window.electronAPI.setAutoContinueEnabled(newValue)
      } else {
        // Browser mode - just update local state
        console.log('Browser mode: auto-continue setting changed to', newValue)
      }
    } catch (error) {
      console.error('Failed to update auto-continue setting:', error)
    }
  }

  const handleShortformSubmit = useCallback((answer: string | string[]) => {
    setShortformAnswer(answer)
    // Submission will be triggered by useEffect when shortformAnswer changes
  }, [])

  const handleMultiQuestionSubmit = useCallback((answers: Record<string, string | string[]>) => {
    setMultiQuestionAnswers(answers)
    // Submission will be triggered by useEffect when multiQuestionAnswers changes
  }, [])

  const handleRandomKataSelect = async () => {
    if (!selectedKata || !isElectronAPIAvailable) return
    
    try {
      const randomKata = await window.electronAPI.getRandomKata(selectedKata.slug, filters)
      if (randomKata) {
        await handleKataSelect(randomKata)
      } else {
        console.log('No suitable random kata found with current filters')
      }
    } catch (error) {
      console.error('Failed to get random kata:', error)
    }
  }

  const triggerAutoContinue = async (result: ExecutionResult | AIJudgment) => {
    if (!autoContinueEnabled || !selectedKata || !isElectronAPIAvailable) return
    
    // Check if auto-continue should trigger
    if (!autoContinueService.shouldTrigger(result)) return
    
    try {
      // Get a random kata that respects current filters
      const nextKata = await window.electronAPI.getRandomKata(selectedKata.slug, filters)
      
      if (nextKata) {
        // Create notification
        const notification = autoContinueService.createNotification(selectedKata, nextKata)
        setAutoContinueNotification(notification)
        
        // Wait a moment for user to see the notification, then switch
        setTimeout(async () => {
          await handleKataSelect(nextKata)
        }, 1500)
      } else {
        console.log('No suitable kata found for auto-continue')
      }
    } catch (error) {
      console.error('Failed to trigger auto-continue:', error)
    }
  }

  const handleCodeChange = (code: string) => {
    setCurrentCode(code)
    // Auto-save is now handled by CodeEditorPanel
  }

  const handleReset = async () => {
    if (!selectedKata || !kataDetails) return
    
    try {
      // Clear current results
      setExecutionResults(null)
      setAiJudgment(null)
      
      // Reset to starter code
      setCurrentCode(kataDetails.starterCode)
      
      // Save starter code to database (instead of clearing)
      if (window.electronAPI) {
        await window.electronAPI.saveCode(selectedKata.slug, kataDetails.starterCode)
      }
      
      console.log('Kata reset successfully')
    } catch (error) {
      console.error('Failed to reset kata:', error)
    }
  }

  const handleRun = async () => {
    if (!kataDetails || !selectedKata) return
    
    if (!isElectronAPIAvailable) {
      setExecutionResults({
        success: false,
        output: '',
        errors: 'Code execution not available in browser mode',
        testResults: [],
        duration: 0
      })
      return
    }
    
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
      
      // Process result through scoring service
      const processedResult = scoringService.processResult(result)
      setExecutionResults(processedResult)
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
    
    if (!isElectronAPIAvailable) {
      setExecutionResults({
        success: false,
        output: '',
        errors: 'Code submission not available in browser mode',
        testResults: [],
        duration: 0
      })
      return
    }
    
    setIsExecuting(true)
    setExecutionResults(null)
    setAiJudgment(null)
    
    try {
      // Save current code before execution
      await window.electronAPI.saveCode(selectedKata.slug, currentCode)
      
      if (kataDetails.type === 'explain') {
        // AI judging for explanation katas
        if (kataDetails.rubric) {
          const aiJudgment = await window.electronAPI.judgeExplanation(
            currentCode,
            kataDetails.rubric,
            kataDetails.title,
            kataDetails.statement
          )
          
          // Process AI judgment through scoring service
          const processedJudgment = scoringService.processAIJudgment(aiJudgment)
          setAiJudgment(processedJudgment)
          
          // Save attempt to database
          await window.electronAPI.saveAttempt({
            kataId: selectedKata.slug,
            timestamp: new Date().toISOString(),
            language: kataDetails.language,
            status: aiJudgment.pass ? 'passed' : 'failed',
            score: aiJudgment.totalScore,
            durationMs: 0, // AI judging doesn't have execution time
            code: currentCode
          })
          
          // Progress display will refresh automatically
          
          // Handle auto-continue if enabled and kata passed
          if (autoContinueEnabled && aiJudgment.pass) {
            await triggerAutoContinue(aiJudgment)
          }
        } else {
          // Fallback for katas without rubric
          const mockAiJudgment: AIJudgment = {
            scores: { clarity: 80, correctness: 70, completeness: 60 },
            feedback: 'No rubric found for this explanation kata.',
            pass: false,
            totalScore: 70
          }
          
          const processedJudgment = scoringService.processAIJudgment(mockAiJudgment)
          setAiJudgment(processedJudgment)
        }
      } else if (kataDetails.type === 'template') {
        // AI judging for template katas
        if (kataDetails.rubric) {
          const aiJudgment = await window.electronAPI.judgeTemplate(
            currentCode,
            kataDetails.rubric,
            undefined, // expectedStructure - could be added to kata metadata
            kataDetails.title,
            kataDetails.statement
          )
          
          // Process AI judgment through scoring service
          const processedJudgment = scoringService.processAIJudgment(aiJudgment)
          setAiJudgment(processedJudgment)
          
          // Save attempt to database
          await window.electronAPI.saveAttempt({
            kataId: selectedKata.slug,
            timestamp: new Date().toISOString(),
            language: kataDetails.language,
            status: aiJudgment.pass ? 'passed' : 'failed',
            score: aiJudgment.totalScore,
            durationMs: 0, // AI judging doesn't have execution time
            code: currentCode
          })
          
          // Progress display will refresh automatically
          
          // Handle auto-continue if enabled and kata passed
          if (autoContinueEnabled && aiJudgment.pass) {
            await triggerAutoContinue(aiJudgment)
          }
        } else {
          // Fallback for katas without rubric
          const mockAiJudgment: AIJudgment = {
            scores: { structure: 75, completeness: 80, best_practices: 70 },
            feedback: 'No rubric found for this template kata.',
            pass: false,
            totalScore: 75
          }
          
          const processedJudgment = scoringService.processAIJudgment(mockAiJudgment)
          setAiJudgment(processedJudgment)
        }
      } else if (kataDetails.type === 'codebase') {
        // AI judging for codebase analysis katas
        if (kataDetails.rubric) {
          const aiJudgment = await window.electronAPI.judgeCodebase(
            currentCode,
            kataDetails.rubric,
            kataDetails.title,
            kataDetails.statement
          )
          
          // Process AI judgment through scoring service
          const processedJudgment = scoringService.processAIJudgment(aiJudgment)
          setAiJudgment(processedJudgment)
          
          // Save attempt to database
          await window.electronAPI.saveAttempt({
            kataId: selectedKata.slug,
            timestamp: new Date().toISOString(),
            language: kataDetails.language,
            status: aiJudgment.pass ? 'passed' : 'failed',
            score: aiJudgment.totalScore,
            durationMs: 0, // AI judging doesn't have execution time
            code: currentCode
          })
          
          // Progress display will refresh automatically
          
          // Handle auto-continue if enabled and kata passed
          if (autoContinueEnabled && aiJudgment.pass) {
            await triggerAutoContinue(aiJudgment)
          }
        } else {
          // Fallback for codebase katas without rubric
          const mockAiJudgment: AIJudgment = {
            scores: { comprehension: 70, structure: 75, detail: 65, accuracy: 80, insights: 60 },
            feedback: 'No rubric found for this codebase analysis kata.',
            pass: false,
            totalScore: 70
          }
          
          const processedJudgment = scoringService.processAIJudgment(mockAiJudgment)
          setAiJudgment(processedJudgment)
        }
      } else if (['shortform', 'one-liner', 'multi-question'].includes(kataDetails.type)) {
        // Check if this is a multi-question kata
        if (kataDetails.multiQuestionConfig) {
          // Multi-question shortform kata evaluation
          const submission = {
            kataType: kataDetails.type as any,
            answers: multiQuestionAnswers,
            multiQuestionConfig: kataDetails.multiQuestionConfig
          }

          const result = await shortformEvaluator.evaluateMultiQuestionSubmission(submission)
          setExecutionResults(result)

          // Save attempt to database
          await window.electronAPI.saveAttempt({
            kataId: selectedKata.slug,
            timestamp: new Date().toISOString(),
            language: kataDetails.language,
            status: result.success ? 'passed' : 'failed',
            score: result.score || 0,
            durationMs: result.duration,
            code: JSON.stringify(multiQuestionAnswers)
          })

          // Handle auto-continue if enabled and kata passed
          if (autoContinueEnabled && result.success) {
            await triggerAutoContinue(result)
          }
        } else {
          // Legacy single-question shortform kata evaluation
          const submission = {
            kataType: kataDetails.type as any,
            answer: shortformAnswer,

            shortformConfig: kataDetails.shortformConfig,
            oneLinerConfig: kataDetails.oneLinerConfig
          }

          const validation = shortformEvaluator.validateSubmission(submission)
          if (!validation.isValid) {
            setExecutionResults({
              success: false,
              output: '',
              errors: validation.errors.join(', '),
              testResults: [],
              duration: 0
            })
            return
          }

          const result = await shortformEvaluator.evaluateSubmission(submission)
          setExecutionResults(result)

          // Save attempt to database
          await window.electronAPI.saveAttempt({
            kataId: selectedKata.slug,
            timestamp: new Date().toISOString(),
            language: kataDetails.language,
            status: result.success ? 'passed' : 'failed',
            score: result.score || 0,
            durationMs: result.duration,
            code: Array.isArray(shortformAnswer) ? shortformAnswer.join(', ') : shortformAnswer
          })

          // Handle auto-continue if enabled and kata passed
          if (autoContinueEnabled && result.success) {
            await triggerAutoContinue(result)
          }
        }
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
        
        // Use scoring service to combine results with proper weighting
        const combinedResult = scoringService.combineResults(publicResult, hiddenResult)
        
        setExecutionResults(combinedResult)
        
        // Save attempt to database
        await window.electronAPI.saveAttempt({
          kataId: selectedKata.slug,
          timestamp: new Date().toISOString(),
          language: kataDetails.language,
          status: combinedResult.passed ? 'passed' : 'failed',
          score: combinedResult.finalScore,
          durationMs: combinedResult.duration,
          code: currentCode
        })
        
        // Handle auto-continue if enabled and kata passed
        if (autoContinueEnabled && combinedResult.passed) {
          await triggerAutoContinue(combinedResult)
        }
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
    <ErrorBoundary>
      <ErrorNotificationContainer />
      <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="header-title">
            <h1>Code Kata App</h1>
            <p>Practice coding challenges with local execution and AI-powered judging</p>
            {!isElectronAPIAvailable && !isElectronAPILoading && (
              <div className="browser-mode-warning">
                ⚠️ Running in browser mode - some features may be limited
              </div>
            )}
          </div>
          <div className="header-controls">
            <button 
              className="settings-button"
              onClick={() => setIsSettingsOpen(true)}
              aria-label="Open settings"
            >
              ⚙️ Settings
            </button>
          </div>
        </div>
      </header>
      
      {shouldShowWarning && (
        <DependencyWarning
          dependencies={dependencies}
          onRefresh={refreshDependencies}
          onDismiss={dismissWarning}
        />
      )}
      
      <AutoContinueNotification
        notification={autoContinueNotification}
        onDismiss={() => setAutoContinueNotification(null)}
      />
      
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
      
      <main className="app-main">
        {isSidebarCollapsed && (
          <button 
            className="sidebar-toggle collapsed"
            onClick={() => setIsSidebarCollapsed(false)}
            aria-label="Show sidebar"
          >
            <div className="hamburger">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </button>
        )}
        
        <div className={`kata-selector-container ${isSidebarCollapsed ? 'collapsed' : ''}`}>
          <KataSelector
            katas={katas}
            selectedKata={selectedKata}
            onKataSelect={handleKataSelect}
            isLoading={isLoading}
            onToggleSidebar={() => setIsSidebarCollapsed(true)}
            onKatasRefresh={loadKatas}
            onRandomKataSelect={handleRandomKataSelect}
            filters={filters}
            onFilterChange={setFilters}
            autoContinueEnabled={autoContinueEnabled}
            onAutoContinueToggle={handleAutoContinueToggle}
          />
        </div>

        <div className="kata-workspace">
          {selectedKata && kataDetails ? (
            <div className="workspace-panels">
              {isTablet ? (
                // Vertical layout for tablet and mobile
                <>
                  <ResizablePanel
                    direction="vertical"
                    initialSize={isMobile ? 200 : 250}
                    minSize={150}
                    maxSize={400}
                    className="statement-panel-container"
                  >
                    <StatementPanel 
                      statement={kataDetails.statement}
                      metadata={kataDetails.metadata}
                      solutionCode={kataDetails.solutionCode}
                      onShowSolution={() => console.log('Solution viewed for kata:', selectedKata.slug)}
                    />
                  </ResizablePanel>
                  
                  <ResizablePanel
                    direction="vertical"
                    initialSize={isMobile ? 300 : 350}
                    minSize={200}
                    maxSize={500}
                    className="code-editor-panel-container"
                  >
                    {['shortform', 'one-liner', 'multi-question'].includes(kataDetails.type) ? (
                      kataDetails.multiQuestionConfig ? (
                        <MultiQuestionPanel
                          kataType={kataDetails.type as any}
                          multiQuestionConfig={kataDetails.multiQuestionConfig}
                          onSubmit={handleMultiQuestionSubmit}
                          isLoading={isExecuting}
                          solutionData={kataDetails.multiQuestionSolution}
                          onShowSolution={() => console.log('Solution viewed for multi-question kata:', selectedKata.slug)}
                        />
                      ) : (
                        <ShortformAnswerPanel
                          kataType={kataDetails.type as any}
                          shortformConfig={kataDetails.shortformConfig}
                          oneLinerConfig={kataDetails.oneLinerConfig}
                          onSubmit={handleShortformSubmit}
                          isLoading={isExecuting}
                        />
                      )
                    ) : (
                      <CodeEditorPanel
                        language={kataDetails.language}
                        initialCode={currentCode}
                        onChange={handleCodeChange}
                        onRun={handleRun}
                        onSubmit={handleSubmit}
                        kataId={selectedKata.slug}
                      />
                    )}
                  </ResizablePanel>
                  
                  <div className="results-panel-container">
                    <ProgressDisplay 
                      kataId={selectedKata.slug}
                      onReset={handleReset}
                      showResetButton={true}
                    />
                    <ResultsPanel
                      results={executionResults}
                      aiJudgment={aiJudgment}
                      isLoading={isExecuting}
                      onReset={handleReset}
                    />
                  </div>
                </>
              ) : (
                // Horizontal layout for desktop
                <>
                  <ResizablePanel
                    direction="horizontal"
                    initialSize={350}
                    minSize={250}
                    maxSize={500}
                    className="statement-panel-container"
                  >
                    <StatementPanel 
                      statement={kataDetails.statement}
                      metadata={kataDetails.metadata}
                      solutionCode={kataDetails.solutionCode}
                      onShowSolution={() => console.log('Solution viewed for kata:', selectedKata.slug)}
                    />
                  </ResizablePanel>
                  
                  <ResizablePanel
                    direction="horizontal"
                    initialSize={450}
                    minSize={350}
                    maxSize={700}
                    className="code-editor-panel-container"
                  >
                    {['shortform', 'one-liner', 'multi-question'].includes(kataDetails.type) ? (
                      kataDetails.multiQuestionConfig ? (
                        <MultiQuestionPanel
                          kataType={kataDetails.type as any}
                          multiQuestionConfig={kataDetails.multiQuestionConfig}
                          onSubmit={handleMultiQuestionSubmit}
                          isLoading={isExecuting}
                          solutionData={kataDetails.multiQuestionSolution}
                          onShowSolution={() => console.log('Solution viewed for multi-question kata:', selectedKata.slug)}
                        />
                      ) : (
                        <ShortformAnswerPanel
                          kataType={kataDetails.type as any}
                          shortformConfig={kataDetails.shortformConfig}
                          oneLinerConfig={kataDetails.oneLinerConfig}
                          onSubmit={handleShortformSubmit}
                          isLoading={isExecuting}
                        />
                      )
                    ) : (
                      <CodeEditorPanel
                        language={kataDetails.language}
                        initialCode={currentCode}
                        onChange={handleCodeChange}
                        onRun={handleRun}
                        onSubmit={handleSubmit}
                        kataId={selectedKata.slug}
                      />
                    )}
                  </ResizablePanel>
                  
                  <div className="results-panel-container">
                    <ProgressDisplay 
                      kataId={selectedKata.slug}
                      onReset={handleReset}
                      showResetButton={true}
                    />
                    <ResultsPanel
                      results={executionResults}
                      aiJudgment={aiJudgment}
                      isLoading={isExecuting}
                      onReset={handleReset}
                    />
                  </div>
                </>
              )}
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
    </ErrorBoundary>
  )
}

export default App
