import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useElectronAPI } from '../useElectronAPI'

// Mock window.electronAPI
const mockElectronAPI = {
  getKatas: vi.fn(),
  loadKata: vi.fn(),
  // ... other methods
}

describe('useElectronAPI', () => {
  beforeEach(() => {
    // Clear any existing electronAPI
    delete (window as any).electronAPI
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should detect when electronAPI is available immediately', async () => {
    // Set up electronAPI before rendering hook
    ;(window as any).electronAPI = mockElectronAPI

    const { result } = renderHook(() => useElectronAPI())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isAvailable).toBe(true)
    expect(result.current.electronAPI).toBe(mockElectronAPI)
  })

  it('should detect when electronAPI is not available', async () => {
    const { result } = renderHook(() => useElectronAPI())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    }, { timeout: 6000 })

    expect(result.current.isAvailable).toBe(false)
    expect(result.current.electronAPI).toBeUndefined()
  }, 7000) // Increase test timeout to 7 seconds

  it('should detect when electronAPI becomes available after delay', async () => {
    const { result } = renderHook(() => useElectronAPI())

    // Initially should be loading
    expect(result.current.isLoading).toBe(true)
    expect(result.current.isAvailable).toBe(false)

    // Add electronAPI after a short delay
    setTimeout(() => {
      ;(window as any).electronAPI = mockElectronAPI
    }, 500)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isAvailable).toBe(true)
    expect(result.current.electronAPI).toBe(mockElectronAPI)
  })
})