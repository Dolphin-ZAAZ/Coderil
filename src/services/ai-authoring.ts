import { 
  KataGenerationRequest, 
  GeneratedKataContent, 
  GeneratedKata,
  GenerationMetadata,
  AIGenerationConfig,
  Kata
} from '@/types'
import { AIConfigService } from './ai-config'
import { PromptEngineService } from './prompt-engine'
import { ResponseParserService } from './response-parser'
import { ContentValidatorService } from './content-validator'
import { FileGeneratorService, FileGenerationResult, SlugConflictResolution } from './file-generator'

export interface VariationOptions {
  difficultyAdjustment: 'easier' | 'harder' | 'same'
  focusArea?: string
  parameterChanges?: string
  seriesName?: string
}

export interface GenerationProgress {
  stage: 'initializing' | 'generating' | 'parsing' | 'validating' | 'complete' | 'error'
  message: string
  progress: number // 0-100
  tokensUsed?: number
  estimatedCost?: number
}

export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  estimatedCost: number
}

export interface RetryConfig {
  maxAttempts: number
  baseDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
}

/**
 * Core AI authoring service that orchestrates kata generation
 */
export class AIAuthoringService {
  private static instance: AIAuthoringService
  private aiConfigService: AIConfigService
  private promptEngineService: PromptEngineService
  private responseParserService: ResponseParserService
  private contentValidatorService: ContentValidatorService
  private fileGeneratorService: FileGeneratorService
  
  // Progress tracking
  private currentProgress: GenerationProgress | null = null
  private progressCallbacks: ((progress: GenerationProgress) => void)[] = []
  
  // Token and cost tracking
  private sessionTokenUsage: TokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    estimatedCost: 0
  }

  private constructor() {
    this.aiConfigService = AIConfigService.getInstance()
    this.promptEngineService = PromptEngineService.getInstance()
    this.responseParserService = ResponseParserService.getInstance()
    this.contentValidatorService = ContentValidatorService.getInstance()
    this.fileGeneratorService = FileGeneratorService.getInstance()
  }

  static getInstance(): AIAuthoringService {
    if (!AIAuthoringService.instance) {
      AIAuthoringService.instance = new AIAuthoringService()
    }
    return AIAuthoringService.instance
  }

  /**
   * Generate a complete kata from a natural language description
   */
  async generateKata(request: KataGenerationRequest): Promise<GeneratedKata> {
    const startTime = Date.now()
    
    try {
      this.updateProgress({
        stage: 'initializing',
        message: 'Initializing kata generation...',
        progress: 0
      })

      // Validate configuration
      const config = await this.aiConfigService.getConfig()
      if (!config.openaiApiKey) {
        throw new AIServiceError('OpenAI API key not configured')
      }

      // Generate prompt
      this.updateProgress({
        stage: 'generating',
        message: 'Generating kata content...',
        progress: 20
      })

      const prompt = this.promptEngineService.buildKataPrompt(request)
      const response = await this.callOpenAIWithRetry(prompt, config)

      // Parse response
      this.updateProgress({
        stage: 'parsing',
        message: 'Parsing generated content...',
        progress: 60
      })

      const content = this.responseParserService.parseKataResponse(response.content, request.type)

      // Validate content
      this.updateProgress({
        stage: 'validating',
        message: 'Validating generated content...',
        progress: 80
      })

      const validationResult = await this.contentValidatorService.validateGeneratedContent(content)
      if (!validationResult.isValid) {
        console.warn('Generated content has validation issues:', validationResult.errors)
        // Continue with warnings, but log them
      }

      // Create generation metadata
      const generationMetadata: GenerationMetadata = {
        timestamp: new Date(),
        model: config.model,
        promptVersion: '1.0',
        originalRequest: request,
        tokensUsed: response.usage.totalTokens,
        generationTime: Date.now() - startTime
      }

      // Generate slug from title
      const slug = this.generateSlug(content.metadata.title)
      content.metadata.slug = slug

      const generatedKata: GeneratedKata = {
        slug,
        content,
        generationMetadata
      }

      this.updateProgress({
        stage: 'complete',
        message: 'Kata generation complete!',
        progress: 100,
        tokensUsed: response.usage.totalTokens,
        estimatedCost: response.usage.estimatedCost
      })

      return generatedKata

    } catch (error) {
      this.updateProgress({
        stage: 'error',
        message: `Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        progress: 0
      })
      
      if (error instanceof AIServiceError) {
        throw error
      }
      
      throw new AIServiceError(
        `Kata generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { retryable: true }
      )
    }
  }

  /**
   * Generate a variation of an existing kata
   */
  async generateVariation(sourceKata: Kata, options: VariationOptions): Promise<GeneratedKata> {
    const startTime = Date.now()
    
    try {
      this.updateProgress({
        stage: 'initializing',
        message: 'Initializing variation generation...',
        progress: 0
      })

      const config = await this.aiConfigService.getConfig()
      if (!config.openaiApiKey) {
        throw new AIServiceError('OpenAI API key not configured')
      }

      this.updateProgress({
        stage: 'generating',
        message: 'Generating kata variation...',
        progress: 20
      })

      const prompt = this.promptEngineService.buildVariationPrompt(sourceKata, options)
      const response = await this.callOpenAIWithRetry(prompt, config)

      this.updateProgress({
        stage: 'parsing',
        message: 'Parsing variation content...',
        progress: 60
      })

      const content = this.responseParserService.parseKataResponse(response.content, sourceKata.type)

      this.updateProgress({
        stage: 'validating',
        message: 'Validating variation content...',
        progress: 80
      })

      const validationResult = await this.contentValidatorService.validateGeneratedContent(content)
      if (!validationResult.isValid) {
        console.warn('Generated variation has validation issues:', validationResult.errors)
      }

      // Create generation metadata
      const generationMetadata: GenerationMetadata = {
        timestamp: new Date(),
        model: config.model,
        promptVersion: '1.0',
        originalRequest: {
          description: `Variation of ${sourceKata.title}`,
          language: sourceKata.language,
          difficulty: sourceKata.difficulty,
          type: sourceKata.type,
          generateHiddenTests: true
        },
        tokensUsed: response.usage.totalTokens,
        generationTime: Date.now() - startTime
      }

      // Generate variation slug
      const baseSlug = options.seriesName ? 
        this.generateSlug(options.seriesName) : 
        sourceKata.slug
      const slug = `${baseSlug}-variation-${Date.now()}`
      content.metadata.slug = slug

      const generatedKata: GeneratedKata = {
        slug,
        content,
        generationMetadata
      }

      this.updateProgress({
        stage: 'complete',
        message: 'Variation generation complete!',
        progress: 100,
        tokensUsed: response.usage.totalTokens,
        estimatedCost: response.usage.estimatedCost
      })

      return generatedKata

    } catch (error) {
      this.updateProgress({
        stage: 'error',
        message: `Variation generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        progress: 0
      })
      
      throw new AIServiceError(
        `Variation generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { retryable: true }
      )
    }
  }

  /**
   * Validate generated content before saving
   */
  async validateGeneration(content: GeneratedKataContent): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    try {
      const result = await this.contentValidatorService.validateGeneratedContent(content)
      return {
        isValid: result.isValid,
        errors: result.errors.map(e => e.message),
        warnings: result.warnings.map(w => w.message)
      }
    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: []
      }
    }
  }

  /**
   * Save generated kata to the file system
   */
  async saveGeneratedKata(
    content: GeneratedKataContent, 
    conflictResolution?: SlugConflictResolution
  ): Promise<FileGenerationResult> {
    try {
      this.updateProgress({
        stage: 'generating',
        message: 'Saving kata files...',
        progress: 90
      })

      const result = await this.fileGeneratorService.generateKataFiles(content, conflictResolution)
      
      if (!result.success) {
        throw new AIServiceError(
          `Failed to save kata files: ${result.errors.join(', ')}`,
          { retryable: false }
        )
      }

      this.updateProgress({
        stage: 'complete',
        message: `Kata saved successfully to ${result.path}`,
        progress: 100
      })

      return result
    } catch (error) {
      this.updateProgress({
        stage: 'error',
        message: `Failed to save kata: ${error instanceof Error ? error.message : 'Unknown error'}`,
        progress: 0
      })

      throw new AIServiceError(
        `Failed to save kata: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { retryable: false }
      )
    }
  }

  /**
   * Get current generation progress
   */
  getCurrentProgress(): GenerationProgress | null {
    return this.currentProgress
  }

  /**
   * Subscribe to progress updates
   */
  onProgress(callback: (progress: GenerationProgress) => void): () => void {
    this.progressCallbacks.push(callback)
    
    // Return unsubscribe function
    return () => {
      const index = this.progressCallbacks.indexOf(callback)
      if (index > -1) {
        this.progressCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Get session token usage statistics
   */
  getSessionTokenUsage(): TokenUsage {
    return { ...this.sessionTokenUsage }
  }

  /**
   * Reset session token usage
   */
  resetSessionTokenUsage(): void {
    this.sessionTokenUsage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimatedCost: 0
    }
  }

  /**
   * Check if a kata slug already exists
   */
  slugExists(slug: string): boolean {
    return this.fileGeneratorService.slugExists(slug)
  }

  /**
   * Generate a unique slug by appending a number if needed
   */
  generateUniqueSlug(baseSlug: string): string {
    return this.fileGeneratorService.generateUniqueSlug(baseSlug)
  }

  /**
   * Generate a complete kata and save it to the file system
   */
  async generateAndSaveKata(
    request: KataGenerationRequest,
    conflictResolution?: SlugConflictResolution
  ): Promise<{ kata: GeneratedKata; fileResult: FileGenerationResult }> {
    const kata = await this.generateKata(request)
    const fileResult = await this.saveGeneratedKata(kata.content, conflictResolution)
    
    return { kata, fileResult }
  }

  /**
   * Call OpenAI API with retry logic and exponential backoff
   */
  private async callOpenAIWithRetry(
    prompt: string, 
    config: AIGenerationConfig
  ): Promise<{ content: string; usage: TokenUsage }> {
    const retryConfig: RetryConfig = {
      maxAttempts: config.retryAttempts,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2
    }

    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      try {
        const result = await this.callOpenAI(prompt, config)
        
        // Update session usage
        this.sessionTokenUsage.promptTokens += result.usage.promptTokens
        this.sessionTokenUsage.completionTokens += result.usage.completionTokens
        this.sessionTokenUsage.totalTokens += result.usage.totalTokens
        this.sessionTokenUsage.estimatedCost += result.usage.estimatedCost
        
        return result
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        // Don't retry on certain errors
        if (error instanceof AIServiceError && !error.retryable) {
          throw error
        }
        
        // Don't retry on the last attempt
        if (attempt === retryConfig.maxAttempts) {
          break
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          retryConfig.baseDelayMs * Math.pow(retryConfig.backoffMultiplier, attempt - 1),
          retryConfig.maxDelayMs
        )
        
        console.warn(`API call failed (attempt ${attempt}/${retryConfig.maxAttempts}), retrying in ${delay}ms:`, error)
        
        // Update progress to show retry
        this.updateProgress({
          stage: 'generating',
          message: `API call failed, retrying in ${Math.round(delay / 1000)}s... (attempt ${attempt}/${retryConfig.maxAttempts})`,
          progress: 20 + (attempt / retryConfig.maxAttempts) * 20
        })
        
        await this.delay(delay)
      }
    }
    
    throw new AIServiceError(
      `API call failed after ${retryConfig.maxAttempts} attempts: ${lastError?.message}`,
      { retryable: false }
    )
  }

  /**
   * Make actual OpenAI API call
   */
  private async callOpenAI(
    prompt: string, 
    config: AIGenerationConfig
  ): Promise<{ content: string; usage: TokenUsage }> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs)
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: config.maxTokens,
          temperature: config.temperature
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        
        if (response.status === 401) {
          throw new AIServiceError('Invalid API key', { retryable: false })
        } else if (response.status === 429) {
          throw new AIServiceError('Rate limit exceeded', { retryable: true })
        } else if (response.status >= 500) {
          throw new AIServiceError('OpenAI server error', { retryable: true })
        } else {
          throw new AIServiceError(
            `API error: ${errorData.error?.message || response.statusText}`,
            { retryable: false }
          )
        }
      }

      const data = await response.json()
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new AIServiceError('Invalid API response format', { retryable: false })
      }

      const content = data.choices[0].message.content
      const usage = this.calculateTokenUsage(data.usage, config.model)

      return { content, usage }

    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new AIServiceError('Request timeout', { retryable: true })
      }
      
      if (error instanceof AIServiceError) {
        throw error
      }
      
      throw new AIServiceError(
        `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { retryable: true }
      )
    }
  }

  /**
   * Calculate token usage and estimated cost
   */
  private calculateTokenUsage(usage: any, model: string): TokenUsage {
    const promptTokens = usage?.prompt_tokens || 0
    const completionTokens = usage?.completion_tokens || 0
    const totalTokens = usage?.total_tokens || promptTokens + completionTokens

    // Rough cost estimation (prices as of 2024, may need updates)
    const costPer1kTokens = this.getModelCostPer1kTokens(model)
    const estimatedCost = (totalTokens / 1000) * costPer1kTokens

    return {
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCost
    }
  }

  /**
   * Get cost per 1k tokens for different models
   */
  private getModelCostPer1kTokens(model: string): number {
    const costs: Record<string, number> = {
      'gpt-4.1-mini': 0.0015, // Estimated cost
      'gpt-4-turbo': 0.01,
      'gpt-4': 0.03,
      'gpt-3.5-turbo': 0.002
    }
    
    return costs[model] || 0.002 // Default to gpt-3.5-turbo cost
  }

  /**
   * Generate a URL-safe slug from a title
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
      .substring(0, 50) // Limit length
  }

  /**
   * Update generation progress and notify callbacks
   */
  private updateProgress(progress: GenerationProgress): void {
    this.currentProgress = progress
    this.progressCallbacks.forEach(callback => {
      try {
        callback(progress)
      } catch (error) {
        console.error('Error in progress callback:', error)
      }
    })
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Enhanced AI Service Error with additional context
 */
class AIServiceError extends Error {
  public readonly retryable: boolean
  public readonly statusCode?: number
  public readonly context?: Record<string, any>

  constructor(
    message: string, 
    options: { retryable?: boolean; statusCode?: number; context?: Record<string, any> } = {}
  ) {
    super(message)
    this.name = 'AIServiceError'
    this.retryable = options.retryable ?? false
    this.statusCode = options.statusCode
    this.context = options.context
  }
}

export { AIServiceError }