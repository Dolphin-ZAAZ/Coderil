import { AIGenerationConfig } from '@/types'
import { DatabaseService } from './database'

export class AIConfigService {
  private static instance: AIConfigService
  private databaseService: DatabaseService | null = null

  private constructor() {
    // Database service will be initialized lazily
  }

  static getInstance(): AIConfigService {
    if (!AIConfigService.instance) {
      AIConfigService.instance = new AIConfigService()
    }
    return AIConfigService.instance
  }

  private async ensureDb(): Promise<DatabaseService> {
    if (!this.databaseService) {
      this.databaseService = await DatabaseService.getInstance()
    }
    return this.databaseService
  }

  /**
   * Get the default AI generation configuration
   */
  getDefaultConfig(): AIGenerationConfig {
    return {
      openaiApiKey: '',
      model: 'gpt-4o-mini',
      maxTokens: 4000,
      temperature: 0.3, // Lower temperature for more consistent output
      retryAttempts: 3,
      timeoutMs: 60000 // Increased to 60 seconds for better reliability
    }
  }

  /**
   * Get the current AI generation configuration
   */
  async getConfig(): Promise<AIGenerationConfig> {
    try {
      const db = await this.ensureDb()
      const configJson = await db.getSetting('aiGenerationConfig')
      let config = this.getDefaultConfig()
      
      if (configJson) {
        const savedConfig = JSON.parse(configJson)
        // Merge with defaults to ensure all properties exist
        config = { ...config, ...savedConfig }
      }
      
      // Fall back to environment variables if API key is not set
      if (!config.openaiApiKey || config.openaiApiKey.trim() === '') {
        const envApiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_TOKEN
        if (envApiKey) {
          config.openaiApiKey = envApiKey
        }
      }
      
      return config
    } catch (error) {
      console.error('Failed to get AI config:', error)
      const defaultConfig = this.getDefaultConfig()
      
      // Still check environment variables even if database fails
      const envApiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_TOKEN
      if (envApiKey) {
        defaultConfig.openaiApiKey = envApiKey
      }
      
      return defaultConfig
    }
  }

  /**
   * Save AI generation configuration
   */
  async saveConfig(config: AIGenerationConfig): Promise<void> {
    try {
      const db = await this.ensureDb()
      await db.setSetting('aiGenerationConfig', JSON.stringify(config))
    } catch (error) {
      console.error('Failed to save AI config:', error)
      throw new Error('Failed to save AI configuration')
    }
  }

  /**
   * Update specific configuration properties
   */
  async updateConfig(updates: Partial<AIGenerationConfig>): Promise<void> {
    const currentConfig = await this.getConfig()
    const newConfig = { ...currentConfig, ...updates }
    await this.saveConfig(newConfig)
  }

  /**
   * Check if API key is configured
   */
  async hasApiKey(): Promise<boolean> {
    const config = await this.getConfig()
    return config.openaiApiKey.trim().length > 0
  }

  /**
   * Validate API key format (basic validation)
   */
  validateApiKey(apiKey: string): boolean {
    // OpenAI API keys start with 'sk-' and are typically 51 characters long
    return apiKey.startsWith('sk-') && apiKey.length >= 20
  }

  /**
   * Get available models
   */
  getAvailableModels(): string[] {
    return [
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo'
    ]
  }

  /**
   * Validate configuration
   */
  validateConfig(config: Partial<AIGenerationConfig>): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (config.openaiApiKey !== undefined) {
      if (!config.openaiApiKey || config.openaiApiKey.trim().length === 0) {
        errors.push('OpenAI API key is required')
      } else if (!this.validateApiKey(config.openaiApiKey)) {
        errors.push('Invalid OpenAI API key format')
      }
    }

    if (config.model !== undefined) {
      if (!config.model || !this.getAvailableModels().includes(config.model)) {
        errors.push('Invalid model selection')
      }
    }

    if (config.maxTokens !== undefined) {
      if (config.maxTokens < 100 || config.maxTokens > 8000) {
        errors.push('Max tokens must be between 100 and 8000')
      }
    }

    if (config.temperature !== undefined) {
      if (config.temperature < 0 || config.temperature > 2) {
        errors.push('Temperature must be between 0 and 2')
      }
    }

    if (config.retryAttempts !== undefined) {
      if (config.retryAttempts < 1 || config.retryAttempts > 10) {
        errors.push('Retry attempts must be between 1 and 10')
      }
    }

    if (config.timeoutMs !== undefined) {
      if (config.timeoutMs < 5000 || config.timeoutMs > 120000) {
        errors.push('Timeout must be between 5 and 120 seconds')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}