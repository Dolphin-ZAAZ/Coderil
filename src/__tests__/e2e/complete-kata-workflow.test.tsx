import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../App'
import type { Kata, KataDetails, ExecutionResult, AIJudgment } from '../../types'

// Mock electron API
const mockElectronAPI = {
  getKatas: vi.fn(),
  loadKata: vi.fn(),
  loadCode: vi.fn(),
  saveCode: vi.fn(),
  executeCode: vi.fn(),
  saveAttempt: vi.fn(),
  getProgress: vi.fn(),
  getSettings: vi.fn(),
  setAutoContinueEnabled: vi.fn(),
  getRandomKata: vi.fn(),
  judgeExplanation: vi.fn(),
  judgeTemplate: vi.fn(),
  importKata: vi.fn(),
  exportKata: vi.fn()
}

// Mock window.electronAPI
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true
})

describe('Complete Kata Workflow E2E Tests', () => {
  const user = userEvent.setup()

  const mockCodeKata: Kata = {
    slug: 'fibonacci-js',
    title: 'Fibonacci Sequence',
    language: 'js',
    type: 'code',
    difficulty: 'easy',
    tags: ['math', 'recursion'],
    path: '/katas/fibonacci-js'
  }

  const mockKataDetails: KataDetails = {
    ...mockCodeKata,
    statement: '# Fibonacci Sequence\n\nImplement a function that returns the nth Fibonacci number.',
    metadata: {
      slug: 'fibonacci-js',
      title: 'Fibonacci Sequence',
      language: 'js',
      type: 'code',
      difficulty: 'easy',
      tags: ['math', 'recursion'],
      entry: 'entry.js',
      test: { kind: 'programmatic', file: 'tests.js' },
      timeout_ms: 5000
    },
    starterCode: 'function fibonacci(n) {\n  // Your code here\n}\n\nmodule.exports = { fibonacci };',
    testConfig: {
      kind: 'programmatic',
      publicTestFile: 'tests.js',
      hiddenTestFile: 'hidden_tests.js',
      timeoutMs: 5000
    }
  }

  const mockExplanationKata: Kata = {
    slug: 'explain-recursion',
    title: 'Explain Recursion',
    language: 'md',
    type: 'explain',
    difficulty: 'medium',
    tags: ['concepts', 'recursion'],
    path: '/katas/explain-recursion'
  }

  const mockExplanationDetails: KataDetails = {
    ...mockExplanationKata,
    statement: '# Explain Recursion\n\nExplain what recursion is and provide examples.',
    metadata: {
      slug: 'explain-recursion',
      title: 'Explain Recursion',
      language: 'md',
      type: 'explain',
      difficulty: 'medium',
      tags: ['concepts', 'recursion'],
      entry: 'explanation.md',
      test: { kind: 'none', file: '' },
      timeout_ms: 0
    },
    starterCode: '# Your explanation here\n\n',
    testConfig: {
      kind: 'none',
      publicTestFile: '',
      timeoutMs: 0
    },
    rubric: {
      keys: ['clarity', 'correctness', 'completeness'],
      threshold: {
        min_total: 70,
        min_correctness: 60
      }
    }
  }

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()
    
    // Setup default mock responses
    mockElectronAPI.getKatas.mockResolvedValue([mockCodeKata, mockExplanationKata])
    mockElectronAPI.getSettings.mockResolvedValue({ autoContinueEnabled: false })
    mockElectronAPI.loadCode.mockResolvedValue(null)
    mockElectronAPI.saveCode.mockResolvedValue(undefined)
    mockElectronAPI.saveAttempt.mockResolvedValue(undefined)
    mockElectronAPI.getProgress.mockResolvedValue({
      kataId: 'fibonacci-js',
      lastCode: '',
      bestScore: 0,
      lastStatus: 'not_attempted',
      attemptsCount: 0,
      lastAttempt: new Date()
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Code Kata Workflow', () => {
    it('should complete full workflow: load → edit → run → submit', async () => {
      // Setup kata loading
      mockElectronAPI.loadKata.mockResolvedValue(mockKataDetails)
      
      // Setup execution results
      const publicResult: ExecutionResult = {
        success: true,
        output: 'All public tests passed',
        errors: '',
        testResults: [
          { name: 'fibonacci(0) should return 0', passed: true },
          { name: 'fibonacci(1) should return 1', passed: true }
        ],
        duration: 150
      }

      const hiddenResult: ExecutionResult = {
        success: true,
        output: 'All hidden tests passed',
        errors: '',
        testResults: [
          { name: 'fibonacci(5) should return 5', passed: true },
          { name: 'fibonacci(10) should return 55', passed: true }
        ],
        duration: 200
      }

      mockElectronAPI.executeCode
        .mockResolvedValueOnce(publicResult) // First call for Run
        .mockResolvedValueOnce(publicResult) // Second call for Submit (public)
        .mockResolvedValueOnce(hiddenResult) // Third call for Submit (hidden)

      // Render the app
      render(<App />)

      // Wait for katas to load
      await waitFor(() => {
        expect(screen.getByText('Fibonacci Sequence')).toBeInTheDocument()
      })

      // Step 1: Select a kata
      await user.click(screen.getByText('Fibonacci Sequence'))

      // Wait for kata details to load
      await waitFor(() => {
        expect(screen.getByText('Implement a function that returns the nth Fibonacci number.')).toBeInTheDocument()
      })

      // Verify kata is loaded
      expect(mockElectronAPI.loadKata).toHaveBeenCalledWith('fibonacci-js')

      // Step 2: Edit code
      const codeEditor = screen.getByRole('textbox', { name: /code editor/i })
      expect(codeEditor).toBeInTheDocument()

      const newCode = `function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

module.exports = { fibonacci };`

      await user.clear(codeEditor)
      await user.type(codeEditor, newCode)

      // Verify code is saved
      await waitFor(() => {
        expect(mockElectronAPI.saveCode).toHaveBeenCalledWith('fibonacci-js', expect.stringContaining('fibonacci(n - 1)'))
      })

      // Step 3: Run public tests
      const runButton = screen.getByRole('button', { name: /run/i })
      await user.click(runButton)

      // Verify execution is called with correct parameters
      await waitFor(() => {
        expect(mockElectronAPI.executeCode).toHaveBeenCalledWith(
          'js',
          expect.stringContaining('fibonacci(n - 1)'),
          '/katas/fibonacci-js',
          false, // hidden = false for public tests
          5000
        )
      })

      // Verify results are displayed
      await waitFor(() => {
        expect(screen.getByText('All public tests passed')).toBeInTheDocument()
        expect(screen.getByText('fibonacci(0) should return 0')).toBeInTheDocument()
      })

      // Step 4: Submit for full evaluation
      const submitButton = screen.getByRole('button', { name: /submit/i })
      await user.click(submitButton)

      // Verify both public and hidden tests are executed
      await waitFor(() => {
        expect(mockElectronAPI.executeCode).toHaveBeenCalledTimes(3) // Run + Submit (public + hidden)
      })

      // Verify attempt is saved
      await waitFor(() => {
        expect(mockElectronAPI.saveAttempt).toHaveBeenCalledWith({
          kataId: 'fibonacci-js',
          timestamp: expect.any(String),
          language: 'js',
          status: 'passed',
          score: expect.any(Number),
          durationMs: expect.any(Number),
          code: expect.stringContaining('fibonacci(n - 1)')
        })
      })

      // Verify final results are displayed
      await waitFor(() => {
        expect(screen.getByText(/passed/i)).toBeInTheDocument()
      })
    }, 15000)

    it('should handle execution failures gracefully', async () => {
      mockElectronAPI.loadKata.mockResolvedValue(mockKataDetails)
      
      const failedResult: ExecutionResult = {
        success: false,
        output: '',
        errors: 'SyntaxError: Unexpected token',
        testResults: [],
        duration: 50
      }

      mockElectronAPI.executeCode.mockResolvedValue(failedResult)

      render(<App />)

      // Select kata and wait for load
      await waitFor(() => {
        expect(screen.getByText('Fibonacci Sequence')).toBeInTheDocument()
      })
      await user.click(screen.getByText('Fibonacci Sequence'))

      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: /code editor/i })).toBeInTheDocument()
      })

      // Run with invalid code
      const runButton = screen.getByRole('button', { name: /run/i })
      await user.click(runButton)

      // Verify error is displayed
      await waitFor(() => {
        expect(screen.getByText('SyntaxError: Unexpected token')).toBeInTheDocument()
      })
    })
  })

  describe('Explanation Kata Workflow', () => {
    it('should complete explanation kata workflow with AI judging', async () => {
      mockElectronAPI.loadKata.mockResolvedValue(mockExplanationDetails)
      
      const aiJudgment: AIJudgment = {
        scores: {
          clarity: 85,
          correctness: 90,
          completeness: 80
        },
        feedback: 'Good explanation with clear examples. Could benefit from more edge cases.',
        pass: true,
        totalScore: 85
      }

      mockElectronAPI.judgeExplanation.mockResolvedValue(aiJudgment)

      render(<App />)

      // Select explanation kata
      await waitFor(() => {
        expect(screen.getByText('Explain Recursion')).toBeInTheDocument()
      })
      await user.click(screen.getByText('Explain Recursion'))

      // Wait for kata to load
      await waitFor(() => {
        expect(screen.getByText('Explain what recursion is and provide examples.')).toBeInTheDocument()
      })

      // Write explanation
      const codeEditor = screen.getByRole('textbox', { name: /code editor/i })
      const explanation = `# Recursion

Recursion is a programming technique where a function calls itself to solve a problem.

## Key Components
1. Base case - stops the recursion
2. Recursive case - function calls itself

## Example
\`\`\`javascript
function factorial(n) {
  if (n <= 1) return 1; // base case
  return n * factorial(n - 1); // recursive case
}
\`\`\``

      await user.clear(codeEditor)
      await user.type(codeEditor, explanation)

      // Submit for AI judging
      const submitButton = screen.getByRole('button', { name: /submit/i })
      await user.click(submitButton)

      // Verify AI judging is called
      await waitFor(() => {
        expect(mockElectronAPI.judgeExplanation).toHaveBeenCalledWith(
          expect.stringContaining('Recursion is a programming technique'),
          mockExplanationDetails.rubric,
          'Explain Recursion',
          expect.stringContaining('Explain what recursion is')
        )
      })

      // Verify AI judgment results are displayed
      await waitFor(() => {
        expect(screen.getByText(/Good explanation with clear examples/)).toBeInTheDocument()
        expect(screen.getByText(/85/)).toBeInTheDocument() // Total score
      })

      // Verify attempt is saved
      expect(mockElectronAPI.saveAttempt).toHaveBeenCalledWith({
        kataId: 'explain-recursion',
        timestamp: expect.any(String),
        language: 'md',
        status: 'passed',
        score: 85,
        durationMs: 0,
        code: expect.stringContaining('Recursion is a programming technique')
      })
    })
  })

  describe('Auto-continue Functionality', () => {
    it('should automatically continue to next kata after successful completion', async () => {
      // Setup auto-continue enabled
      mockElectronAPI.getSettings.mockResolvedValue({ autoContinueEnabled: true })
      mockElectronAPI.loadKata.mockResolvedValue(mockKataDetails)
      
      const successResult: ExecutionResult = {
        success: true,
        output: 'All tests passed',
        errors: '',
        testResults: [{ name: 'test', passed: true }],
        duration: 100
      }

      mockElectronAPI.executeCode.mockResolvedValue(successResult)
      mockElectronAPI.getRandomKata.mockResolvedValue(mockExplanationKata)

      render(<App />)

      // Wait for app to load with auto-continue enabled
      await waitFor(() => {
        expect(screen.getByRole('checkbox', { name: /auto-continue/i })).toBeChecked()
      })

      // Select and complete a kata
      await user.click(screen.getByText('Fibonacci Sequence'))
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /submit/i }))

      // Wait for auto-continue to trigger
      await waitFor(() => {
        expect(mockElectronAPI.getRandomKata).toHaveBeenCalledWith(
          'fibonacci-js',
          expect.any(Object) // filters
        )
      }, { timeout: 3000 })

      // Verify notification is shown
      await waitFor(() => {
        expect(screen.getByText(/continuing to/i)).toBeInTheDocument()
      })
    })

    it('should allow toggling auto-continue setting', async () => {
      mockElectronAPI.getSettings.mockResolvedValue({ autoContinueEnabled: false })

      render(<App />)

      await waitFor(() => {
        const toggle = screen.getByRole('checkbox', { name: /auto-continue/i })
        expect(toggle).not.toBeChecked()
      })

      // Toggle auto-continue on
      const toggle = screen.getByRole('checkbox', { name: /auto-continue/i })
      await user.click(toggle)

      expect(mockElectronAPI.setAutoContinueEnabled).toHaveBeenCalledWith(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle kata loading failures gracefully', async () => {
      mockElectronAPI.loadKata.mockRejectedValue(new Error('Failed to load kata'))

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('Fibonacci Sequence')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Fibonacci Sequence'))

      // Should show fallback content
      await waitFor(() => {
        expect(screen.getByText(/Failed to load kata details/)).toBeInTheDocument()
      })
    })

    it('should handle execution timeouts', async () => {
      mockElectronAPI.loadKata.mockResolvedValue(mockKataDetails)
      mockElectronAPI.executeCode.mockRejectedValue(new Error('Execution timeout'))

      render(<App />)

      await user.click(screen.getByText('Fibonacci Sequence'))
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /run/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /run/i }))

      await waitFor(() => {
        expect(screen.getByText(/Execution failed: Error: Execution timeout/)).toBeInTheDocument()
      })
    })
  })
})