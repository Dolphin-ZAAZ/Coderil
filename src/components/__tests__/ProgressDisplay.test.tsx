import { render, screen, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { ProgressDisplay } from '../ProgressDisplay'

// Mock the electronAPI
const mockElectronAPI = {
  getProgress: vi.fn(),
  getKataStats: vi.fn(),
  saveCode: vi.fn()
}

// Mock window.electronAPI
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true
})

describe('ProgressDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state initially', () => {
    mockElectronAPI.getProgress.mockImplementation(() => new Promise(() => {})) // Never resolves
    mockElectronAPI.getKataStats.mockImplementation(() => new Promise(() => {})) // Never resolves

    render(<ProgressDisplay kataId="test-kata" />)
    
    expect(screen.getByText('Loading progress...')).toBeInTheDocument()
  })

  it('shows empty state when no progress data exists', async () => {
    mockElectronAPI.getProgress.mockResolvedValue(null)
    mockElectronAPI.getKataStats.mockResolvedValue(null)

    render(<ProgressDisplay kataId="test-kata" />)
    
    await waitFor(() => {
      expect(screen.getByText('No progress data yet')).toBeInTheDocument()
    })
  })

  it('displays progress stats when data exists', async () => {
    const mockProgress = {
      kataId: 'test-kata',
      lastCode: 'console.log("test")',
      bestScore: 85,
      lastStatus: 'passed',
      attemptsCount: 3,
      lastAttempt: new Date('2024-01-01')
    }

    const mockStats = {
      totalAttempts: 3,
      bestScore: 85,
      lastStatus: 'passed',
      averageScore: 75,
      passedAttempts: 2
    }

    mockElectronAPI.getProgress.mockResolvedValue(mockProgress)
    mockElectronAPI.getKataStats.mockResolvedValue(mockStats)

    render(<ProgressDisplay kataId="test-kata" />)
    
    await waitFor(() => {
      expect(screen.getByText('Progress')).toBeInTheDocument()
      expect(screen.getByText('85%')).toBeInTheDocument() // Best score
      expect(screen.getByText('3')).toBeInTheDocument() // Attempts
      expect(screen.getByText('2')).toBeInTheDocument() // Passed attempts
      expect(screen.getByText('75%')).toBeInTheDocument() // Average score
      // Use getAllByText for "Passed" since it appears in both label and value
      expect(screen.getAllByText('Passed')).toHaveLength(2)
    })
  })

  it('shows success indicator when kata has been passed', async () => {
    const mockStats = {
      totalAttempts: 2,
      bestScore: 95,
      lastStatus: 'passed',
      averageScore: 85,
      passedAttempts: 1
    }

    mockElectronAPI.getProgress.mockResolvedValue({})
    mockElectronAPI.getKataStats.mockResolvedValue(mockStats)

    render(<ProgressDisplay kataId="test-kata" />)
    
    await waitFor(() => {
      expect(screen.getByText('Kata completed!')).toBeInTheDocument()
      expect(screen.getByText('🎉')).toBeInTheDocument()
    })
  })

  it('shows reset button when showResetButton is true', async () => {
    const mockStats = {
      totalAttempts: 1,
      bestScore: 50,
      lastStatus: 'failed',
      averageScore: 50,
      passedAttempts: 0
    }

    mockElectronAPI.getProgress.mockResolvedValue({})
    mockElectronAPI.getKataStats.mockResolvedValue(mockStats)

    render(<ProgressDisplay kataId="test-kata" showResetButton={true} />)
    
    await waitFor(() => {
      expect(screen.getByText('Reset')).toBeInTheDocument()
    })
  })

  it('shows no attempts message when no attempts exist', async () => {
    const mockStats = {
      totalAttempts: 0,
      bestScore: 0,
      lastStatus: 'not_attempted',
      averageScore: 0,
      passedAttempts: 0
    }

    mockElectronAPI.getProgress.mockResolvedValue(null)
    mockElectronAPI.getKataStats.mockResolvedValue(mockStats)

    render(<ProgressDisplay kataId="test-kata" />)
    
    await waitFor(() => {
      expect(screen.getByText(/No attempts yet/)).toBeInTheDocument()
    })
  })

  it('handles error state gracefully', async () => {
    mockElectronAPI.getProgress.mockRejectedValue(new Error('Database error'))
    mockElectronAPI.getKataStats.mockRejectedValue(new Error('Database error'))

    render(<ProgressDisplay kataId="test-kata" />)
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load progress data')).toBeInTheDocument()
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })
  })
})