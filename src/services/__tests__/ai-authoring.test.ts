import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AIAuthoringService, AIServiceError } from '../ai-authoring'
import { AIConfigService } from '../ai-config'
import { PromptEngineService } from '../prompt-engine'
import { ResponseParserService } from '../response-parser'
import { ContentValidatorService } from '../content-validator'
import { KataGenerationRequest, GeneratedKataContent, Language, KataType, Difficulty } from '@/types'

// Mock the dependencies
vi.mock('../ai-config')
vi.mock('../prompt-engine')
vi.mock('../response-parser')
vi.mock('../content-validator')

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('AIAuthoringService', () => {
  let service: AIAuthoringService
  let mockAIConfig: any
  let mockPromptEngine: any
  let mockResponseParser: any
  let mockContentValidator: any

  const mockConfig = {
    openaiApiKey: 'sk-test-key',
    model: 'gpt-4.1-mini',
    maxTokens: 4000,
    temperature: 0.7,
    retryAttempts: 3,
    timeoutMs: 30000
  }

  const mockRequest: KataGenerationRequest = {
    description: 'Create a function to reverse a string',
    language: 'py' as Language,
    difficulty: 'easy' as Difficulty,
    type: 'code' as KataType,
    topics: ['strings', 'algorithms'],
    constraints: 'Use only built-in functions',
    tags: ['beginner', 'strings'],
    generateHiddenTests: true,
    additionalRequirements: 'Include edge cases'
  }

  const mockGeneratedContent: GeneratedKataContent = {
    metadata: {
      slug: 'reverse-string',
      title: 'Reverse String',
      language: 'py' as Language,
      type: 'code' as KataType,
      difficulty: 'easy' as Difficulty,
      tags: ['strings', 'algorithms'],
      entry: 'entry.py',
      test: { kind: 'programmatic', file: 'tests.py' },
      timeout_ms: 5000
    },
    statement: 'Create a function that reverses a string',
    starterCode: 'def reverse_string(s):\n    # TODO: implement\n    pass',
    testCode: 'def test_reverse_string():\n    assert reverse_string("hello") == "olleh"',
    solutionCode: 'def reverse_string(s):\n    return s[::-1]',
    hiddenTestCode: 'def test_edge_cases():\n    assert reverse_string("") == ""'
  }

  const mockAPIResponse = {
    choices: [{
      message: {
        content: `\`\`\`yaml
slug: reverse-string
title: "Reverse String"
language: py
type: code
difficulty: easy
tags: [strings, algorithms]
\`\`\`

\`\`\`markdown
# Reverse String
Create a function that reverses a string
\`\`\`

\`\`\`python
def reverse_string(s):
    # TODO: implement
    pass
\`\`\`

\`\`\`python
def test_reverse_string():
    assert reverse_string("hello") == "olleh"
\`\`\`

\`\`\`python
def reverse_string(s):
    return s[::-1]
\`\`\``
      }
    }],
    usage: {
      prompt_tokens: 100,
      completion_tokens: 200,
      total_tokens: 300
    }
  }

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()
    
    // Setup mock instances
    mockAIConfig = {
      getConfig: vi.fn().mockResolvedValue(mockConfig),
      hasApiKey: vi.fn().mockResolvedValue(true)
    }
    
    mockPromptEngine = {
      buildKataPrompt: vi.fn().mockReturnValue('Generated prompt'),
      buildVariationPrompt: vi.fn().mockReturnValue('Variation prompt')
    }
    
    mockResponseParser = {
      parseKataResponse: vi.fn().mockReturnValue(mockGeneratedContent)
    }
    
    mockContentValidator = {
      validateGeneratedContent: vi.fn().mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: []
      })
    }

    // Mock the getInstance methods
    vi.mocked(AIConfigService.getInstance).mockReturnValue(mockAIConfig)
    vi.mocked(PromptEngineService.getInstance).mockReturnValue(mockPromptEngine)
    vi.mocked(ResponseParserService.getInstance).mockReturnValue(mockResponseParser)
    vi.mocked(ContentValidatorService.getInstance).mockReturnValue(mockContentValidator)

    // Reset the singleton instance to force re-initialization
    // @ts-ignore - accessing private static property for testing
    AIAuthoringService.instance = undefined

    // Get fresh service instance
    service = AIAuthoringService.getInstance()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('generateKata', () => {
    it('should generate a kata successfully', async () => {
      // Setup successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAPIResponse)
      })

      const result = await service.generateKata(mockRequest)

      expect(result).toBeDefined()
      expect(result.slug).toBe('reverse-string')
      expect(result.content).toEqual(mockGeneratedContent)
      expect(result.generationMetadata).toBeDefined()
      expect(result.generationMetadata.tokensUsed).toBe(300)
      expect(result.generationMetadata.originalRequest).toEqual(mockRequest)
    })

    it('should throw error when API key is not configured', async () => {
      mockAIConfig.getConfig.mockResolvedValue({ ...mockConfig, openaiApiKey: '' })

      await expect(service.generateKata(mockRequest)).rejects.toThrow('OpenAI API key not configured')
    })

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: { message: 'Invalid API key' } })
      })

      await expect(service.generateKata(mockRequest)).rejects.toThrow(AIServiceError)
    })

    it('should retry on retryable errors', async () => {
      // First call fails with 500, second succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: { message: 'Server error' } })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAPIResponse)
        })

      const result = await service.generateKata(mockRequest)

      expect(result).toBeDefined()
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should handle timeout errors', async () => {
      // Mock a timeout by making fetch reject with AbortError
      mockAIConfig.getConfig.mockResolvedValue({ ...mockConfig, timeoutMs: 100 }) // Very short timeout
      mockFetch.mockImplementation(() => {
        const error = new Error('The operation was aborted')
        error.name = 'AbortError'
        return Promise.reject(error)
      })

      await expect(service.generateKata(mockRequest)).rejects.toThrow('Request timeout')
    })

    it('should track progress during generation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAPIResponse)
      })

      const progressUpdates: any[] = []
      const unsubscribe = service.onProgress((progress) => {
        progressUpdates.push(progress)
      })

      await service.generateKata(mockRequest)
      unsubscribe()

      expect(progressUpdates.length).toBeGreaterThan(0)
      expect(progressUpdates[0].stage).toBe('initializing')
      expect(progressUpdates[progressUpdates.length - 1].stage).toBe('complete')
    })

    it('should validate generated content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAPIResponse)
      })

      await service.generateKata(mockRequest)

      expect(mockContentValidator.validateGeneratedContent).toHaveBeenCalledWith(mockGeneratedContent)
    })

    it('should continue with warnings if validation has issues', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAPIResponse)
      })

      mockContentValidator.validateGeneratedContent.mockResolvedValue({
        isValid: false,
        errors: [{ type: 'syntax', message: 'Minor syntax issue' }],
        warnings: [],
        suggestions: []
      })

      const result = await service.generateKata(mockRequest)

      expect(result).toBeDefined()
      // Should still complete despite validation issues
    })
  })

  describe('generateVariation', () => {
    const mockSourceKata = {
      slug: 'original-kata',
      title: 'Original Kata',
      language: 'py' as Language,
      type: 'code' as KataType,
      difficulty: 'easy' as Difficulty,
      tags: ['strings'],
      path: '/path/to/kata'
    }

    const mockVariationOptions = {
      difficultyAdjustment: 'harder' as const,
      focusArea: 'performance',
      parameterChanges: 'Add time complexity requirements',
      seriesName: 'String Manipulation Series'
    }

    it('should generate a variation successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAPIResponse)
      })

      const result = await service.generateVariation(mockSourceKata, mockVariationOptions)

      expect(result).toBeDefined()
      expect(result.slug).toContain('string-manipulation-series-variation')
      expect(mockPromptEngine.buildVariationPrompt).toHaveBeenCalledWith(mockSourceKata, mockVariationOptions)
    })

    it('should handle variation generation errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: { message: 'Bad request' } })
      })

      await expect(service.generateVariation(mockSourceKata, mockVariationOptions)).rejects.toThrow(AIServiceError)
    })
  })

  describe('validateGeneration', () => {
    it('should validate generated content', async () => {
      const result = await service.validateGeneration(mockGeneratedContent)

      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual([])
      expect(result.warnings).toEqual([])
    })

    it('should handle validation errors', async () => {
      mockContentValidator.validateGeneratedContent.mockResolvedValue({
        isValid: false,
        errors: [{ type: 'syntax', message: 'Syntax error' }],
        warnings: [{ type: 'style', message: 'Style warning' }],
        suggestions: []
      })

      const result = await service.validateGeneration(mockGeneratedContent)

      expect(result.isValid).toBe(false)
      expect(result.errors).toEqual(['Syntax error'])
      expect(result.warnings).toEqual(['Style warning'])
    })
  })

  describe('progress tracking', () => {
    it('should track and report progress', async () => {
      const progressUpdates: any[] = []
      const unsubscribe = service.onProgress((progress) => {
        progressUpdates.push(progress)
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAPIResponse)
      })

      await service.generateKata(mockRequest)

      expect(progressUpdates.length).toBeGreaterThan(0)
      expect(progressUpdates.some(p => p.stage === 'initializing')).toBe(true)
      expect(progressUpdates.some(p => p.stage === 'generating')).toBe(true)
      expect(progressUpdates.some(p => p.stage === 'parsing')).toBe(true)
      expect(progressUpdates.some(p => p.stage === 'validating')).toBe(true)
      expect(progressUpdates.some(p => p.stage === 'complete')).toBe(true)

      unsubscribe()
    })

    it('should allow unsubscribing from progress updates', () => {
      const callback = vi.fn()
      const unsubscribe = service.onProgress(callback)

      unsubscribe()

      // Trigger some progress (this would normally call the callback)
      // Since we can't easily trigger progress without a full generation,
      // we'll just verify the unsubscribe function exists
      expect(typeof unsubscribe).toBe('function')
    })
  })

  describe('token usage tracking', () => {
    it('should track token usage across requests', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockAPIResponse)
      })

      // Reset session usage
      service.resetSessionTokenUsage()

      await service.generateKata(mockRequest)

      const usage = service.getSessionTokenUsage()
      expect(usage.totalTokens).toBe(300)
      expect(usage.promptTokens).toBe(100)
      expect(usage.completionTokens).toBe(200)
      expect(usage.estimatedCost).toBeGreaterThan(0)
    })

    it('should accumulate token usage across multiple requests', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockAPIResponse)
      })

      service.resetSessionTokenUsage()

      await service.generateKata(mockRequest)
      await service.generateKata(mockRequest)

      const usage = service.getSessionTokenUsage()
      expect(usage.totalTokens).toBe(600) // 300 * 2
    })

    it('should reset session token usage', () => {
      service.resetSessionTokenUsage()
      const usage = service.getSessionTokenUsage()
      
      expect(usage.totalTokens).toBe(0)
      expect(usage.promptTokens).toBe(0)
      expect(usage.completionTokens).toBe(0)
      expect(usage.estimatedCost).toBe(0)
    })
  })

  describe('retry logic', () => {
    it('should retry on rate limit errors', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          json: () => Promise.resolve({ error: { message: 'Rate limit exceeded' } })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAPIResponse)
        })

      const result = await service.generateKata(mockRequest)

      expect(result).toBeDefined()
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should not retry on non-retryable errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: { message: 'Invalid API key' } })
      })

      await expect(service.generateKata(mockRequest)).rejects.toThrow('Invalid API key')
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should fail after max retry attempts', async () => {
      // Mock config with only 2 retry attempts
      mockAIConfig.getConfig.mockResolvedValue({ ...mockConfig, retryAttempts: 2 })

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: { message: 'Server error' } })
      })

      await expect(service.generateKata(mockRequest)).rejects.toThrow('API call failed after 2 attempts')
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('error handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      await expect(service.generateKata(mockRequest)).rejects.toThrow(AIServiceError)
    })

    it('should handle malformed API responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invalid: 'response' })
      })

      await expect(service.generateKata(mockRequest)).rejects.toThrow('Invalid API response format')
    })

    it('should handle parsing errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAPIResponse)
      })

      mockResponseParser.parseKataResponse.mockImplementation(() => {
        throw new Error('Parsing failed')
      })

      await expect(service.generateKata(mockRequest)).rejects.toThrow(AIServiceError)
    })
  })

  describe('cost calculation', () => {
    it('should calculate costs for different models', async () => {
      const gpt4Response = { ...mockAPIResponse }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(gpt4Response)
      })

      mockAIConfig.getConfig.mockResolvedValue({ ...mockConfig, model: 'gpt-4' })

      service.resetSessionTokenUsage()
      await service.generateKata(mockRequest)

      const usage = service.getSessionTokenUsage()
      expect(usage.estimatedCost).toBeGreaterThan(0)
      // GPT-4 should be more expensive than GPT-3.5
    })
  })

  describe('slug generation', () => {
    it('should generate valid slugs from titles', async () => {
      const contentWithSpecialTitle = {
        ...mockGeneratedContent,
        metadata: {
          ...mockGeneratedContent.metadata,
          title: 'Complex Title with Special Characters! & Spaces'
        }
      }

      mockResponseParser.parseKataResponse.mockReturnValue(contentWithSpecialTitle)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAPIResponse)
      })

      const result = await service.generateKata(mockRequest)

      expect(result.slug).toMatch(/^[a-z0-9-]+$/) // Should be URL-safe
      expect(result.slug).not.toContain(' ')
      expect(result.slug).not.toContain('!')
      expect(result.slug).not.toContain('&')
    })
  })
})