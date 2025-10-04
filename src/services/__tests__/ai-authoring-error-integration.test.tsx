import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AIAuthoringService } from '../ai-authoring'
import { AIAuthoringErrorHandler } from '../ai-authoring-error-handler'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock all dependencies
vi.mock('../ai-config')
vi.mock('../prompt-engine')
vi.mock('../response-parser')
vi.mock('../content-validator')
vi.mock('../file-generator')
vi.mock('../ai-authoring-error-handler')

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock console methods to avoid noise in tests
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

describe('AI Authoring Error Integration Tests', () => {
  let service: AIAuthoringService
  let errorHandler: AIAuthoringErrorHandler

  beforeEach(() => {
    vi.clearAllMocks()
    console.error = vi.fn()
    console.warn = vi.fn()

    // Mock error handler
    errorHandler = {
      handleAPIError: vi.fn(),
      handleValidationError: vi.fn(),
      handleParsingError: vi.fn(),
      handleFileGenerationError: vi.fn(),
      handleNetworkError: vi.fn(),
      handleTimeoutError: vi.fn(),
      handleRateLimitError: vi.fn(),
      handleQuotaExceededError: vi.fn(),
      formatUserFriendlyError: vi.fn(),
      shouldRetry: vi.fn(),
      getRetryDelay: vi.fn()
    } as any

    vi.mocked(AIAuthoringErrorHandler.getInstance).mockReturnValue(errorHandler)

    // Reset singleton
    // @ts-ignore
    AIAuthoringService.instance = undefined
    service = AIAuthoringService.getInstance()
  })

  afterEach(() => {
    console.error = originalConsoleError
    console.warn = originalConsoleWarn
    vi.restoreAllMocks()
  })

  describe('API Error Handling Integration', () => {
    it('should handle 401 unauthorized errors', async () => {
      const request = {
        description: 'Test kata',
        language: 'py' as const,
        difficulty: 'easy' as const,
        type: 'code' as const,
        generateHiddenTests: false
      }

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({
          error: { message: 'Invalid API key' }
        })
      })

      vi.mocked(errorHandler.handleAPIError).mockReturnValue({
        userMessage: 'Invalid API key. Please check your OpenAI API key in settings.',
        technicalDetails: 'HTTP 401: Invalid API key',
        suggestedActions: ['Check API key configuration', 'Verify API key permissions'],
        canRetry: false
      })

      const result = await service.generateKata(request)

      expect(result.success).toBe(false)
      expect(errorHandler.handleAPIError).toHaveBeenCalledWith(
        expect.objectContaining({ status: 401 })
      )
      expect(result.error).toContain('Invalid API key')
    })

    it('should handle 429 rate limit errors with retry logic', async () => {
      const request = {
        description: 'Test kata',
        language: 'py' as const,
        difficulty: 'easy' as const,
        type: 'code' as const,
        generateHiddenTests: false
      }

      // First call: rate limited
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Map([['retry-after', '60']]),
        json: () => Promise.resolve({
          error: { message: 'Rate limit exceeded' }
        })
      })

      // Second call: success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Generated content' } }],
          usage: { total_tokens: 100 }
        })
      })

      vi.mocked(errorHandler.shouldRetry).mockReturnValue(true)
      vi.mocked(errorHandler.getRetryDelay).mockReturnValue(1000) // 1 second for testing
      vi.mocked(errorHandler.handleRateLimitError).mockReturnValue({
        userMessage: 'Rate limit exceeded. Retrying in 1 second...',
        technicalDetails: 'HTTP 429: Rate limit exceeded',
        suggestedActions: ['Wait and retry', 'Consider upgrading API plan'],
        canRetry: true,
        retryAfter: 1000
      })

      const result = await service.generateKata(request)

      expect(errorHandler.handleRateLimitError).toHaveBeenCalled()
      expect(errorHandler.shouldRetry).toHaveBeenCalled()
      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result.success).toBe(true)
    })

    it('should handle quota exceeded errors', async () => {
      const request = {
        description: 'Test kata',
        language: 'py' as const,
        difficulty: 'easy' as const,
        type: 'code' as const,
        generateHiddenTests: false
      }

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: () => Promise.resolve({
          error: { 
            message: 'You exceeded your current quota',
            type: 'insufficient_quota'
          }
        })
      })

      vi.mocked(errorHandler.handleQuotaExceededError).mockReturnValue({
        userMessage: 'OpenAI API quota exceeded. Please check your billing and usage limits.',
        technicalDetails: 'Insufficient quota error',
        suggestedActions: ['Check billing status', 'Upgrade API plan', 'Wait for quota reset'],
        canRetry: false
      })

      const result = await service.generateKata(request)

      expect(result.success).toBe(false)
      expect(errorHandler.handleQuotaExceededError).toHaveBeenCalled()
      expect(result.error).toContain('quota exceeded')
    })

    it('should handle network timeout errors', async () => {
      const request = {
        description: 'Test kata',
        language: 'py' as const,
        difficulty: 'easy' as const,
        type: 'code' as const,
        generateHiddenTests: false
      }

      mockFetch.mockRejectedValueOnce(new Error('Request timeout'))

      vi.mocked(errorHandler.handleTimeoutError).mockReturnValue({
        userMessage: 'Request timed out. Please try again.',
        technicalDetails: 'Network timeout after 30 seconds',
        suggestedActions: ['Try again', 'Check internet connection', 'Reduce request complexity'],
        canRetry: true
      })

      vi.mocked(errorHandler.shouldRetry).mockReturnValue(false) // Don't retry for this test

      const result = await service.generateKata(request)

      expect(result.success).toBe(false)
      expect(errorHandler.handleTimeoutError).toHaveBeenCalled()
      expect(result.error).toContain('timed out')
    })
  })

  describe('Validation Error Handling Integration', () => {
    it('should handle content validation failures', async () => {
      const request = {
        description: 'Test kata',
        language: 'py' as const,
        difficulty: 'easy' as const,
        type: 'code' as const,
        generateHiddenTests: false
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Invalid content' } }],
          usage: { total_tokens: 100 }
        })
      })

      // Mock validation failure
      const mockContentValidator = require('../content-validator').ContentValidatorService.getInstance()
      mockContentValidator.validateGeneratedContent.mockResolvedValue({
        isValid: false,
        errors: ['Invalid metadata format', 'Missing required fields'],
        warnings: ['Code quality could be improved'],
        suggestions: ['Add more test cases']
      })

      vi.mocked(errorHandler.handleValidationError).mockReturnValue({
        userMessage: 'Generated content failed validation. Please try again.',
        technicalDetails: 'Validation errors: Invalid metadata format, Missing required fields',
        suggestedActions: ['Try generating again', 'Modify the request description'],
        canRetry: true
      })

      const result = await service.generateKata(request)

      expect(result.success).toBe(false)
      expect(errorHandler.handleValidationError).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: ['Invalid metadata format', 'Missing required fields']
        })
      )
    })

    it('should handle parsing errors gracefully', async () => {
      const request = {
        description: 'Test kata',
        language: 'py' as const,
        difficulty: 'easy' as const,
        type: 'code' as const,
        generateHiddenTests: false
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Malformed response' } }],
          usage: { total_tokens: 100 }
        })
      })

      // Mock parsing failure
      const mockResponseParser = require('../response-parser').ResponseParserService.getInstance()
      mockResponseParser.parseKataResponse.mockImplementation(() => {
        throw new Error('Failed to parse YAML metadata')
      })

      vi.mocked(errorHandler.handleParsingError).mockReturnValue({
        userMessage: 'Failed to parse AI response. The generated content was malformed.',
        technicalDetails: 'YAML parsing error: Failed to parse YAML metadata',
        suggestedActions: ['Try generating again', 'Report this issue if it persists'],
        canRetry: true
      })

      const result = await service.generateKata(request)

      expect(result.success).toBe(false)
      expect(errorHandler.handleParsingError).toHaveBeenCalled()
    })
  })

  describe('File Generation Error Handling Integration', () => {
    it('should handle file system errors', async () => {
      const request = {
        description: 'Test kata',
        language: 'py' as const,
        difficulty: 'easy' as const,
        type: 'code' as const,
        generateHiddenTests: false
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Valid content' } }],
          usage: { total_tokens: 100 }
        })
      })

      // Mock file generation failure
      const mockFileGenerator = require('../file-generator').FileGeneratorService.getInstance()
      mockFileGenerator.generateKataFiles.mockResolvedValue({
        success: false,
        errors: ['Permission denied', 'Disk full'],
        warnings: []
      })

      vi.mocked(errorHandler.handleFileGenerationError).mockReturnValue({
        userMessage: 'Failed to save kata files. Please check file permissions.',
        technicalDetails: 'File system errors: Permission denied, Disk full',
        suggestedActions: ['Check file permissions', 'Free up disk space', 'Try a different location'],
        canRetry: false
      })

      const result = await service.generateKata(request)

      expect(result.success).toBe(false)
      expect(errorHandler.handleFileGenerationError).toHaveBeenCalled()
    })
  })

  describe('Error Boundary Integration', () => {
    it('should integrate with React Error Boundary', () => {
      const ThrowingComponent = () => {
        throw new Error('AI generation failed')
      }

      const TestComponent = () => (
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      )

      render(<TestComponent />)

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
    })

    it('should display user-friendly error messages in UI', () => {
      const errorMessage = 'Failed to generate kata: Invalid API key'
      
      const ErrorDisplay = ({ error }: { error: string }) => (
        <div data-testid="error-display">
          <h3>Generation Failed</h3>
          <p>{error}</p>
          <button>Try Again</button>
        </div>
      )

      render(<ErrorDisplay error={errorMessage} />)

      expect(screen.getByTestId('error-display')).toBeInTheDocument()
      expect(screen.getByText('Generation Failed')).toBeInTheDocument()
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
      expect(screen.getByText('Try Again')).toBeInTheDocument()
    })
  })

  describe('Error Recovery Scenarios', () => {
    it('should recover from transient network errors', async () => {
      const request = {
        description: 'Test kata',
        language: 'py' as const,
        difficulty: 'easy' as const,
        type: 'code' as const,
        generateHiddenTests: false
      }

      // First call fails with network error
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      
      // Second call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Success content' } }],
          usage: { total_tokens: 100 }
        })
      })

      vi.mocked(errorHandler.shouldRetry).mockReturnValue(true)
      vi.mocked(errorHandler.getRetryDelay).mockReturnValue(100)

      const result = await service.generateKata(request)

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result.success).toBe(true)
    })

    it('should provide progressive error messages during retries', async () => {
      const request = {
        description: 'Test kata',
        language: 'py' as const,
        difficulty: 'easy' as const,
        type: 'code' as const,
        generateHiddenTests: false
      }

      let attemptCount = 0
      mockFetch.mockImplementation(() => {
        attemptCount++
        if (attemptCount < 3) {
          return Promise.reject(new Error('Temporary failure'))
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: 'Success' } }],
            usage: { total_tokens: 100 }
          })
        })
      })

      vi.mocked(errorHandler.shouldRetry).mockReturnValue(true)
      vi.mocked(errorHandler.getRetryDelay).mockReturnValue(10)

      const progressCallback = vi.fn()
      const result = await service.generateKata(request, progressCallback)

      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: 'generating',
          message: expect.stringContaining('Retrying')
        })
      )
      expect(result.success).toBe(true)
    })
  })

  describe('Error Logging and Debugging', () => {
    it('should log detailed error information for debugging', async () => {
      const request = {
        description: 'Test kata',
        language: 'py' as const,
        difficulty: 'easy' as const,
        type: 'code' as const,
        generateHiddenTests: false
      }

      const apiError = {
        status: 500,
        statusText: 'Internal Server Error',
        response: { error: { message: 'Server error' } }
      }

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ error: { message: 'Server error' } })
      })

      await service.generateKata(request)

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('AI generation failed'),
        expect.objectContaining({
          request: expect.any(Object),
          error: expect.any(Object)
        })
      )
    })

    it('should include request context in error reports', async () => {
      const request = {
        description: 'Complex kata with special requirements',
        language: 'py' as const,
        difficulty: 'hard' as const,
        type: 'code' as const,
        topics: ['algorithms', 'data-structures'],
        constraints: 'Must use O(log n) complexity',
        generateHiddenTests: true
      }

      mockFetch.mockRejectedValueOnce(new Error('Generation failed'))

      const result = await service.generateKata(request)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.metadata?.originalRequest).toEqual(request)
    })
  })

  describe('User Experience Error Handling', () => {
    it('should provide actionable error messages', async () => {
      const request = {
        description: 'Test kata',
        language: 'py' as const,
        difficulty: 'easy' as const,
        type: 'code' as const,
        generateHiddenTests: false
      }

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: { message: 'Invalid API key' } })
      })

      vi.mocked(errorHandler.formatUserFriendlyError).mockReturnValue({
        title: 'API Key Invalid',
        message: 'Your OpenAI API key is invalid or has expired.',
        actions: [
          { label: 'Check Settings', action: 'open-settings' },
          { label: 'Get API Key', action: 'open-openai' },
          { label: 'Try Again', action: 'retry' }
        ]
      })

      const result = await service.generateKata(request)

      expect(result.success).toBe(false)
      expect(errorHandler.formatUserFriendlyError).toHaveBeenCalled()
    })

    it('should handle multiple error types in sequence', async () => {
      const request = {
        description: 'Test kata',
        language: 'py' as const,
        difficulty: 'easy' as const,
        type: 'code' as const,
        generateHiddenTests: false
      }

      // Network error, then rate limit, then success
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          json: () => Promise.resolve({ error: { message: 'Rate limited' } })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: 'Success' } }],
            usage: { total_tokens: 100 }
          })
        })

      vi.mocked(errorHandler.shouldRetry).mockReturnValue(true)
      vi.mocked(errorHandler.getRetryDelay).mockReturnValue(10)

      const result = await service.generateKata(request)

      expect(mockFetch).toHaveBeenCalledTimes(3)
      expect(errorHandler.handleNetworkError).toHaveBeenCalled()
      expect(errorHandler.handleRateLimitError).toHaveBeenCalled()
      expect(result.success).toBe(true)
    })
  })
})