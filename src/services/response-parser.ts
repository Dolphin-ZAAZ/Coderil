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
    
    // Match code blocks with optional language and comments
    const codeBlockRegex = /```(?:(\w+))?\s*(?:#\s*(.+?))?\n([\s\S]*?)```/g
    let match

    while ((match = codeBlockRegex.exec(response)) !== null) {
      const [, language, comment, code] = match
      
      // Skip empty or placeholder code blocks
      if (!code.trim() || code.includes('Write your explanation here') || code.includes('[Replace this with')) {
        continue
      }
      
      // Determine the key for this code block
      let key = 'code'
      
      // Check for file name comments (e.g., # entry.py, # tests.py)
      if (comment) {
        const fileName = comment.toLowerCase().replace(/\.(py|js|ts|cpp)$/, '')
        if (fileName.includes('entry') || fileName.includes('starter')) {
          key = 'entry'
        } else if (fileName.includes('test')) {
          key = 'tests'
        } else if (fileName.includes('solution')) {
          key = 'solution'
        } else if (fileName.includes('hidden')) {
          key = 'hidden_tests'
        } else {
          key = fileName.replace(/\s+/g, '_')
        }
      } else if (language) {
        // Try to infer purpose from content and context
        const codeContent = code.toLowerCase()
        if (codeContent.includes('test') || codeContent.includes('assert') || codeContent.includes('expect')) {
          key = 'tests'
        } else if (codeContent.includes('solution') || (codeContent.includes('def ') && !codeContent.includes('todo') && !codeContent.includes('pass'))) {
          key = 'solution'
        } else if (codeContent.includes('todo') || codeContent.includes('pass') || codeContent.includes('implement')) {
          key = 'entry'
        } else {
          // Default based on order - first code block is usually entry
          const existingKeys = Object.keys(codeBlocks)
          if (!existingKeys.includes('entry') && language !== 'yaml' && language !== 'markdown') {
            key = 'entry'
          } else if (!existingKeys.includes('tests')) {
            key = 'tests'
          } else {
            key = 'solution'
          }
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
        } else if (key === 'title') {
          // Remove quotation marks from title
          let title = match[1].trim()
          if ((title.startsWith('"') && title.endsWith('"')) || (title.startsWith("'") && title.endsWith("'"))) {
            title = title.slice(1, -1)
          }
          metadata.title = title
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
    // Look for markdown code block containing statement
    const markdownBlockMatch = response.match(/```markdown\s*\n([\s\S]*?)```/i)
    if (markdownBlockMatch) {
      let content = markdownBlockMatch[1].trim()
      // Remove unwanted file name headings
      content = this.cleanStatementContent(content)
      return content
    }

    // Look for statement section
    const statementMatch = response.match(/(?:^|\n)#+\s*(?:statement|problem|description)\s*\n([\s\S]*?)(?=\n#+|\n```|$)/i)
    if (statementMatch) {
      let content = statementMatch[1].trim()
      content = this.cleanStatementContent(content)
      return content
    }

    // Look for content between first heading and first code block
    const contentMatch = response.match(/(?:^|\n)#[^#].*?\n([\s\S]*?)(?=\n```|$)/i)
    if (contentMatch) {
      let content = contentMatch[1].trim()
      // Filter out placeholder comments
      if (!content.includes('<!-- Write your') && !content.includes('[Replace this with')) {
        content = this.cleanStatementContent(content)
        return content
      }
    }

    // Fallback: take first meaningful paragraph
    const lines = response.split('\n')
    const contentLines = lines.filter(line => 
      line.trim() && 
      !line.startsWith('```') && 
      !line.startsWith('#') &&
      !line.includes('<!-- Write your') &&
      !line.includes('[Replace this with')
    )
    
    if (contentLines.length > 0) {
      let content = contentLines.slice(0, 10).join('\n').trim()
      content = this.cleanStatementContent(content)
      return content
    }

    return response.substring(0, 500).trim()
  }

  /**
   * Clean statement content by removing unwanted headings and formatting
   */
  private cleanStatementContent(content: string): string {
    // Remove file name headings like "# statement.md", "# meta.yaml", etc.
    content = content.replace(/^#+\s*(?:statement|meta|entry|tests?|solution)\.(?:md|yaml|yml|py|js|ts|cpp)\s*\n?/gim, '')
    
    // Remove comment-style file names like "# statement.md"
    content = content.replace(/^#+\s*(?:statement|meta|entry|tests?|solution)\.(?:md|yaml|yml|py|js|ts|cpp)\s*$/gim, '')
    
    // Remove standalone file extension comments
    content = content.replace(/^#+\s*\.(?:md|yaml|yml|py|js|ts|cpp)\s*\n?/gim, '')
    
    // Clean up multiple consecutive newlines
    content = content.replace(/\n{3,}/g, '\n\n')
    
    return content.trim()
  }

  /**
   * Build metadata with defaults
   */
  private buildMetadata(partial: Partial<KataMetadata>, type: KataType): KataMetadata {
    // Clean up title by removing quotation marks
    let title = partial.title || 'Generated Kata'
    if ((title.startsWith('"') && title.endsWith('"')) || (title.startsWith("'") && title.endsWith("'"))) {
      title = title.slice(1, -1)
    }

    return {
      slug: partial.slug || 'generated-kata',
      title,
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