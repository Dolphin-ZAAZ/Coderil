import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { AIConfigService } from '../ai-config'
import { DatabaseService } from '../database'

// Mock the database service
vi.mock('../database', () => ({
  DatabaseService: {
    getInstance: vi.fn()
  }
}))

describe('AIConfigService', () => {
  let aiConfigService: AIConfigService
  let mockDatabaseService: any

  beforeEach(() => {
    mockDatabaseService = {
      getSetting: vi.fn(),
      setSetting: vi.fn()
    }
    
    vi.mocked(DatabaseService.getInstance).mockReturnValue(mockDatabaseService)
    
    // Reset the singleton instance
    ;(AIConfigService as any).instance = undefined
    aiConfigService = AIConfigService.getInstance()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getDefaultConfig', () => {
    it('should return default configuration', () => {
      const defaultConfig = aiConfigService.getDefaultConfig()
      
      expect(defaultConfig).toEqual({
        openaiApiKey: '',
        model: 'gpt-4.1-mini',
        maxTokens: 4000,
        temperature: 0.7,
        retryAttempts: 3,
        timeoutMs: 30000
      })
    })
  })

  describe('getConfig', () => {
    it('should return default config when no saved config exists', async () => {
      mockDatabaseService.getSetting.mockResolvedValue(null)
      
      const config = await aiConfigService.getConfig()
      
      expect(config).toEqual(aiConfigService.getDefaultConfig())
      expect(mockDatabaseService.getSetting).toHaveBeenCalledWith('aiGenerationConfig')
    })

    it('should return merged config when saved config exists', async () => {
      const savedConfig = {
        openaiApiKey: 'sk-test-key',
        model: 'gpt-4-turbo'
      }
      mockDatabaseService.getSetting.mockResolvedValue(JSON.stringify(savedConfig))
      
      const config = await aiConfigService.getConfig()
      
      expect(config).toEqual({
        ...aiConfigService.getDefaultConfig(),
        ...savedConfig
      })
    })

    it('should return default config on error', async () => {
      mockDatabaseService.getSetting.mockRejectedValue(new Error('Database error'))
      
      const config = await aiConfigService.getConfig()
      
      expect(config).toEqual(aiConfigService.getDefaultConfig())
    })
  })

  describe('saveConfig', () => {
    it('should save config to database', async () => {
      const config = {
        openaiApiKey: 'sk-test-key',
        model: 'gpt-4.1-mini',
        maxTokens: 4000,
        temperature: 0.7,
        retryAttempts: 3,
        timeoutMs: 30000
      }
      
      await aiConfigService.saveConfig(config)
      
      expect(mockDatabaseService.setSetting).toHaveBeenCalledWith(
        'aiGenerationConfig',
        JSON.stringify(config)
      )
    })

    it('should throw error on database failure', async () => {
      mockDatabaseService.setSetting.mockRejectedValue(new Error('Database error'))
      
      const config = aiConfigService.getDefaultConfig()
      
      await expect(aiConfigService.saveConfig(config)).rejects.toThrow('Failed to save AI configuration')
    })
  })

  describe('validateApiKey', () => {
    it('should validate correct API key format', () => {
      expect(aiConfigService.validateApiKey('sk-1234567890abcdef1234567890abcdef')).toBe(true)
      expect(aiConfigService.validateApiKey('sk-proj-1234567890abcdef')).toBe(true)
    })

    it('should reject invalid API key formats', () => {
      expect(aiConfigService.validateApiKey('invalid-key')).toBe(false)
      expect(aiConfigService.validateApiKey('sk-')).toBe(false)
      expect(aiConfigService.validateApiKey('sk-short')).toBe(false)
      expect(aiConfigService.validateApiKey('')).toBe(false)
    })
  })

  describe('getAvailableModels', () => {
    it('should return list of available models', () => {
      const models = aiConfigService.getAvailableModels()
      
      expect(models).toEqual([
        'gpt-4.1-mini',
        'gpt-4-turbo',
        'gpt-4',
        'gpt-3.5-turbo'
      ])
    })
  })

  describe('validateConfig', () => {
    it('should validate correct configuration', () => {
      const config = {
        openaiApiKey: 'sk-1234567890abcdef1234567890abcdef',
        model: 'gpt-4.1-mini',
        maxTokens: 4000,
        temperature: 0.7,
        retryAttempts: 3,
        timeoutMs: 30000
      }
      
      const result = aiConfigService.validateConfig(config)
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject invalid API key', () => {
      const config = { openaiApiKey: 'invalid-key' }
      
      const result = aiConfigService.validateConfig(config)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid OpenAI API key format')
    })

    it('should reject invalid model', () => {
      const config = { model: 'invalid-model' }
      
      const result = aiConfigService.validateConfig(config)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid model selection')
    })

    it('should reject invalid maxTokens', () => {
      const config = { maxTokens: 50 }
      
      const result = aiConfigService.validateConfig(config)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Max tokens must be between 100 and 8000')
    })

    it('should reject invalid temperature', () => {
      const config = { temperature: 3.0 }
      
      const result = aiConfigService.validateConfig(config)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Temperature must be between 0 and 2')
    })

    it('should reject invalid retry attempts', () => {
      const config = { retryAttempts: 0 }
      
      const result = aiConfigService.validateConfig(config)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Retry attempts must be between 1 and 10')
    })

    it('should reject invalid timeout', () => {
      const config = { timeoutMs: 1000 }
      
      const result = aiConfigService.validateConfig(config)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Timeout must be between 5 and 120 seconds')
    })
  })

  describe('hasApiKey', () => {
    it('should return true when API key is configured', async () => {
      mockDatabaseService.getSetting.mockResolvedValue(JSON.stringify({
        openaiApiKey: 'sk-test-key'
      }))
      
      const hasKey = await aiConfigService.hasApiKey()
      
      expect(hasKey).toBe(true)
    })

    it('should return false when API key is empty', async () => {
      mockDatabaseService.getSetting.mockResolvedValue(JSON.stringify({
        openaiApiKey: ''
      }))
      
      const hasKey = await aiConfigService.hasApiKey()
      
      expect(hasKey).toBe(false)
    })

    it('should return false when no config exists', async () => {
      mockDatabaseService.getSetting.mockResolvedValue(null)
      
      const hasKey = await aiConfigService.hasApiKey()
      
      expect(hasKey).toBe(false)
    })
  })
})