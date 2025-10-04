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
import { GenerationHistoryService } from './generation-history'
import { aiAuthoringErrorHandler } from './ai-authoring-error-handler'

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
  private generationHistoryService: GenerationHistoryService
  
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
    this.generationHistoryService = GenerationHistoryService.getInstance()
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
        throw new AIServiceError('OpenAI API key not configured', {
          retryable: false,
          errorType: 'auth',
          context: { operation: 'generateKata', stage: 'config_validation' }
        })
      }

      // Validate request
      this.validateGenerationRequest(request)

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
        const errorMessage = `Generated content validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`
        console.warn(errorMessage, validationResult.errors)
        
        // For critical validation errors, throw an error
        const criticalErrors = validationResult.errors.filter(e => e.type === 'structure' || e.type === 'metadata')
        if (criticalErrors.length > 0) {
          throw new AIServiceError(errorMessage, {
            retryable: true,
            errorType: 'validation',
            context: { 
              operation: 'generateKata', 
              stage: 'content_validation',
              validationErrors: validationResult.errors,
              request
            }
          })
        }
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

      // Record successful generation in history
      this.generationHistoryService.recordSuccessfulGeneration(
        request,
        generatedKata,
        response.usage.totalTokens,
        response.usage.estimatedCost,
        Date.now() - startTime,
        config.model
      )

      return generatedKata

    } catch (error) {
      const errorMessage = error instanceof AIServiceError ? 
        error.getUserFriendlyMessage() : 
        `Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      
      this.updateProgress({
        stage: 'error',
        message: errorMessage,
        progress: 0
      })
      
      // Record failed generation in history
      const config = await this.aiConfigService.getConfig().catch(() => ({ model: 'unknown' }))
      this.generationHistoryService.recordFailedGeneration(
        request,
        errorMessage,
        0, // No tokens used on failure
        0, // No cost on failure
        Date.now() - startTime,
        config.model || 'unknown'
      )
      
      // Handle and log the error through the specialized error handler
      if (error instanceof AIServiceError) {
        aiAuthoringErrorHandler.handleGenerationError(error, request)
        throw error
      }
      
      const wrappedError = new AIServiceError(
        `Kata generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { 
          retryable: true,
          errorType: 'unknown',
          context: { operation: 'generateKata', originalError: error, request }
        }
      )
      
      aiAuthoringErrorHandler.handleGenerationError(wrappedError, request)
      throw wrappedError
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

      // Validate configuration
      const config = await this.aiConfigService.getConfig()
      if (!config.openaiApiKey) {
        throw new AIServiceError('OpenAI API key not configured', {
          retryable: false,
          errorType: 'auth',
          context: { operation: 'generateVariation', sourceKata: sourceKata.slug }
        })
      }

      // Validate source kata and options
      this.validateVariationRequest(sourceKata, options)

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
        const errorMessage = `Generated variation validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`
        console.warn(errorMessage, validationResult.errors)
        
        // For critical validation errors, throw an error
        const criticalErrors = validationResult.errors.filter(e => e.type === 'structure' || e.type === 'metadata')
        if (criticalErrors.length > 0) {
          throw new AIServiceError(errorMessage, {
            retryable: true,
            errorType: 'validation',
            context: { 
              operation: 'generateVariation', 
              stage: 'content_validation',
              validationErrors: validationResult.errors,
              sourceKata: sourceKata.slug,
              options
            }
          })
        }
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

      // Record successful variation generation in history
      const variationRequest: KataGenerationRequest = {
        description: `Variation of ${sourceKata.title}`,
        language: sourceKata.language,
        difficulty: sourceKata.difficulty,
        type: sourceKata.type,
        generateHiddenTests: true
      }

      this.generationHistoryService.recordSuccessfulGeneration(
        variationRequest,
        generatedKata,
        response.usage.totalTokens,
        response.usage.estimatedCost,
        Date.now() - startTime,
        config.model
      )

      return generatedKata

    } catch (error) {
      const errorMessage = error instanceof AIServiceError ? 
        error.getUserFriendlyMessage() : 
        `Variation generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      
      this.updateProgress({
        stage: 'error',
        message: errorMessage,
        progress: 0
      })
      
      // Handle and log the error through the specialized error handler
      if (error instanceof AIServiceError) {
        aiAuthoringErrorHandler.handleVariationError(error, sourceKata, options)
        throw error
      }
      
      const wrappedError = new AIServiceError(
        `Variation generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { 
          retryable: true,
          errorType: 'unknown',
          context: { operation: 'generateVariation', originalError: error, sourceKata: sourceKata.slug, options }
        }
      )
      
      aiAuthoringErrorHandler.handleVariationError(wrappedError, sourceKata, options)
      throw wrappedError
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
      // Validate content before saving
      if (!content || !content.metadata) {
        throw new AIServiceError('Invalid kata content: missing metadata', {
          retryable: false,
          errorType: 'validation',
          context: { operation: 'saveGeneratedKata', content }
        })
      }

      if (!content.metadata.slug) {
        throw new AIServiceError('Invalid kata content: missing slug', {
          retryable: false,
          errorType: 'validation',
          context: { operation: 'saveGeneratedKata', metadata: content.metadata }
        })
      }

      this.updateProgress({
        stage: 'generating',
        message: 'Saving kata files...',
        progress: 90
      })

      const result = await this.fileGeneratorService.generateKataFiles(content, conflictResolution)
      
      if (!result.success) {
        const errorMessage = `Failed to save kata files: ${result.errors.join(', ')}`
        throw new AIServiceError(errorMessage, {
          retryable: result.errors.some(e => e.includes('permission') || e.includes('space')),
          errorType: 'validation',
          context: { 
            operation: 'saveGeneratedKata', 
            slug: content.metadata.slug,
            errors: result.errors,
            conflictResolution
          }
        })
      }

      this.updateProgress({
        stage: 'complete',
        message: `Kata saved successfully to ${result.path}`,
        progress: 100
      })

      return result
    } catch (error) {
      const errorMessage = error instanceof AIServiceError ? 
        error.getUserFriendlyMessage() : 
        `Failed to save kata: ${error instanceof Error ? error.message : 'Unknown error'}`
      
      this.updateProgress({
        stage: 'error',
        message: errorMessage,
        progress: 0
      })

      // Handle and log the error through the specialized error handler
      if (error instanceof AIServiceError) {
        aiAuthoringErrorHandler.handleSaveError(error, content)
        throw error
      }

      const wrappedError = new AIServiceError(
        `Failed to save kata: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { 
          retryable: false,
          errorType: 'unknown',
          context: { operation: 'saveGeneratedKata', originalError: error, content: content.metadata }
        }
      )

      aiAuthoringErrorHandler.handleSaveError(wrappedError, content)
      throw wrappedError
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
   * Get generation history
   */
  getGenerationHistory(limit?: number) {
    return this.generationHistoryService.getHistory(limit)
  }

  /**
   * Get generation statistics
   */
  getGenerationStats() {
    return this.generationHistoryService.getGenerationStats()
  }

  /**
   * Get current generation session
   */
  getCurrentGenerationSession() {
    return this.generationHistoryService.getCurrentSession()
  }

  /**
   * Get cost breakdown for a time period
   */
  getCostBreakdown(days: number = 30) {
    return this.generationHistoryService.getCostBreakdown(days)
  }

  /**
   * Clear generation history
   */
  clearGenerationHistory(): void {
    this.generationHistoryService.clearHistory()
  }

  /**
   * Export generation history
   */
  exportGenerationHistory(): string {
    return this.generationHistoryService.exportHistory()
  }

  /**
   * Import generation history
   */
  importGenerationHistory(jsonData: string) {
    return this.generationHistoryService.importHistory(jsonData)
  }

  /**
   * Start a new generation session
   */
  startNewGenerationSession(): void {
    this.generationHistoryService.startNewSession()
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
        const errorMessage = errorData.error?.message || response.statusText
        
        if (response.status === 401) {
          throw new AIServiceError('Invalid API key', { 
            retryable: false,
            statusCode: 401,
            errorType: 'auth',
            context: { model: config.model, errorData }
          })
        } else if (response.status === 403) {
          throw new AIServiceError('API access forbidden', { 
            retryable: false,
            statusCode: 403,
            errorType: 'auth',
            context: { model: config.model, errorData }
          })
        } else if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after')
          throw new AIServiceError('Rate limit exceeded', { 
            retryable: true,
            statusCode: 429,
            errorType: 'rate_limit',
            context: { model: config.model, retryAfter, errorData }
          })
        } else if (response.status >= 500) {
          throw new AIServiceError('OpenAI server error', { 
            retryable: true,
            statusCode: response.status,
            errorType: 'server',
            context: { model: config.model, errorData }
          })
        } else if (response.status === 400) {
          throw new AIServiceError(`Invalid request: ${errorMessage}`, { 
            retryable: false,
            statusCode: 400,
            errorType: 'validation',
            context: { model: config.model, errorData }
          })
        } else {
          throw new AIServiceError(`API error: ${errorMessage}`, { 
            retryable: false,
            statusCode: response.status,
            errorType: 'unknown',
            context: { model: config.model, errorData }
          })
        }
      }

      const data = await response.json()
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new AIServiceError('Invalid API response format', { 
          retryable: false,
          errorType: 'validation',
          context: { model: config.model, responseData: data }
        })
      }

      const content = data.choices[0].message.content
      if (!content || typeof content !== 'string') {
        throw new AIServiceError('Empty or invalid response content', { 
          retryable: true,
          errorType: 'validation',
          context: { model: config.model, content }
        })
      }

      const usage = this.calculateTokenUsage(data.usage, config.model)

      return { content, usage }

    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new AIServiceError('Request timeout', { 
          retryable: true,
          errorType: 'timeout',
          context: { model: config.model, timeoutMs: config.timeoutMs }
        })
      }
      
      if (error instanceof AIServiceError) {
        throw error
      }
      
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new AIServiceError('Network connection failed', { 
          retryable: true,
          errorType: 'network',
          context: { model: config.model, originalError: error.message }
        })
      }
      
      throw new AIServiceError(
        `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { 
          retryable: true,
          errorType: 'network',
          context: { model: config.model, originalError: error }
        }
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
   * Validate generation request
   */
  private validateGenerationRequest(request: KataGenerationRequest): void {
    if (!request.description || request.description.trim().length === 0) {
      throw new AIServiceError('Kata description is required', {
        retryable: false,
        errorType: 'validation',
        context: { operation: 'validateGenerationRequest', field: 'description' }
      })
    }

    if (request.description.length > 5000) {
      throw new AIServiceError('Kata description is too long (max 5000 characters)', {
        retryable: false,
        errorType: 'validation',
        context: { operation: 'validateGenerationRequest', field: 'description', length: request.description.length }
      })
    }

    const validLanguages = ['py', 'js', 'ts', 'cpp', 'none']
    if (!validLanguages.includes(request.language)) {
      throw new AIServiceError(`Invalid language: ${request.language}`, {
        retryable: false,
        errorType: 'validation',
        context: { operation: 'validateGenerationRequest', field: 'language', value: request.language }
      })
    }

    const validDifficulties = ['easy', 'medium', 'hard']
    if (!validDifficulties.includes(request.difficulty)) {
      throw new AIServiceError(`Invalid difficulty: ${request.difficulty}`, {
        retryable: false,
        errorType: 'validation',
        context: { operation: 'validateGenerationRequest', field: 'difficulty', value: request.difficulty }
      })
    }

    const validTypes = ['code', 'explain', 'template', 'codebase', 'shortform', 'multiple-choice', 'one-liner', 'multi-question']
    if (!validTypes.includes(request.type)) {
      throw new AIServiceError(`Invalid kata type: ${request.type}`, {
        retryable: false,
        errorType: 'validation',
        context: { operation: 'validateGenerationRequest', field: 'type', value: request.type }
      })
    }

    // Validate language compatibility with kata type
    if (['code', 'template'].includes(request.type) && request.language === 'none') {
      throw new AIServiceError('Code and template katas require a programming language', {
        retryable: false,
        errorType: 'validation',
        context: { operation: 'validateGenerationRequest', type: request.type, language: request.language }
      })
    }
  }

  /**
   * Validate variation request
   */
  private validateVariationRequest(sourceKata: Kata, options: VariationOptions): void {
    if (!sourceKata || !sourceKata.slug) {
      throw new AIServiceError('Source kata is required for variation generation', {
        retryable: false,
        errorType: 'validation',
        context: { operation: 'validateVariationRequest', sourceKata }
      })
    }

    const validAdjustments = ['easier', 'harder', 'same']
    if (!validAdjustments.includes(options.difficultyAdjustment)) {
      throw new AIServiceError(`Invalid difficulty adjustment: ${options.difficultyAdjustment}`, {
        retryable: false,
        errorType: 'validation',
        context: { operation: 'validateVariationRequest', field: 'difficultyAdjustment', value: options.difficultyAdjustment }
      })
    }

    if (options.focusArea && options.focusArea.length > 500) {
      throw new AIServiceError('Focus area description is too long (max 500 characters)', {
        retryable: false,
        errorType: 'validation',
        context: { operation: 'validateVariationRequest', field: 'focusArea', length: options.focusArea.length }
      })
    }

    if (options.parameterChanges && options.parameterChanges.length > 1000) {
      throw new AIServiceError('Parameter changes description is too long (max 1000 characters)', {
        retryable: false,
        errorType: 'validation',
        context: { operation: 'validateVariationRequest', field: 'parameterChanges', length: options.parameterChanges.length }
      })
    }
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
export class AIServiceError extends Error {
  public readonly retryable: boolean
  public readonly statusCode?: number
  public readonly context?: Record<string, any>
  public readonly errorType?: 'network' | 'auth' | 'rate_limit' | 'server' | 'validation' | 'timeout' | 'unknown'

  constructor(
    message: string, 
    options: { 
      retryable?: boolean
      statusCode?: number
      context?: Record<string, any>
      errorType?: 'network' | 'auth' | 'rate_limit' | 'server' | 'validation' | 'timeout' | 'unknown'
    } = {}
  ) {
    super(message)
    this.name = 'AIServiceError'
    this.retryable = options.retryable ?? false
    this.statusCode = options.statusCode
    this.context = options.context
    this.errorType = options.errorType ?? 'unknown'
  }

  /**
   * Get user-friendly error message with recovery suggestions
   */
  getUserFriendlyMessage(): string {
    switch (this.errorType) {
      case 'auth':
        return 'Authentication failed. Please check your OpenAI API key in Settings.'
      case 'rate_limit':
        return 'Rate limit exceeded. Please wait a moment and try again.'
      case 'network':
        return 'Network connection failed. Please check your internet connection and try again.'
      case 'server':
        return 'OpenAI service is temporarily unavailable. Please try again in a few minutes.'
      case 'timeout':
        return 'Request timed out. The generation is taking longer than expected. Please try again.'
      case 'validation':
        return 'The generated content failed validation. Please try regenerating with different parameters.'
      default:
        return this.message
    }
  }

  /**
   * Get recovery suggestions for the error
   */
  getRecoverySuggestions(): string[] {
    switch (this.errorType) {
      case 'auth':
        return [
          'Check your OpenAI API key in Settings',
          'Ensure your API key has sufficient credits',
          'Verify your API key has the correct permissions'
        ]
      case 'rate_limit':
        return [
          'Wait a few minutes before trying again',
          'Consider upgrading your OpenAI plan for higher rate limits',
          'Try generating simpler katas to reduce token usage'
        ]
      case 'network':
        return [
          'Check your internet connection',
          'Try again in a few moments',
          'Disable VPN if you\'re using one'
        ]
      case 'server':
        return [
          'Wait a few minutes and try again',
          'Check OpenAI status page for service updates',
          'Try with a different model if available'
        ]
      case 'timeout':
        return [
          'Try generating a simpler kata',
          'Reduce the complexity of your requirements',
          'Check your internet connection speed'
        ]
      case 'validation':
        return [
          'Try with different generation parameters',
          'Simplify your kata description',
          'Check if the selected language and type are compatible'
        ]
      default:
        return [
          'Try again in a few moments',
          'Check your internet connection',
          'Contact support if the problem persists'
        ]
    }
  }
}