import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { errorHandler } from '../error-handler'
import { AIAuthoringService } from '../ai-authoring'
import type { 
  AIServiceError, 
  FileSystemError, 
  KataGenerationRequest,
  ErrorNotification,
  AppError
} from '@/types'

// Mock the AI authoring dependencies
vi.mock('../ai-config')
vi.mock('../prompt-engine')
vi.mock('../response-parser')
vi.mock('../content-validator')
vi.mock('../file-generator')
vi.mock('../generation-history')
vi.mock('../ai-authoring-error-handler')

describe('Error Handler Integration with AI Authoring', () => {
  let aiAuthoringService: AIAuthoringService
  let errorNotifications: ErrorNotification[] = []
  let errorEvents: AppError[] = []

  beforeEach(() => {
    vi.clearAllMocks()
    errorNotifications = []
    errorEvents = []
    
    // Reset singleton
    ;(AIAuthoringService as any).instance = undefined
    aiAuthoringService = AIAuthoringService.getInstance()

    // Subscribe to error events
    errorHandler.onError((error) => {
      errorEvents.push(error)
    })

    errorHandler.onNotification((notification) => {
      errorNotifications.push(notification)
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    errorHandler.clearErrorLog()
  })

  describe('AI Service Error Integration', () => {
    it('should handle OpenAI API authentication errors', () => {
      const apiError: AIServiceError = {
        name: 'AIServiceError',
        message: 'Invalid API key',
        statusCode: 401,
        retryable: false,
        errorType: 'auth',
        context: { model: 'gpt-4.1-mini' },
        stack: 'Error stack trace'
      }

      const result = errorHandler.handleAIServiceError(apiError, {
        operation: 'generateKata',
        request: { description: 'Test kata' }
      })

      expect(result.type).toBe('AI_SERVICE_ERROR')
      expect(result.message).toContain('authentication failed')
      expect(result.recoverable).toBe(false)
      expect(errorEvents).toHaveLength(1)
      expect(errorNotifications).toHaveLength(1)
    })

    it('should handle rate limiting with retry options', () => {
      const rateLimitError: AIServiceError = {
        name: 'AIServiceError',
        message: 'Rate limit exceeded',
        statusCode: 429,
        retryable: true,
        errorType: 'rate_limit',
        context: { model: 'gpt-4.1-mini', retryAfter: '60' },
        stack: 'Error stack trace'
      }

      const retryFn = vi.fn()
      const result = errorHandler.handleAIServiceError(rateLimitError, {
        operation: 'generateKata',
        retry: retryFn
      })

      expect(result.type).toBe('AI_SERVICE_ERROR')
      expect(result.message).toContain('rate limit exceeded')
      expect(result.recoverable).toBe(true)
      
      // Should create notification with retry action
      expect(errorNotifications).toHaveLength(1)
      const notification = errorNotifications[0]
      expect(notification.actions).toBeDefined()
      expect(notification.actions?.some(action => action.label === 'Retry')).toBe(true)
    })

    it('should handle network errors with fallback options', () => {
      const networkError = new Error('Network connection failed')
      
      const fallbackFn = vi.fn()
      const result = errorHandler.handleNetworkError(networkError, {
        operation: 'generateKata'
      }, {
        fallback: fallbackFn
      })

      expect(result.type).toBe('NETWORK_ERROR')
      expect(result.message).toBe('Network connection failed')
      expect(result.recoverable).toBe(true)
      
      // Should create notification with fallback action
      expect(errorNotifications).toHaveLength(1)
      const notification = errorNotifications[0]
      expect(notification.actions?.some(action => action.label === 'Use Fallback')).toBe(true)
    })
  })

  describe('File System Error Integration', () => {
    it('should handle kata save failures with recovery options', () => {
      const fileError: FileSystemError = {
        name: 'FileSystemError',
        message: 'Permission denied',
        code: 'EACCES',
        path: '/path/to/katas/new-kata',
        stack: 'Error stack trace'
      }

      const retryFn = vi.fn()
      const result = errorHandler.handleFileSystemError(fileError, {
        operation: 'saveGeneratedKata',
        slug: 'new-kata',
        retry: retryFn
      })

      expect(result.type).toBe('FILE_SYSTEM_ERROR')
      expect(result.message).toContain('Permission denied')
      expect(result.context?.path).toBe('/path/to/katas/new-kata')
      expect(result.recoverable).toBe(true)
      
      expect(errorNotifications).toHaveLength(1)
    })

    it('should handle disk space errors during kata generation', () => {
      const diskSpaceError: FileSystemError = {
        name: 'FileSystemError',
        message: 'No space left on device',
        code: 'ENOSPC',
        path: '/path/to/katas',
        stack: 'Error stack trace'
      }

      const result = errorHandler.handleFileSystemError(diskSpaceError, {
        operation: 'saveGeneratedKata'
      })

      expect(result.type).toBe('FILE_SYSTEM_ERROR')
      expect(result.message).toBe('No space left on device')
      expect(result.recoverable).toBe(false)
    })
  })

  describe('Error Recovery Integration', () => {
    it('should provide appropriate recovery actions for AI authoring failures', () => {
      const generationError: AIServiceError = {
        name: 'AIServiceError',
        message: 'Generation timeout',
        statusCode: 408,
        retryable: true,
        errorType: 'timeout',
        context: { operation: 'generateKata' },
        stack: 'Error stack trace'
      }

      const request: KataGenerationRequest = {
        description: 'Create a sorting algorithm kata',
        language: 'py',
        difficulty: 'medium',
        type: 'code',
        generateHiddenTests: true
      }

      const retryFn = vi.fn()
      const ignoreFn = vi.fn()

      errorHandler.handleAIServiceError(generationError, {
        operation: 'generateKata',
        request
      }, {
        retry: retryFn,
        ignore: ignoreFn
      })

      expect(errorNotifications).toHaveLength(1)
      const notification = errorNotifications[0]
      
      expect(notification.actions).toHaveLength(2)
      expect(notification.actions?.find(a => a.label === 'Retry')).toBeDefined()
      expect(notification.actions?.find(a => a.label === 'Ignore')).toBeDefined()
    })

    it('should handle cascading errors during kata generation', () => {
      // Simulate multiple errors during generation process
      const apiError: AIServiceError = {
        name: 'AIServiceError',
        message: 'API call failed',
        retryable: true,
        errorType: 'network',
        context: {},
        stack: 'Error stack trace'
      }

      const validationError = new Error('Content validation failed')
      const saveError: FileSystemError = {
        name: 'FileSystemError',
        message: 'File already exists',
        code: 'EEXIST',
        path: '/path/to/kata',
        stack: 'Error stack trace'
      }

      // Handle multiple errors
      errorHandler.handleAIServiceError(apiError)
      errorHandler.handleError(validationError, { stage: 'validation' })
      errorHandler.handleFileSystemError(saveError)

      expect(errorEvents).toHaveLength(3)
      expect(errorNotifications).toHaveLength(3)
      
      // Verify error log contains all errors
      const errorLog = errorHandler.getErrorLog()
      expect(errorLog).toHaveLength(3)
    })
  })

  describe('Error Context and Debugging', () => {
    it('should provide detailed context for AI authoring errors', () => {
      const contextualError: AIServiceError = {
        name: 'AIServiceError',
        message: 'Invalid request format',
        statusCode: 400,
        retryable: false,
        errorType: 'validation',
        context: {
          model: 'gpt-4.1-mini',
          requestData: { description: 'Invalid kata description' }
        },
        stack: 'Error stack trace'
      }

      const result = errorHandler.handleAIServiceError(contextualError, {
        operation: 'generateKata',
        stage: 'prompt_generation',
        userId: 'test-user',
        sessionId: 'session-123'
      })

      expect(result.context).toMatchObject({
        model: 'gpt-4.1-mini',
        operation: 'generateKata',
        stage: 'prompt_generation',
        userId: 'test-user',
        sessionId: 'session-123'
      })
    })

    it('should maintain error history for debugging', () => {
      const errors = [
        new Error('First error'),
        new Error('Second error'),
        new Error('Third error')
      ]

      errors.forEach((error, index) => {
        errorHandler.handleError(error, { sequence: index + 1 })
      })

      const errorLog = errorHandler.getErrorLog()
      expect(errorLog).toHaveLength(3)
      expect(errorLog[0].context?.sequence).toBe(1)
      expect(errorLog[2].context?.sequence).toBe(3)
    })
  })

  describe('Error Notification UI Integration', () => {
    it('should create user-friendly notifications for AI errors', () => {
      const userFriendlyError: AIServiceError = {
        name: 'AIServiceError',
        message: 'Model not available',
        statusCode: 503,
        retryable: true,
        errorType: 'server',
        context: { model: 'gpt-4.1-mini' },
        stack: 'Error stack trace'
      }

      errorHandler.handleAIServiceError(userFriendlyError)

      expect(errorNotifications).toHaveLength(1)
      const notification = errorNotifications[0]
      
      expect(notification.error.message).toContain('temporarily unavailable')
      expect(notification.dismissed).toBe(false)
      expect(notification.id).toBeDefined()
    })

    it('should provide different notification styles for different error types', () => {
      const criticalError: AIServiceError = {
        name: 'AIServiceError',
        message: 'API key invalid',
        statusCode: 401,
        retryable: false,
        errorType: 'auth',
        context: {},
        stack: 'Error stack trace'
      }

      const warningError = new Error('Generation took longer than expected')

      errorHandler.handleAIServiceError(criticalError)
      errorHandler.handleError(warningError, { severity: 'warning' })

      expect(errorNotifications).toHaveLength(2)
      
      const criticalNotification = errorNotifications[0]
      const warningNotification = errorNotifications[1]
      
      expect(criticalNotification.error.recoverable).toBe(false)
      expect(warningNotification.error.recoverable).toBe(false) // Default for unknown errors
    })
  })

  describe('Performance and Memory Management', () => {
    it('should limit error log size to prevent memory leaks', () => {
      // Generate more than 100 errors (the limit)
      for (let i = 0; i < 150; i++) {
        errorHandler.handleError(new Error(`Error ${i}`), { index: i })
      }

      const errorLog = errorHandler.getErrorLog()
      expect(errorLog).toHaveLength(100) // Should be capped at 100
      
      // Should keep the most recent errors
      expect(errorLog[99].context?.index).toBe(149)
      expect(errorLog[0].context?.index).toBe(50)
    })

    it('should clean up error listeners properly', () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()

      const unsubscribe1 = errorHandler.onError(listener1)
      const unsubscribe2 = errorHandler.onNotification(listener2)

      // Generate an error
      errorHandler.handleError(new Error('Test error'))

      expect(listener1).toHaveBeenCalledTimes(1)
      expect(listener2).toHaveBeenCalledTimes(1)

      // Unsubscribe and generate another error
      unsubscribe1()
      unsubscribe2()

      errorHandler.handleError(new Error('Another error'))

      // Listeners should not be called again
      expect(listener1).toHaveBeenCalledTimes(1)
      expect(listener2).toHaveBeenCalledTimes(1)
    })
  })
})