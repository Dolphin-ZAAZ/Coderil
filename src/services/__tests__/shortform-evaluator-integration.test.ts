import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ShortformEvaluatorService } from '../shortform-evaluator'
import type { 
  MultiQuestionConfig, 
  ShortformQuestion,
  MultiQuestionSubmission,
  ShortformSubmission
} from '@/types'

describe('ShortformEvaluatorService Integration with AI Generated Katas', () => {
  let evaluatorService: ShortformEvaluatorService

  beforeEach(() => {
    // Reset singleton
    ;(ShortformEvaluatorService as any).instance = undefined
    evaluatorService = ShortformEvaluatorService.getInstance()
  })

  describe('AI Generated Multi-Question Katas', () => {
    it('should evaluate AI-generated multi-question assessments', async () => {
      // Simulate an AI-generated multi-question configuration
      const aiGeneratedConfig: MultiQuestionConfig = {
        title: 'JavaScript Fundamentals Assessment',
        description: 'AI-generated assessment covering JavaScript basics',
        questions: [
          {
            id: 'ai-q1',
            type: 'multiple-choice',
            question: 'Which of the following is a primitive data type in JavaScript?',
            options: [
              { id: 'a', text: 'Object' },
              { id: 'b', text: 'Array' },
              { id: 'c', text: 'String' },
              { id: 'd', text: 'Function' }
            ],
            correctAnswers: ['c'],
            allowMultiple: false,
            points: 10,
            explanation: 'String is a primitive data type in JavaScript, while Object, Array, and Function are reference types.'
          },
          {
            id: 'ai-q2',
            type: 'shortform',
            question: 'What does the "this" keyword refer to in JavaScript?',
            expectedAnswer: 'The current execution context',
            acceptableAnswers: [
              'execution context',
              'current context',
              'calling object',
              'the object that called the function'
            ],
            caseSensitive: false,
            maxLength: 200,
            points: 15,
            explanation: 'The "this" keyword refers to the object that is currently executing the code.'
          },
          {
            id: 'ai-q3',
            type: 'code',
            question: 'Write a function that returns the sum of two numbers',
            language: 'javascript',
            starterCode: 'function add(a, b) {\n  // Your code here\n}',
            points: 20,
            explanation: 'A simple function that adds two parameters and returns the result.'
          },
          {
            id: 'ai-q4',
            type: 'explanation',
            question: 'Explain the difference between let, const, and var in JavaScript',
            minWords: 30,
            points: 25,
            explanation: 'These are different ways to declare variables with different scoping and mutability rules.'
          },
          {
            id: 'ai-q5',
            type: 'one-liner',
            question: 'What method is used to add an element to the end of an array?',
            expectedAnswer: 'push',
            acceptableAnswers: ['push()', '.push()', 'Array.push'],
            caseSensitive: false,
            points: 10
          }
        ],
        passingScore: 70,
        allowReview: true,
        showProgressBar: true
      }

      const submission: MultiQuestionSubmission = {
        kataType: 'multi-question',
        answers: {
          'ai-q1': ['c'], // Correct multiple choice
          'ai-q2': 'The current execution context', // Correct shortform
          'ai-q3': 'function add(a, b) {\n  return a + b;\n}', // Correct code
          'ai-q4': 'let and const are block-scoped while var is function-scoped. const cannot be reassigned after declaration, let can be reassigned, and var can be reassigned and redeclared.', // Good explanation
          'ai-q5': 'push' // Correct one-liner
        },
        multiQuestionConfig: aiGeneratedConfig
      }

      const result = await evaluatorService.evaluateMultiQuestionSubmission(submission)

      expect(result.success).toBe(true)
      expect(result.score).toBeGreaterThanOrEqual(70) // Should pass
      expect(result.testResults).toHaveLength(5)
      
      // Verify each question was evaluated
      expect(result.testResults[0].passed).toBe(true) // Multiple choice
      expect(result.testResults[1].passed).toBe(true) // Shortform
      expect(result.testResults[2].passed).toBe(true) // Code (basic validation)
      expect(result.testResults[3].passed).toBe(true) // Explanation (meets word count)
      expect(result.testResults[4].passed).toBe(true) // One-liner
    })

    it('should handle AI-generated questions with various difficulty levels', async () => {
      const advancedConfig: MultiQuestionConfig = {
        title: 'Advanced Algorithm Assessment',
        description: 'AI-generated advanced programming challenges',
        questions: [
          {
            id: 'adv-q1',
            type: 'multiple-choice',
            question: 'What is the time complexity of quicksort in the average case?',
            options: [
              { id: 'a', text: 'O(n)' },
              { id: 'b', text: 'O(n log n)' },
              { id: 'c', text: 'O(n²)' },
              { id: 'd', text: 'O(log n)' }
            ],
            correctAnswers: ['b'],
            allowMultiple: false,
            points: 20
          },
          {
            id: 'adv-q2',
            type: 'explanation',
            question: 'Explain the concept of dynamic programming and provide an example',
            minWords: 100,
            points: 30
          }
        ],
        passingScore: 80,
        allowReview: true,
        showProgressBar: true
      }

      const submission: MultiQuestionSubmission = {
        kataType: 'multi-question',
        answers: {
          'adv-q1': ['b'], // Correct
          'adv-q2': 'Dynamic programming is an optimization technique that solves complex problems by breaking them down into simpler subproblems. It stores the results of subproblems to avoid redundant calculations. A classic example is the Fibonacci sequence where we can store previously calculated values instead of recalculating them each time. This reduces the time complexity from exponential to linear. The key principles are optimal substructure and overlapping subproblems. Memoization and tabulation are two common approaches to implement dynamic programming solutions.' // Good explanation, meets word count
        },
        multiQuestionConfig: advancedConfig
      }

      const result = await evaluatorService.evaluateMultiQuestionSubmission(submission)

      expect(result.success).toBe(true)
      expect(result.score).toBeGreaterThanOrEqual(80)
      expect(result.testResults).toHaveLength(2)
    })

    it('should handle mixed question types with partial credit', async () => {
      const mixedConfig: MultiQuestionConfig = {
        title: 'Mixed Assessment',
        description: 'AI-generated mixed question types',
        questions: [
          {
            id: 'mix-q1',
            type: 'multiple-choice',
            question: 'Select all valid JavaScript array methods:',
            options: [
              { id: 'a', text: 'push()' },
              { id: 'b', text: 'pop()' },
              { id: 'c', text: 'shift()' },
              { id: 'd', text: 'invalid()' }
            ],
            correctAnswers: ['a', 'b', 'c'],
            allowMultiple: true,
            points: 30
          },
          {
            id: 'mix-q2',
            type: 'shortform',
            question: 'What is the result of 2 + "2" in JavaScript?',
            expectedAnswer: '22',
            acceptableAnswers: ['"22"', '22', 'string 22'],
            points: 20
          }
        ],
        passingScore: 60,
        allowReview: true,
        showProgressBar: true
      }

      const submission: MultiQuestionSubmission = {
        kataType: 'multi-question',
        answers: {
          'mix-q1': ['a', 'b'], // Partially correct (missing 'c')
          'mix-q2': '22' // Correct
        },
        multiQuestionConfig: mixedConfig
      }

      const result = await evaluatorService.evaluateMultiQuestionSubmission(submission)

      // Should fail because multiple choice is incorrect and doesn't meet passing score
      expect(result.success).toBe(false)
      expect(result.score).toBeLessThan(60)
      expect(result.testResults).toHaveLength(2)
      expect(result.testResults[0].passed).toBe(false) // Multiple choice incorrect
      expect(result.testResults[1].passed).toBe(true) // Shortform correct
    })
  })

  describe('AI Generated Single Question Katas', () => {
    it('should evaluate AI-generated shortform katas', async () => {
      const shortformSubmission: ShortformSubmission = {
        kataType: 'shortform',
        answer: 'Bubble sort',
        shortformConfig: {
          question: 'What is a simple O(n²) sorting algorithm?',
          expectedAnswer: 'Bubble sort',
          acceptableAnswers: ['bubble sort', 'selection sort', 'insertion sort'],
          caseSensitive: false,
          maxLength: 100,
          explanation: 'These are all simple quadratic sorting algorithms suitable for small datasets.'
        }
      }

      const result = await evaluatorService.evaluateSubmission(shortformSubmission)

      expect(result.success).toBe(true)
      expect(result.score).toBe(100)
      expect(result.testResults[0].passed).toBe(true)
    })

    it('should evaluate AI-generated multiple choice katas', async () => {
      const multipleChoiceSubmission: ShortformSubmission = {
        kataType: 'multiple-choice',
        answer: ['b', 'c'],
        multipleChoiceConfig: {
          question: 'Which of the following are functional programming concepts?',
          options: [
            { id: 'a', text: 'Inheritance' },
            { id: 'b', text: 'Immutability' },
            { id: 'c', text: 'Pure functions' },
            { id: 'd', text: 'Polymorphism' }
          ],
          correctAnswers: ['b', 'c'],
          allowMultiple: true,
          explanation: 'Immutability and pure functions are core concepts in functional programming.'
        }
      }

      const result = await evaluatorService.evaluateSubmission(multipleChoiceSubmission)

      expect(result.success).toBe(true)
      expect(result.score).toBe(100)
      expect(result.testResults[0].passed).toBe(true)
    })

    it('should evaluate AI-generated one-liner katas', async () => {
      const oneLinerSubmission: ShortformSubmission = {
        kataType: 'one-liner',
        answer: 'O(1)',
        oneLinerConfig: {
          question: 'What is the time complexity of accessing an array element by index?',
          expectedAnswer: 'O(1)',
          acceptableAnswers: ['O(1)', 'constant time', 'constant'],
          caseSensitive: false
        }
      }

      const result = await evaluatorService.evaluateSubmission(oneLinerSubmission)

      expect(result.success).toBe(true)
      expect(result.score).toBe(100)
      expect(result.testResults[0].passed).toBe(true)
    })
  })

  describe('Error Handling for AI Generated Content', () => {
    it('should handle malformed AI-generated configurations gracefully', async () => {
      const malformedConfig: MultiQuestionConfig = {
        title: 'Malformed Assessment',
        description: 'Test malformed config handling',
        questions: [
          {
            id: 'malformed-q1',
            type: 'multiple-choice',
            question: 'Test question',
            options: [], // Empty options array
            correctAnswers: ['a'], // References non-existent option
            points: 10
          }
        ],
        passingScore: 70,
        allowReview: true,
        showProgressBar: true
      }

      const submission: MultiQuestionSubmission = {
        kataType: 'multi-question',
        answers: {
          'malformed-q1': ['a']
        },
        multiQuestionConfig: malformedConfig
      }

      const result = await evaluatorService.evaluateMultiQuestionSubmission(submission)

      // Should handle gracefully and not crash
      expect(result).toBeDefined()
      expect(result.success).toBe(false)
      expect(result.testResults).toHaveLength(1)
    })

    it('should validate AI-generated submission formats', () => {
      const invalidSubmission = {
        kataType: 'shortform' as const,
        answer: null, // Invalid answer
        shortformConfig: {
          question: 'Test question',
          expectedAnswer: 'Test answer'
        }
      }

      const validation = evaluatorService.validateSubmission(invalidSubmission as any)

      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('Answer is required')
    })
  })

  describe('Performance with AI Generated Content', () => {
    it('should handle large AI-generated assessments efficiently', async () => {
      // Create a large assessment with many questions
      const questions: ShortformQuestion[] = []
      const answers: Record<string, string | string[]> = {}

      for (let i = 1; i <= 50; i++) {
        questions.push({
          id: `perf-q${i}`,
          type: 'shortform',
          question: `Question ${i}: What is ${i} + ${i}?`,
          expectedAnswer: (i + i).toString(),
          points: 2
        })
        answers[`perf-q${i}`] = (i + i).toString()
      }

      const largeConfig: MultiQuestionConfig = {
        title: 'Large Performance Test',
        description: 'Testing performance with many questions',
        questions,
        passingScore: 70,
        allowReview: true,
        showProgressBar: true
      }

      const submission: MultiQuestionSubmission = {
        kataType: 'multi-question',
        answers,
        multiQuestionConfig: largeConfig
      }

      const startTime = Date.now()
      const result = await evaluatorService.evaluateMultiQuestionSubmission(submission)
      const endTime = Date.now()

      expect(result.success).toBe(true)
      expect(result.testResults).toHaveLength(50)
      expect(endTime - startTime).toBeLessThan(1000) // Should complete within 1 second
    })
  })
})