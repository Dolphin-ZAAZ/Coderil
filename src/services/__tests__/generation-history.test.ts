import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GenerationHistoryService } from '../generation-history'
import { KataGenerationRequest, GeneratedKata } from '@/types'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('GenerationHistoryService', () => {
  let service: GenerationHistoryService
  
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    
    // Reset singleton instance
    ;(GenerationHistoryService as any).instance = undefined
    service = GenerationHistoryService.getInstance()
  })

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = GenerationHistoryService.getInstance()
      const instance2 = GenerationHistoryService.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('session management', () => {
    it('should start a new session on initialization', () => {
      const session = service.getCurrentSession()
      expect(session).toBeTruthy()
      expect(session?.totalGenerations).toBe(0)
      expect(session?.successfulGenerations).toBe(0)
      expect(session?.failedGenerations).toBe(0)
    })

    it('should end current session when starting a new one', () => {
      const firstSession = service.getCurrentSession()
      expect(firstSession?.endTime).toBeUndefined()
      
      service.startNewSession()
      
      const secondSession = service.getCurrentSession()
      expect(secondSession?.id).not.toBe(firstSession?.id)
    })
  })

  describe('recording generations', () => {
    const mockRequest: KataGenerationRequest = {
      description: 'Test kata',
      language: 'py',
      difficulty: 'medium',
      type: 'code',
      generateHiddenTests: true
    }

    const mockKata: GeneratedKata = {
      slug: 'test-kata',
      content: {
        metadata: {
          slug: 'test-kata',
          title: 'Test Kata',
          language: 'py',
          type: 'code',
          difficulty: 'medium',
          tags: [],
          entry: 'entry.py',
          test: { kind: 'programmatic', file: 'tests.py' },
          timeout_ms: 5000
        },
        statement: 'Test statement'
      },
      generationMetadata: {
        timestamp: new Date(),
        model: 'gpt-4',
        promptVersion: '1.0',
        originalRequest: mockRequest,
        tokensUsed: 1000,
        generationTime: 5000
      }
    }

    it('should record successful generation', () => {
      service.recordSuccessfulGeneration(
        mockRequest,
        mockKata,
        1000,
        0.02,
        5000,
        'gpt-4'
      )

      const history = service.getHistory()
      expect(history).toHaveLength(1)
      expect(history[0].result).toBe('success')
      expect(history[0].tokensUsed).toBe(1000)
      expect(history[0].estimatedCost).toBe(0.02)

      const session = service.getCurrentSession()
      expect(session?.totalGenerations).toBe(1)
      expect(session?.successfulGenerations).toBe(1)
      expect(session?.failedGenerations).toBe(0)
    })

    it('should record failed generation', () => {
      service.recordFailedGeneration(
        mockRequest,
        'API error',
        500,
        0.01,
        2000,
        'gpt-4'
      )

      const history = service.getHistory()
      expect(history).toHaveLength(1)
      expect(history[0].result).toBe('error')
      expect(history[0].error).toBe('API error')
      expect(history[0].tokensUsed).toBe(500)

      const session = service.getCurrentSession()
      expect(session?.totalGenerations).toBe(1)
      expect(session?.successfulGenerations).toBe(0)
      expect(session?.failedGenerations).toBe(1)
    })

    it('should record cancelled generation', () => {
      service.recordCancelledGeneration(
        mockRequest,
        0,
        0,
        1000,
        'gpt-4'
      )

      const history = service.getHistory()
      expect(history).toHaveLength(1)
      expect(history[0].result).toBe('cancelled')
      expect(history[0].tokensUsed).toBe(0)

      const session = service.getCurrentSession()
      expect(session?.totalGenerations).toBe(1)
      expect(session?.successfulGenerations).toBe(0)
      expect(session?.failedGenerations).toBe(0)
    })
  })

  describe('statistics', () => {
    beforeEach(() => {
      const mockRequest: KataGenerationRequest = {
        description: 'Test kata',
        language: 'py',
        difficulty: 'medium',
        type: 'code',
        generateHiddenTests: true
      }

      // Add some test data
      service.recordSuccessfulGeneration(mockRequest, {} as GeneratedKata, 1000, 0.02, 5000, 'gpt-4')
      service.recordSuccessfulGeneration(mockRequest, {} as GeneratedKata, 800, 0.016, 4000, 'gpt-4')
      service.recordFailedGeneration(mockRequest, 'Error', 200, 0.004, 1000, 'gpt-4')
    })

    it('should calculate generation statistics', () => {
      const stats = service.getGenerationStats()
      
      expect(stats.totalGenerations).toBe(3)
      expect(stats.successfulGenerations).toBe(2)
      expect(stats.failedGenerations).toBe(1)
      expect(stats.totalTokensUsed).toBe(2000)
      expect(stats.totalCost).toBeCloseTo(0.04)
      expect(stats.averageGenerationTime).toBe((5000 + 4000 + 1000) / 3)
      expect(stats.mostUsedLanguage).toBe('py')
      expect(stats.mostUsedDifficulty).toBe('medium')
      expect(stats.mostUsedType).toBe('code')
    })

    it('should return recent generations', () => {
      const stats = service.getGenerationStats()
      expect(stats.recentGenerations).toHaveLength(3)
    })
  })

  describe('cost breakdown', () => {
    it('should calculate cost breakdown for time period', () => {
      const mockRequest: KataGenerationRequest = {
        description: 'Test kata',
        language: 'py',
        difficulty: 'medium',
        type: 'code',
        generateHiddenTests: true
      }

      service.recordSuccessfulGeneration(mockRequest, {} as GeneratedKata, 1000, 0.02, 5000, 'gpt-4')
      service.recordSuccessfulGeneration(mockRequest, {} as GeneratedKata, 800, 0.016, 4000, 'gpt-4')

      const breakdown = service.getCostBreakdown(30)
      expect(breakdown.total).toBeCloseTo(0.036)
      expect(breakdown.daily).toHaveLength(1) // All on same day
      expect(breakdown.daily[0].cost).toBeCloseTo(0.036)
      expect(breakdown.daily[0].generations).toBe(2)
    })
  })

  describe('history management', () => {
    it('should clear history', () => {
      const mockRequest: KataGenerationRequest = {
        description: 'Test kata',
        language: 'py',
        difficulty: 'medium',
        type: 'code',
        generateHiddenTests: true
      }

      service.recordSuccessfulGeneration(mockRequest, {} as GeneratedKata, 1000, 0.02, 5000, 'gpt-4')
      expect(service.getHistory()).toHaveLength(1)

      service.clearHistory()
      expect(service.getHistory()).toHaveLength(0)
    })

    it('should export and import history', () => {
      const mockRequest: KataGenerationRequest = {
        description: 'Test kata',
        language: 'py',
        difficulty: 'medium',
        type: 'code',
        generateHiddenTests: true
      }

      service.recordSuccessfulGeneration(mockRequest, {} as GeneratedKata, 1000, 0.02, 5000, 'gpt-4')
      
      const exported = service.exportHistory()
      expect(exported).toContain('history')
      expect(exported).toContain('exportDate')

      service.clearHistory()
      expect(service.getHistory()).toHaveLength(0)

      const result = service.importHistory(exported)
      expect(result.success).toBe(true)
      expect(result.imported).toBe(1)
      expect(service.getHistory()).toHaveLength(1)
    })

    it('should handle invalid import data', () => {
      const result = service.importHistory('invalid json')
      expect(result.success).toBe(false)
      expect(result.imported).toBe(0)
      expect(result.errors).toHaveLength(1)
    })
  })

  describe('localStorage integration', () => {
    it('should save history to localStorage', () => {
      const mockRequest: KataGenerationRequest = {
        description: 'Test kata',
        language: 'py',
        difficulty: 'medium',
        type: 'code',
        generateHiddenTests: true
      }

      service.recordSuccessfulGeneration(mockRequest, {} as GeneratedKata, 1000, 0.02, 5000, 'gpt-4')
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'ai-generation-history',
        expect.any(String)
      )
    })

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage full')
      })

      const mockRequest: KataGenerationRequest = {
        description: 'Test kata',
        language: 'py',
        difficulty: 'medium',
        type: 'code',
        generateHiddenTests: true
      }

      // Should not throw
      expect(() => {
        service.recordSuccessfulGeneration(mockRequest, {} as GeneratedKata, 1000, 0.02, 5000, 'gpt-4')
      }).not.toThrow()
    })
  })
})