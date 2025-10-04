import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AIAuthoringService, AIServiceError } from '../ai-authoring'
import { AIConfigService } from '../ai-config'
import { PromptEngineService } from '../prompt-engine'
import { ResponseParserService } from '../response-parser'
import { ContentValidatorService } from '../content-validator'
import { FileGeneratorService } from '../file-generator'
import { GenerationHistoryService } from '../generation-history'
import { KataGenerationRequest, Language, KataType, Difficulty } from '@/types'

// Mock all dependencies
vi.mock('../ai-config')
vi.mock('../prompt-engine')
vi.mock('../response-parser')
vi.mock('../content-validator')
vi.mock('../file-generator')
vi.mock('../generation-history')

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('AIAuthoringService', () => {
  let service: AIAuthoringService
  let mockAIConfig: any
  let mockPromptEngine: any
  let mockResponseParser: any
  let mockContentValidator: any
  let mockFileGenerator: any
  let mockGenerationHistory: any

  const mockConfig = {
    openaiApiKey: 'sk-test-key',
    model: 'gpt-4.1-mini',
    maxTokens: 4000,
    temperature: 0.7,
    retryAttempts: 3,
    timeoutMs: 30000
  }

  const mockGeneratedContent = {
    metadata: {
      slug: 'test-kata',
      title: 'Test Kata',
      language: 'py' as Language,
      type: 'code' as KataType,
      difficulty: 'easy' as Difficulty,
      tags: ['test'],
      entry: 'entry.py',
      test: { kind: 'programmatic', file: 'tests.py' },
      timeout_ms: 5000
    },
    statement: '# Test Kata\n\nThis is a test kata.',
    starterCode: 'def solution():\n    pass',
    testCode: 'def test_solution():\n    assert True',
    solutionCode: 'def solution():\n    return True'
  }

  beforeEach(() => {
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

    mockFileGenerator = {
      generateKataFiles: vi.fn().mockResolvedValue({
        success: true,
        slug: 'test-kata',
        path: '/test/katas/test-kata',
        filesCreated: ['meta.yaml', 'statement.md'],
        errors: [],
        warnings: []
      }),
      slugExists: vi.fn().mockReturnValue(false),
      generateUniqueSlug: vi.fn().mockImplementation((slug) => slug)
    }

    mockGenerationHistory = {
      recordSuccessfulGeneration: vi.fn(),
      recordFailedGeneration: vi.fn(),
      getHistory: vi.fn().mockReturnValue([]),
      getGenerationStats: vi.fn().mockReturnValue({}),
      getCurrentSession: vi.fn().mockReturnValue({}),
      getCostBreakdown: vi.fn().mockReturnValue({}),
      clearHistory: vi.fn(),
      exportHistory: vi.fn().mockReturnValue('{}'),
      importHistory: vi.fn(),
      startNewSession: vi.fn()
    }

    // Mock the getInstance methods
    vi.mocked(AIConfigService.getInstance).mockReturnValue(mockAIConfig)
    vi.mocked(PromptEngineService.getInstance).mockReturnValue(mockPromptEngine)
    vi.mocked(ResponseParserService.getInstance).mockReturnValue(mockResponseParser)
    vi.mocked(ContentValidatorService.getInstance).mockReturnValue(mockContentValidator)
    vi.mocked(FileGeneratorService.getInstance).mockReturnValue(mockFileGenerator)
    vi.mocked(GenerationHistoryService.getInstance).mockReturnValue(mockGenerationHistory)

    // Reset the singleton instance
    // @ts-ignore - accessing private static property for testing
    AIAuthoringService.instance = undefined

    service = AIAuthoringService.getInstance()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = AIAuthoringService.getInstance()
      const instance2 = AIAuthoringService.getInstance()
      
      expect(instance1).toBe(instance2)
    })
  })

  describe('generateKata', () => {
    const validRequest: KataGenerationRequest = {
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

    it('should generate a kata successfully', async () => {
      const mockAPIResponse = {
        choices: [{
          message: {
            content: 'Generated kata content'
          }
        }],
        usage: {
          prompt_tokens: 150,
          completion_tokens: 250,
          total_tokens: 400
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAPIResponse)
      })

      const result = await service.generateKata(validRequest)

      expect(result.success).toBe(true)
      expect(result.kata).toEqual(mockGeneratedContent)
      expect(result.metadata).toBeDefined()
      expect(result.metadata.tokensUsed).toBe(400)
      expect(mockGenerationHistory.recordSuccessfulGeneration).toHaveBeenCalled()
    })

    it('should throw error when API key is not configured', async () => {
      mockAIConfig.getConfig.mockResolvedValueOnce({ ...mockConfig, openaiApiKey: '' })

      const result = await service.generateKata(validRequest)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('OpenAI API key not configured')
    })

    it('should validate generation request', async () => {
      const invalidRequest = {
        ...validRequest,
        description: '' // Empty description
      }

      await expect(service.generateKata(invalidRequest)).rejects.toThrow(AIServiceError)
      await expect(service.generateKata(invalidRequest)).rejects.toThrow('Kata description is required')
    })

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ error: { message: 'Invalid API key' } })
      })

      await expect(service.generateKata(validRequest)).rejects.toThrow(AIServiceError)
      expect(mockGenerationHistory.recordFailedGeneration).toHaveBeenCalled()
    })

    it('should handle validation errors', async () => {
      const mockAPIResponse = {
        choices: [{ message: { content: 'Generated content' } }],
        usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAPIResponse)
      })

      mockContentValidator.validateGeneratedContent.mockResolvedValueOnce({
        isValid: false,
        errors: [{ type: 'structure', message: 'Invalid structure' }],
        warnings: [],
        suggestions: []
      })

      await expect(service.generateKata(validRequest)).rejects.toThrow(AIServiceError)
      expect(mockGenerationHistory.recordFailedGeneration).toHaveBeenCalled()
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Network error'))

      await expect(service.generateKata(validRequest)).rejects.toThrow(AIServiceError)
      expect(mockGenerationHistory.recordFailedGeneration).toHaveBeenCalled()
    })

    it('should retry on transient failures', async () => {
      // First call fails, second succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: () => Promise.resolve({ error: { message: 'Server error' } })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: 'Generated content' } }],
            usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 }
          })
        })

      const result = await service.generateKata(validRequest)

      expect(result).toBeDefined()
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should handle timeout errors', async () => {
      // Mock a timeout by rejecting with a timeout error
      mockFetch.mockRejectedValueOnce(new Error('Request timeout'))

      await expect(service.generateKata(validRequest)).rejects.toThrow(AIServiceError)
    })

    it('should track progress during generation', async () => {
      const progressCallback = vi.fn()
      service.onProgress(progressCallback)

      const mockAPIResponse = {
        choices: [{ message: { content: 'Generated content' } }],
        usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAPIResponse)
      })

      await service.generateKata(validRequest)

      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({ stage: 'initializing', progress: 0 })
      )
      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({ stage: 'generating', progress: 20 })
      )
      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({ stage: 'complete', progress: 100 })
      )
    })

    it('should update session token usage', async () => {
      const mockAPIResponse = {
        choices: [{ message: { content: 'Generated content' } }],
        usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAPIResponse)
      })

      await service.generateKata(validRequest)

      const sessionUsage = service.getSessionTokenUsage()
      expect(sessionUsage.promptTokens).toBe(100)
      expect(sessionUsage.completionTokens).toBe(200)
      expect(sessionUsage.totalTokens).toBe(300)
      expect(sessionUsage.estimatedCost).toBeGreaterThan(0)
    })
  })

  describe('generateVariation', () => {
    const sourceKata = {
      slug: 'fibonacci-sequence',
      title: 'Fibonacci Sequence',
      language: 'py' as Language,
      type: 'code' as KataType,
      difficulty: 'medium' as Difficulty,
      tags: ['algorithms', 'recursion'],
      path: '/katas/fibonacci-sequence'
    }

    const variationOptions = {
      difficultyAdjustment: 'harder' as const,
      focusArea: 'optimization',
      parameterChanges: 'Add memoization',
      seriesName: 'Fibonacci Advanced'
    }

    it('should generate a variation successfully', async () => {
      const mockAPIResponse = {
        choices: [{ message: { content: 'Generated variation content' } }],
        usage: { prompt_tokens: 150, completion_tokens: 250, total_tokens: 400 }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAPIResponse)
      })

      const result = await service.generateVariation(sourceKata, variationOptions)

      expect(result.slug).toContain('fibonacci-advanced-variation')
      expect(result.content).toEqual(mockGeneratedContent)
      expect(mockPromptEngine.buildVariationPrompt).toHaveBeenCalledWith(sourceKata, variationOptions)
      expect(mockGenerationHistory.recordSuccessfulGeneration).toHaveBeenCalled()
    })

    it('should validate source kata and options', async () => {
      const invalidSourceKata = null as any

      await expect(service.generateVariation(invalidSourceKata, variationOptions)).rejects.toThrow()
    })

    it('should handle variation generation errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ error: { message: 'Invalid request' } })
      })

      await expect(service.generateVariation(sourceKata, variationOptions)).rejects.toThrow(AIServiceError)
    })

    it('should generate variation slug correctly', async () => {
      const mockAPIResponse = {
        choices: [{ message: { content: 'Generated variation content' } }],
        usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAPIResponse)
      })

      const result = await service.generateVariation(sourceKata, variationOptions)

      expect(result.slug).toContain('fibonacci-advanced-variation')
      expect(result.slug).toMatch(/fibonacci-advanced-variation-\d+/)
    })

    it('should handle variations without series name', async () => {
      const optionsWithoutSeries = {
        difficultyAdjustment: 'easier' as const
      }

      const mockAPIResponse = {
        choices: [{ message: { content: 'Generated variation content' } }],
        usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAPIResponse)
      })

      const result = await service.generateVariation(sourceKata, optionsWithoutSeries)

      expect(result.slug).toContain('fibonacci-sequence-variation')
    })
  })

  describe('validateGeneration', () => {
    it('should validate generated content successfully', async () => {
      const result = await service.validateGeneration(mockGeneratedContent)

      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual([])
      expect(result.warnings).toEqual([])
      expect(mockContentValidator.validateGeneratedContent).toHaveBeenCalledWith(mockGeneratedContent)
    })

    it('should handle validation failures', async () => {
      mockContentValidator.validateGeneratedContent.mockResolvedValueOnce({
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

    it('should handle validation service errors', async () => {
      mockContentValidator.validateGeneratedContent.mockRejectedValueOnce(new Error('Validation failed'))

      const result = await service.validateGeneration(mockGeneratedContent)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Validation failed: Validation failed')
    })
  })

  describe('saveGeneratedKata', () => {
    it('should save generated kata successfully', async () => {
      const result = await service.saveGeneratedKata(mockGeneratedContent)

      expect(result.success).toBe(true)
      expect(result.slug).toBe('test-kata')
      expect(result.path).toBe('/test/katas/test-kata')
      expect(mockFileGenerator.generateKataFiles).toHaveBeenCalledWith(mockGeneratedContent, undefined)
    })

    it('should handle invalid content', async () => {
      const invalidContent = { metadata: null } as any

      await expect(service.saveGeneratedKata(invalidContent)).rejects.toThrow(AIServiceError)
      await expect(service.saveGeneratedKata(invalidContent)).rejects.toThrow('Invalid kata content: missing metadata')
    })

    it('should handle missing slug', async () => {
      const contentWithoutSlug = {
        ...mockGeneratedContent,
        metadata: { ...mockGeneratedContent.metadata, slug: '' }
      }

      await expect(service.saveGeneratedKata(contentWithoutSlug)).rejects.toThrow(AIServiceError)
      await expect(service.saveGeneratedKata(contentWithoutSlug)).rejects.toThrow('Invalid kata content: missing slug')
    })

    it('should handle file generation failures', async () => {
      mockFileGenerator.generateKataFiles.mockResolvedValue({
        success: false,
        slug: 'test-kata',
        path: '',
        filesCreated: [],
        errors: ['Permission denied'],
        warnings: []
      })

      await expect(service.saveGeneratedKata(mockGeneratedContent)).rejects.toThrow(AIServiceError)
      await expect(service.saveGeneratedKata(mockGeneratedContent)).rejects.toThrow('Failed to save kata files: Permission denied')
    })

    it('should handle conflict resolution', async () => {
      const conflictResolution = { action: 'overwrite' as const }

      await service.saveGeneratedKata(mockGeneratedContent, conflictResolution)

      expect(mockFileGenerator.generateKataFiles).toHaveBeenCalledWith(mockGeneratedContent, conflictResolution)
    })
  })

  describe('progress tracking', () => {
    it('should track current progress', () => {
      expect(service.getCurrentProgress()).toBeNull()

      // Simulate progress update during generation
      const progressCallback = vi.fn()
      service.onProgress(progressCallback)

      // Progress should be updated during generation
      expect(service.getCurrentProgress()).toBeNull() // No active generation
    })

    it('should allow subscribing to progress updates', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      const unsubscribe1 = service.onProgress(callback1)
      const unsubscribe2 = service.onProgress(callback2)

      expect(typeof unsubscribe1).toBe('function')
      expect(typeof unsubscribe2).toBe('function')

      // Test unsubscribe
      unsubscribe1()
      unsubscribe2()
    })
  })

  describe('token usage tracking', () => {
    it('should track session token usage', () => {
      const initialUsage = service.getSessionTokenUsage()
      
      expect(initialUsage.promptTokens).toBe(0)
      expect(initialUsage.completionTokens).toBe(0)
      expect(initialUsage.totalTokens).toBe(0)
      expect(initialUsage.estimatedCost).toBe(0)
    })

    it('should reset session token usage', () => {
      service.resetSessionTokenUsage()
      
      const usage = service.getSessionTokenUsage()
      expect(usage.promptTokens).toBe(0)
      expect(usage.completionTokens).toBe(0)
      expect(usage.totalTokens).toBe(0)
      expect(usage.estimatedCost).toBe(0)
    })
  })

  describe('generation history', () => {
    it('should delegate to generation history service', () => {
      service.getGenerationHistory(10)
      expect(mockGenerationHistory.getHistory).toHaveBeenCalledWith(10)

      service.getGenerationStats()
      expect(mockGenerationHistory.getGenerationStats).toHaveBeenCalled()

      service.getCurrentGenerationSession()
      expect(mockGenerationHistory.getCurrentSession).toHaveBeenCalled()

      service.getCostBreakdown(30)
      expect(mockGenerationHistory.getCostBreakdown).toHaveBeenCalledWith(30)

      service.clearGenerationHistory()
      expect(mockGenerationHistory.clearHistory).toHaveBeenCalled()

      service.exportGenerationHistory()
      expect(mockGenerationHistory.exportHistory).toHaveBeenCalled()

      service.importGenerationHistory('{}')
      expect(mockGenerationHistory.importHistory).toHaveBeenCalledWith('{}')

      service.startNewGenerationSession()
      expect(mockGenerationHistory.startNewSession).toHaveBeenCalled()
    })
  })

  describe('slug management', () => {
    it('should check if slug exists', () => {
      service.slugExists('test-kata')
      expect(mockFileGenerator.slugExists).toHaveBeenCalledWith('test-kata')
    })

    it('should generate unique slug', () => {
      service.generateUniqueSlug('test-kata')
      expect(mockFileGenerator.generateUniqueSlug).toHaveBeenCalledWith('test-kata')
    })
  })

  describe('generateAndSaveKata', () => {
    it('should generate and save kata in one operation', async () => {
      const mockAPIResponse = {
        choices: [{ message: { content: 'Generated content' } }],
        usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAPIResponse)
      })

      const request: KataGenerationRequest = {
        description: 'Test kata',
        language: 'py',
        difficulty: 'easy',
        type: 'code',
        generateHiddenTests: false
      }

      const result = await service.generateAndSaveKata(request)

      expect(result.kata).toBeDefined()
      expect(result.fileResult).toBeDefined()
      expect(result.fileResult.success).toBe(true)
    })
  })

  describe('request validation', () => {
    it('should validate description length', async () => {
      const longDescription = 'A'.repeat(5001) // Too long
      const request = {
        description: longDescription,
        language: 'py' as Language,
        difficulty: 'easy' as Difficulty,
        type: 'code' as KataType,
        generateHiddenTests: false
      }

      await expect(service.generateKata(request)).rejects.toThrow('Kata description is too long')
    })

    it('should validate language', async () => {
      const request = {
        description: 'Test kata',
        language: 'invalid' as Language,
        difficulty: 'easy' as Difficulty,
        type: 'code' as KataType,
        generateHiddenTests: false
      }

      await expect(service.generateKata(request)).rejects.toThrow('Invalid language: invalid')
    })

    it('should validate difficulty', async () => {
      const request = {
        description: 'Test kata',
        language: 'py' as Language,
        difficulty: 'invalid' as Difficulty,
        type: 'code' as KataType,
        generateHiddenTests: false
      }

      await expect(service.generateKata(request)).rejects.toThrow('Invalid difficulty: invalid')
    })
  })

  describe('API error handling', () => {
    it('should handle 401 authentication errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ error: { message: 'Invalid API key' } })
      })

      const request: KataGenerationRequest = {
        description: 'Test kata',
        language: 'py',
        difficulty: 'easy',
        type: 'code',
        generateHiddenTests: false
      }

      await expect(service.generateKata(request)).rejects.toThrow(AIServiceError)
    })

    it('should handle 429 rate limit errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Map([['retry-after', '60']]),
        json: () => Promise.resolve({ error: { message: 'Rate limit exceeded' } })
      })

      const request: KataGenerationRequest = {
        description: 'Test kata',
        language: 'py',
        difficulty: 'easy',
        type: 'code',
        generateHiddenTests: false
      }

      await expect(service.generateKata(request)).rejects.toThrow(AIServiceError)
    })

    it('should handle 500 server errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ error: { message: 'Server error' } })
      })

      const request: KataGenerationRequest = {
        description: 'Test kata',
        language: 'py',
        difficulty: 'easy',
        type: 'code',
        generateHiddenTests: false
      }

      await expect(service.generateKata(request)).rejects.toThrow(AIServiceError)
    })

    it('should handle malformed API responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invalid: 'response' })
      })

      const request: KataGenerationRequest = {
        description: 'Test kata',
        language: 'py',
        difficulty: 'easy',
        type: 'code',
        generateHiddenTests: false
      }

      await expect(service.generateKata(request)).rejects.toThrow(AIServiceError)
    })
  })

  describe('cost calculation', () => {
    it('should calculate token costs correctly', async () => {
      const mockAPIResponse = {
        choices: [{ message: { content: 'Generated content' } }],
        usage: { prompt_tokens: 1000, completion_tokens: 2000, total_tokens: 3000 }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAPIResponse)
      })

      const request: KataGenerationRequest = {
        description: 'Test kata',
        language: 'py',
        difficulty: 'easy',
        type: 'code',
        generateHiddenTests: false
      }

      await service.generateKata(request)

      const usage = service.getSessionTokenUsage()
      expect(usage.totalTokens).toBe(3000)
      expect(usage.estimatedCost).toBeGreaterThan(0)
      // For gpt-4.1-mini at $0.0015 per 1k tokens: 3000 tokens = $0.0045
      expect(usage.estimatedCost).toBeCloseTo(0.0045, 4)
    })

    it('should handle different model costs', async () => {
      // Test with different model
      mockAIConfig.getConfig.mockResolvedValueOnce({
        ...mockConfig,
        model: 'gpt-4'
      })

      const mockAPIResponse = {
        choices: [{ message: { content: 'Generated content' } }],
        usage: { prompt_tokens: 1000, completion_tokens: 1000, total_tokens: 2000 }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAPIResponse)
      })

      const request: KataGenerationRequest = {
        description: 'Test kata',
        language: 'py',
        difficulty: 'easy',
        type: 'code',
        generateHiddenTests: false
      }

      await service.generateKata(request)

      const usage = service.getSessionTokenUsage()
      // GPT-4 is more expensive than gpt-4.1-mini
      expect(usage.estimatedCost).toBeGreaterThan(0.01) // Should be around $0.06 for 2k tokens
    })
  })
})