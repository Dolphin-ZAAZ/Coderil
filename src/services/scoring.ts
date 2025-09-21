import { ExecutionResult, TestResult, AIJudgment } from '@/types'

export interface ScoringConfig {
  publicWeight: number
  hiddenWeight: number
  passingThreshold: number
}

export interface CombinedExecutionResult extends ExecutionResult {
  publicResults?: ExecutionResult
  hiddenResults?: ExecutionResult
  finalScore: number
  passed: boolean
}

export class ScoringService {
  private static instance: ScoringService | null = null
  
  private readonly defaultConfig: ScoringConfig = {
    publicWeight: 0.3,
    hiddenWeight: 0.7,
    passingThreshold: 70
  }

  static getInstance(): ScoringService {
    if (!ScoringService.instance) {
      ScoringService.instance = new ScoringService()
    }
    return ScoringService.instance
  }

  /**
   * Calculate score from test results
   */
  calculateScore(testResults: TestResult[]): number {
    if (testResults.length === 0) {
      return 0
    }

    const passedTests = testResults.filter(test => test.passed).length
    return (passedTests / testResults.length) * 100
  }

  /**
   * Combine public and hidden test results with weighted scoring
   */
  combineResults(
    publicResult: ExecutionResult,
    hiddenResult: ExecutionResult,
    config: Partial<ScoringConfig> = {}
  ): CombinedExecutionResult {
    const scoringConfig = { ...this.defaultConfig, ...config }
    
    // Calculate individual scores
    const publicScore = publicResult.score ?? this.calculateScore(publicResult.testResults)
    const hiddenScore = hiddenResult.score ?? this.calculateScore(hiddenResult.testResults)
    
    // Calculate weighted final score
    const finalScore = (publicScore * scoringConfig.publicWeight) + (hiddenScore * scoringConfig.hiddenWeight)
    
    // Determine if passed based on threshold and both test suites succeeding
    const passed = finalScore >= scoringConfig.passingThreshold && 
                   publicResult.success && 
                   hiddenResult.success

    // Combine test results with labels
    const labeledPublicTests = publicResult.testResults.map(test => ({
      ...test,
      name: `[Public] ${test.name}`
    }))
    
    const labeledHiddenTests = hiddenResult.testResults.map(test => ({
      ...test,
      name: `[Hidden] ${test.name}`,
      // Hide detailed failure information for hidden tests
      message: test.passed ? test.message : 'Hidden test failed',
      expected: test.passed ? test.expected : undefined,
      actual: test.passed ? test.actual : undefined
    }))

    // Combine outputs with clear separation
    const combinedOutput = this.combineOutputs(publicResult.output, hiddenResult.output)
    const combinedErrors = this.combineErrors(publicResult.errors, hiddenResult.errors)

    return {
      success: passed,
      output: combinedOutput,
      errors: combinedErrors,
      testResults: [...labeledPublicTests, ...labeledHiddenTests],
      score: finalScore,
      finalScore,
      passed,
      duration: publicResult.duration + hiddenResult.duration,
      publicResults: publicResult,
      hiddenResults: hiddenResult
    }
  }

  /**
   * Process single execution result for display
   */
  processResult(result: ExecutionResult): ExecutionResult {
    // Ensure score is calculated if not present
    const score = result.score ?? this.calculateScore(result.testResults)
    
    return {
      ...result,
      score
    }
  }

  /**
   * Determine pass/fail status based on score and success
   */
  determinePassStatus(result: ExecutionResult, threshold: number = 70): boolean {
    const score = result.score ?? this.calculateScore(result.testResults)
    return result.success && score >= threshold
  }

  /**
   * Format test results for display
   */
  formatTestResults(testResults: TestResult[]): TestResult[] {
    return testResults.map((test, index) => ({
      ...test,
      name: test.name || `Test ${index + 1}`,
      message: test.message || (test.passed ? 'Test passed' : 'Test failed')
    }))
  }

  /**
   * Get scoring summary for display
   */
  getScoringSummary(result: CombinedExecutionResult): {
    publicScore: number
    hiddenScore: number
    finalScore: number
    publicWeight: number
    hiddenWeight: number
    passed: boolean
  } {
    const publicScore = result.publicResults?.score ?? 0
    const hiddenScore = result.hiddenResults?.score ?? 0
    
    return {
      publicScore,
      hiddenScore,
      finalScore: result.finalScore,
      publicWeight: this.defaultConfig.publicWeight,
      hiddenWeight: this.defaultConfig.hiddenWeight,
      passed: result.passed
    }
  }

  /**
   * Validate AI judgment result
   */
  validateAIJudgment(judgment: AIJudgment): boolean {
    return (
      typeof judgment.totalScore === 'number' &&
      typeof judgment.pass === 'boolean' &&
      typeof judgment.feedback === 'string' &&
      typeof judgment.scores === 'object' &&
      judgment.totalScore >= 0 &&
      judgment.totalScore <= 100
    )
  }

  /**
   * Process AI judgment for display
   */
  processAIJudgment(judgment: AIJudgment): AIJudgment {
    // Ensure scores are within valid range
    const processedScores = Object.entries(judgment.scores).reduce((acc, [key, score]) => {
      acc[key] = Math.max(0, Math.min(100, score))
      return acc
    }, {} as Record<string, number>)

    // Recalculate total score if needed
    const totalScore = Object.keys(processedScores).length > 0
      ? Object.values(processedScores).reduce((sum, score) => sum + score, 0) / Object.keys(processedScores).length
      : Math.max(0, Math.min(100, judgment.totalScore))

    return {
      ...judgment,
      scores: processedScores,
      totalScore
    }
  }

  /**
   * Combine output strings with clear separation
   */
  private combineOutputs(publicOutput: string, hiddenOutput: string): string {
    const sections: string[] = []
    
    if (publicOutput.trim()) {
      sections.push('=== Public Tests ===')
      sections.push(publicOutput.trim())
    }
    
    if (hiddenOutput.trim()) {
      sections.push('=== Hidden Tests ===')
      sections.push(hiddenOutput.trim())
    }
    
    return sections.join('\n\n')
  }

  /**
   * Combine error strings with clear separation
   */
  private combineErrors(publicErrors: string, hiddenErrors: string): string {
    const sections: string[] = []
    
    if (publicErrors.trim()) {
      sections.push('=== Public Test Errors ===')
      sections.push(publicErrors.trim())
    }
    
    if (hiddenErrors.trim()) {
      sections.push('=== Hidden Test Errors ===')
      sections.push(hiddenErrors.trim())
    }
    
    return sections.join('\n\n')
  }
}