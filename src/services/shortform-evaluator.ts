import type { 
  MultipleChoiceConfig, 
  ShortformConfig, 
  OneLinerConfig,
  ExecutionResult,
  TestResult,
  KataType
} from '@/types'

export interface ShortformSubmission {
  kataType: KataType
  answer: string | string[]
  multipleChoiceConfig?: MultipleChoiceConfig
  shortformConfig?: ShortformConfig
  oneLinerConfig?: OneLinerConfig
}

export interface ShortformEvaluationResult {
  correct: boolean
  score: number
  feedback: string
  explanation?: string
  expectedAnswer?: string
  actualAnswer: string | string[]
}

export class ShortformEvaluatorService {
  private static instance: ShortformEvaluatorService

  public static getInstance(): ShortformEvaluatorService {
    if (!ShortformEvaluatorService.instance) {
      ShortformEvaluatorService.instance = new ShortformEvaluatorService()
    }
    return ShortformEvaluatorService.instance
  }

  /**
   * Evaluates a shortform kata submission
   */
  public async evaluateSubmission(submission: ShortformSubmission): Promise<ExecutionResult> {
    const startTime = Date.now()
    
    try {
      let result: ShortformEvaluationResult

      switch (submission.kataType) {
        case 'multiple-choice':
          result = this.evaluateMultipleChoice(submission)
          break
        case 'shortform':
          result = this.evaluateShortform(submission)
          break
        case 'one-liner':
          result = this.evaluateOneLiner(submission)
          break
        default:
          throw new Error(`Unsupported kata type: ${submission.kataType}`)
      }

      const duration = Date.now() - startTime
      
      return {
        success: result.correct,
        output: result.feedback,
        errors: result.correct ? '' : 'Answer incorrect',
        testResults: [{
          name: 'Answer Validation',
          passed: result.correct,
          message: result.feedback,
          expected: result.expectedAnswer,
          actual: result.actualAnswer
        }],
        score: result.score,
        duration
      }
    } catch (error) {
      const duration = Date.now() - startTime
      
      return {
        success: false,
        output: '',
        errors: `Evaluation error: ${error}`,
        testResults: [{
          name: 'Answer Validation',
          passed: false,
          message: `Failed to evaluate: ${error}`,
          expected: 'Valid answer',
          actual: submission.answer
        }],
        score: 0,
        duration
      }
    }
  }

  /**
   * Evaluates multiple choice answers
   */
  private evaluateMultipleChoice(submission: ShortformSubmission): ShortformEvaluationResult {
    const config = submission.multipleChoiceConfig
    if (!config) {
      throw new Error('Multiple choice configuration not provided')
    }

    const userAnswers = Array.isArray(submission.answer) ? submission.answer : [submission.answer]
    const correctAnswers = config.correctAnswers.sort()
    const userAnswersSorted = userAnswers.sort()

    const isCorrect = this.arraysEqual(correctAnswers, userAnswersSorted)
    const score = isCorrect ? 100 : 0

    let feedback: string
    if (isCorrect) {
      feedback = 'Correct! Well done.'
    } else {
      const correctOptions = config.options
        .filter(opt => config.correctAnswers.includes(opt.id))
        .map(opt => opt.text)
      
      feedback = `Incorrect. The correct answer${correctOptions.length > 1 ? 's are' : ' is'}: ${correctOptions.join(', ')}`
    }

    return {
      correct: isCorrect,
      score,
      feedback,
      explanation: config.explanation,
      expectedAnswer: correctAnswers.join(', '),
      actualAnswer: userAnswers
    }
  }

  /**
   * Evaluates shortform text answers
   */
  private evaluateShortform(submission: ShortformSubmission): ShortformEvaluationResult {
    const config = submission.shortformConfig
    if (!config) {
      throw new Error('Shortform configuration not provided')
    }

    const userAnswer = Array.isArray(submission.answer) ? submission.answer[0] : submission.answer
    const isCorrect = this.checkTextAnswer(userAnswer, config.expectedAnswer, config.acceptableAnswers, config.caseSensitive)
    const score = isCorrect ? 100 : 0

    let feedback: string
    if (isCorrect) {
      feedback = 'Correct! Your answer matches the expected response.'
    } else {
      feedback = `Incorrect. Expected: ${config.expectedAnswer || 'See acceptable answers'}`
      if (config.acceptableAnswers && config.acceptableAnswers.length > 0) {
        feedback += ` (Acceptable answers: ${config.acceptableAnswers.join(', ')})`
      }
    }

    return {
      correct: isCorrect,
      score,
      feedback,
      explanation: config.explanation,
      expectedAnswer: config.expectedAnswer,
      actualAnswer: userAnswer
    }
  }

  /**
   * Evaluates one-liner answers
   */
  private evaluateOneLiner(submission: ShortformSubmission): ShortformEvaluationResult {
    const config = submission.oneLinerConfig
    if (!config) {
      throw new Error('One-liner configuration not provided')
    }

    const userAnswer = Array.isArray(submission.answer) ? submission.answer[0] : submission.answer
    const isCorrect = this.checkTextAnswer(userAnswer, config.expectedAnswer, config.acceptableAnswers, config.caseSensitive)
    const score = isCorrect ? 100 : 0

    let feedback: string
    if (isCorrect) {
      feedback = 'Correct! Your answer is right on target.'
    } else {
      feedback = `Incorrect. Expected: ${config.expectedAnswer || 'See acceptable answers'}`
      if (config.acceptableAnswers && config.acceptableAnswers.length > 0) {
        feedback += ` (Acceptable answers: ${config.acceptableAnswers.join(', ')})`
      }
    }

    return {
      correct: isCorrect,
      score,
      feedback,
      explanation: config.explanation,
      expectedAnswer: config.expectedAnswer,
      actualAnswer: userAnswer
    }
  }

  /**
   * Checks if a text answer matches expected answers
   */
  private checkTextAnswer(
    userAnswer: string, 
    expectedAnswer?: string, 
    acceptableAnswers?: string[], 
    caseSensitive = false
  ): boolean {
    if (!expectedAnswer && (!acceptableAnswers || acceptableAnswers.length === 0)) {
      return true // No validation criteria provided
    }

    const normalizeAnswer = (answer: string) => {
      let normalized = answer.trim()
      if (!caseSensitive) {
        normalized = normalized.toLowerCase()
      }
      return normalized
    }

    const normalizedUserAnswer = normalizeAnswer(userAnswer)

    // Check against expected answer
    if (expectedAnswer && normalizeAnswer(expectedAnswer) === normalizedUserAnswer) {
      return true
    }

    // Check against acceptable answers
    if (acceptableAnswers) {
      return acceptableAnswers.some(acceptable => 
        normalizeAnswer(acceptable) === normalizedUserAnswer
      )
    }

    return false
  }

  /**
   * Utility function to compare arrays for equality
   */
  private arraysEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false
    return a.every((val, index) => val === b[index])
  }

  /**
   * Validates a shortform submission
   */
  public validateSubmission(submission: ShortformSubmission): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!submission.answer) {
      errors.push('Answer is required')
    }

    switch (submission.kataType) {
      case 'multiple-choice':
        if (!submission.multipleChoiceConfig) {
          errors.push('Multiple choice configuration is required')
        } else if (!Array.isArray(submission.answer) && typeof submission.answer !== 'string') {
          errors.push('Multiple choice answer must be a string or array of strings')
        }
        break

      case 'shortform':
        if (!submission.shortformConfig) {
          errors.push('Shortform configuration is required')
        } else if (typeof submission.answer !== 'string') {
          errors.push('Shortform answer must be a string')
        } else if (submission.shortformConfig.maxLength && submission.answer.length > submission.shortformConfig.maxLength) {
          errors.push(`Answer exceeds maximum length of ${submission.shortformConfig.maxLength} characters`)
        }
        break

      case 'one-liner':
        if (!submission.oneLinerConfig) {
          errors.push('One-liner configuration is required')
        } else if (typeof submission.answer !== 'string') {
          errors.push('One-liner answer must be a string')
        }
        break

      default:
        errors.push(`Unsupported kata type: ${submission.kataType}`)
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}