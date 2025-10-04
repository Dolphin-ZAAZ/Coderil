import { 
  KataType, 
  Language, 
  GeneratedKataContent, 
  KataMetadata, 
  Rubric, 
  MultiQuestionConfig,
  ShortformConfig,
  OneLinerConfig,
  MultipleChoiceConfig
} from '@/types'

export interface ValidationError {
  type: 'syntax' | 'logic' | 'structure' | 'metadata'
  message: string
  file?: string
  line?: number
}

export interface ValidationWarning {
  type: 'style' | 'performance' | 'clarity'
  message: string
  file?: string
  suggestion?: string
}

export interface ParsedValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  suggestions: string[]
}

/**
 * Service for parsing AI-generated responses and extracting structured content
 */
export class ResponseParserService {
  private static instance: ResponseParserService

  static getInstance(): ResponseParserService {
    if (!ResponseParserService.instance) {
      ResponseParserService.instance = new ResponseParserService()
    }
    return ResponseParserService.instance
  }

  /**
   * Parse AI response into structured kata content based on kata type
   */
  parseKataResponse(response: string, type: KataType): GeneratedKataContent {
    try {
      // First validate the response structure
      if (!this.validateResponseStructure(response, type)) {
        throw new Error(`Invalid response structure for kata type: ${type}`)
      }

      // Extract code blocks and metadata
      const codeBlocks = this.extractCodeBlocks(response)
      const metadata = this.parseMetadata(response)

      // Build the content based on kata type
      const content = this.buildKataContent(response, type, codeBlocks, metadata)

      return content
    } catch (error) {
      // Attempt fallback parsing for malformed responses
      console.warn('Primary parsing failed, attempting fallback parsing:', error)
      return this.fallbackParse(response, type)
    }
  }

  /**
   * Extract code blocks from markdown response
   */
  extractCodeBlocks(response: string): Record<string, string> {
    const codeBlocks: Record<string, string> = {}
    
    // Match code blocks with optional language and label
    const codeBlockRegex = /```(?:(\w+))?\s*(?:\/\/\s*(.+?))?\n([\s\S]*?)```/g
    let match

    while ((match = codeBlockRegex.exec(response)) !== null) {
      const [, language, label, code] = match
      
      // Determine the key for this code block
      let key = 'code'
      if (label) {
        key = label.toLowerCase().replace(/\s+/g, '_')
      } else if (language) {
        // Try to infer purpose from language and content
        if (code.includes('test') || code.includes('assert') || code.includes('expect')) {
          key = 'tests'
        } else if (code.includes('solution') || code.includes('answer')) {
          key = 'solution'
        } else if (code.includes('entry') || code.includes('starter')) {
          key = 'entry'
        } else {
          key = language
        }
      } else {
        // No language specified, try to infer from content
        if (code.includes('test') || code.includes('assert') || code.includes('expect')) {
          key = 'tests'
        } else if (code.includes('solution') || code.includes('answer')) {
          key = 'solution'
        } else if (code.includes('def ') || code.includes('function ') || code.includes('class ')) {
          key = 'code'
        }
      }

      codeBlocks[key] = code.trim()
    }

    // Also try to extract YAML/JSON blocks for metadata
    const yamlBlockRegex = /```(?:yaml|yml)\s*\n([\s\S]*?)```/g
    while ((match = yamlBlockRegex.exec(response)) !== null) {
      codeBlocks['yaml'] = match[1].trim()
    }

    const jsonBlockRegex = /```json\s*\n([\s\S]*?)```/g
    while ((match = jsonBlockRegex.exec(response)) !== null) {
      codeBlocks['json'] = match[1].trim()
    }

    return codeBlocks
  }

  /**
   * Parse metadata from AI response
   */
  parseMetadata(response: string): Partial<KataMetadata> {
    const metadata: Partial<KataMetadata> = {}

    // Try to extract structured metadata from YAML or JSON blocks
    const codeBlocks = this.extractCodeBlocks(response)
    
    if (codeBlocks.yaml) {
      try {
        const yaml = require('js-yaml')
        const parsed = yaml.load(codeBlocks.yaml)
        Object.assign(metadata, parsed)
      } catch (error) {
        console.warn('Failed to parse YAML metadata:', error)
      }
    }

    if (codeBlocks.json) {
      try {
        const parsed = JSON.parse(codeBlocks.json)
        Object.assign(metadata, parsed)
      } catch (error) {
        console.warn('Failed to parse JSON metadata:', error)
      }
    }

    // Extract metadata from text patterns
    const patterns = {
      title: /(?:title|name):\s*(.+)/i,
      difficulty: /difficulty:\s*(easy|medium|hard)/i,
      language: /language:\s*(py|js|ts|cpp|none)/i,
      tags: /tags:\s*\[([^\]]+)\]/i,
      timeout: /timeout[_\s]*ms:\s*(\d+)/i
    }

    for (const [key, pattern] of Object.entries(patterns)) {
      const match = response.match(pattern)
      if (match) {
        if (key === 'tags') {
          metadata.tags = match[1].split(',').map(tag => tag.trim())
        } else if (key === 'timeout') {
          metadata.timeout_ms = parseInt(match[1], 10)
        } else {
          // Type assertion for other metadata fields
          (metadata as any)[key] = match[1].trim()
        }
      }
    }

    return metadata
  }

  /**
   * Validate response structure for specific kata type
   */
  validateResponseStructure(response: string, type: KataType): boolean {
    if (!response || response.trim().length === 0) {
      return false
    }

    // Check for required sections based on kata type
    switch (type) {
      case 'code':
        return this.hasRequiredSections(response, ['statement', 'entry', 'tests'])
      
      case 'explain':
        return this.hasRequiredSections(response, ['statement'])
      
      case 'template':
        return this.hasRequiredSections(response, ['statement', 'rubric'])
      
      case 'multi-question':
        return this.hasRequiredSections(response, ['questions']) || 
               response.includes('multiQuestion') ||
               response.includes('multi-question')
      
      case 'shortform':
      case 'one-liner':
      case 'multiple-choice':
        return this.hasRequiredSections(response, ['question']) ||
               response.includes('shortform') ||
               response.includes('multiple-choice')
      
      default:
        return true // For unknown types, assume valid
    }
  }

  /**
   * Build kata content based on type and extracted components
   */
  private buildKataContent(
    response: string, 
    type: KataType, 
    codeBlocks: Record<string, string>, 
    metadata: Partial<KataMetadata>
  ): GeneratedKataContent {
    // Extract statement from response
    const statement = this.extractStatement(response)
    
    // Build base content structure
    const content: GeneratedKataContent = {
      metadata: this.buildMetadata(metadata, type),
      statement,
      starterCode: codeBlocks.entry || codeBlocks.starter || codeBlocks.code || '',
      testCode: codeBlocks.tests || codeBlocks.test || '',
      solutionCode: codeBlocks.solution || codeBlocks.answer || ''
    }

    // Add type-specific content
    switch (type) {
      case 'code':
        content.hiddenTestCode = codeBlocks.hidden_tests || codeBlocks.hidden
        break
      
      case 'explain':
      case 'template':
        content.rubric = this.parseRubric(response, codeBlocks)
        if (type === 'template') {
          content.solutionFiles = this.parseSolutionFiles(response, codeBlocks)
        }
        break
      
      case 'multi-question':
        content.multiQuestionConfig = this.parseMultiQuestionConfig(response, codeBlocks)
        break
      
      case 'shortform':
        content.shortformConfig = this.parseShortformConfig(response, codeBlocks)
        break
      
      case 'one-liner':
        content.oneLinerConfig = this.parseOneLinerConfig(response, codeBlocks)
        break
      
      case 'multiple-choice':
        content.multipleChoiceConfig = this.parseMultipleChoiceConfig(response, codeBlocks)
        break
    }

    return content
  }

  /**
   * Fallback parsing for malformed responses
   */
  private fallbackParse(response: string, type: KataType): GeneratedKataContent {
    console.log('Attempting fallback parsing for malformed response')
    
    // Extract whatever we can from the response
    const codeBlocks = this.extractCodeBlocks(response)
    const statement = this.extractStatement(response) || 'Generated kata statement'
    
    // For fallback, try to get any available code
    const availableCode = Object.values(codeBlocks)[0] || ''
    
    // Create minimal valid content
    const content: GeneratedKataContent = {
      metadata: {
        slug: 'generated-kata',
        title: 'Generated Kata',
        language: 'none' as Language,
        type,
        difficulty: 'medium',
        tags: [],
        entry: 'entry.txt',
        test: { kind: 'none', file: 'none' },
        timeout_ms: 0
      },
      statement,
      starterCode: codeBlocks.entry || codeBlocks.starter || codeBlocks.code || availableCode,
      testCode: codeBlocks.tests || codeBlocks.test || '',
      solutionCode: codeBlocks.solution || codeBlocks.answer || ''
    }

    return content
  }

  /**
   * Check if response has required sections
   */
  private hasRequiredSections(response: string, sections: string[]): boolean {
    const lowerResponse = response.toLowerCase()
    return sections.every(section => 
      lowerResponse.includes(section) || 
      lowerResponse.includes(`# ${section}`) ||
      lowerResponse.includes(`## ${section}`)
    )
  }

  /**
   * Extract statement from response
   */
  private extractStatement(response: string): string {
    // Look for statement section
    const statementMatch = response.match(/(?:^|\n)#+\s*(?:statement|problem|description)\s*\n([\s\S]*?)(?=\n#+|\n```|$)/i)
    if (statementMatch) {
      return statementMatch[1].trim()
    }

    // Fallback: take first paragraph or section
    const lines = response.split('\n')
    const contentLines = lines.filter(line => 
      line.trim() && 
      !line.startsWith('```') && 
      !line.startsWith('#')
    )
    
    if (contentLines.length > 0) {
      return contentLines.slice(0, 5).join('\n').trim()
    }

    return response.substring(0, 500).trim()
  }

  /**
   * Build metadata with defaults
   */
  private buildMetadata(partial: Partial<KataMetadata>, type: KataType): KataMetadata {
    return {
      slug: partial.slug || 'generated-kata',
      title: partial.title || 'Generated Kata',
      language: partial.language || 'none',
      type,
      difficulty: partial.difficulty || 'medium',
      tags: partial.tags || [],
      entry: partial.entry || 'entry.txt',
      test: partial.test || { kind: 'none', file: 'none' },
      timeout_ms: partial.timeout_ms || 0
    }
  }

  /**
   * Parse rubric from response
   */
  private parseRubric(response: string, codeBlocks: Record<string, string>): Rubric | undefined {
    // Try YAML block first
    if (codeBlocks.yaml) {
      try {
        const yaml = require('js-yaml')
        const parsed = yaml.load(codeBlocks.yaml)
        if (parsed.rubric) return parsed.rubric
        if (parsed.keys && parsed.threshold) return parsed
      } catch (error) {
        console.warn('Failed to parse rubric from YAML:', error)
      }
    }

    // Try to extract from text
    const rubricMatch = response.match(/rubric:\s*\n([\s\S]*?)(?=\n\n|\n```|$)/i)
    if (rubricMatch) {
      try {
        const yaml = require('js-yaml')
        return yaml.load(rubricMatch[1])
      } catch (error) {
        console.warn('Failed to parse rubric from text:', error)
      }
    }

    return undefined
  }

  /**
   * Parse solution files for template katas
   */
  private parseSolutionFiles(_response: string, codeBlocks: Record<string, string>): Record<string, string> {
    const solutionFiles: Record<string, string> = {}
    
    // Extract files from code blocks
    Object.entries(codeBlocks).forEach(([key, content]) => {
      if (key.includes('solution') || key.includes('template')) {
        solutionFiles[key] = content
      }
    })

    return solutionFiles
  }

  /**
   * Parse multi-question configuration
   */
  private parseMultiQuestionConfig(response: string, codeBlocks: Record<string, string>): MultiQuestionConfig | undefined {
    // Try JSON/YAML blocks first
    if (codeBlocks.json) {
      try {
        const parsed = JSON.parse(codeBlocks.json)
        if (parsed.questions) return parsed
      } catch (error) {
        console.warn('Failed to parse multi-question config from JSON:', error)
      }
    }

    if (codeBlocks.yaml) {
      try {
        const yaml = require('js-yaml')
        const parsed = yaml.load(codeBlocks.yaml)
        if (parsed.questions) return parsed
      } catch (error) {
        console.warn('Failed to parse multi-question config from YAML:', error)
      }
    }

    // Try to extract from text patterns
    const questionsMatch = response.match(/questions:\s*\n([\s\S]*?)(?=\n\n|\n```|$)/i)
    if (questionsMatch) {
      try {
        const yaml = require('js-yaml')
        const parsed = yaml.load(questionsMatch[1])
        return { questions: parsed }
      } catch (error) {
        console.warn('Failed to parse questions from text:', error)
      }
    }

    return undefined
  }

  /**
   * Parse shortform configuration
   */
  private parseShortformConfig(_response: string, codeBlocks: Record<string, string>): ShortformConfig | undefined {
    // Similar parsing logic for shortform config
    if (codeBlocks.yaml) {
      try {
        const yaml = require('js-yaml')
        const parsed = yaml.load(codeBlocks.yaml)
        if (parsed.question) return parsed
      } catch (error) {
        console.warn('Failed to parse shortform config from YAML:', error)
      }
    }

    return undefined
  }

  /**
   * Parse one-liner configuration
   */
  private parseOneLinerConfig(_response: string, codeBlocks: Record<string, string>): OneLinerConfig | undefined {
    // Similar parsing logic for one-liner config
    if (codeBlocks.yaml) {
      try {
        const yaml = require('js-yaml')
        const parsed = yaml.load(codeBlocks.yaml)
        if (parsed.question) return parsed
      } catch (error) {
        console.warn('Failed to parse one-liner config from YAML:', error)
      }
    }

    return undefined
  }

  /**
   * Parse multiple-choice configuration
   */
  private parseMultipleChoiceConfig(_response: string, codeBlocks: Record<string, string>): MultipleChoiceConfig | undefined {
    // Similar parsing logic for multiple-choice config
    if (codeBlocks.yaml) {
      try {
        const yaml = require('js-yaml')
        const parsed = yaml.load(codeBlocks.yaml)
        if (parsed.question && parsed.options) return parsed
      } catch (error) {
        console.warn('Failed to parse multiple-choice config from YAML:', error)
      }
    }

    return undefined
  }
}