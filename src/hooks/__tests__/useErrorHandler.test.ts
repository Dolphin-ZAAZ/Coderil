import { renderHook, act } from '@testing-library/react'
import { vi } from 'vitest'
import { useErrorHandler, useErrorListener, useErrorLog } from '../useErrorHandler'
import { errorHandler } from '@/services/error-handler'
import { FileSystemError, ExecutionError, AIServiceError, DatabaseError } from '@/types'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { describe } from 'node:test'
import { it } from 'node:test'
import { describe } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { describe } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { describe } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { beforeEach } from 'node:test'
import { describe } from 'node:test'

// Mock the error handler
vi.mock('@/services/error-handler', () => ({
  errorHandler: {
    handleError: vi.fn(),
    handleFileSystemError: vi.fn(),
    handleExecutionError: vi.fn(),
    handleAIServiceError: vi.fn(),
    handleDatabaseError: vi.fn(),
    handleNetworkError: vi.fn(),
    onError: vi.fn(),
    getErrorLog: vi.fn(),
    clearErrorLog: vi.fn()
  }
}))

const mockErrorHandler = errorHandler as any

describe('useErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('provides error handling functions', () => {
    const { result } = renderHook(() => useErrorHandler())

    expect(result.current.handleError).toBeDefined()
    expect(result.current.handleFileSystemError).toBeDefined()
    expect(result.current.handleExecutionError).toBeDefined()
    expect(result.current.handleAIServiceError).toBeDefined()
    expect(result.current.handleDatabaseError).toBeDefined()
    expect(result.current.handleNetworkError).toBeDefined()
    expect(result.current.withErrorHandling).toBeDefined()
    expect(result.current.withSyncErrorHandling).toBeDefined()
  })

  it('calls errorHandler.handleError', () => {
    const { result } = renderHook(() => useErrorHandler())
    const error = new Error('Test error')
    const context = { test: 'context' }

    act(() => {
      result.current.handleError(error, context)
    })

    expect(mockErrorHandler.handleError).toHaveBeenCalledWith(error, context, undefined)
  })

  it('calls errorHandler.handleFileSystemError', () => {
    const { result } = renderHook(() => useErrorHandler())
    const error = new Error('FS error') as FileSystemError
    error.code = 'ENOENT'

    act(() => {
      result.current.handleFileSystemError(error)
    })

    expect(mockErrorHandler.handleFileSystemError).toHaveBeenCalledWith(error, undefined)
  })

  it('calls errorHandler.handleExecutionError', () => {
    const { result } = renderHook(() => useErrorHandler())
    const error = new Error('Exec error') as ExecutionError
    error.exitCode = 1

    act(() => {
      result.current.handleExecutionError(error)
    })

    expect(mockErrorHandler.handleExecutionError).toHaveBeenCalledWith(error, undefined)
  })

  it('calls errorHandler.handleAIServiceError', () => {
    const { result } = renderHook(() => useErrorHandler())
    const error = new Error('AI error') as AIServiceError
    error.statusCode = 500

    act(() => {
      result.current.handleAIServiceError(error)
    })

    expect(mockErrorHandler.handleAIServiceError).toHaveBeenCalledWith(error, undefined)
  })

  it('calls errorHandler.handleDatabaseError', () => {
    const { result } = renderHook(() => useErrorHandler())
    const error = new Error('DB error') as DatabaseError
    error.code = 'SQLITE_BUSY'

    act(() => {
      result.current.handleDatabaseError(error)
    })

    expect(mockErrorHandler.handleDatabaseError).toHaveBeenCalledWith(error, undefined)
  })

  it('calls errorHandler.handleNetworkError', () => {
    const { result } = renderHook(() => useErrorHandler())
    const error = new Error('Network error')

    act(() => {
      result.current.handleNetworkError(error)
    })

    expect(mockErrorHandler.handleNetworkError).toHaveBeenCalledWith(error, undefined)
  })

  describe('withErrorHandling', () => {
    it('wraps async operations with error handling', async () => {
      const { result } = renderHook(() => useErrorHandler())
      const mockOperation = vi.fn().mockResolvedValue('success')

      const wrappedOperation = result.current.withErrorHandling(mockOperation)
      const response = await wrappedOperation()

      expect(mockOperation).toHaveBeenCalled()
      expect(response).toBe('success')
    })

    it('handles errors in async operations', async () => {
      const { result } = renderHook(() => useErrorHandler())
      const error = new Error('Async error')
      const mockOperation = vi.fn().mockRejectedValue(error)

      const wrappedOperation = result.current.withErrorHandling(mockOperation)
      const response = await wrappedOperation()

      expect(mockOperation).toHaveBeenCalled()
      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(error, undefined, undefined)
      expect(response).toBeNull()
    })

    it('passes context and recovery options', async () => {
      const { result } = renderHook(() => useErrorHandler())
      const error = new Error('Async error')
      const mockOperation = vi.fn().mockRejectedValue(error)
      const context = { test: 'context' }
      const recoveryOptions = { retry: vi.fn() }

      const wrappedOperation = result.current.withErrorHandling(mockOperation, context, recoveryOptions)
      await wrappedOperation()

      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(error, context, recoveryOptions)
    })
  })

  describe('withSyncErrorHandling', () => {
    it('wraps sync operations with error handling', () => {
      const { result } = renderHook(() => useErrorHandler())
      const mockOperation = vi.fn().mockReturnValue('success')

      const wrappedOperation = result.current.withSyncErrorHandling(mockOperation)
      const response = wrappedOperation()

      expect(mockOperation).toHaveBeenCalled()
      expect(response).toBe('success')
    })

    it('handles errors in sync operations', () => {
      const { result } = renderHook(() => useErrorHandler())
      const error = new Error('Sync error')
      const mockOperation = vi.fn().mockImplementation(() => {
        throw error
      })

      const wrappedOperation = result.current.withSyncErrorHandling(mockOperation)
      const response = wrappedOperation()

      expect(mockOperation).toHaveBeenCalled()
      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(error, undefined, undefined)
      expect(response).toBeNull()
    })
  })
})

describe('useErrorListener', () => {
  it('subscribes to error events', () => {
    const callback = vi.fn()
    const unsubscribe = vi.fn()
    mockErrorHandler.onError.mockReturnValue(unsubscribe)

    const { unmount } = renderHook(() => useErrorListener(callback))

    expect(mockErrorHandler.onError).toHaveBeenCalledWith(callback)

    unmount()
    expect(unsubscribe).toHaveBeenCalled()
  })
})

describe('useErrorLog', () => {
  it('provides error log functions', () => {
    const { result } = renderHook(() => useErrorLog())

    expect(result.current.getErrorLog).toBeDefined()
    expect(result.current.clearErrorLog).toBeDefined()
  })

  it('calls errorHandler.getErrorLog', () => {
    const { result } = renderHook(() => useErrorLog())

    act(() => {
      result.current.getErrorLog()
    })

    expect(mockErrorHandler.getErrorLog).toHaveBeenCalled()
  })

  it('calls errorHandler.clearErrorLog', () => {
    const { result } = renderHook(() => useErrorLog())

    act(() => {
      result.current.clearErrorLog()
    })

    expect(mockErrorHandler.clearErrorLog).toHaveBeenCalled()
  })
})