import { describe, it, expect, beforeEach } from 'vitest'
import { ShortformEvaluatorService } from '../shortform-evaluator'
import type { 
  ShortformSubmission, 
  MultipleChoiceConfig, 
  ShortformConfig, 
  OneLinerConfig 
} from '@/types'

describe('ShortformEvaluatorService', () => {
  let service: ShortformEvaluatorService

  beforeEach(() => {
    service = ShortformEvaluatorService.getInstance()
  })

  describe('Multiple Choice Evaluation', () => {
    const multipleChoiceConfig: MultipleChoiceConfig = {
      question: 'Which are programming languages?',
      allowMultiple: true,
      options: [
        { id: 'a', text: 'JavaScript' },
        { id: 'b', text: 'HTML' },
        { id: 'c', text: 'Python' },
        { id: 'd', text: 'CSS' }
      ],
      correctAnswers: ['a', 'c'],
      explanation: 'JavaScript and Python are programming languages.'
    }

    it('should correctly evaluate correct multiple choice answers', async () => {
      const submission: ShortformSubmission = {
        kataType: 'multiple-choice',
        answer: ['a', 'c'],
        multipleChoiceConfig
      }

      const result = await service.evaluateSubmission(submission)

      expect(result.success).toBe(true)
      expect(result.score).toBe(100)
      expect(result.testResults[0].passed).toBe(true)
      expect(result.output).toContain('Correct')
    })

    it('should correctly evaluate incorrect multiple choice answers', async () => {
      const submission: ShortformSubmission = {
        kataType: 'multiple-choice',
        answer: ['a', 'b'],
        multipleChoiceConfig
      }

      const result = await service.evaluateSubmission(submission)

      expect(result.success).toBe(false)
      expect(result.score).toBe(0)
      expect(result.testResults[0].passed).toBe(false)
      expect(result.output).toContain('Incorrect')
    })

    it('should handle single selection multiple choice', async () => {
      const singleChoiceConfig: MultipleChoiceConfig = {
        ...multipleChoiceConfig,
        allowMultiple: false,
        correctAnswers: ['a']
      }

      const submission: ShortformSubmission = {
        kataType: 'multiple-choice',
        answer: ['a'],
        multipleChoiceConfig: singleChoiceConfig
      }

      const result = await service.evaluateSubmission(submission)

      expect(result.success).toBe(true)
      expect(result.score).toBe(100)
    })
  })

  describe('Shortform Evaluation', () => {
    const shortformConfig: ShortformConfig = {
      question: 'What is the time complexity of binary search?',
      expectedAnswer: 'O(log n)',
      acceptableAnswers: ['O(log n)', 'logarithmic', 'log n'],
      caseSensitive: false,
      maxLength: 50,
      explanation: 'Binary search has O(log n) time complexity.'
    }

    it('should correctly evaluate exact match', async () => {
      const submission: ShortformSubmission = {
        kataType: 'shortform',
        answer: 'O(log n)',
        shortformConfig
      }

      const result = await service.evaluateSubmission(submission)

      expect(result.success).toBe(true)
      expect(result.score).toBe(100)
      expect(result.testResults[0].passed).toBe(true)
    })

    it('should correctly evaluate acceptable alternative', async () => {
      const submission: ShortformSubmission = {
        kataType: 'shortform',
        answer: 'logarithmic',
        shortformConfig
      }

      const result = await service.evaluateSubmission(submission)

      expect(result.success).toBe(true)
      expect(result.score).toBe(100)
    })

    it('should handle case insensitive matching', async () => {
      const submission: ShortformSubmission = {
        kataType: 'shortform',
        answer: 'LOGARITHMIC',
        shortformConfig
      }

      const result = await service.evaluateSubmission(submission)

      expect(result.success).toBe(true)
      expect(result.score).toBe(100)
    })

    it('should handle case sensitive matching when configured', async () => {
      const caseSensitiveConfig: ShortformConfig = {
        ...shortformConfig,
        caseSensitive: true
      }

      const submission: ShortformSubmission = {
        kataType: 'shortform',
        answer: 'LOGARITHMIC',
        shortformConfig: caseSensitiveConfig
      }

      const result = await service.evaluateSubmission(submission)

      expect(result.success).toBe(false)
      expect(result.score).toBe(0)
    })

    it('should correctly evaluate incorrect answers', async () => {
      const submission: ShortformSubmission = {
        kataType: 'shortform',
        answer: 'O(n)',
        shortformConfig
      }

      const result = await service.evaluateSubmission(submission)

      expect(result.success).toBe(false)
      expect(result.score).toBe(0)
      expect(result.output).toContain('Incorrect')
    })

    it('should trim whitespace from answers', async () => {
      const submission: ShortformSubmission = {
        kataType: 'shortform',
        answer: '  O(log n)  ',
        shortformConfig
      }

      const result = await service.evaluateSubmission(submission)

      expect(result.success).toBe(true)
      expect(result.score).toBe(100)
    })
  })

  describe('One-Liner Evaluation', () => {
    const oneLinerConfig: OneLinerConfig = {
      question: 'What does DRY stand for?',
      expectedAnswer: "Don't Repeat Yourself",
      acceptableAnswers: [
        "Don't Repeat Yourself",
        "Do not Repeat Yourself",
        "Don't repeat yourself"
      ],
      caseSensitive: false,
      explanation: 'DRY is a software development principle.'
    }

    it('should correctly evaluate exact match', async () => {
      const submission: ShortformSubmission = {
        kataType: 'one-liner',
        answer: "Don't Repeat Yourself",
        oneLinerConfig
      }

      const result = await service.evaluateSubmission(submission)

      expect(result.success).toBe(true)
      expect(result.score).toBe(100)
    })

    it('should correctly evaluate acceptable alternatives', async () => {
      const submission: ShortformSubmission = {
        kataType: 'one-liner',
        answer: "Do not Repeat Yourself",
        oneLinerConfig
      }

      const result = await service.evaluateSubmission(submission)

      expect(result.success).toBe(true)
      expect(result.score).toBe(100)
    })

    it('should handle case insensitive matching', async () => {
      const submission: ShortformSubmission = {
        kataType: 'one-liner',
        answer: "don't repeat yourself",
        oneLinerConfig
      }

      const result = await service.evaluateSubmission(submission)

      expect(result.success).toBe(true)
      expect(result.score).toBe(100)
    })
  })

  describe('Validation', () => {
    it('should validate shortform submissions', () => {
      const validSubmission: ShortformSubmission = {
        kataType: 'shortform',
        answer: 'test answer',
        shortformConfig: {
          question: 'Test question?',
          expectedAnswer: 'test answer'
        }
      }

      const result = service.validateSubmission(validSubmission)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject submissions without answers', () => {
      const invalidSubmission: ShortformSubmission = {
        kataType: 'shortform',
        answer: '',
        shortformConfig: {
          question: 'Test question?',
          expectedAnswer: 'test answer'
        }
      }

      const result = service.validateSubmission(invalidSubmission)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Answer is required')
    })

    it('should reject submissions without required config', () => {
      const invalidSubmission: ShortformSubmission = {
        kataType: 'shortform',
        answer: 'test answer'
      }

      const result = service.validateSubmission(invalidSubmission)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Shortform configuration is required')
    })

    it('should validate answer length for shortform', () => {
      const config: ShortformConfig = {
        question: 'Test?',
        expectedAnswer: 'test',
        maxLength: 5
      }

      const invalidSubmission: ShortformSubmission = {
        kataType: 'shortform',
        answer: 'this is too long',
        shortformConfig: config
      }

      const result = service.validateSubmission(invalidSubmission)
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('exceeds maximum length')
    })

    it('should reject unsupported kata types', () => {
      const invalidSubmission: ShortformSubmission = {
        kataType: 'invalid-type' as any,
        answer: 'test'
      }

      const result = service.validateSubmission(invalidSubmission)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Unsupported kata type: invalid-type')
    })
  })

  describe('Error Handling', () => {
    it('should handle evaluation errors gracefully', async () => {
      const submission: ShortformSubmission = {
        kataType: 'shortform',
        answer: 'test',
        // Missing config will cause an error
      }

      const result = await service.evaluateSubmission(submission)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Evaluation error')
      expect(result.testResults[0].passed).toBe(false)
    })
  })
})