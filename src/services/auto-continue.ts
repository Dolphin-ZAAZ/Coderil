import { Kata, KataFilters, ExecutionResult, AIJudgment, AutoContinueNotification } from '@/types'

export class AutoContinueService {
  private static instance: AutoContinueService

  private constructor() {}

  public static getInstance(): AutoContinueService {
    if (!AutoContinueService.instance) {
      AutoContinueService.instance = new AutoContinueService()
    }
    return AutoContinueService.instance
  }

  // For testing purposes
  public static resetInstance(): void {
    AutoContinueService.instance = undefined as any
  }

  /**
   * Get a random kata that respects current filters and is different from the current kata
   */
  public getRandomKata(
    currentKata: Kata,
    availableKatas: Kata[],
    filters: KataFilters
  ): Kata | null {
    // Filter out the current kata
    let filteredKatas = availableKatas.filter(kata => kata.slug !== currentKata.slug)

    // Apply filters
    if (filters.difficulty && filters.difficulty.length > 0) {
      filteredKatas = filteredKatas.filter(kata => 
        filters.difficulty!.includes(kata.difficulty)
      )
    }

    if (filters.language && filters.language.length > 0) {
      filteredKatas = filteredKatas.filter(kata => 
        filters.language!.includes(kata.language)
      )
    }

    if (filters.type && filters.type.length > 0) {
      filteredKatas = filteredKatas.filter(kata => 
        filters.type!.includes(kata.type)
      )
    }

    if (filters.tags && filters.tags.length > 0) {
      filteredKatas = filteredKatas.filter(kata => 
        filters.tags!.some(tag => kata.tags.includes(tag))
      )
    }

    // Return null if no suitable katas found
    if (filteredKatas.length === 0) {
      return null
    }

    // Select random kata
    const randomIndex = Math.floor(Math.random() * filteredKatas.length)
    return filteredKatas[randomIndex]
  }

  /**
   * Determine if auto-continue should trigger based on execution result
   */
  public shouldTrigger(result: ExecutionResult | AIJudgment): boolean {
    // Check if it's an ExecutionResult
    if ('success' in result && 'testResults' in result) {
      const execResult = result as ExecutionResult
      // For code katas, check if all tests passed and score is high enough
      if (execResult.success && execResult.testResults.every(test => test.passed)) {
        // Consider passed if score is 70% or higher, or if no score is available but all tests passed
        return execResult.score === undefined || execResult.score >= 70
      }
      return false
    }

    // Check if it's an AIJudgment
    if ('pass' in result && 'totalScore' in result) {
      const aiResult = result as AIJudgment
      return aiResult.pass
    }

    return false
  }

  /**
   * Create a notification for auto-continue transition
   */
  public createNotification(fromKata: Kata, toKata: Kata): AutoContinueNotification {
    return {
      message: `Auto-continuing from "${fromKata.title}" to "${toKata.title}"`,
      fromKata: fromKata.slug,
      toKata: toKata.slug,
      timestamp: new Date()
    }
  }

  /**
   * Get a random kata from all available katas (for manual random selection)
   */
  public getRandomKataFromFiltered(
    availableKatas: Kata[],
    filters: KataFilters,
    currentKata?: Kata
  ): Kata | null {
    let filteredKatas = [...availableKatas]

    // Filter out current kata if provided
    if (currentKata) {
      filteredKatas = filteredKatas.filter(kata => kata.slug !== currentKata.slug)
    }

    // Apply filters
    if (filters.difficulty && filters.difficulty.length > 0) {
      filteredKatas = filteredKatas.filter(kata => 
        filters.difficulty!.includes(kata.difficulty)
      )
    }

    if (filters.language && filters.language.length > 0) {
      filteredKatas = filteredKatas.filter(kata => 
        filters.language!.includes(kata.language)
      )
    }

    if (filters.type && filters.type.length > 0) {
      filteredKatas = filteredKatas.filter(kata => 
        filters.type!.includes(kata.type)
      )
    }

    if (filters.tags && filters.tags.length > 0) {
      filteredKatas = filteredKatas.filter(kata => 
        filters.tags!.some(tag => kata.tags.includes(tag))
      )
    }

    // Return null if no suitable katas found
    if (filteredKatas.length === 0) {
      return null
    }

    // Select random kata
    const randomIndex = Math.floor(Math.random() * filteredKatas.length)
    return filteredKatas[randomIndex]
  }
}