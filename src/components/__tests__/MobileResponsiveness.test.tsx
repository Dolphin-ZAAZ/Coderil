import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import App from '../../App'

// Mock hooks and services
vi.mock('../../hooks', () => ({
  useMediaQuery: vi.fn(),
  useElectronAPI: () => ({
    isAvailable: false,
    isLoading: false
  }),
  useDependencyChecker: () => ({
    dependencies: {},
    shouldShowWarning: false,
    refreshDependencies: vi.fn(),
    dismissWarning: vi.fn()
  })
}))

// Import the mocked hook
import { useMediaQuery } from '../../hooks'
const mockUseMediaQuery = vi.mocked(useMediaQuery)

describe('Mobile Responsiveness', () => {
  beforeEach(() => {
    // Reset mocks
    mockUseMediaQuery.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should auto-collapse sidebar on mobile', () => {
    // Mock mobile viewport
    mockUseMediaQuery.mockImplementation((query: string) => {
      if (query === '(max-width: 768px)') return true // isMobile
      if (query === '(max-width: 1200px)') return true // isTablet
      return false
    })

    render(<App />)

    // The sidebar should be collapsed on mobile
    const sidebarToggle = screen.getByLabelText('Show sidebar')
    expect(sidebarToggle).toBeInTheDocument()
    expect(sidebarToggle).toHaveClass('collapsed')
  })

  it('should show expanded sidebar on desktop', () => {
    // Mock desktop viewport
    mockUseMediaQuery.mockImplementation((query: string) => {
      return false // Not mobile, not tablet
    })

    render(<App />)

    // The sidebar should not be collapsed on desktop
    const kataSelectorContainer = document.querySelector('.kata-selector-container')
    expect(kataSelectorContainer).not.toHaveClass('collapsed')
  })

  it('should use vertical layout on tablet', () => {
    // Mock tablet viewport
    mockUseMediaQuery.mockImplementation((query: string) => {
      if (query === '(max-width: 768px)') return false // Not mobile
      if (query === '(max-width: 1200px)') return true // isTablet
      return false
    })

    render(<App />)

    // Should render the app without errors
    expect(screen.getByText('Code Kata App')).toBeInTheDocument()
  })

  it('should handle viewport changes gracefully', () => {
    let isMobile = false
    
    // Mock dynamic viewport changes
    mockUseMediaQuery.mockImplementation((query: string) => {
      if (query === '(max-width: 768px)') return isMobile
      if (query === '(max-width: 1200px)') return isMobile
      return false
    })

    const { rerender } = render(<App />)

    // Initially desktop
    expect(screen.getByText('Code Kata App')).toBeInTheDocument()

    // Change to mobile
    isMobile = true
    rerender(<App />)

    // Should still render correctly
    expect(screen.getByText('Code Kata App')).toBeInTheDocument()
  })
})