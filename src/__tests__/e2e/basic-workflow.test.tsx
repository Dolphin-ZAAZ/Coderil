import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../App'
import type { Kata, KataDetails } from '../../types'

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

describe('Basic Workflow E2E Test', () => {
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
    statement: '# Test Kata\n\nA simple test kata.',
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
    mockElectronAPI.loadCode.mockResolvedValue(null)
    mockElectronAPI.saveCode.mockResolvedValue(undefined)
    mockElectronAPI.getProgress.mockResolvedValue({
      kataId: 'test-kata',
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

  it('should load app and display kata list', async () => {
    render(<App />)

    // Wait for katas to load
    await waitFor(() => {
      expect(screen.getByText('Test Kata')).toBeInTheDocument()
    }, { timeout: 5000 })

    // Verify app header
    expect(screen.getByText('Code Kata App')).toBeInTheDocument()
    
    // Verify kata is displayed
    expect(screen.getByText('Test Kata')).toBeInTheDocument()
    expect(screen.getByText('easy')).toBeInTheDocument()
    expect(screen.getByText('JS')).toBeInTheDocument()
  })

  it('should select kata and load details', async () => {
    render(<App />)

    // Wait for katas to load
    await waitFor(() => {
      expect(screen.getByText('Test Kata')).toBeInTheDocument()
    })

    // Click on kata
    await user.click(screen.getByText('Test Kata'))

    // Verify kata details are loaded
    await waitFor(() => {
      expect(mockElectronAPI.loadKata).toHaveBeenCalledWith('test-kata')
    })

    // Verify statement is displayed
    await waitFor(() => {
      expect(screen.getByText('A simple test kata.')).toBeInTheDocument()
    })
  })

  it('should handle basic code execution', async () => {
    const mockResult = {
      success: true,
      output: 'Test passed',
      errors: '',
      testResults: [{ name: 'test1', passed: true }],
      duration: 100
    }

    mockElectronAPI.executeCode.mockResolvedValue(mockResult)

    render(<App />)

    // Select kata
    await waitFor(() => {
      expect(screen.getByText('Test Kata')).toBeInTheDocument()
    })
    await user.click(screen.getByText('Test Kata'))

    // Wait for Run button to appear
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /run/i })).toBeInTheDocument()
    })

    // Click Run
    await user.click(screen.getByRole('button', { name: /run/i }))

    // Verify execution was called
    await waitFor(() => {
      expect(mockElectronAPI.executeCode).toHaveBeenCalled()
    })

    // Verify results are displayed
    await waitFor(() => {
      expect(screen.getByText('Test passed')).toBeInTheDocument()
    })
  })

  it('should toggle auto-continue setting', async () => {
    render(<App />)

    // Wait for app to load
    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: /auto-continue/i })).toBeInTheDocument()
    })

    const toggle = screen.getByRole('checkbox', { name: /auto-continue/i })
    expect(toggle).not.toBeChecked()

    // Toggle on
    await user.click(toggle)

    expect(mockElectronAPI.setAutoContinueEnabled).toHaveBeenCalledWith(true)
  })
})