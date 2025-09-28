import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../App'
import type { Kata, KataDetails, Progress, Attempt } from '../../types'

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

describe('Progress Persistence Integration Tests', () => {
  const user = userEvent.setup()

  const mockKata: Kata = {
    slug: 'test-kata',
    title: 'Test Kata',
    language: 'js',
    type: 'code',
    difficulty: 'easy',
    tags: ['test'],
    path: '/katas/test-kata'
  }

  const mockKataDetails: KataDetails = {
    ...mockKata,
    statement: '# Test Kata\n\nA test kata for progress persistence.',
    metadata: {
      slug: 'test-kata',
      title: 'Test Kata',
      language: 'js',
      type: 'code',
      difficulty: 'easy',
      tags: ['test'],
      entry: 'entry.js',
      test: { kind: 'programmatic', file: 'tests.js' },
      timeout_ms: 5000
    },
    starterCode: 'function solution() {\n  // Your code here\n}',
    testConfig: {
      kind: 'programmatic',
      publicTestFile: 'tests.js',
      timeoutMs: 5000
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockElectronAPI.getKatas.mockResolvedValue([mockKata])
    mockElectronAPI.getSettings.mockResolvedValue({ autoContinueEnabled: false })
    mockElectronAPI.loadKata.mockResolvedValue(mockKataDetails)
    mockElectronAPI.saveCode.mockResolvedValue(undefined)
    mockElectronAPI.saveAttempt.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Code Persistence', () => {
    it('should save code automatically as user types', async () => {
      mockElectronAPI.loadCode.mockResolvedValue(null)
      mockElectronAPI.getProgress.mockResolvedValue({
        kataId: 'test-kata',
        lastCode: '',
        bestScore: 0,
        lastStatus: 'not_attempted',
        attemptsCount: 0,
        lastAttempt: new Date()
      })

      render(<App />)

      // Select kata
      await waitFor(() => {
        expect(screen.getByText('Test Kata')).toBeInTheDocument()
      })
      await user.click(screen.getByText('Test Kata'))

      // Wait for editor to load
      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: /code editor/i })).toBeInTheDocument()
      })

      // Type code
      const editor = screen.getByRole('textbox', { name: /code editor/i })
      const newCode = 'function solution() { return 42; }'
      
      await user.clear(editor)
      await user.type(editor, newCode)

      // Verify code is saved (with debouncing, so wait a bit)
      await waitFor(() => {
        expect(mockElectronAPI.saveCode).toHaveBeenCalledWith('test-kata', expect.stringContaining('return 42'))
      }, { timeout: 2000 })
    })

    it('should restore previously saved code on kata selection', async () => {
      const savedCode = 'function solution() { return "saved code"; }'
      mockElectronAPI.loadCode.mockResolvedValue(savedCode)
      mockElectronAPI.getProgress.mockResolvedValue({
        kataId: 'test-kata',
        lastCode: savedCode,
        bestScore: 75,
        lastStatus: 'passed',
        attemptsCount: 3,
        lastAttempt: new Date()
      })

      render(<App />)

      // Select kata
      await user.click(screen.getByText('Test Kata'))

      // Verify saved code is loaded
      await waitFor(() => {
        expect(mockElectronAPI.loadCode).toHaveBeenCalledWith('test-kata')
      })

      // Verify code appears in editor
      await waitFor(() => {
        const editor = screen.getByRole('textbox', { name: /code editor/i })
        expect(editor).toHaveValue(savedCode)
      })
    })

    it('should clear code when reset button is clicked', async () => {
      const savedCode = 'function solution() { return "saved code"; }'
      mockElectronAPI.loadCode.mockResolvedValue(savedCode)
      mockElectronAPI.getProgress.mockResolvedValue({
        kataId: 'test-kata',
        lastCode: savedCode,
        bestScore: 75,
        lastStatus: 'passed',
        attemptsCount: 3,
        lastAttempt: new Date()
      })

      render(<App />)

      await user.click(screen.getByText('Test Kata'))

      // Wait for progress display to show reset button
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument()
      })

      // Click reset
      await user.click(screen.getByRole('button', { name: /reset/i }))

      // Verify starter code is restored
      await waitFor(() => {
        const editor = screen.getByRole('textbox', { name: /code editor/i })
        expect(editor).toHaveValue(mockKataDetails.starterCode)
      })

      // Verify starter code is saved
      expect(mockElectronAPI.saveCode).toHaveBeenCalledWith('test-kata', mockKataDetails.starterCode)
    })
  })

  describe('Attempt History', () => {
    it('should save attempt after successful submission', async () => {
      mockElectronAPI.loadCode.mockResolvedValue(null)
      mockElectronAPI.getProgress.mockResolvedValue({
        kataId: 'test-kata',
        lastCode: '',
        bestScore: 0,
        lastStatus: 'not_attempted',
        attemptsCount: 0,
        lastAttempt: new Date()
      })

      const successResult = {
        success: true,
        output: 'All tests passed',
        errors: '',
        testResults: [{ name: 'test1', passed: true }],
        duration: 150
      }

      mockElectronAPI.executeCode.mockResolvedValue(successResult)

      render(<App />)

      await user.click(screen.getByText('Test Kata'))
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /submit/i }))

      // Verify attempt is saved with correct data
      await waitFor(() => {
        expect(mockElectronAPI.saveAttempt).toHaveBeenCalledWith({
          kataId: 'test-kata',
          timestamp: expect.any(String),
          language: 'js',
          status: 'passed',
          score: expect.any(Number),
          durationMs: expect.any(Number),
          code: expect.any(String)
        })
      })
    })

    it('should save attempt after failed submission', async () => {
      mockElectronAPI.loadCode.mockResolvedValue(null)
      mockElectronAPI.getProgress.mockResolvedValue({
        kataId: 'test-kata',
        lastCode: '',
        bestScore: 0,
        lastStatus: 'not_attempted',
        attemptsCount: 0,
        lastAttempt: new Date()
      })

      const failedResult = {
        success: false,
        output: '',
        errors: 'Test failed',
        testResults: [{ name: 'test1', passed: false, message: 'Expected 42, got undefined' }],
        duration: 100
      }

      mockElectronAPI.executeCode.mockResolvedValue(failedResult)

      render(<App />)

      await user.click(screen.getByText('Test Kata'))
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /submit/i }))

      // Verify failed attempt is saved
      await waitFor(() => {
        expect(mockElectronAPI.saveAttempt).toHaveBeenCalledWith({
          kataId: 'test-kata',
          timestamp: expect.any(String),
          language: 'js',
          status: 'failed',
          score: expect.any(Number),
          durationMs: expect.any(Number),
          code: expect.any(String)
        })
      })
    })
  })

  describe('Progress Display', () => {
    it('should display progress information for attempted kata', async () => {
      const progressData: Progress = {
        kataId: 'test-kata',
        lastCode: 'function solution() { return 42; }',
        bestScore: 85,
        lastStatus: 'passed',
        attemptsCount: 5,
        lastAttempt: new Date('2024-01-15T10:30:00Z')
      }

      mockElectronAPI.loadCode.mockResolvedValue(progressData.lastCode)
      mockElectronAPI.getProgress.mockResolvedValue(progressData)

      render(<App />)

      await user.click(screen.getByText('Test Kata'))

      // Verify progress information is displayed
      await waitFor(() => {
        expect(screen.getByText(/Best Score:/)).toBeInTheDocument()
        expect(screen.getByText(/85/)).toBeInTheDocument()
        expect(screen.getByText(/Attempts:/)).toBeInTheDocument()
        expect(screen.getByText(/5/)).toBeInTheDocument()
        expect(screen.getByText(/Status:/)).toBeInTheDocument()
        expect(screen.getByText(/passed/i)).toBeInTheDocument()
      })
    })

    it('should display default progress for new kata', async () => {
      const defaultProgress: Progress = {
        kataId: 'test-kata',
        lastCode: '',
        bestScore: 0,
        lastStatus: 'not_attempted',
        attemptsCount: 0,
        lastAttempt: new Date()
      }

      mockElectronAPI.loadCode.mockResolvedValue(null)
      mockElectronAPI.getProgress.mockResolvedValue(defaultProgress)

      render(<App />)

      await user.click(screen.getByText('Test Kata'))

      // Verify default progress is shown
      await waitFor(() => {
        expect(screen.getByText(/Best Score:/)).toBeInTheDocument()
        expect(screen.getByText(/0/)).toBeInTheDocument()
        expect(screen.getByText(/Attempts:/)).toBeInTheDocument()
        expect(screen.getByText(/0/)).toBeInTheDocument()
        expect(screen.getByText(/not attempted/i)).toBeInTheDocument()
      })
    })

    it('should update progress display after successful submission', async () => {
      // Start with no progress
      mockElectronAPI.loadCode.mockResolvedValue(null)
      mockElectronAPI.getProgress
        .mockResolvedValueOnce({
          kataId: 'test-kata',
          lastCode: '',
          bestScore: 0,
          lastStatus: 'not_attempted',
          attemptsCount: 0,
          lastAttempt: new Date()
        })
        .mockResolvedValueOnce({
          kataId: 'test-kata',
          lastCode: 'function solution() { return 42; }',
          bestScore: 90,
          lastStatus: 'passed',
          attemptsCount: 1,
          lastAttempt: new Date()
        })

      const successResult = {
        success: true,
        output: 'All tests passed',
        errors: '',
        testResults: [{ name: 'test1', passed: true }],
        duration: 150
      }

      mockElectronAPI.executeCode.mockResolvedValue(successResult)

      render(<App />)

      await user.click(screen.getByText('Test Kata'))

      // Initial state
      await waitFor(() => {
        expect(screen.getByText(/0/)).toBeInTheDocument() // Best score 0
      })

      // Submit solution
      await user.click(screen.getByRole('button', { name: /submit/i }))

      // Progress should update after submission
      await waitFor(() => {
        expect(screen.getByText(/90/)).toBeInTheDocument() // Updated best score
        expect(screen.getByText(/passed/i)).toBeInTheDocument() // Updated status
      })
    })
  })

  describe('Application Restart Simulation', () => {
    it('should restore state after simulated restart', async () => {
      // Simulate app restart by re-rendering with saved data
      const savedCode = 'function solution() { return "persisted"; }'
      const savedProgress: Progress = {
        kataId: 'test-kata',
        lastCode: savedCode,
        bestScore: 95,
        lastStatus: 'passed',
        attemptsCount: 7,
        lastAttempt: new Date('2024-01-15T15:45:00Z')
      }

      mockElectronAPI.loadCode.mockResolvedValue(savedCode)
      mockElectronAPI.getProgress.mockResolvedValue(savedProgress)

      // First render (simulating fresh app start)
      const { unmount } = render(<App />)

      await user.click(screen.getByText('Test Kata'))

      // Verify data is loaded from persistence
      await waitFor(() => {
        expect(mockElectronAPI.loadCode).toHaveBeenCalledWith('test-kata')
        expect(mockElectronAPI.getProgress).toHaveBeenCalledWith('test-kata')
      })

      // Verify UI shows persisted data
      await waitFor(() => {
        const editor = screen.getByRole('textbox', { name: /code editor/i })
        expect(editor).toHaveValue(savedCode)
        expect(screen.getByText(/95/)).toBeInTheDocument() // Best score
        expect(screen.getByText(/7/)).toBeInTheDocument() // Attempts
      })

      // Simulate app restart
      unmount()

      // Re-render app (simulating restart)
      render(<App />)

      await user.click(screen.getByText('Test Kata'))

      // Verify data is loaded again after restart
      await waitFor(() => {
        expect(mockElectronAPI.loadCode).toHaveBeenCalledTimes(2) // Called again after restart
        expect(mockElectronAPI.getProgress).toHaveBeenCalledTimes(2)
      })

      // Verify UI still shows persisted data
      await waitFor(() => {
        const editor = screen.getByRole('textbox', { name: /code editor/i })
        expect(editor).toHaveValue(savedCode)
        expect(screen.getByText(/95/)).toBeInTheDocument()
        expect(screen.getByText(/7/)).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling in Persistence', () => {
    it('should handle save failures gracefully', async () => {
      mockElectronAPI.loadCode.mockResolvedValue(null)
      mockElectronAPI.getProgress.mockResolvedValue({
        kataId: 'test-kata',
        lastCode: '',
        bestScore: 0,
        lastStatus: 'not_attempted',
        attemptsCount: 0,
        lastAttempt: new Date()
      })

      // Mock save failure
      mockElectronAPI.saveCode.mockRejectedValue(new Error('Save failed'))

      render(<App />)

      await user.click(screen.getByText('Test Kata'))

      const editor = screen.getByRole('textbox', { name: /code editor/i })
      await user.type(editor, 'new code')

      // Should not crash the app even if save fails
      await waitFor(() => {
        expect(mockElectronAPI.saveCode).toHaveBeenCalled()
      })

      // App should still be functional
      expect(screen.getByText('Test Kata')).toBeInTheDocument()
    })

    it('should handle load failures gracefully', async () => {
      mockElectronAPI.loadCode.mockRejectedValue(new Error('Load failed'))
      mockElectronAPI.getProgress.mockRejectedValue(new Error('Progress load failed'))

      render(<App />)

      await user.click(screen.getByText('Test Kata'))

      // Should fall back to starter code
      await waitFor(() => {
        const editor = screen.getByRole('textbox', { name: /code editor/i })
        expect(editor).toHaveValue(mockKataDetails.starterCode)
      })

      // App should still be functional
      expect(screen.getByText('Test Kata')).toBeInTheDocument()
    })
  })
})