import { describe, it, expect, beforeEach } from 'vitest'
import { ScoringService } from '../scoring'
import { ExecutionResult, TestResult, AIJudgment } from '@/types'

describe('ScoringService', () => {
  let scoringService: ScoringService

  beforeEach(() => {
    scoringService = ScoringService.getInstance()
  })

  describe('calculateScore', () => {
    it('should return 0 for empty test results', () => {
      const score = scoringService.calculateScore([])
      expect(score).toBe(0)
    })

    it('should calculate 100% for all passing tests', () => {
      const testResults: TestResult[] = [
        { name: 'test1', passed: true },
        { name: 'test2', passed: true },
        { name: 'test3', passed: true }
      ]
      const score = scoringService.calculateScore(testResults)
      expect(score).toBe(100)
    })

    it('should calculate 50% for half passing tests', () => {
      const testResults: TestResult[] = [
        { name: 'test1', passed: true },
        { name: 'test2', passed: false },
        { name: 'test3', passed: true },
        { name: 'test4', passed: false }
      ]
      const score = scoringService.calculateScore(testResults)
      expect(score).toBe(50)
    })

    it('should calculate 0% for all failing tests', () => {
      const testResults: TestResult[] = [
        { name: 'test1', passed: false },
        { name: 'test2', passed: false }
      ]
      const score = scoringService.calculateScore(testResults)
      expect(score).toBe(0)
    })
  })

  describe('combineResults', () => {
    it('should combine results with default 30/70 weighting', () => {
      const publicResult: ExecutionResult = {
        success: true,
        output: 'Public output',
        errors: '',
        testResults: [
          { name: 'public_test1', passed: true },
          { name: 'public_test2', passed: true }
        ],
        score: 100,
        duration: 100
      }

      const hiddenResult: ExecutionResult = {
        success: true,
        output: 'Hidden output',
        errors: '',
        testResults: [
          { name: 'hidden_test1', passed: true },
          { name: 'hidden_test2', passed: false }
        ],
        score: 50,
        duration: 200
      }

      const combined = scoringService.combineResults(publicResult, hiddenResult)

      // Final score should be (100 * 0.3) + (50 * 0.7) = 30 + 35 = 65
      expect(combined.finalScore).toBe(65)
      expect(combined.score).toBe(65)
      expect(combined.duration).toBe(300)
      expect(combined.testResults).toHaveLength(4)
      expect(combined.testResults[0].name).toBe('[Public] public_test1')
      expect(combined.testResults[2].name).toBe('[Hidden] hidden_test1')
    })

    it('should mark as failed if score below threshold', () => {
      const publicResult: ExecutionResult = {
        success: true,
        output: 'Public output',
        errors: '',
        testResults: [{ name: 'test1', passed: true }],
        score: 60,
        duration: 100
      }

      const hiddenResult: ExecutionResult = {
        success: true,
        output: 'Hidden output',
        errors: '',
        testResults: [{ name: 'test2', passed: false }],
        score: 0,
        duration: 100
      }

      const combined = scoringService.combineResults(publicResult, hiddenResult)

      // Final score: (60 * 0.3) + (0 * 0.7) = 18, which is below 70% threshold
      expect(combined.finalScore).toBe(18)
      expect(combined.passed).toBe(false)
    })

    it('should mark as failed if either test suite fails', () => {
      const publicResult: ExecutionResult = {
        success: false, // Public tests failed
        output: 'Public output',
        errors: 'Public error',
        testResults: [{ name: 'test1', passed: false }],
        score: 0,
        duration: 100
      }

      const hiddenResult: ExecutionResult = {
        success: true,
        output: 'Hidden output',
        errors: '',
        testResults: [{ name: 'test2', passed: true }],
        score: 100,
        duration: 100
      }

      const combined = scoringService.combineResults(publicResult, hiddenResult)

      expect(combined.passed).toBe(false)
      expect(combined.success).toBe(false)
    })

    it('should hide hidden test details for failed tests', () => {
      const publicResult: ExecutionResult = {
        success: true,
        output: 'Public output',
        errors: '',
        testResults: [{ name: 'test1', passed: true, message: 'Public test passed' }],
        score: 100,
        duration: 100
      }

      const hiddenResult: ExecutionResult = {
        success: false,
        output: 'Hidden output',
        errors: '',
        testResults: [{
          name: 'test2',
          passed: false,
          message: 'Expected 5, got 3',
          expected: 5,
          actual: 3
        }],
        score: 0,
        duration: 100
      }

      const combined = scoringService.combineResults(publicResult, hiddenResult)

      const hiddenTest = combined.testResults.find(t => t.name.includes('Hidden'))
      expect(hiddenTest?.message).toBe('Hidden test failed')
      expect(hiddenTest?.expected).toBeUndefined()
      expect(hiddenTest?.actual).toBeUndefined()
    })

    it('should combine outputs with clear separation', () => {
      const publicResult: ExecutionResult = {
        success: true,
        output: 'Public test output',
        errors: 'Public error',
        testResults: [],
        duration: 100
      }

      const hiddenResult: ExecutionResult = {
        success: true,
        output: 'Hidden test output',
        errors: 'Hidden error',
        testResults: [],
        duration: 100
      }

      const combined = scoringService.combineResults(publicResult, hiddenResult)

      expect(combined.output).toContain('=== Public Tests ===')
      expect(combined.output).toContain('=== Hidden Tests ===')
      expect(combined.output).toContain('Public test output')
      expect(combined.output).toContain('Hidden test output')

      expect(combined.errors).toContain('=== Public Test Errors ===')
      expect(combined.errors).toContain('=== Hidden Test Errors ===')
      expect(combined.errors).toContain('Public error')
      expect(combined.errors).toContain('Hidden error')
    })

    it('should use custom scoring config', () => {
      const publicResult: ExecutionResult = {
        success: true,
        output: '',
        errors: '',
        testResults: [{ name: 'test1', passed: true }],
        score: 100,
        duration: 100
      }

      const hiddenResult: ExecutionResult = {
        success: true,
        output: '',
        errors: '',
        testResults: [{ name: 'test2', passed: true }],
        score: 80,
        duration: 100
      }

      const combined = scoringService.combineResults(publicResult, hiddenResult, {
        publicWeight: 0.5,
        hiddenWeight: 0.5,
        passingThreshold: 85
      })

      // Final score: (100 * 0.5) + (80 * 0.5) = 90
      expect(combined.finalScore).toBe(90)
      expect(combined.passed).toBe(true) // Above 85% threshold
    })
  })

  describe('processResult', () => {
    it('should calculate score if not present', () => {
      const result: ExecutionResult = {
        success: true,
        output: 'Test output',
        errors: '',
        testResults: [
          { name: 'test1', passed: true },
          { name: 'test2', passed: false }
        ],
        duration: 100
      }

      const processed = scoringService.processResult(result)
      expect(processed.score).toBe(50)
    })

    it('should preserve existing score', () => {
      const result: ExecutionResult = {
        success: true,
        output: 'Test output',
        errors: '',
        testResults: [
          { name: 'test1', passed: true },
          { name: 'test2', passed: false }
        ],
        score: 75,
        duration: 100
      }

      const processed = scoringService.processResult(result)
      expect(processed.score).toBe(75)
    })
  })

  describe('determinePassStatus', () => {
    it('should return true for successful result above threshold', () => {
      const result: ExecutionResult = {
        success: true,
        output: '',
        errors: '',
        testResults: [
          { name: 'test1', passed: true },
          { name: 'test2', passed: true }
        ],
        score: 100,
        duration: 100
      }

      expect(scoringService.determinePassStatus(result)).toBe(true)
    })

    it('should return false for successful result below threshold', () => {
      const result: ExecutionResult = {
        success: true,
        output: '',
        errors: '',
        testResults: [
          { name: 'test1', passed: true },
          { name: 'test2', passed: false }
        ],
        score: 50,
        duration: 100
      }

      expect(scoringService.determinePassStatus(result)).toBe(false)
    })

    it('should return false for failed result regardless of score', () => {
      const result: ExecutionResult = {
        success: false,
        output: '',
        errors: 'Compilation error',
        testResults: [],
        score: 100,
        duration: 100
      }

      expect(scoringService.determinePassStatus(result)).toBe(false)
    })

    it('should use custom threshold', () => {
      const result: ExecutionResult = {
        success: true,
        output: '',
        errors: '',
        testResults: [
          { name: 'test1', passed: true },
          { name: 'test2', passed: false }
        ],
        score: 60,
        duration: 100
      }

      expect(scoringService.determinePassStatus(result, 50)).toBe(true)
      expect(scoringService.determinePassStatus(result, 70)).toBe(false)
    })
  })

  describe('formatTestResults', () => {
    it('should add default names and messages', () => {
      const testResults: TestResult[] = [
        { name: '', passed: true },
        { name: 'custom_test', passed: false, message: '' }
      ]

      const formatted = scoringService.formatTestResults(testResults)

      expect(formatted[0].name).toBe('Test 1')
      expect(formatted[0].message).toBe('Test passed')
      expect(formatted[1].name).toBe('custom_test')
      expect(formatted[1].message).toBe('Test failed')
    })

    it('should preserve existing names and messages', () => {
      const testResults: TestResult[] = [
        { name: 'existing_test', passed: true, message: 'Custom message' }
      ]

      const formatted = scoringService.formatTestResults(testResults)

      expect(formatted[0].name).toBe('existing_test')
      expect(formatted[0].message).toBe('Custom message')
    })
  })

  describe('processAIJudgment', () => {
    it('should clamp scores to valid range', () => {
      const judgment: AIJudgment = {
        scores: {
          clarity: 150, // Above 100
          correctness: -10, // Below 0
          completeness: 75
        },
        feedback: 'Test feedback',
        pass: true,
        totalScore: 120 // Above 100
      }

      const processed = scoringService.processAIJudgment(judgment)

      expect(processed.scores.clarity).toBe(100)
      expect(processed.scores.correctness).toBe(0)
      expect(processed.scores.completeness).toBe(75)
      expect(processed.totalScore).toBe(58.333333333333336)
    })

    it('should recalculate total score from individual scores', () => {
      const judgment: AIJudgment = {
        scores: {
          clarity: 80,
          correctness: 90,
          completeness: 70
        },
        feedback: 'Test feedback',
        pass: true,
        totalScore: 50 // Will be recalculated
      }

      const processed = scoringService.processAIJudgment(judgment)

      // Average of 80, 90, 70 = 80
      expect(processed.totalScore).toBe(80)
    })

    it('should preserve total score if no individual scores', () => {
      const judgment: AIJudgment = {
        scores: {},
        feedback: 'Test feedback',
        pass: true,
        totalScore: 85
      }

      const processed = scoringService.processAIJudgment(judgment)

      expect(processed.totalScore).toBe(85)
    })
  })

  describe('validateAIJudgment', () => {
    it('should return true for valid judgment', () => {
      const judgment: AIJudgment = {
        scores: { clarity: 80 },
        feedback: 'Good work',
        pass: true,
        totalScore: 80
      }

      expect(scoringService.validateAIJudgment(judgment)).toBe(true)
    })

    it('should return false for invalid judgment', () => {
      const invalidJudgments = [
        { scores: {}, feedback: 'test', pass: true, totalScore: -10 }, // Negative score
        { scores: {}, feedback: 'test', pass: true, totalScore: 150 }, // Score too high
        { scores: {}, feedback: 123, pass: true, totalScore: 80 }, // Invalid feedback type
        { scores: {}, feedback: 'test', pass: 'yes', totalScore: 80 }, // Invalid pass type
        { scores: 'invalid', feedback: 'test', pass: true, totalScore: 80 } // Invalid scores type
      ]

      invalidJudgments.forEach(judgment => {
        expect(scoringService.validateAIJudgment(judgment as any)).toBe(false)
      })
    })
  })

  describe('getScoringSummary', () => {
    it('should return correct scoring summary', () => {
      const publicResult: ExecutionResult = {
        success: true,
        output: '',
        errors: '',
        testResults: [],
        score: 90,
        duration: 100
      }

      const hiddenResult: ExecutionResult = {
        success: true,
        output: '',
        errors: '',
        testResults: [],
        score: 80,
        duration: 100
      }

      const combined = scoringService.combineResults(publicResult, hiddenResult)
      const summary = scoringService.getScoringSummary(combined)

      expect(summary.publicScore).toBe(90)
      expect(summary.hiddenScore).toBe(80)
      expect(summary.finalScore).toBe(83) // (90 * 0.3) + (80 * 0.7) = 27 + 56 = 83
      expect(summary.publicWeight).toBe(0.3)
      expect(summary.hiddenWeight).toBe(0.7)
      expect(summary.passed).toBe(true)
    })
  })
})