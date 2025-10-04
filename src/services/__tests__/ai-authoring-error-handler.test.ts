import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AIAuthoringErrorHandler } from '../ai-authoring-error-handler'
import { AIServiceError } from '../ai-authoring'
import { errorHandler } from '../error-handler'

// Mock the global error handler
vi.mock('../error-handler', () => ({
  errorHandler: {
    handleAIServiceError: vi.fn()
  }
}))

describe('AIAuthoringErrorHandler', () => {
  let handler: AIAuthoringErrorHandler
  const mockErrorHandler = vi.mocked(errorHandler)

  beforeEach(() => {
    handler = AIAuthoringErrorHandler.getInstance()
    vi.clearAllMocks()
  })

  describe('handleError', () => {
    it('should handle AIServiceError with retry callback', () => {
      const retryCallback = vi.fn()
      const aiError = new AIServiceError('Test error', {
        retryable: true,
        errorType: 'network'
      })

      handler.handleError(aiError, {
        operation: 'test_operation',
        retryCallback
      })

      expect(mockErrorHandler.handleAIServiceError).toHaveBeenCalledWith(
        aiError,
        expect.objectContaining({
          operation: 'test_operation',
          retryCallback
        })
      )
    })

    it('should convert regular Error to AIServiceError', () => {
      const regularError = new Error('Regular error')
      const retryCallback = vi.fn()

      handler.handleError(regularError, {
        operation: 'test_operation',
        retryCallback
      })

      expect(mockErrorHandler.handleAIServiceError).toHaveBeenCalledWith(
        expect.any(AIServiceError),
        expect.objectContaining({
          operation: 'test_operation',
          retryCallback
        })
      )
    })

    it('should handle auth errors with settings fallback', () => {
      const authError = new AIServiceError('Auth failed', {
        retryable: false,
        errorType: 'auth'
      })

      // Mock window.electronAPI
      const mockOpenSettings = vi.fn()
      global.window = {
        electronAPI: {
          openSettings: mockOpenSettings
        }
      } as any

      handler.handleError(authError, {
        operation: 'test_operation'
      })

      expect(mockErrorHandler.handleAIServiceError).toHaveBeenCalledWith(
        authError,
        expect.objectContaining({
          operation: 'test_operation'
        })
      )
    })

    it('should handle rate limit errors with auto-retry', () => {
      vi.useFakeTimers()
      
      const rateLimitError = new AIServiceError('Rate limited', {
        retryable: true,
        errorType: 'rate_limit',
        context: { retryAfter: 2 }
      })

      const retryCallback = vi.fn()

      handler.handleError(rateLimitError, {
        operation: 'test_operation',
        retryCallback
      })

      // Fast-forward time
      vi.advanceTimersByTime(2000)

      expect(retryCallback).toHaveBeenCalled()
      
      vi.useRealTimers()
    })
  })

  describe('handleGenerationError', () => {
    it('should handle generation errors with proper context', () => {
      const error = new AIServiceError('Generation failed', {
        retryable: true,
        errorType: 'validation'
      })
      const request = { description: 'Test kata', type: 'code' }
      const retryCallback = vi.fn()

      handler.handleGenerationError(error, request, retryCallback)

      expect(mockErrorHandler.handleAIServiceError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          operation: 'kata_generation',
          request,
          retryCallback
        })
      )
    })
  })

  describe('handleVariationError', () => {
    it('should handle variation errors with proper context', () => {
      const error = new AIServiceError('Variation failed', {
        retryable: true,
        errorType: 'network'
      })
      const sourceKata = { slug: 'test-kata', title: 'Test Kata' }
      const options = { difficultyAdjustment: 'harder' as const }
      const retryCallback = vi.fn()

      handler.handleVariationError(error, sourceKata, options, retryCallback)

      expect(mockErrorHandler.handleAIServiceError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          operation: 'variation_generation',
          sourceKata,
          options,
          retryCallback
        })
      )
    })
  })

  describe('handleSaveError', () => {
    it('should handle save errors with proper context', () => {
      const error = new AIServiceError('Save failed', {
        retryable: false,
        errorType: 'validation'
      })
      const content = { metadata: { slug: 'test-kata' } }
      const retryCallback = vi.fn()

      handler.handleSaveError(error, content, retryCallback)

      expect(mockErrorHandler.handleAIServiceError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          operation: 'file_save',
          content,
          retryCallback
        })
      )
    })
  })

  describe('handleValidationError', () => {
    it('should handle validation errors with proper context', () => {
      const error = new AIServiceError('Validation failed', {
        retryable: true,
        errorType: 'validation'
      })
      const content = { metadata: { slug: 'test-kata' } }
      const retryCallback = vi.fn()

      handler.handleValidationError(error, content, retryCallback)

      expect(mockErrorHandler.handleAIServiceError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          operation: 'content_validation',
          content,
          retryCallback
        })
      )
    })
  })

  describe('getUserFriendlyMessage', () => {
    it('should return enhanced message for auth errors', () => {
      const authError = new AIServiceError('Auth failed', {
        errorType: 'auth'
      })

      const message = handler.getUserFriendlyMessage(authError)

      expect(message).toContain('Authentication failed')
      expect(message).toContain('Go to Settings')
      expect(message).toContain('Enter your OpenAI API key')
    })

    it('should return enhanced message for rate limit errors', () => {
      const rateLimitError = new AIServiceError('Rate limited', {
        errorType: 'rate_limit',
        context: { retryAfter: 30 }
      })

      const message = handler.getUserFriendlyMessage(rateLimitError)

      expect(message).toContain('Rate limit exceeded')
      expect(message).toContain('automatically retry in 30 seconds')
    })

    it('should return enhanced message for network errors', () => {
      const networkError = new AIServiceError('Network failed', {
        errorType: 'network'
      })

      const message = handler.getUserFriendlyMessage(networkError)

      expect(message).toContain('Network connection failed')
      expect(message).toContain('check your internet connection')
    })

    it('should return enhanced message for validation errors', () => {
      const validationError = new AIServiceError('Validation failed', {
        errorType: 'validation'
      })

      const message = handler.getUserFriendlyMessage(validationError)

      expect(message).toContain('failed validation')
      expect(message).toContain('simplifying your kata description')
    })

    it('should return enhanced message for timeout errors', () => {
      const timeoutError = new AIServiceError('Timeout', {
        errorType: 'timeout'
      })

      const message = handler.getUserFriendlyMessage(timeoutError)

      expect(message).toContain('timed out')
      expect(message).toContain('complex requests')
    })
  })

  describe('getRecoverySuggestions', () => {
    it('should return enhanced suggestions for auth errors', () => {
      const authError = new AIServiceError('Auth failed', {
        errorType: 'auth'
      })

      const suggestions = handler.getRecoverySuggestions(authError)

      expect(suggestions).toContain('Visit OpenAI\'s website to check your account status')
      expect(suggestions).toContain('Make sure you\'re using the correct API key format')
    })

    it('should return enhanced suggestions for validation errors', () => {
      const validationError = new AIServiceError('Validation failed', {
        errorType: 'validation'
      })

      const suggestions = handler.getRecoverySuggestions(validationError)

      expect(suggestions).toContain('Try generating a simpler kata first')
      expect(suggestions).toContain('Check if your description contains any unusual characters')
    })

    it('should return enhanced suggestions for timeout errors', () => {
      const timeoutError = new AIServiceError('Timeout', {
        errorType: 'timeout'
      })

      const suggestions = handler.getRecoverySuggestions(timeoutError)

      expect(suggestions).toContain('Break complex katas into smaller parts')
      expect(suggestions).toContain('Try generating without hidden tests first')
    })
  })

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = AIAuthoringErrorHandler.getInstance()
      const instance2 = AIAuthoringErrorHandler.getInstance()

      expect(instance1).toBe(instance2)
    })
  })
})