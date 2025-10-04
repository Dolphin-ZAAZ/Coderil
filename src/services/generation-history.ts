import { 
  GeneratedKata, 
  KataGenerationRequest
} from '@/types'

export interface GenerationHistoryEntry {
  id: string
  timestamp: Date
  request: KataGenerationRequest
  result: 'success' | 'error' | 'cancelled'
  generatedKata?: GeneratedKata
  error?: string
  tokensUsed: number
  estimatedCost: number
  generationTime: number
  model: string
}

export interface GenerationSession {
  id: string
  startTime: Date
  endTime?: Date
  totalGenerations: number
  successfulGenerations: number
  failedGenerations: number
  totalTokensUsed: number
  totalCost: number
  averageGenerationTime: number
}

export interface GenerationStats {
  totalGenerations: number
  successfulGenerations: number
  failedGenerations: number
  totalTokensUsed: number
  totalCost: number
  averageGenerationTime: number
  mostUsedLanguage: string
  mostUsedDifficulty: string
  mostUsedType: string
  recentGenerations: GenerationHistoryEntry[]
}

/**
 * Service for tracking AI kata generation history and statistics
 */
export class GenerationHistoryService {
  private static instance: GenerationHistoryService
  private history: GenerationHistoryEntry[] = []
  private currentSession: GenerationSession | null = null
  private readonly maxHistoryEntries = 1000
  private readonly storageKey = 'ai-generation-history'
  private readonly sessionStorageKey = 'ai-generation-session'

  private constructor() {
    this.loadHistory()
    this.startNewSession()
  }

  static getInstance(): GenerationHistoryService {
    if (!GenerationHistoryService.instance) {
      GenerationHistoryService.instance = new GenerationHistoryService()
    }
    return GenerationHistoryService.instance
  }

  /**
   * Start a new generation session
   */
  startNewSession(): void {
    // End current session if exists
    if (this.currentSession && !this.currentSession.endTime) {
      this.endCurrentSession()
    }

    this.currentSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      startTime: new Date(),
      totalGenerations: 0,
      successfulGenerations: 0,
      failedGenerations: 0,
      totalTokensUsed: 0,
      totalCost: 0,
      averageGenerationTime: 0
    }

    this.saveSession()
  }

  /**
   * End the current generation session
   */
  endCurrentSession(): void {
    if (this.currentSession && !this.currentSession.endTime) {
      this.currentSession.endTime = new Date()
      this.saveSession()
    }
  }

  /**
   * Record a successful generation
   */
  recordSuccessfulGeneration(
    request: KataGenerationRequest,
    generatedKata: GeneratedKata,
    tokensUsed: number,
    estimatedCost: number,
    generationTime: number,
    model: string
  ): void {
    const entry: GenerationHistoryEntry = {
      id: `gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      request,
      result: 'success',
      generatedKata,
      tokensUsed,
      estimatedCost,
      generationTime,
      model
    }

    this.addHistoryEntry(entry)
    this.updateSessionStats(entry)
  }

  /**
   * Record a failed generation
   */
  recordFailedGeneration(
    request: KataGenerationRequest,
    error: string,
    tokensUsed: number = 0,
    estimatedCost: number = 0,
    generationTime: number,
    model: string
  ): void {
    const entry: GenerationHistoryEntry = {
      id: `gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      request,
      result: 'error',
      error,
      tokensUsed,
      estimatedCost,
      generationTime,
      model
    }

    this.addHistoryEntry(entry)
    this.updateSessionStats(entry)
  }

  /**
   * Record a cancelled generation
   */
  recordCancelledGeneration(
    request: KataGenerationRequest,
    tokensUsed: number = 0,
    estimatedCost: number = 0,
    generationTime: number,
    model: string
  ): void {
    const entry: GenerationHistoryEntry = {
      id: `gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      request,
      result: 'cancelled',
      tokensUsed,
      estimatedCost,
      generationTime,
      model
    }

    this.addHistoryEntry(entry)
    this.updateSessionStats(entry)
  }

  /**
   * Get generation history
   */
  getHistory(limit?: number): GenerationHistoryEntry[] {
    const sortedHistory = [...this.history].sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    )
    
    return limit ? sortedHistory.slice(0, limit) : sortedHistory
  }

  /**
   * Get current session statistics
   */
  getCurrentSession(): GenerationSession | null {
    return this.currentSession ? { ...this.currentSession } : null
  }

  /**
   * Get comprehensive generation statistics
   */
  getGenerationStats(): GenerationStats {
    const recentGenerations = this.getHistory(10)
    
    const totalGenerations = this.history.length
    const successfulGenerations = this.history.filter(h => h.result === 'success').length
    const failedGenerations = this.history.filter(h => h.result === 'error').length
    
    const totalTokensUsed = this.history.reduce((sum, h) => sum + h.tokensUsed, 0)
    const totalCost = this.history.reduce((sum, h) => sum + h.estimatedCost, 0)
    const totalTime = this.history.reduce((sum, h) => sum + h.generationTime, 0)
    const averageGenerationTime = totalGenerations > 0 ? totalTime / totalGenerations : 0

    // Calculate most used values
    const languageCounts = this.countByProperty('language')
    const difficultyCounts = this.countByProperty('difficulty')
    const typeCounts = this.countByProperty('type')

    return {
      totalGenerations,
      successfulGenerations,
      failedGenerations,
      totalTokensUsed,
      totalCost,
      averageGenerationTime,
      mostUsedLanguage: this.getMostUsed(languageCounts),
      mostUsedDifficulty: this.getMostUsed(difficultyCounts),
      mostUsedType: this.getMostUsed(typeCounts),
      recentGenerations
    }
  }

  /**
   * Get cost breakdown by time period
   */
  getCostBreakdown(days: number = 30): {
    daily: { date: string; cost: number; generations: number }[]
    total: number
  } {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    const recentHistory = this.history.filter(h => h.timestamp >= cutoffDate)
    
    // Group by day
    const dailyData = new Map<string, { cost: number; generations: number }>()
    
    recentHistory.forEach(entry => {
      const dateKey = entry.timestamp.toISOString().split('T')[0]
      const existing = dailyData.get(dateKey) || { cost: 0, generations: 0 }
      
      dailyData.set(dateKey, {
        cost: existing.cost + entry.estimatedCost,
        generations: existing.generations + 1
      })
    })

    const daily = Array.from(dailyData.entries()).map(([date, data]) => ({
      date,
      cost: data.cost,
      generations: data.generations
    })).sort((a, b) => a.date.localeCompare(b.date))

    const total = recentHistory.reduce((sum, h) => sum + h.estimatedCost, 0)

    return { daily, total }
  }

  /**
   * Clear generation history
   */
  clearHistory(): void {
    this.history = []
    this.saveHistory()
  }

  /**
   * Export generation history as JSON
   */
  exportHistory(): string {
    return JSON.stringify({
      history: this.history,
      exportDate: new Date().toISOString(),
      version: '1.0'
    }, null, 2)
  }

  /**
   * Import generation history from JSON
   */
  importHistory(jsonData: string): { success: boolean; imported: number; errors: string[] } {
    try {
      const data = JSON.parse(jsonData)
      const errors: string[] = []
      let imported = 0

      if (!data.history || !Array.isArray(data.history)) {
        return { success: false, imported: 0, errors: ['Invalid history format'] }
      }

      data.history.forEach((entry: any, index: number) => {
        try {
          // Validate entry structure
          if (!entry.id || !entry.timestamp || !entry.request || !entry.result) {
            errors.push(`Entry ${index}: Missing required fields`)
            return
          }

          // Convert timestamp string back to Date
          entry.timestamp = new Date(entry.timestamp)
          
          // Add to history if not already exists
          if (!this.history.find(h => h.id === entry.id)) {
            this.history.push(entry)
            imported++
          }
        } catch (error) {
          errors.push(`Entry ${index}: ${error instanceof Error ? error.message : 'Invalid format'}`)
        }
      })

      // Trim history if too large
      if (this.history.length > this.maxHistoryEntries) {
        this.history = this.history
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, this.maxHistoryEntries)
      }

      this.saveHistory()

      return { success: true, imported, errors }
    } catch (error) {
      return { 
        success: false, 
        imported: 0, 
        errors: [`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`] 
      }
    }
  }

  /**
   * Add entry to history
   */
  private addHistoryEntry(entry: GenerationHistoryEntry): void {
    this.history.push(entry)
    
    // Trim history if it gets too large
    if (this.history.length > this.maxHistoryEntries) {
      this.history = this.history
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, this.maxHistoryEntries)
    }
    
    this.saveHistory()
  }

  /**
   * Update current session statistics
   */
  private updateSessionStats(entry: GenerationHistoryEntry): void {
    if (!this.currentSession) return

    this.currentSession.totalGenerations++
    
    if (entry.result === 'success') {
      this.currentSession.successfulGenerations++
    } else if (entry.result === 'error') {
      this.currentSession.failedGenerations++
    }
    
    this.currentSession.totalTokensUsed += entry.tokensUsed
    this.currentSession.totalCost += entry.estimatedCost
    
    // Update average generation time
    const totalTime = this.currentSession.averageGenerationTime * (this.currentSession.totalGenerations - 1) + entry.generationTime
    this.currentSession.averageGenerationTime = totalTime / this.currentSession.totalGenerations

    this.saveSession()
  }

  /**
   * Count occurrences of a property in generation requests
   */
  private countByProperty(property: keyof KataGenerationRequest): Record<string, number> {
    const counts: Record<string, number> = {}
    
    this.history.forEach(entry => {
      const value = entry.request[property]
      if (value) {
        const key = Array.isArray(value) ? value.join(',') : String(value)
        counts[key] = (counts[key] || 0) + 1
      }
    })
    
    return counts
  }

  /**
   * Get the most frequently used value from counts
   */
  private getMostUsed(counts: Record<string, number>): string {
    let maxCount = 0
    let mostUsed = 'N/A'
    
    Object.entries(counts).forEach(([key, count]) => {
      if (count > maxCount) {
        maxCount = count
        mostUsed = key
      }
    })
    
    return mostUsed
  }

  /**
   * Load history from localStorage
   */
  private loadHistory(): void {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        const data = JSON.parse(stored)
        this.history = data.map((entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp)
        }))
      }
    } catch (error) {
      console.warn('Failed to load generation history:', error)
      this.history = []
    }
  }

  /**
   * Save history to localStorage
   */
  private saveHistory(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.history))
    } catch (error) {
      console.warn('Failed to save generation history:', error)
    }
  }

  /**
   * Save current session to localStorage
   */
  private saveSession(): void {
    try {
      if (this.currentSession) {
        localStorage.setItem(this.sessionStorageKey, JSON.stringify(this.currentSession))
      }
    } catch (error) {
      console.warn('Failed to save generation session:', error)
    }
  }
}