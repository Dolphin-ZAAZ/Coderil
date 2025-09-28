import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AutoContinueService } from '../auto-continue'
import { DatabaseService } from '../database'
import { Kata, KataFilters, ExecutionResult, AIJudgment } from '@/types'

// Mock the DatabaseService
vi.mock('../database', () => ({
  DatabaseService: {
    getInstance: vi.fn()
  }
}))

describe('AutoContinueService', () => {
  let autoContinueService: AutoContinueService
  let mockDbService: any

  beforeEach(() => {
    // Reset the singleton instance
    AutoContinueService.resetInstance()
    
    mockDbService = {
      getSetting: vi.fn(),
      setSetting: vi.fn()
    }
    
    vi.mocked(DatabaseService.getInstance).mockResolvedValue(mockDbService)
    autoContinueService = AutoContinueService.getInstance()
  })

  afterEach(() => {
    vi.clearAllMocks()
    AutoContinueService.resetInstance()
  })

  // Note: isEnabled and setEnabled methods were moved to main process IPC handlers
  // These tests are kept for reference but the methods are no longer part of AutoContinueService

  describe('getRandomKata', () => {
    const mockKatas: Kata[] = [
      {
        slug: 'kata1',
        title: 'Kata 1',
        language: 'py',
        type: 'code',
        difficulty: 'easy',
        tags: ['arrays'],
        path: '/path/to/kata1'
      },
      {
        slug: 'kata2',
        title: 'Kata 2',
        language: 'js',
        type: 'explain',
        difficulty: 'medium',
        tags: ['algorithms'],
        path: '/path/to/kata2'
      },
      {
        slug: 'kata3',
        title: 'Kata 3',
        language: 'py',
        type: 'code',
        difficulty: 'hard',
        tags: ['arrays', 'sorting'],
        path: '/path/to/kata3'
      }
    ]

    const currentKata = mockKatas[0]

    it('should return a random kata different from current', () => {
      const result = autoContinueService.getRandomKata(currentKata, mockKatas, {})
      
      expect(result).not.toBeNull()
      expect(result?.slug).not.toBe(currentKata.slug)
      expect(mockKatas.some(kata => kata.slug === result?.slug)).toBe(true)
    })

    it('should filter by difficulty', () => {
      const filters: KataFilters = { difficulty: ['medium'] }
      
      const result = autoContinueService.getRandomKata(currentKata, mockKatas, filters)
      
      expect(result?.difficulty).toBe('medium')
      expect(result?.slug).toBe('kata2')
    })

    it('should filter by language', () => {
      const filters: KataFilters = { language: ['js'] }
      
      const result = autoContinueService.getRandomKata(currentKata, mockKatas, filters)
      
      expect(result?.language).toBe('js')
      expect(result?.slug).toBe('kata2')
    })

    it('should filter by type', () => {
      const filters: KataFilters = { type: ['explain'] }
      
      const result = autoContinueService.getRandomKata(currentKata, mockKatas, filters)
      
      expect(result?.type).toBe('explain')
      expect(result?.slug).toBe('kata2')
    })

    it('should filter by tags', () => {
      const filters: KataFilters = { tags: ['sorting'] }
      
      const result = autoContinueService.getRandomKata(currentKata, mockKatas, filters)
      
      expect(result?.tags).toContain('sorting')
      expect(result?.slug).toBe('kata3')
    })

    it('should apply multiple filters', () => {
      const filters: KataFilters = { 
        language: ['py'], 
        difficulty: ['hard'] 
      }
      
      const result = autoContinueService.getRandomKata(currentKata, mockKatas, filters)
      
      expect(result?.language).toBe('py')
      expect(result?.difficulty).toBe('hard')
      expect(result?.slug).toBe('kata3')
    })

    it('should return null when no suitable katas found', () => {
      const filters: KataFilters = { language: ['cpp'] }
      
      const result = autoContinueService.getRandomKata(currentKata, mockKatas, filters)
      
      expect(result).toBeNull()
    })

    it('should return null when only current kata matches filters', () => {
      const filters: KataFilters = { 
        language: ['py'], 
        difficulty: ['easy'] 
      }
      
      const result = autoContinueService.getRandomKata(currentKata, mockKatas, filters)
      
      expect(result).toBeNull()
    })
  })

  describe('shouldTrigger', () => {
    it('should return true for successful ExecutionResult with all tests passed', () => {
      const result: ExecutionResult = {
        success: true,
        output: 'All tests passed',
        errors: '',
        testResults: [
          { name: 'test1', passed: true },
          { name: 'test2', passed: true }
        ],
        score: 85,
        duration: 1000
      }
      
      expect(autoContinueService.shouldTrigger(result)).toBe(true)
    })

    it('should return true for successful ExecutionResult without score but all tests passed', () => {
      const result: ExecutionResult = {
        success: true,
        output: 'All tests passed',
        errors: '',
        testResults: [
          { name: 'test1', passed: true },
          { name: 'test2', passed: true }
        ],
        duration: 1000
      }
      
      expect(autoContinueService.shouldTrigger(result)).toBe(true)
    })

    it('should return false for ExecutionResult with low score', () => {
      const result: ExecutionResult = {
        success: true,
        output: 'Some tests passed',
        errors: '',
        testResults: [
          { name: 'test1', passed: true },
          { name: 'test2', passed: false }
        ],
        score: 50,
        duration: 1000
      }
      
      expect(autoContinueService.shouldTrigger(result)).toBe(false)
    })

    it('should return false for failed ExecutionResult', () => {
      const result: ExecutionResult = {
        success: false,
        output: '',
        errors: 'Compilation error',
        testResults: [],
        duration: 0
      }
      
      expect(autoContinueService.shouldTrigger(result)).toBe(false)
    })

    it('should return true for passing AIJudgment', () => {
      const result: AIJudgment = {
        scores: { clarity: 80, correctness: 85 },
        feedback: 'Good explanation',
        pass: true,
        totalScore: 82.5
      }
      
      expect(autoContinueService.shouldTrigger(result)).toBe(true)
    })

    it('should return false for failing AIJudgment', () => {
      const result: AIJudgment = {
        scores: { clarity: 60, correctness: 50 },
        feedback: 'Needs improvement',
        pass: false,
        totalScore: 55
      }
      
      expect(autoContinueService.shouldTrigger(result)).toBe(false)
    })
  })

  describe('createNotification', () => {
    it('should create a notification with correct message and metadata', () => {
      const fromKata: Kata = {
        slug: 'kata1',
        title: 'First Kata',
        language: 'py',
        type: 'code',
        difficulty: 'easy',
        tags: [],
        path: '/path/to/kata1'
      }

      const toKata: Kata = {
        slug: 'kata2',
        title: 'Second Kata',
        language: 'js',
        type: 'explain',
        difficulty: 'medium',
        tags: [],
        path: '/path/to/kata2'
      }

      const notification = autoContinueService.createNotification(fromKata, toKata)

      expect(notification.message).toBe('Auto-continuing from "First Kata" to "Second Kata"')
      expect(notification.fromKata).toBe('kata1')
      expect(notification.toKata).toBe('kata2')
      expect(notification.timestamp).toBeInstanceOf(Date)
    })
  })

  describe('getRandomKataFromFiltered', () => {
    const mockKatas: Kata[] = [
      {
        slug: 'kata1',
        title: 'Kata 1',
        language: 'py',
        type: 'code',
        difficulty: 'easy',
        tags: ['arrays'],
        path: '/path/to/kata1'
      },
      {
        slug: 'kata2',
        title: 'Kata 2',
        language: 'js',
        type: 'explain',
        difficulty: 'medium',
        tags: ['algorithms'],
        path: '/path/to/kata2'
      }
    ]

    it('should return a random kata from filtered list', () => {
      const filters: KataFilters = { language: ['py'] }
      
      const result = autoContinueService.getRandomKataFromFiltered(mockKatas, filters)
      
      expect(result?.language).toBe('py')
      expect(result?.slug).toBe('kata1')
    })

    it('should exclude current kata when provided', () => {
      const currentKata = mockKatas[0]
      const filters: KataFilters = {}
      
      const result = autoContinueService.getRandomKataFromFiltered(mockKatas, filters, currentKata)
      
      expect(result?.slug).not.toBe(currentKata.slug)
      expect(result?.slug).toBe('kata2')
    })

    it('should return null when no katas match filters', () => {
      const filters: KataFilters = { language: ['cpp'] }
      
      const result = autoContinueService.getRandomKataFromFiltered(mockKatas, filters)
      
      expect(result).toBeNull()
    })
  })
})