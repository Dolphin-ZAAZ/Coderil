import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import { 
  GeneratedKataContent, 
  KataMetadata, 
  Language,
  MultiQuestionConfig,
  ShortformConfig,
  OneLinerConfig,
  MultipleChoiceConfig,
  Rubric,
  FileSystemError
} from '@/types'
import { errorHandler } from './error-handler'

export interface FileGenerationResult {
  success: boolean
  slug: string
  path: string
  filesCreated: string[]
  errors: string[]
  warnings: string[]
}

export interface SlugConflictResolution {
  action: 'overwrite' | 'rename' | 'cancel'
  newSlug?: string
}

/**
 * Service responsible for generating and saving kata files to the file system
 */
export class FileGeneratorService {
  private static instance: FileGeneratorService
  private katasDirectory: string

  private constructor(katasDirectory?: string) {
    this.katasDirectory = katasDirectory || path.join(process.cwd(), 'katas')
  }

  static getInstance(katasDirectory?: string): FileGeneratorService {
    if (!FileGeneratorService.instance) {
      FileGeneratorService.instance = new FileGeneratorService(katasDirectory)
    }
    return FileGeneratorService.instance
  }

  /**
   * Generate and save all files for a kata
   */
  async generateKataFiles(
    content: GeneratedKataContent,
    conflictResolution?: SlugConflictResolution
  ): Promise<FileGenerationResult> {
    const result: FileGenerationResult = {
      success: false,
      slug: content.metadata.slug,
      path: '',
      filesCreated: [],
      errors: [],
      warnings: []
    }

    try {
      // Handle slug conflicts
      const resolvedSlug = await this.resolveSlugConflict(content.metadata.slug, conflictResolution)
      if (!resolvedSlug) {
        result.errors.push('Kata generation cancelled due to slug conflict')
        return result
      }

      // Update metadata with resolved slug
      content.metadata.slug = resolvedSlug
      result.slug = resolvedSlug

      // Create kata directory
      const kataPath = path.join(this.katasDirectory, resolvedSlug)
      result.path = kataPath

      // Ensure katas directory exists
      if (!fs.existsSync(this.katasDirectory)) {
        fs.mkdirSync(this.katasDirectory, { recursive: true })
      }

      // Create kata directory
      if (!fs.existsSync(kataPath)) {
        fs.mkdirSync(kataPath, { recursive: true })
      }

      // Generate files based on kata type
      await this.generateFilesByType(content, kataPath, result)

      result.success = result.errors.length === 0
      return result

    } catch (error) {
      const fsError = new Error(`Failed to generate kata files: ${error}`) as FileSystemError
      fsError.code = 'FILE_GENERATION_FAILED'
      fsError.path = result.path
      
      result.errors.push(fsError.message)
      errorHandler.handleFileSystemError(fsError, {
        operation: 'generate_kata_files',
        slug: result.slug
      })
      
      return result
    }
  }

  /**
   * Generate files based on kata type
   */
  private async generateFilesByType(
    content: GeneratedKataContent,
    kataPath: string,
    result: FileGenerationResult
  ): Promise<void> {
    // Always generate core files
    await this.generateMetadataFile(content.metadata, kataPath, result)
    await this.generateStatementFile(content.statement, kataPath, result)

    // Generate type-specific files
    switch (content.metadata.type) {
      case 'code':
        await this.generateCodeKataFiles(content, kataPath, result)
        break
      
      case 'explain':
        await this.generateExplanationKataFiles(content, kataPath, result)
        break
      
      case 'template':
        await this.generateTemplateKataFiles(content, kataPath, result)
        break
      
      case 'codebase':
        await this.generateCodebaseKataFiles(content, kataPath, result)
        break
      
      case 'multi-question':
        await this.generateMultiQuestionKataFiles(content, kataPath, result)
        break
      
      case 'shortform':
        await this.generateShortformKataFiles(content, kataPath, result)
        break
      
      case 'one-liner':
        await this.generateOneLinerKataFiles(content, kataPath, result)
        break
      
      case 'multiple-choice':
        await this.generateMultipleChoiceKataFiles(content, kataPath, result)
        break
      
      default:
        result.warnings.push(`Unknown kata type: ${content.metadata.type}`)
    }
  }

  /**
   * Generate meta.yaml file
   */
  private async generateMetadataFile(
    metadata: KataMetadata,
    kataPath: string,
    result: FileGenerationResult
  ): Promise<void> {
    try {
      const metaPath = path.join(kataPath, 'meta.yaml')
      
      // Create clean metadata object for YAML output
      const cleanMetadata: any = {
        slug: metadata.slug,
        title: metadata.title,
        language: metadata.language,
        type: metadata.type,
        difficulty: metadata.difficulty,
        tags: metadata.tags || [],
        entry: metadata.entry,
        test: metadata.test,
        timeout_ms: metadata.timeout_ms
      }

      // Add optional fields if present
      if (metadata.solution) {
        cleanMetadata.solution = metadata.solution
      }

      const yamlContent = yaml.dump(cleanMetadata, {
        indent: 2,
        lineWidth: 120,
        noRefs: true
      })

      fs.writeFileSync(metaPath, yamlContent, 'utf8')
      result.filesCreated.push('meta.yaml')
    } catch (error) {
      result.errors.push(`Failed to create meta.yaml: ${error}`)
    }
  }

  /**
   * Generate statement.md file
   */
  private async generateStatementFile(
    statement: string,
    kataPath: string,
    result: FileGenerationResult
  ): Promise<void> {
    try {
      const statementPath = path.join(kataPath, 'statement.md')
      fs.writeFileSync(statementPath, statement, 'utf8')
      result.filesCreated.push('statement.md')
    } catch (error) {
      result.errors.push(`Failed to create statement.md: ${error}`)
    }
  }

  /**
   * Generate files for code katas
   */
  private async generateCodeKataFiles(
    content: GeneratedKataContent,
    kataPath: string,
    result: FileGenerationResult
  ): Promise<void> {
    const extension = this.getFileExtension(content.metadata.language)

    // Generate starter code file
    if (content.starterCode) {
      try {
        const entryPath = path.join(kataPath, content.metadata.entry)
        fs.writeFileSync(entryPath, content.starterCode, 'utf8')
        result.filesCreated.push(content.metadata.entry)
      } catch (error) {
        result.errors.push(`Failed to create entry file: ${error}`)
      }
    }

    // Generate test file
    if (content.testCode && content.metadata.test.file) {
      try {
        const testPath = path.join(kataPath, content.metadata.test.file)
        fs.writeFileSync(testPath, content.testCode, 'utf8')
        result.filesCreated.push(content.metadata.test.file)
      } catch (error) {
        result.errors.push(`Failed to create test file: ${error}`)
      }
    }

    // Generate hidden test file
    if (content.hiddenTestCode) {
      try {
        const hiddenTestFile = `hidden_tests.${extension}`
        const hiddenTestPath = path.join(kataPath, hiddenTestFile)
        fs.writeFileSync(hiddenTestPath, content.hiddenTestCode, 'utf8')
        result.filesCreated.push(hiddenTestFile)
      } catch (error) {
        result.errors.push(`Failed to create hidden test file: ${error}`)
      }
    }

    // Generate solution file
    if (content.solutionCode) {
      try {
        const solutionFile = `solution.${extension}`
        const solutionPath = path.join(kataPath, solutionFile)
        fs.writeFileSync(solutionPath, content.solutionCode, 'utf8')
        result.filesCreated.push(solutionFile)
      } catch (error) {
        result.errors.push(`Failed to create solution file: ${error}`)
      }
    }

    // Generate package.json for JS/TS katas if needed
    if (['js', 'ts'].includes(content.metadata.language)) {
      await this.generatePackageJson(content.metadata, kataPath, result)
    }
  }

  /**
   * Generate files for explanation katas
   */
  private async generateExplanationKataFiles(
    content: GeneratedKataContent,
    kataPath: string,
    result: FileGenerationResult
  ): Promise<void> {
    // Generate explanation template file
    try {
      const explanationPath = path.join(kataPath, content.metadata.entry)
      const templateContent = `# ${content.metadata.title}

<!-- Write your explanation here -->

## Your Explanation

[Replace this with your detailed explanation]

## Key Points

- Point 1
- Point 2
- Point 3

## Examples

[Provide examples if applicable]

## Conclusion

[Summarize your explanation]
`
      fs.writeFileSync(explanationPath, templateContent, 'utf8')
      result.filesCreated.push(content.metadata.entry)
    } catch (error) {
      result.errors.push(`Failed to create explanation template: ${error}`)
    }

    // Generate solution file if provided
    if (content.solutionCode) {
      try {
        const solutionPath = path.join(kataPath, 'solution.md')
        fs.writeFileSync(solutionPath, content.solutionCode, 'utf8')
        result.filesCreated.push('solution.md')
      } catch (error) {
        result.errors.push(`Failed to create solution file: ${error}`)
      }
    }

    // Generate rubric file
    if (content.rubric) {
      await this.generateRubricFile(content.rubric, kataPath, result)
    }
  }

  /**
   * Generate files for template katas
   */
  private async generateTemplateKataFiles(
    content: GeneratedKataContent,
    kataPath: string,
    result: FileGenerationResult
  ): Promise<void> {
    // Create template directory
    const templateDir = path.join(kataPath, 'template')
    if (!fs.existsSync(templateDir)) {
      fs.mkdirSync(templateDir, { recursive: true })
    }

    // Generate template files from solutionFiles
    if (content.solutionFiles) {
      for (const [filePath, fileContent] of Object.entries(content.solutionFiles)) {
        try {
          const fullPath = path.join(templateDir, filePath)
          
          // Ensure directory exists
          const dir = path.dirname(fullPath)
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
          }

          fs.writeFileSync(fullPath, fileContent, 'utf8')
          result.filesCreated.push(`template/${filePath}`)
        } catch (error) {
          result.errors.push(`Failed to create template file ${filePath}: ${error}`)
        }
      }
    }

    // Generate solution file if provided
    if (content.solutionCode) {
      try {
        const extension = this.getFileExtension(content.metadata.language)
        const solutionPath = path.join(kataPath, `solution.${extension}`)
        fs.writeFileSync(solutionPath, content.solutionCode, 'utf8')
        result.filesCreated.push(`solution.${extension}`)
      } catch (error) {
        result.errors.push(`Failed to create solution file: ${error}`)
      }
    }

    // Generate rubric file
    if (content.rubric) {
      await this.generateRubricFile(content.rubric, kataPath, result)
    }
  }

  /**
   * Generate files for codebase katas
   */
  private async generateCodebaseKataFiles(
    content: GeneratedKataContent,
    kataPath: string,
    result: FileGenerationResult
  ): Promise<void> {
    // Generate entry file (codebase to analyze)
    if (content.starterCode) {
      try {
        const entryPath = path.join(kataPath, content.metadata.entry)
        fs.writeFileSync(entryPath, content.starterCode, 'utf8')
        result.filesCreated.push(content.metadata.entry)
      } catch (error) {
        result.errors.push(`Failed to create entry file: ${error}`)
      }
    }

    // Generate analysis template
    try {
      const analysisPath = path.join(kataPath, 'analysis.md')
      const analysisTemplate = `# Codebase Analysis: ${content.metadata.title}

## Overview

[Provide a high-level overview of the codebase]

## Architecture

[Describe the overall architecture and design patterns]

## Key Components

[Identify and explain the main components]

## Code Quality

[Assess code quality, readability, and maintainability]

## Recommendations

[Suggest improvements or optimizations]

## Conclusion

[Summarize your analysis]
`
      fs.writeFileSync(analysisPath, analysisTemplate, 'utf8')
      result.filesCreated.push('analysis.md')
    } catch (error) {
      result.errors.push(`Failed to create analysis template: ${error}`)
    }

    // Generate solution analysis if provided
    if (content.solutionCode) {
      try {
        const solutionPath = path.join(kataPath, 'solution_analysis.md')
        fs.writeFileSync(solutionPath, content.solutionCode, 'utf8')
        result.filesCreated.push('solution_analysis.md')
      } catch (error) {
        result.errors.push(`Failed to create solution analysis: ${error}`)
      }
    }

    // Generate rubric file
    if (content.rubric) {
      await this.generateRubricFile(content.rubric, kataPath, result)
    }
  }

  /**
   * Generate files for multi-question katas
   */
  private async generateMultiQuestionKataFiles(
    content: GeneratedKataContent,
    kataPath: string,
    result: FileGenerationResult
  ): Promise<void> {
    // Generate answer template
    try {
      const answerPath = path.join(kataPath, content.metadata.entry)
      const answerTemplate = `# ${content.metadata.title}

<!-- This file will be used to store your answers -->
<!-- The multi-question interface will handle the actual questions -->

## Instructions

This is a multi-question assessment. Use the application interface to answer the questions.
Your progress will be automatically saved.

## Notes

[You can add any notes or scratch work here]
`
      fs.writeFileSync(answerPath, answerTemplate, 'utf8')
      result.filesCreated.push(content.metadata.entry)
    } catch (error) {
      result.errors.push(`Failed to create answer template: ${error}`)
    }

    // Generate config file with multi-question configuration
    if (content.multiQuestionConfig) {
      await this.generateMultiQuestionConfig(content.multiQuestionConfig, content.metadata, kataPath, result)
    }

    // Generate solution files for code questions
    if (content.multiQuestionConfig) {
      await this.generateMultiQuestionSolutions(content.multiQuestionConfig, kataPath, result)
    }
  }

  /**
   * Generate files for shortform katas (legacy)
   */
  private async generateShortformKataFiles(
    content: GeneratedKataContent,
    kataPath: string,
    result: FileGenerationResult
  ): Promise<void> {
    // Generate answer template
    try {
      const answerPath = path.join(kataPath, content.metadata.entry)
      const answerTemplate = `# ${content.metadata.title}

<!-- Write your answer here -->

## Your Answer

[Replace this with your answer]
`
      fs.writeFileSync(answerPath, answerTemplate, 'utf8')
      result.filesCreated.push(content.metadata.entry)
    } catch (error) {
      result.errors.push(`Failed to create answer template: ${error}`)
    }

    // Generate config file with shortform configuration
    if (content.shortformConfig) {
      await this.generateShortformConfig(content.shortformConfig, kataPath, result)
    }
  }

  /**
   * Generate files for one-liner katas (legacy)
   */
  private async generateOneLinerKataFiles(
    content: GeneratedKataContent,
    kataPath: string,
    result: FileGenerationResult
  ): Promise<void> {
    // Generate answer template
    try {
      const answerPath = path.join(kataPath, content.metadata.entry)
      const answerTemplate = `# ${content.metadata.title}

<!-- Write your one-liner answer here -->

## Your Answer

[Replace this with your one-liner answer]
`
      fs.writeFileSync(answerPath, answerTemplate, 'utf8')
      result.filesCreated.push(content.metadata.entry)
    } catch (error) {
      result.errors.push(`Failed to create answer template: ${error}`)
    }

    // Generate config file with one-liner configuration
    if (content.oneLinerConfig) {
      await this.generateOneLinerConfig(content.oneLinerConfig, kataPath, result)
    }
  }

  /**
   * Generate files for multiple-choice katas (legacy)
   */
  private async generateMultipleChoiceKataFiles(
    content: GeneratedKataContent,
    kataPath: string,
    result: FileGenerationResult
  ): Promise<void> {
    // Generate answer template
    try {
      const answerPath = path.join(kataPath, content.metadata.entry)
      const answerTemplate = `# ${content.metadata.title}

<!-- Select your answer(s) using the application interface -->

## Instructions

This is a multiple-choice question. Use the application interface to select your answer(s).

## Notes

[You can add any notes or reasoning here]
`
      fs.writeFileSync(answerPath, answerTemplate, 'utf8')
      result.filesCreated.push(content.metadata.entry)
    } catch (error) {
      result.errors.push(`Failed to create answer template: ${error}`)
    }

    // Generate config file with multiple-choice configuration
    if (content.multipleChoiceConfig) {
      await this.generateMultipleChoiceConfig(content.multipleChoiceConfig, kataPath, result)
    }
  }

  /**
   * Generate multi-question configuration
   */
  private async generateMultiQuestionConfig(
    config: MultiQuestionConfig,
    metadata: KataMetadata,
    kataPath: string,
    result: FileGenerationResult
  ): Promise<void> {
    try {
      // Update metadata to include multiQuestion config
      const updatedMetadata = {
        ...metadata,
        multiQuestion: config
      }

      // Write updated meta.yaml with embedded config
      const metaPath = path.join(kataPath, 'meta.yaml')
      const yamlContent = yaml.dump(updatedMetadata, {
        indent: 2,
        lineWidth: 120,
        noRefs: true
      })

      fs.writeFileSync(metaPath, yamlContent, 'utf8')
      
      // Also create separate config.yaml for clarity
      const configPath = path.join(kataPath, 'config.yaml')
      const configContent = yaml.dump({ multiQuestion: config }, {
        indent: 2,
        lineWidth: 120,
        noRefs: true
      })

      fs.writeFileSync(configPath, configContent, 'utf8')
      result.filesCreated.push('config.yaml')
    } catch (error) {
      result.errors.push(`Failed to create multi-question config: ${error}`)
    }
  }

  /**
   * Generate solution files for multi-question code questions
   */
  private async generateMultiQuestionSolutions(
    config: MultiQuestionConfig,
    kataPath: string,
    result: FileGenerationResult
  ): Promise<void> {
    // Create solutions directory
    const solutionsDir = path.join(kataPath, 'solutions')
    if (!fs.existsSync(solutionsDir)) {
      fs.mkdirSync(solutionsDir, { recursive: true })
    }

    for (const question of config.questions) {
      if (question.type === 'code' && question.language) {
        try {
          const extension = this.getFileExtension(question.language)
          const solutionFile = `${question.id}.${extension}`
          const solutionPath = path.join(solutionsDir, solutionFile)
          
          // Generate basic solution template if no solution provided
          const solutionContent = `# Solution for question: ${question.id}
# ${question.question}

# TODO: Implement solution
pass  # Remove this and implement the solution
`
          
          fs.writeFileSync(solutionPath, solutionContent, 'utf8')
          result.filesCreated.push(`solutions/${solutionFile}`)
        } catch (error) {
          result.errors.push(`Failed to create solution for question ${question.id}: ${error}`)
        }
      }
    }
  }

  /**
   * Generate shortform configuration (legacy)
   */
  private async generateShortformConfig(
    config: ShortformConfig,
    kataPath: string,
    result: FileGenerationResult
  ): Promise<void> {
    try {
      const configPath = path.join(kataPath, 'config.yaml')
      const configContent = yaml.dump({ shortform: config }, {
        indent: 2,
        lineWidth: 120,
        noRefs: true
      })

      fs.writeFileSync(configPath, configContent, 'utf8')
      result.filesCreated.push('config.yaml')
    } catch (error) {
      result.errors.push(`Failed to create shortform config: ${error}`)
    }
  }

  /**
   * Generate one-liner configuration (legacy)
   */
  private async generateOneLinerConfig(
    config: OneLinerConfig,
    kataPath: string,
    result: FileGenerationResult
  ): Promise<void> {
    try {
      const configPath = path.join(kataPath, 'config.yaml')
      const configContent = yaml.dump({ oneLiner: config }, {
        indent: 2,
        lineWidth: 120,
        noRefs: true
      })

      fs.writeFileSync(configPath, configContent, 'utf8')
      result.filesCreated.push('config.yaml')
    } catch (error) {
      result.errors.push(`Failed to create one-liner config: ${error}`)
    }
  }

  /**
   * Generate multiple-choice configuration (legacy)
   */
  private async generateMultipleChoiceConfig(
    config: MultipleChoiceConfig,
    kataPath: string,
    result: FileGenerationResult
  ): Promise<void> {
    try {
      const configPath = path.join(kataPath, 'config.yaml')
      const configContent = yaml.dump({ multipleChoice: config }, {
        indent: 2,
        lineWidth: 120,
        noRefs: true
      })

      fs.writeFileSync(configPath, configContent, 'utf8')
      result.filesCreated.push('config.yaml')
    } catch (error) {
      result.errors.push(`Failed to create multiple-choice config: ${error}`)
    }
  }

  /**
   * Generate rubric file
   */
  private async generateRubricFile(
    rubric: Rubric,
    kataPath: string,
    result: FileGenerationResult
  ): Promise<void> {
    try {
      const rubricPath = path.join(kataPath, 'rubric.yaml')
      const rubricContent = yaml.dump(rubric, {
        indent: 2,
        lineWidth: 120,
        noRefs: true
      })

      fs.writeFileSync(rubricPath, rubricContent, 'utf8')
      result.filesCreated.push('rubric.yaml')
    } catch (error) {
      result.errors.push(`Failed to create rubric file: ${error}`)
    }
  }

  /**
   * Generate package.json for JS/TS katas
   */
  private async generatePackageJson(
    metadata: KataMetadata,
    kataPath: string,
    result: FileGenerationResult
  ): Promise<void> {
    try {
      const packageJson = {
        name: metadata.slug,
        version: "1.0.0",
        description: metadata.title,
        main: metadata.entry,
        scripts: {
          test: metadata.language === 'ts' ? "tsc && node tests.js" : "node tests.js"
        },
        keywords: metadata.tags || [],
        devDependencies: metadata.language === 'ts' ? {
          "typescript": "^5.0.0",
          "@types/node": "^20.0.0"
        } : {}
      }

      const packagePath = path.join(kataPath, 'package.json')
      fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2), 'utf8')
      result.filesCreated.push('package.json')
    } catch (error) {
      result.errors.push(`Failed to create package.json: ${error}`)
    }
  }

  /**
   * Resolve slug conflicts
   */
  private async resolveSlugConflict(
    originalSlug: string,
    resolution?: SlugConflictResolution
  ): Promise<string | null> {
    const kataPath = path.join(this.katasDirectory, originalSlug)
    
    // No conflict if directory doesn't exist
    if (!fs.existsSync(kataPath)) {
      return originalSlug
    }

    // Handle resolution
    if (!resolution) {
      throw new Error(`Kata with slug '${originalSlug}' already exists. Please provide conflict resolution.`)
    }

    switch (resolution.action) {
      case 'overwrite':
        // Remove existing directory
        try {
          fs.rmSync(kataPath, { recursive: true, force: true })
          return originalSlug
        } catch (error) {
          throw new Error(`Failed to overwrite existing kata: ${error}`)
        }

      case 'rename':
        if (!resolution.newSlug) {
          throw new Error('New slug required for rename action')
        }
        
        // Check if new slug also conflicts
        const newKataPath = path.join(this.katasDirectory, resolution.newSlug)
        if (fs.existsSync(newKataPath)) {
          throw new Error(`New slug '${resolution.newSlug}' also conflicts with existing kata`)
        }
        
        return resolution.newSlug

      case 'cancel':
        return null

      default:
        throw new Error(`Unknown conflict resolution action: ${resolution.action}`)
    }
  }

  /**
   * Generate a unique slug by appending a number
   */
  generateUniqueSlug(baseSlug: string): string {
    let counter = 1
    let candidateSlug = baseSlug

    while (fs.existsSync(path.join(this.katasDirectory, candidateSlug))) {
      candidateSlug = `${baseSlug}-${counter}`
      counter++
    }

    return candidateSlug
  }

  /**
   * Check if a slug already exists
   */
  slugExists(slug: string): boolean {
    return fs.existsSync(path.join(this.katasDirectory, slug))
  }

  /**
   * Get file extension for a language
   */
  private getFileExtension(language: Language): string {
    switch (language) {
      case 'py': return 'py'
      case 'js': return 'js'
      case 'ts': return 'ts'
      case 'cpp': return 'cpp'
      case 'none': return 'md'
      default: return 'txt'
    }
  }

  /**
   * Get the katas directory path
   */
  getKatasDirectory(): string {
    return this.katasDirectory
  }

  /**
   * Set the katas directory path
   */
  setKatasDirectory(directory: string): void {
    this.katasDirectory = directory
  }
}