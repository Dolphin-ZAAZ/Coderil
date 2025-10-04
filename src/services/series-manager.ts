import { Kata, Difficulty } from '@/types'

export interface KataSeries {
  name: string
  baseKata: Kata
  variations: Kata[]
  progression: SeriesProgression
}

export interface SeriesProgression {
  difficultyOrder: Difficulty[]
  focusAreas: string[]
  parameterEvolution: ParameterEvolution[]
}

export interface ParameterEvolution {
  parameter: string
  values: any[]
  description: string
}

export interface SeriesGenerationPlan {
  seriesName: string
  baseKata: Kata
  targetVariations: VariationPlan[]
}

export interface VariationPlan {
  title: string
  difficulty: Difficulty
  focusArea?: string
  parameterChanges?: string
  description: string
}

/**
 * Service for managing kata series and progression logic
 */
export class SeriesManagerService {
  private static instance: SeriesManagerService

  static getInstance(): SeriesManagerService {
    if (!SeriesManagerService.instance) {
      SeriesManagerService.instance = new SeriesManagerService()
    }
    return SeriesManagerService.instance
  }

  /**
   * Generate a series name based on the source kata and focus
   */
  generateSeriesName(sourceKata: Kata, focusArea?: string): string {
    const baseName = this.slugify(sourceKata.title)
    
    if (focusArea) {
      const focusSlug = this.slugify(focusArea)
      return `${baseName}-${focusSlug}-series`
    }
    
    return `${baseName}-variations`
  }

  /**
   * Create a progression plan for a kata series
   */
  createSeriesProgression(
    sourceKata: Kata, 
    seriesName: string,
    targetCount: number = 3
  ): SeriesGenerationPlan {
    const variations: VariationPlan[] = []
    
    // Create easier variation if source isn't already easy
    if (sourceKata.difficulty !== 'easy') {
      variations.push({
        title: `${sourceKata.title} - Simplified`,
        difficulty: 'easy',
        focusArea: 'basic implementation',
        description: 'Simplified version focusing on core concepts'
      })
    }
    
    // Create harder variation if source isn't already hard
    if (sourceKata.difficulty !== 'hard') {
      variations.push({
        title: `${sourceKata.title} - Advanced`,
        difficulty: 'hard',
        focusArea: 'optimization and edge cases',
        parameterChanges: 'Add performance requirements and complex constraints',
        description: 'Advanced version with optimization challenges'
      })
    }
    
    // Create contextual variations
    const contextualVariations = this.generateContextualVariations(sourceKata, targetCount - variations.length)
    variations.push(...contextualVariations)
    
    return {
      seriesName,
      baseKata: sourceKata,
      targetVariations: variations.slice(0, targetCount)
    }
  }

  /**
   * Generate contextual variations that change the problem domain
   */
  private generateContextualVariations(sourceKata: Kata, count: number): VariationPlan[] {
    const variations: VariationPlan[] = []
    const contexts = this.getContextualVariations(sourceKata.type)
    
    for (let i = 0; i < Math.min(count, contexts.length); i++) {
      const context = contexts[i]
      variations.push({
        title: `${sourceKata.title} - ${context.name}`,
        difficulty: sourceKata.difficulty,
        focusArea: context.focusArea,
        parameterChanges: context.parameterChanges,
        description: context.description
      })
    }
    
    return variations
  }

  /**
   * Get contextual variation ideas based on kata type
   */
  private getContextualVariations(kataType: string): Array<{
    name: string
    focusArea: string
    parameterChanges?: string
    description: string
  }> {
    const commonVariations = [
      {
        name: 'Real-World Application',
        focusArea: 'practical implementation',
        parameterChanges: 'Use realistic data formats and constraints',
        description: 'Apply the same algorithm to a real-world scenario'
      },
      {
        name: 'Performance Focus',
        focusArea: 'optimization',
        parameterChanges: 'Add time/space complexity requirements',
        description: 'Emphasize algorithmic efficiency and optimization'
      },
      {
        name: 'Edge Case Challenge',
        focusArea: 'robustness',
        parameterChanges: 'Include more boundary conditions and special cases',
        description: 'Focus on handling edge cases and error conditions'
      }
    ]

    const typeSpecificVariations: Record<string, Array<any>> = {
      'code': [
        {
          name: 'Interactive Version',
          focusArea: 'user interaction',
          parameterChanges: 'Add input validation and user feedback',
          description: 'Create an interactive version with user input handling'
        },
        {
          name: 'Batch Processing',
          focusArea: 'data processing',
          parameterChanges: 'Process multiple inputs efficiently',
          description: 'Extend to handle batch processing of multiple inputs'
        }
      ],
      'explain': [
        {
          name: 'Comparative Analysis',
          focusArea: 'critical thinking',
          description: 'Compare and contrast different approaches or concepts'
        },
        {
          name: 'Teaching Perspective',
          focusArea: 'pedagogy',
          description: 'Explain the concept from a teaching perspective'
        }
      ],
      'template': [
        {
          name: 'Framework Integration',
          focusArea: 'framework usage',
          parameterChanges: 'Integrate with popular frameworks or libraries',
          description: 'Adapt the template for specific frameworks'
        },
        {
          name: 'Production Ready',
          focusArea: 'production practices',
          parameterChanges: 'Add logging, error handling, and monitoring',
          description: 'Create a production-ready version with best practices'
        }
      ]
    }

    return [
      ...commonVariations,
      ...(typeSpecificVariations[kataType] || [])
    ]
  }

  /**
   * Analyze existing katas to detect series patterns
   */
  detectExistingSeries(katas: Kata[]): KataSeries[] {
    const seriesMap = new Map<string, Kata[]>()
    
    // Group katas by potential series names
    katas.forEach(kata => {
      const potentialSeries = this.extractSeriesName(kata.slug)
      if (potentialSeries) {
        if (!seriesMap.has(potentialSeries)) {
          seriesMap.set(potentialSeries, [])
        }
        seriesMap.get(potentialSeries)!.push(kata)
      }
    })
    
    // Convert to series objects
    const series: KataSeries[] = []
    seriesMap.forEach((katas, seriesName) => {
      if (katas.length > 1) {
        const baseKata = this.identifyBaseKata(katas)
        const variations = katas.filter(k => k.slug !== baseKata.slug)
        
        series.push({
          name: seriesName,
          baseKata,
          variations,
          progression: this.analyzeProgression(katas)
        })
      }
    })
    
    return series
  }

  /**
   * Extract potential series name from kata slug
   */
  private extractSeriesName(slug: string): string | null {
    // Look for common series patterns
    const patterns = [
      /-variations?$/,
      /-series$/,
      /-\d+$/,
      /-v\d+$/,
      /-part-\d+$/,
      /-level-\d+$/
    ]
    
    for (const pattern of patterns) {
      if (pattern.test(slug)) {
        return slug.replace(pattern, '')
      }
    }
    
    // Look for difficulty-based series (e.g., "kata-name-easy", "kata-name-hard")
    const difficultyPattern = /-(easy|medium|hard)$/
    if (difficultyPattern.test(slug)) {
      return slug.replace(difficultyPattern, '')
    }
    
    return null
  }

  /**
   * Identify the base kata in a series (usually the original or simplest)
   */
  private identifyBaseKata(katas: Kata[]): Kata {
    // Prefer the kata without series suffixes
    const withoutSuffix = katas.find(kata => 
      !/-\d+$/.test(kata.slug) && 
      !/-v\d+$/.test(kata.slug) &&
      !/-variations?$/.test(kata.slug)
    )
    
    if (withoutSuffix) return withoutSuffix
    
    // Otherwise, return the first one alphabetically
    return katas.sort((a, b) => a.slug.localeCompare(b.slug))[0]
  }

  /**
   * Analyze the progression pattern in a series
   */
  private analyzeProgression(katas: Kata[]): SeriesProgression {
    const difficulties = katas.map(k => k.difficulty)
    const uniqueDifficulties = Array.from(new Set(difficulties)) as Difficulty[]
    
    // Sort difficulties in logical order
    const difficultyOrder: Difficulty[] = ['easy', 'medium', 'hard'].filter(d => 
      uniqueDifficulties.includes(d as Difficulty)
    ) as Difficulty[]
    
    // Extract focus areas from tags
    const allTags = katas.flatMap(k => k.tags)
    const focusAreas = Array.from(new Set(allTags))
    
    return {
      difficultyOrder,
      focusAreas,
      parameterEvolution: [] // Could be enhanced to detect parameter patterns
    }
  }

  /**
   * Generate next variation suggestion for a series
   */
  generateNextVariationSuggestion(series: KataSeries): VariationPlan | null {
    const existingDifficulties = new Set([
      series.baseKata.difficulty,
      ...series.variations.map(v => v.difficulty)
    ])
    
    // Suggest missing difficulty levels
    const allDifficulties: Difficulty[] = ['easy', 'medium', 'hard']
    const missingDifficulties = allDifficulties.filter(d => !existingDifficulties.has(d))
    
    if (missingDifficulties.length > 0) {
      const targetDifficulty = missingDifficulties[0]
      return {
        title: `${series.baseKata.title} - ${this.capitalize(targetDifficulty)}`,
        difficulty: targetDifficulty,
        focusArea: this.getDifficultyFocus(targetDifficulty),
        description: `${this.capitalize(targetDifficulty)} variation of the ${series.name} series`
      }
    }
    
    // Suggest contextual variation
    const usedContexts = series.variations.map(v => this.extractContext(v.title))
    const availableContexts = this.getContextualVariations(series.baseKata.type)
      .filter(c => !usedContexts.includes(c.name))
    
    if (availableContexts.length > 0) {
      const context = availableContexts[0]
      return {
        title: `${series.baseKata.title} - ${context.name}`,
        difficulty: series.baseKata.difficulty,
        focusArea: context.focusArea,
        parameterChanges: context.parameterChanges,
        description: context.description
      }
    }
    
    return null
  }

  /**
   * Utility methods
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }

  private capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1)
  }

  private getDifficultyFocus(difficulty: Difficulty): string {
    const focusMap: Record<Difficulty, string> = {
      'easy': 'basic concepts and implementation',
      'medium': 'intermediate algorithms and problem solving',
      'hard': 'advanced optimization and complex scenarios'
    }
    return focusMap[difficulty]
  }

  private extractContext(title: string): string {
    const parts = title.split(' - ')
    return parts.length > 1 ? parts[parts.length - 1] : ''
  }
}