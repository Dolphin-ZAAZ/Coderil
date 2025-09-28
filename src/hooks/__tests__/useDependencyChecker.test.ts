import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDependencyChecker } from '../useDependencyChecker'
import { SystemDependencies } from '@/types'

// Mock window.electronAPI
const mockElectronAPI = {
  checkDependencies: vi.fn()
}

const mockIpcRenderer = {
  on: vi.fn(),
  off: vi.fn()
}

// Mock window object
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true
})

Object.defineProperty(window, 'ipcRenderer', {
  value: mockIpcRenderer,
  writable: true
})

describe('useDependencyChecker', () => {
  const mockDependencies: SystemDependencies = {
    python: {
      name: 'Python',
      available: true,
      version: 'Python 3.9.0'
    },
    nodejs: {
      name: 'Node.js',
      available: true,
      version: 'v18.0.0'
    },
    cpp: {
      name: 'C++ Compiler (GCC)',
      available: false,
      error: 'No C++ compiler found',
      installationGuide: 'Install build-essential'
    },
    allAvailable: false
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockElectronAPI.checkDependencies.mockResolvedValue(mockDependencies)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should initialize with null dependencies', () => {
    const { result } = renderHook(() => useDependencyChecker())

    expect(result.current.dependencies).toBeNull()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isDismissed).toBe(false)
    expect(result.current.shouldShowWarning).toBe(false)
  })

  it('should check dependencies on mount', async () => {
    const { result } = renderHook(() => useDependencyChecker())

    // Wait for the effect to run
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(mockElectronAPI.checkDependencies).toHaveBeenCalled()
  })

  it('should update dependencies state after check', async () => {
    const { result } = renderHook(() => useDependencyChecker())

    await act(async () => {
      await result.current.checkDependencies()
    })

    expect(result.current.dependencies).toEqual(mockDependencies)
    expect(result.current.shouldShowWarning).toBe(true) // allAvailable is false
  })

  it('should handle loading state correctly', async () => {
    let resolvePromise: (value: SystemDependencies) => void
    const pendingPromise = new Promise<SystemDependencies>((resolve) => {
      resolvePromise = resolve
    })

    mockElectronAPI.checkDependencies.mockReturnValue(pendingPromise)

    const { result } = renderHook(() => useDependencyChecker())

    act(() => {
      result.current.checkDependencies()
    })

    expect(result.current.isLoading).toBe(true)

    await act(async () => {
      resolvePromise!(mockDependencies)
      await pendingPromise
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.dependencies).toEqual(mockDependencies)
  })

  it('should dismiss warning when dismissWarning is called', () => {
    const { result } = renderHook(() => useDependencyChecker())

    act(() => {
      result.current.dismissWarning()
    })

    expect(result.current.isDismissed).toBe(true)
  })

  it('should refresh dependencies and reset dismissed state', async () => {
    const { result } = renderHook(() => useDependencyChecker())

    // First dismiss the warning
    act(() => {
      result.current.dismissWarning()
    })

    expect(result.current.isDismissed).toBe(true)

    // Then refresh
    await act(async () => {
      await result.current.refreshDependencies()
    })

    expect(result.current.isDismissed).toBe(false)
    expect(mockElectronAPI.checkDependencies).toHaveBeenCalled()
  })

  it('should show warning when dependencies are not all available and not dismissed', async () => {
    const { result } = renderHook(() => useDependencyChecker())

    await act(async () => {
      await result.current.checkDependencies()
    })

    expect(result.current.shouldShowWarning).toBe(true)

    // Dismiss warning
    act(() => {
      result.current.dismissWarning()
    })

    expect(result.current.shouldShowWarning).toBe(false)
  })

  it('should not show warning when all dependencies are available', async () => {
    const allAvailableDeps: SystemDependencies = {
      ...mockDependencies,
      cpp: {
        name: 'C++ Compiler (GCC)',
        available: true,
        version: 'gcc 9.4.0'
      },
      allAvailable: true
    }

    mockElectronAPI.checkDependencies.mockResolvedValue(allAvailableDeps)

    const { result } = renderHook(() => useDependencyChecker())

    await act(async () => {
      await result.current.checkDependencies()
    })

    expect(result.current.shouldShowWarning).toBe(false)
  })

  it('should handle IPC listener setup and cleanup', () => {
    const { unmount } = renderHook(() => useDependencyChecker())

    expect(mockIpcRenderer.on).toHaveBeenCalledWith('dependency-status', expect.any(Function))

    unmount()

    expect(mockIpcRenderer.off).toHaveBeenCalledWith('dependency-status', expect.any(Function))
  })

  it('should handle dependency status from main process', () => {
    const { result } = renderHook(() => useDependencyChecker())

    // Simulate receiving dependency status from main process
    const statusHandler = mockIpcRenderer.on.mock.calls.find(
      call => call[0] === 'dependency-status'
    )?.[1]

    expect(statusHandler).toBeDefined()

    act(() => {
      statusHandler?.(null, mockDependencies)
    })

    expect(result.current.dependencies).toEqual(mockDependencies)
  })

  it('should handle missing electronAPI gracefully', async () => {
    // Temporarily remove electronAPI
    const originalAPI = window.electronAPI
    delete (window as any).electronAPI

    const { result } = renderHook(() => useDependencyChecker())

    await act(async () => {
      await result.current.checkDependencies()
    })

    // Should not crash and dependencies should remain null
    expect(result.current.dependencies).toBeNull()

    // Restore electronAPI
    window.electronAPI = originalAPI
  })

  it('should handle checkDependencies errors gracefully', async () => {
    mockElectronAPI.checkDependencies.mockRejectedValue(new Error('Check failed'))

    const { result } = renderHook(() => useDependencyChecker())

    await act(async () => {
      await result.current.checkDependencies()
    })

    // Should not crash and loading should be false
    expect(result.current.isLoading).toBe(false)
  })
})