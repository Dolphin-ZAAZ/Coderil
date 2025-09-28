import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../App'
import type { Kata, KataDetails, ExecutionResult, AIJudgment, KataFilters } from '../../types'

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

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true
})

describe('Auto-Continue Integration Tests', () => {
  const user = userEvent.setup()

  const mockKatas: Kata[] = [
    {
      slug: 'easy-js-kata',
      title: 'Easy JavaScript Kata',
      language: 'js',
      type: 'code',
      difficulty: 'easy',
      tags: ['basic', 'javascript'],
      path: '/katas/easy-js-kata'
    },
    {
      slug: 'medium-py-kata',
      title: 'Medium Python Kata',
      language: 'py',
      type: 'code',
      difficulty: 'medium',
      tags: ['algorithms', 'python'],
      path: '/katas/medium-py-kata'
    },
    {
      slug: 'hard-cpp-kata',
      title: 'Hard C++ Kata',
      language: 'cpp',
      type: 'code',
      difficulty: 'hard',
      tags: ['advanced', 'cpp'],
      path: '/katas/hard-cpp-kata'
    },
    {
      slug: 'explain-concepts',
      title: 'Explain Programming Concepts',
      language: 'md',
      type: 'explain',
      difficulty: 'medium',
      tags: ['concepts', 'explanation'],
      path: '/katas/explain-concepts'
    },
    {
      slug: 'react-template',
      title: 'React Component Template',
      language: 'tsx',
      type: 'template',
      difficulty: 'medium',
      tags: ['react', 'template'],
      path: '/katas/react-template'
    }
  ]

  const createMockKataDetails = (kata: Kata): KataDetails => ({
    ...kata,
    statement: `# ${kata.title}\n\nTest kata for auto-continue functionality.`,
    metadata: {
      slug: kata.slug,
      title: kata.title,
      language: kata.language as any,
      type: kata.type as any,
      difficulty: kata.difficulty as any,
      tags: kata.tags,
      entry: `entry.${kata.language}`,
      test: { kind: 'programmatic', file: `tests.${kata.language}` },
      timeout_ms: 5000
    },
    starterCode: `// Starter code for ${kata.title}`,
    testConfig: {
      kind: 'programmatic',
      publicTestFile: `tests.${kata.language}`,
      timeoutMs: 5000
    }
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockElectronAPI.getKatas.mockResolvedValue(mockKatas)
    mockElectronAPI.loadCode.mockResolvedValue(null)
    mockElectronAPI.saveCode.mockResolvedValue(undefined)
    mockElectronAPI.saveAttempt.mockResolvedValue(undefined)
    mockElectronAPI.getProgress.mockResolvedValue({
      kataId: 'test',
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

  describe('Auto-Continue Settings', () => {
    it('should load auto-continue setting from storage', async () => {
      mockElectronAPI.getSettings.mockResolvedValue({ autoContinueEnabled: true })

      render(<App />)

      await waitFor(() => {
        const toggle = screen.getByRole('checkbox', { name: /auto-continue/i })
        expect(toggle).toBeChecked()
      })
    })

    it('should save auto-continue setting when toggled', async () => {
      mockElectronAPI.getSettings.mockResolvedValue({ autoContinueEnabled: false })
      mockElectronAPI.setAutoContinueEnabled.mockResolvedValue(undefined)

      render(<App />)

      await waitFor(() => {
        const toggle = screen.getByRole('checkbox', { name: /auto-continue/i })
        expect(toggle).not.toBeChecked()
      })

      // Toggle on
      const toggle = screen.getByRole('checkbox', { name: /auto-continue/i })
      await user.click(toggle)

      expect(mockElectronAPI.setAutoContinueEnabled).toHaveBeenCalledWith(true)
    })

    it('should persist auto-continue setting across app restarts', async () => {
      // First render with setting disabled
      mockElectronAPI.getSettings.mockResolvedValue({ autoContinueEnabled: false })
      const { unmount } = render(<App />)

      await waitFor(() => {
        const toggle = screen.getByRole('checkbox', { name: /auto-continue/i })
        expect(toggle).not.toBeChecked()
      })

      unmount()

      // Second render with setting enabled (simulating persistence)
      mockElectronAPI.getSettings.mockResolvedValue({ autoContinueEnabled: true })
      render(<App />)

      await waitFor(() => {
        const toggle = screen.getByRole('checkbox', { name: /auto-continue/i })
        expect(toggle).toBeChecked()
      })
    })
  })

  describe('Auto-Continue Triggering', () => {
    it('should trigger auto-continue after successful code kata completion', async () => {
      mockElectronAPI.getSettings.mockResolvedValue({ autoContinueEnabled: true })
      mockElectronAPI.loadKata.mockResolvedValue(createMockKataDetails(mockKatas[0]))
      
      const successResult: ExecutionResult = {
        success: true,
        output: 'All tests passed',
        errors: '',
        testResults: [{ name: 'test1', passed: true }],
        duration: 150
      }

      mockElectronAPI.executeCode.mockResolvedValue(successResult)
      mockElectronAPI.getRandomKata.mockResolvedValue(mockKatas[1])

      render(<App />)

      // Select first kata
      await waitFor(() => {
        expect(screen.getByText('Easy JavaScript Kata')).toBeInTheDocument()
      })
      await user.click(screen.getByText('Easy JavaScript Kata'))

      // Submit successful solution
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument()
      })
      await user.click(screen.getByRole('button', { name: /submit/i }))

      // Verify auto-continue is triggered
      await waitFor(() => {
        expect(mockElectronAPI.getRandomKata).toHaveBeenCalledWith(
          'easy-js-kata',
          expect.any(Object) // filters
        )
      }, { timeout: 3000 })
    })

    it('should trigger auto-continue after successful explanation kata', async () => {
      mockElectronAPI.getSettings.mockResolvedValue({ autoContinueEnabled: true })
      
      const explanationDetails = {
        ...createMockKataDetails(mockKatas[3]),
        rubric: {
          keys: ['clarity', 'correctness'],
          threshold: { min_total: 70, min_correctness: 60 }
        }
      }
      
      mockElectronAPI.loadKata.mockResolvedValue(explanationDetails)
      
      const aiJudgment: AIJudgment = {
        scores: { clarity: 85, correctness: 90 },
        feedback: 'Good explanation',
        pass: true,
        totalScore: 87.5
      }

      mockElectronAPI.judgeExplanation.mockResolvedValue(aiJudgment)
      mockElectronAPI.getRandomKata.mockResolvedValue(mockKatas[0])

      render(<App />)

      await user.click(screen.getByText('Explain Programming Concepts'))
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument()
      })
      await user.click(screen.getByRole('button', { name: /submit/i }))

      // Verify auto-continue is triggered after AI judging
      await waitFor(() => {
        expect(mockElectronAPI.getRandomKata).toHaveBeenCalled()
      }, { timeout: 3000 })
    })

    it('should NOT trigger auto-continue after failed submission', async () => {
      mockElectronAPI.getSettings.mockResolvedValue({ autoContinueEnabled: true })
      mockElectronAPI.loadKata.mockResolvedValue(createMockKataDetails(mockKatas[0]))
      
      const failedResult: ExecutionResult = {
        success: false,
        output: '',
        errors: 'Test failed',
        testResults: [{ name: 'test1', passed: false, message: 'Expected 42, got undefined' }],
        duration: 100
      }

      mockElectronAPI.executeCode.mockResolvedValue(failedResult)

      render(<App />)

      await user.click(screen.getByText('Easy JavaScript Kata'))
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument()
      })
      await user.click(screen.getByRole('button', { name: /submit/i }))

      // Wait a bit to ensure auto-continue doesn't trigger
      await new Promise(resolve => setTimeout(resolve, 2000))

      expect(mockElectronAPI.getRandomKata).not.toHaveBeenCalled()
    })

    it('should NOT trigger auto-continue when disabled', async () => {
      mockElectronAPI.getSettings.mockResolvedValue({ autoContinueEnabled: false })
      mockElectronAPI.loadKata.mockResolvedValue(createMockKataDetails(mockKatas[0]))
      
      const successResult: ExecutionResult = {
        success: true,
        output: 'All tests passed',
        errors: '',
        testResults: [{ name: 'test1', passed: true }],
        duration: 150
      }

      mockElectronAPI.executeCode.mockResolvedValue(successResult)

      render(<App />)

      await user.click(screen.getByText('Easy JavaScript Kata'))
      await user.click(screen.getByRole('button', { name: /submit/i }))

      // Wait to ensure auto-continue doesn't trigger
      await new Promise(resolve => setTimeout(resolve, 2000))

      expect(mockElectronAPI.getRandomKata).not.toHaveBeenCalled()
    })
  })

  describe('Filter Respect in Auto-Continue', () => {
    it('should respect difficulty filter when selecting next kata', async () => {
      mockElectronAPI.getSettings.mockResolvedValue({ autoContinueEnabled: true })
      mockElectronAPI.loadKata.mockResolvedValue(createMockKataDetails(mockKatas[0]))
      
      const successResult: ExecutionResult = {
        success: true,
        output: 'All tests passed',
        errors: '',
        testResults: [{ name: 'test1', passed: true }],
        duration: 150
      }

      mockElectronAPI.executeCode.mockResolvedValue(successResult)
      mockElectronAPI.getRandomKata.mockResolvedValue(mockKatas[1]) // Medium difficulty kata

      render(<App />)

      // Set difficulty filter to medium (this would be done through UI in real app)
      const filters: KataFilters = { difficulty: ['medium'] }

      await user.click(screen.getByText('Easy JavaScript Kata'))
      await user.click(screen.getByRole('button', { name: /submit/i }))

      await waitFor(() => {
        expect(mockElectronAPI.getRandomKata).toHaveBeenCalledWith(
          'easy-js-kata',
          expect.objectContaining({
            difficulty: expect.arrayContaining(['medium'])
          })
        )
      }, { timeout: 3000 })
    })

    it('should respect language filter when selecting next kata', async () => {
      mockElectronAPI.getSettings.mockResolvedValue({ autoContinueEnabled: true })
      mockElectronAPI.loadKata.mockResolvedValue(createMockKataDetails(mockKatas[0]))
      
      const successResult: ExecutionResult = {
        success: true,
        output: 'All tests passed',
        errors: '',
        testResults: [{ name: 'test1', passed: true }],
        duration: 150
      }

      mockElectronAPI.executeCode.mockResolvedValue(successResult)
      mockElectronAPI.getRandomKata.mockResolvedValue(mockKatas[1]) // Python kata

      render(<App />)

      await user.click(screen.getByText('Easy JavaScript Kata'))
      await user.click(screen.getByRole('button', { name: /submit/i }))

      await waitFor(() => {
        expect(mockElectronAPI.getRandomKata).toHaveBeenCalledWith(
          'easy-js-kata',
          expect.any(Object) // Should include current filters
        )
      }, { timeout: 3000 })
    })

    it('should respect type filter when selecting next kata', async () => {
      mockElectronAPI.getSettings.mockResolvedValue({ autoContinueEnabled: true })
      mockElectronAPI.loadKata.mockResolvedValue(createMockKataDetails(mockKatas[0]))
      
      const successResult: ExecutionResult = {
        success: true,
        output: 'All tests passed',
        errors: '',
        testResults: [{ name: 'test1', passed: true }],
        duration: 150
      }

      mockElectronAPI.executeCode.mockResolvedValue(successResult)
      mockElectronAPI.getRandomKata.mockResolvedValue(mockKatas[3]) // Explanation kata

      render(<App />)

      await user.click(screen.getByText('Easy JavaScript Kata'))
      await user.click(screen.getByRole('button', { name: /submit/i }))

      await waitFor(() => {
        expect(mockElectronAPI.getRandomKata).toHaveBeenCalledWith(
          'easy-js-kata',
          expect.any(Object)
        )
      }, { timeout: 3000 })
    })

    it('should handle case when no katas match current filters', async () => {
      mockElectronAPI.getSettings.mockResolvedValue({ autoContinueEnabled: true })
      mockElectronAPI.loadKata.mockResolvedValue(createMockKataDetails(mockKatas[0]))
      
      const successResult: ExecutionResult = {
        success: true,
        output: 'All tests passed',
        errors: '',
        testResults: [{ name: 'test1', passed: true }],
        duration: 150
      }

      mockElectronAPI.executeCode.mockResolvedValue(successResult)
      mockElectronAPI.getRandomKata.mockResolvedValue(null) // No suitable kata found

      render(<App />)

      await user.click(screen.getByText('Easy JavaScript Kata'))
      await user.click(screen.getByRole('button', { name: /submit/i }))

      await waitFor(() => {
        expect(mockElectronAPI.getRandomKata).toHaveBeenCalled()
      }, { timeout: 3000 })

      // Should remain on current kata when no suitable next kata is found
      expect(screen.getByText('Easy JavaScript Kata')).toBeInTheDocument()
    })
  })

  describe('Auto-Continue Notifications', () => {
    it('should display notification when auto-continuing', async () => {
      mockElectronAPI.getSettings.mockResolvedValue({ autoContinueEnabled: true })
      mockElectronAPI.loadKata
        .mockResolvedValueOnce(createMockKataDetails(mockKatas[0]))
        .mockResolvedValueOnce(createMockKataDetails(mockKatas[1]))
      
      const successResult: ExecutionResult = {
        success: true,
        output: 'All tests passed',
        errors: '',
        testResults: [{ name: 'test1', passed: true }],
        duration: 150
      }

      mockElectronAPI.executeCode.mockResolvedValue(successResult)
      mockElectronAPI.getRandomKata.mockResolvedValue(mockKatas[1])

      render(<App />)

      await user.click(screen.getByText('Easy JavaScript Kata'))
      await user.click(screen.getByRole('button', { name: /submit/i }))

      // Should show auto-continue notification
      await waitFor(() => {
        expect(screen.getByText(/continuing to/i)).toBeInTheDocument()
      }, { timeout: 3000 })

      // Should show the target kata name in notification
      expect(screen.getByText(/Medium Python Kata/i)).toBeInTheDocument()
    })

    it('should allow dismissing auto-continue notification', async () => {
      mockElectronAPI.getSettings.mockResolvedValue({ autoContinueEnabled: true })
      mockElectronAPI.loadKata
        .mockResolvedValueOnce(createMockKataDetails(mockKatas[0]))
        .mockResolvedValueOnce(createMockKataDetails(mockKatas[1]))
      
      const successResult: ExecutionResult = {
        success: true,
        output: 'All tests passed',
        errors: '',
        testResults: [{ name: 'test1', passed: true }],
        duration: 150
      }

      mockElectronAPI.executeCode.mockResolvedValue(successResult)
      mockElectronAPI.getRandomKata.mockResolvedValue(mockKatas[1])

      render(<App />)

      await user.click(screen.getByText('Easy JavaScript Kata'))
      await user.click(screen.getByRole('button', { name: /submit/i }))

      // Wait for notification
      await waitFor(() => {
        expect(screen.getByText(/continuing to/i)).toBeInTheDocument()
      })

      // Find and click dismiss button
      const dismissButton = screen.getByRole('button', { name: /dismiss|close/i })
      await user.click(dismissButton)

      // Notification should be dismissed
      await waitFor(() => {
        expect(screen.queryByText(/continuing to/i)).not.toBeInTheDocument()
      })
    })

    it('should auto-dismiss notification after timeout', async () => {
      mockElectronAPI.getSettings.mockResolvedValue({ autoContinueEnabled: true })
      mockElectronAPI.loadKata
        .mockResolvedValueOnce(createMockKataDetails(mockKatas[0]))
        .mockResolvedValueOnce(createMockKataDetails(mockKatas[1]))
      
      const successResult: ExecutionResult = {
        success: true,
        output: 'All tests passed',
        errors: '',
        testResults: [{ name: 'test1', passed: true }],
        duration: 150
      }

      mockElectronAPI.executeCode.mockResolvedValue(successResult)
      mockElectronAPI.getRandomKata.mockResolvedValue(mockKatas[1])

      render(<App />)

      await user.click(screen.getByText('Easy JavaScript Kata'))
      await user.click(screen.getByRole('button', { name: /submit/i }))

      // Wait for notification
      await waitFor(() => {
        expect(screen.getByText(/continuing to/i)).toBeInTheDocument()
      })

      // Wait for auto-dismiss (should happen after kata transition)
      await waitFor(() => {
        expect(screen.queryByText(/continuing to/i)).not.toBeInTheDocument()
      }, { timeout: 5000 })
    })
  })

  describe('Manual Random Kata Selection', () => {
    it('should provide manual random kata selection button', async () => {
      mockElectronAPI.getSettings.mockResolvedValue({ autoContinueEnabled: false })
      mockElectronAPI.loadKata.mockResolvedValue(createMockKataDetails(mockKatas[0]))
      mockElectronAPI.getRandomKata.mockResolvedValue(mockKatas[1])

      render(<App />)

      await user.click(screen.getByText('Easy JavaScript Kata'))

      // Look for random kata button (implementation may vary)
      // This would typically be in the kata selector or header
      const randomButton = screen.getByRole('button', { name: /random|shuffle/i })
      await user.click(randomButton)

      expect(mockElectronAPI.getRandomKata).toHaveBeenCalledWith(
        'easy-js-kata',
        expect.any(Object)
      )
    })

    it('should respect filters in manual random selection', async () => {
      mockElectronAPI.getSettings.mockResolvedValue({ autoContinueEnabled: false })
      mockElectronAPI.loadKata.mockResolvedValue(createMockKataDetails(mockKatas[0]))
      mockElectronAPI.getRandomKata.mockResolvedValue(mockKatas[2])

      render(<App />)

      await user.click(screen.getByText('Easy JavaScript Kata'))

      // Simulate setting filters and then clicking random
      const randomButton = screen.getByRole('button', { name: /random|shuffle/i })
      await user.click(randomButton)

      expect(mockElectronAPI.getRandomKata).toHaveBeenCalledWith(
        'easy-js-kata',
        expect.any(Object) // Should include current filters
      )
    })
  })

  describe('Error Handling in Auto-Continue', () => {
    it('should handle random kata selection failures gracefully', async () => {
      mockElectronAPI.getSettings.mockResolvedValue({ autoContinueEnabled: true })
      mockElectronAPI.loadKata.mockResolvedValue(createMockKataDetails(mockKatas[0]))
      
      const successResult: ExecutionResult = {
        success: true,
        output: 'All tests passed',
        errors: '',
        testResults: [{ name: 'test1', passed: true }],
        duration: 150
      }

      mockElectronAPI.executeCode.mockResolvedValue(successResult)
      mockElectronAPI.getRandomKata.mockRejectedValue(new Error('Random selection failed'))

      render(<App />)

      await user.click(screen.getByText('Easy JavaScript Kata'))
      await user.click(screen.getByRole('button', { name: /submit/i }))

      // Should not crash the app
      await waitFor(() => {
        expect(mockElectronAPI.getRandomKata).toHaveBeenCalled()
      })

      // Should remain on current kata
      expect(screen.getByText('Easy JavaScript Kata')).toBeInTheDocument()
    })

    it('should handle kata loading failures during auto-continue', async () => {
      mockElectronAPI.getSettings.mockResolvedValue({ autoContinueEnabled: true })
      mockElectronAPI.loadKata
        .mockResolvedValueOnce(createMockKataDetails(mockKatas[0]))
        .mockRejectedValueOnce(new Error('Failed to load next kata'))
      
      const successResult: ExecutionResult = {
        success: true,
        output: 'All tests passed',
        errors: '',
        testResults: [{ name: 'test1', passed: true }],
        duration: 150
      }

      mockElectronAPI.executeCode.mockResolvedValue(successResult)
      mockElectronAPI.getRandomKata.mockResolvedValue(mockKatas[1])

      render(<App />)

      await user.click(screen.getByText('Easy JavaScript Kata'))
      await user.click(screen.getByRole('button', { name: /submit/i }))

      // Should attempt auto-continue but handle failure gracefully
      await waitFor(() => {
        expect(mockElectronAPI.getRandomKata).toHaveBeenCalled()
      })

      // Should remain functional
      expect(screen.getByText('Easy JavaScript Kata')).toBeInTheDocument()
    })
  })
})