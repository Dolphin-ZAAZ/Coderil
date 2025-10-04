import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AIServiceError } from '../ai-authoring'
import { aiAuthoringErrorHandler } from '../ai-authoring-error-handler'
import { errorHandler } from '../error-handler'

// Mock the global error handler
vi.mock('../error-handler', () => ({
  errorHandler: {
    handleAIServiceError: vi.fn().mockReturnValue({
      type: 'AI_SERVICE_ERROR',
      message: 'Test error',
      timestamp: new Date(),
      recoverable: true
    })
  }
}))

describe('AI Authoring Error Handling Integration', () => {
  const mockErrorHandler = vi.mocked(errorHandler)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Error handler integration', () => {
    it('should handle generation errors through specialized error handler', () => {
      const error = new AIServiceError('Generation failed', {
        retryable: true,
        errorType: 'validation'
      })
      const request = { description: 'Test kata', type: 'code' }
      const retryCallback = vi.fn()

      aiAuthoringErrorHandler.handleGenerationError(error, request, retryCallback)

      expect(mockErrorHandler.handleAIServiceError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          operation: 'kata_generation',
          request,
          retryCallback
        })
      )
    })

    it('should handle variation errors through specialized error handler', () => {
      const error = new AIServiceError('Variation failed', {
        retryable: true,
        errorType: 'network'
      })
      const sourceKata = { slug: 'test-kata', title: 'Test Kata' }
      const options = { difficultyAdjustment: 'harder' as const }
      const retryCallback = vi.fn()

      aiAuthoringErrorHandler.handleVariationError(error, sourceKata, options, retryCallback)

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

    it('should handle save errors through specialized error handler', () => {
      const error = new AIServiceError('Save failed', {
        retryable: false,
        errorType: 'validation'
      })
      const content = { metadata: { slug: 'test-kata' } }
      const retryCallback = vi.fn()

      aiAuthoringErrorHandler.handleSaveError(error, content, retryCallback)

      expect(mockErrorHandler.handleAIServiceError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          operation: 'file_save',
          content,
          retryCallback
        })
      )
    })

    it('should handle validation errors through specialized error handler', () => {
      const error = new AIServiceError('Validation failed', {
        retryable: true,
        errorType: 'validation'
      })
      const content = { metadata: { slug: 'test-kata' } }
      const retryCallback = vi.fn()

      aiAuthoringErrorHandler.handleValidationError(error, content, retryCallback)

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

  describe('Error recovery suggestions', () => {
    it('should provide appropriate recovery suggestions for different error types', () => {
      const authError = new AIServiceError('Auth failed', { errorType: 'auth' })
      const authSuggestions = aiAuthoringErrorHandler.getRecoverySuggestions(authError)
      expect(authSuggestions).toContain('Visit OpenAI\'s website to check your account status')

      const validationError = new AIServiceError('Validation failed', { errorType: 'validation' })
      const validationSuggestions = aiAuthoringErrorHandler.getRecoverySuggestions(validationError)
      expect(validationSuggestions).toContain('Try generating a simpler kata first')

      const timeoutError = new AIServiceError('Timeout', { errorType: 'timeout' })
      const timeoutSuggestions = aiAuthoringErrorHandler.getRecoverySuggestions(timeoutError)
      expect(timeoutSuggestions).toContain('Break complex katas into smaller parts')
    })

    it('should provide user-friendly error messages', () => {
      const networkError = new AIServiceError('Network failed', { errorType: 'network' })
      const message = aiAuthoringErrorHandler.getUserFriendlyMessage(networkError)
      expect(message).toContain('check your internet connection')

      const rateLimitError = new AIServiceError('Rate limited', { 
        errorType: 'rate_limit',
        context: { retryAfter: 30 }
      })
      const rateLimitMessage = aiAuthoringErrorHandler.getUserFriendlyMessage(rateLimitError)
      expect(rateLimitMessage).toContain('automatically retry in 30 seconds')
    })
  })

  describe('Error type classification', () => {
    it('should correctly classify different error types', () => {
      const authError = new AIServiceError('Invalid API key', {
        errorType: 'auth',
        statusCode: 401
      })
      expect(authError.errorType).toBe('auth')
      expect(authError.retryable).toBe(false)

      const networkError = new AIServiceError('Network failed', {
        errorType: 'network',
        retryable: true
      })
      expect(networkError.errorType).toBe('network')
      expect(networkError.retryable).toBe(true)

      const rateLimitError = new AIServiceError('Rate limited', {
        errorType: 'rate_limit',
        statusCode: 429,
        retryable: true
      })
      expect(rateLimitError.errorType).toBe('rate_limit')
      expect(rateLimitError.retryable).toBe(true)

      const validationError = new AIServiceError('Validation failed', {
        errorType: 'validation',
        retryable: true
      })
      expect(validationError.errorType).toBe('validation')
      expect(validationError.retryable).toBe(true)

      const timeoutError = new AIServiceError('Timeout', {
        errorType: 'timeout',
        retryable: true
      })
      expect(timeoutError.errorType).toBe('timeout')
      expect(timeoutError.retryable).toBe(true)
    })
  })
})