import { vi } from 'vitest'
import { errorHandler } from '../error-handler'
import { AppError, FileSystemError, ExecutionError, AIServiceError, DatabaseError } from '@/types'
import { it } from 'node:test'
import { it } from 'node:test'
import { describe } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { describe } from 'node:test'
import { it } from 'node:test'
import { describe } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { describe } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
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
import { describe } from 'node:test'
import { beforeEach } from 'node:test'
import { describe } from 'node:test'

describe('GlobalErrorHandler', () => {
  beforeEach(() => {
    // Clear error log before each test
    errorHandler.clearErrorLog()
  })

  describe('handleError', () => {
    it('handles generic errors', () => {
      const error = new Error('Test error')
      const result = errorHandler.handleError(error, { test: 'context' })

      expect(result.type).toBe('UNKNOWN_ERROR')
      expect(result.message).toBe('Test error')
      expect(result.context).toEqual({ test: 'context' })
      expect(result.recoverable).toBe(false)
    })

    it('handles AppError objects', () => {
      const appError: AppError = {
        type: 'VALIDATION_ERROR',
        message: 'Validation failed',
        timestamp: new Date(),
        recoverable: true
      }

      const result = errorHandler.handleError(appError)

      expect(result).toBe(appError)
    })

    it('logs errors to error log', () => {
      const error = new Error('Test error')
      errorHandler.handleError(error)

      const errorLog = errorHandler.getErrorLog()
      expect(errorLog).toHaveLength(1)
      expect(errorLog[0].message).toBe('Test error')
    })

    it('limits error log to 100 entries', () => {
      // Add 101 errors
      for (let i = 0; i < 101; i++) {
        errorHandler.handleError(new Error(`Error ${i}`))
      }

      const errorLog = errorHandler.getErrorLog()
      expect(errorLog).toHaveLength(100)
      expect(errorLog[0].message).toBe('Error 1') // First error should be removed
      expect(errorLog[99].message).toBe('Error 100')
    })
  })

  describe('handleFileSystemError', () => {
    it('handles ENOENT errors', () => {
      const fsError = new Error('File not found') as FileSystemError
      fsError.code = 'ENOENT'
      fsError.path = '/test/path'

      const result = errorHandler.handleFileSystemError(fsError)

      expect(result.type).toBe('FILE_SYSTEM_ERROR')
      expect(result.message).toBe('File or directory not found: /test/path')
      expect(result.recoverable).toBe(true)
      expect(result.context?.code).toBe('ENOENT')
      expect(result.context?.path).toBe('/test/path')
    })

    it('handles EACCES errors', () => {
      const fsError = new Error('Permission denied') as FileSystemError
      fsError.code = 'EACCES'
      fsError.path = '/test/path'

      const result = errorHandler.handleFileSystemError(fsError)

      expect(result.message).toBe('Permission denied: /test/path')
      expect(result.recoverable).toBe(false) // EACCES is not recoverable
    })

    it('handles unknown file system errors', () => {
      const fsError = new Error('Unknown error') as FileSystemError
      fsError.code = 'UNKNOWN'

      const result = errorHandler.handleFileSystemError(fsError)

      expect(result.message).toBe('File system error: Unknown error')
    })
  })

  describe('handleExecutionError', () => {
    it('handles timeout errors', () => {
      const execError = new Error('Timeout') as ExecutionError
      execError.timeout = true

      const result = errorHandler.handleExecutionError(execError)

      expect(result.type).toBe('EXECUTION_ERROR')
      expect(result.message).toBe('Code execution timed out')
      expect(result.recoverable).toBe(false)
      expect(result.context?.timeout).toBe(true)
    })

    it('handles exit code errors', () => {
      const execError = new Error('Process failed') as ExecutionError
      execError.exitCode = 1
      execError.stderr = 'Error output'

      const result = errorHandler.handleExecutionError(execError)

      expect(result.message).toBe('Code execution failed with exit code 1')
      expect(result.details).toBe('Error output')
      expect(result.recoverable).toBe(true)
    })
  })

  describe('handleAIServiceError', () => {
    it('handles authentication errors', () => {
      const aiError = new Error('Unauthorized') as AIServiceError
      aiError.statusCode = 401

      const result = errorHandler.handleAIServiceError(aiError)

      expect(result.type).toBe('AI_SERVICE_ERROR')
      expect(result.message).toBe('AI service authentication failed - check API key')
      expect(result.recoverable).toBe(false)
      expect(result.context?.statusCode).toBe(401)
    })

    it('handles rate limit errors', () => {
      const aiError = new Error('Rate limited') as AIServiceError
      aiError.statusCode = 429
      aiError.retryable = true

      const result = errorHandler.handleAIServiceError(aiError)

      expect(result.message).toBe('AI service rate limit exceeded - please try again later')
      expect(result.recoverable).toBe(true)
    })

    it('handles retryable errors', () => {
      const aiError = new Error('Service unavailable') as AIServiceError
      aiError.retryable = true

      const result = errorHandler.handleAIServiceError(aiError)

      expect(result.recoverable).toBe(true)
    })
  })

  describe('handleDatabaseError', () => {
    it('handles SQLITE_BUSY errors', () => {
      const dbError = new Error('Database busy') as DatabaseError
      dbError.code = 'SQLITE_BUSY'

      const result = errorHandler.handleDatabaseError(dbError)

      expect(result.type).toBe('DATABASE_ERROR')
      expect(result.message).toBe('Database is busy - please try again')
      expect(result.recoverable).toBe(true)
    })

    it('handles SQLITE_CONSTRAINT errors', () => {
      const dbError = new Error('Constraint violation') as DatabaseError
      dbError.code = 'SQLITE_CONSTRAINT'
      dbError.constraint = 'unique_key'

      const result = errorHandler.handleDatabaseError(dbError)

      expect(result.message).toBe('Database constraint violation: unique_key')
      expect(result.context?.constraint).toBe('unique_key')
    })

    it('handles unknown database errors', () => {
      const dbError = new Error('Unknown database error') as DatabaseError

      const result = errorHandler.handleDatabaseError(dbError)

      expect(result.message).toBe('Database error: Unknown database error')
      expect(result.recoverable).toBe(false)
    })
  })

  describe('handleNetworkError', () => {
    it('handles network errors', () => {
      const networkError = new Error('Connection failed')

      const result = errorHandler.handleNetworkError(networkError)

      expect(result.type).toBe('NETWORK_ERROR')
      expect(result.message).toBe('Network connection failed')
      expect(result.recoverable).toBe(true)
    })
  })

  describe('event listeners', () => {
    it('notifies error listeners', () => {
      const listener = vi.fn()
      const unsubscribe = errorHandler.onError(listener)

      const error = new Error('Test error')
      errorHandler.handleError(error)

      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Test error',
        type: 'UNKNOWN_ERROR'
      }))

      unsubscribe()
    })

    it('notifies notification listeners', () => {
      const listener = vi.fn()
      const unsubscribe = errorHandler.onNotification(listener)

      const error = new Error('Test error')
      errorHandler.handleError(error)

      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({
          message: 'Test error'
        }),
        dismissed: false
      }))

      unsubscribe()
    })

    it('removes listeners when unsubscribed', () => {
      const listener = vi.fn()
      const unsubscribe = errorHandler.onError(listener)

      unsubscribe()

      const error = new Error('Test error')
      errorHandler.handleError(error)

      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('error log management', () => {
    it('clears error log', () => {
      errorHandler.handleError(new Error('Test error'))
      expect(errorHandler.getErrorLog()).toHaveLength(1)

      errorHandler.clearErrorLog()
      expect(errorHandler.getErrorLog()).toHaveLength(0)
    })

    it('returns copy of error log', () => {
      errorHandler.handleError(new Error('Test error'))
      const log1 = errorHandler.getErrorLog()
      const log2 = errorHandler.getErrorLog()

      expect(log1).not.toBe(log2) // Different objects
      expect(log1).toEqual(log2) // Same content
    })
  })
})