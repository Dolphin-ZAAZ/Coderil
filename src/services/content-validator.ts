import { 
  Language, 
  KataMetadata, 
  Rubric, 
  KataType, 
  ValidationError,
  ValidationWarning,
  ContentValidationResult,
  validateKataMetadata,
  validateRubric
} from '@/types'
import { CodeExecutionService } from './code-execution'
import { errorHandler } from './error-handler'
import { spawn } from 'child_process'
import { writeFileSync, mkdirSync, existsSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

export class ContentValidatorService {
  private static instance: ContentValidatorService | null = null
  private codeExecutionService: CodeExecutionService

  private constructor() {
    this.codeExecutionService = CodeExecutionService.getInstance()
  }

  static getInstance(): ContentValidatorService {
    if (!ContentValidatorService.instance) {
      ContentValidatorService.instance = new ContentValidatorService()
    }
    return ContentValidatorService.instance
  }

  /**
   * Validate generated code for syntax errors
   */
  async validateGeneratedCode(code: string, language: Language): Promise<ContentValidationResult> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    const suggestions: string[] = []

    if (language === 'none') {
      return { isValid: true, errors, warnings, suggestions }
    }

    try {
      switch (language) {
        case 'py':
          return await this.validatePythonCode(code)
        case 'js':
          return await this.validateJavaScriptCode(code)
        case 'ts':
          return await this.validateTypeScriptCode(code)
        case 'cpp':
          return await this.validateCppCode(code)
        default:
          errors.push({
            type: 'syntax',
            message: `Unsupported language: ${language}`
          })
          return { isValid: false, errors, warnings, suggestions }
      }
    } catch (error) {
      errorHandler.handleError(error as Error, {
        operation: 'validate_generated_code',
        language,
        codeLength: code.length
      })

      errors.push({
        type: 'syntax',
        message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
      return { isValid: false, errors, warnings, suggestions }
    }
  }

  /**
   * Validate test cases by executing them against the solution
   */
  async validateTestCases(
    tests: string, 
    solution: string, 
    language: Language
  ): Promise<ContentValidationResult> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    const suggestions: string[] = []

    if (language === 'none') {
      return { isValid: true, errors, warnings, suggestions }
    }

    try {
      // Create temporary directory for test execution
      const tempDir = join(tmpdir(), `kata-validation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
      mkdirSync(tempDir, { recursive: true })

      try {
        // Write solution and test files
        const fileExtension = this.getFileExtension(language)
        const solutionFile = join(tempDir, `entry.${fileExtension}`)
        const testFile = join(tempDir, `tests.${fileExtension}`)

        writeFileSync(solutionFile, solution)
        writeFileSync(testFile, tests)

        // Execute tests against solution
        const result = await this.codeExecutionService.executeCode(
          language,
          solution,
          testFile,
          tempDir,
          false, // not hidden tests
          10000 // 10 second timeout
        )

        // Analyze execution results
        if (!result.success) {
          errors.push({
            type: 'logic',
            message: 'Test execution failed',
            file: 'tests'
          })

          if (result.errors) {
            errors.push({
              type: 'logic',
              message: `Test errors: ${result.errors}`,
              file: 'tests'
            })
          }
        } else {
          // Check if all tests passed
          const failedTests = result.testResults?.filter(t => !t.passed) || []
          if (failedTests.length > 0) {
            errors.push({
              type: 'logic',
              message: `${failedTests.length} test(s) failed`,
              file: 'tests'
            })

            failedTests.forEach(test => {
              errors.push({
                type: 'logic',
                message: `Test "${test.name}" failed: ${test.message || 'No message'}`,
                file: 'tests'
              })
            })
          }

          // Check test coverage
          const testCount = result.testResults?.length || 0
          if (testCount < 3) {
            warnings.push({
              type: 'clarity',
              message: 'Consider adding more test cases for better coverage',
              file: 'tests',
              suggestion: 'Add edge cases and boundary conditions'
            })
          }

          // Check for meaningful test names
          const genericTestNames = result.testResults?.filter(t => 
            t.name.match(/^test_?\d+$/) || t.name === 'test' || t.name === 'unknown_test'
          ) || []
          
          if (genericTestNames.length > 0) {
            warnings.push({
              type: 'clarity',
              message: 'Test names could be more descriptive',
              file: 'tests',
              suggestion: 'Use descriptive test names that explain what is being tested'
            })
          }
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings,
          suggestions
        }

      } finally {
        // Clean up temporary directory
        if (existsSync(tempDir)) {
          rmSync(tempDir, { recursive: true, force: true })
        }
      }

    } catch (error) {
      errorHandler.handleError(error as Error, {
        operation: 'validate_test_cases',
        language,
        testsLength: tests.length,
        solutionLength: solution.length
      })

      errors.push({
        type: 'logic',
        message: `Test validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })

      return { isValid: false, errors, warnings, suggestions }
    }
  }

  /**
   * Validate kata metadata
   */
  validateMetadata(metadata: KataMetadata): ContentValidationResult {
    const validationResult = validateKataMetadata(metadata)
    
    const errors: ValidationError[] = validationResult.errors.map(error => ({
      type: 'metadata' as const,
      message: error,
      file: 'meta.yaml'
    }))

    const warnings: ValidationWarning[] = validationResult.warnings.map(warning => ({
      type: 'clarity' as const,
      message: warning,
      file: 'meta.yaml',
      suggestion: 'Consider adding missing metadata for better discoverability'
    }))

    const suggestions: string[] = []

    // Additional quality checks
    if (metadata.title && metadata.title.length < 10) {
      warnings.push({
        type: 'clarity',
        message: 'Title is quite short',
        file: 'meta.yaml',
        suggestion: 'Consider a more descriptive title'
      })
    }

    if (metadata.title && metadata.title.length > 100) {
      warnings.push({
        type: 'clarity',
        message: 'Title is quite long',
        file: 'meta.yaml',
        suggestion: 'Consider shortening the title'
      })
    }

    if (metadata.tags && metadata.tags.length === 0) {
      suggestions.push('Add relevant tags to improve kata discoverability')
    }

    if (metadata.tags && metadata.tags.length > 10) {
      warnings.push({
        type: 'clarity',
        message: 'Many tags specified',
        file: 'meta.yaml',
        suggestion: 'Consider using fewer, more specific tags'
      })
    }

    // Check timeout values
    if (metadata.type === 'code' && metadata.timeout_ms < 1000) {
      warnings.push({
        type: 'performance',
        message: 'Timeout is quite short for code execution',
        file: 'meta.yaml',
        suggestion: 'Consider increasing timeout for complex algorithms'
      })
    }

    if (metadata.timeout_ms > 30000) {
      warnings.push({
        type: 'performance',
        message: 'Timeout is quite long',
        file: 'meta.yaml',
        suggestion: 'Consider reducing timeout to prevent hanging'
      })
    }

    return {
      isValid: validationResult.isValid,
      errors,
      warnings,
      suggestions
    }
  }

  /**
   * Validate complete generated kata content
   */
  async validateGeneratedContent(content: any): Promise<ContentValidationResult> {
    const allErrors: ValidationError[] = []
    const allWarnings: ValidationWarning[] = []
    const allSuggestions: string[] = []

    try {
      // Validate metadata
      if (content.metadata) {
        const metadataResult = this.validateMetadata(content.metadata)
        allErrors.push(...metadataResult.errors)
        allWarnings.push(...metadataResult.warnings)
        allSuggestions.push(...metadataResult.suggestions)
      }

      // Validate starter code if present
      if (content.starterCode && content.metadata?.language && content.metadata.language !== 'none') {
        const codeResult = await this.validateGeneratedCode(content.starterCode, content.metadata.language)
        allErrors.push(...codeResult.errors)
        allWarnings.push(...codeResult.warnings)
        allSuggestions.push(...codeResult.suggestions)
      }

      // Validate test cases if present
      if (content.testCode && content.solutionCode && content.metadata?.language && content.metadata.language !== 'none') {
        const testResult = await this.validateTestCases(content.testCode, content.solutionCode, content.metadata.language)
        allErrors.push(...testResult.errors)
        allWarnings.push(...testResult.warnings)
        allSuggestions.push(...testResult.suggestions)
      }

      // Validate rubric if present
      if (content.rubric && content.metadata?.type) {
        const rubricResult = this.validateRubric(content.rubric, content.metadata.type)
        allErrors.push(...rubricResult.errors)
        allWarnings.push(...rubricResult.warnings)
        allSuggestions.push(...rubricResult.suggestions)
      }

      // Validate solution code if present
      if (content.solutionCode && content.metadata?.language && content.metadata.language !== 'none') {
        const solutionResult = await this.validateGeneratedCode(content.solutionCode, content.metadata.language)
        allErrors.push(...solutionResult.errors)
        allWarnings.push(...solutionResult.warnings)
        allSuggestions.push(...solutionResult.suggestions)
      }

      return {
        isValid: allErrors.length === 0,
        errors: allErrors,
        warnings: allWarnings,
        suggestions: allSuggestions
      }

    } catch (error) {
      return {
        isValid: false,
        errors: [{
          type: 'structure',
          message: `Content validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        warnings: [],
        suggestions: []
      }
    }
  }

  /**
   * Validate rubric for explanation and template katas
   */
  validateRubric(rubric: Rubric, type: KataType): ContentValidationResult {
    const validationResult = validateRubric(rubric)
    
    const errors: ValidationError[] = validationResult.errors.map(error => ({
      type: 'structure' as const,
      message: error,
      file: 'rubric.yaml'
    }))

    const warnings: ValidationWarning[] = []
    const suggestions: string[] = []

    // Type-specific validation
    if (type === 'explain') {
      const expectedKeys = ['correctness', 'clarity', 'completeness']
      const missingKeys = expectedKeys.filter(key => !rubric.keys.includes(key))
      
      if (missingKeys.length > 0) {
        warnings.push({
          type: 'clarity',
          message: `Consider adding standard explanation criteria: ${missingKeys.join(', ')}`,
          file: 'rubric.yaml',
          suggestion: 'Include correctness, clarity, and completeness for explanation katas'
        })
      }
    }

    if (type === 'template') {
      const expectedKeys = ['structure', 'completeness', 'best_practices']
      const missingKeys = expectedKeys.filter(key => !rubric.keys.includes(key))
      
      if (missingKeys.length > 0) {
        warnings.push({
          type: 'clarity',
          message: `Consider adding standard template criteria: ${missingKeys.join(', ')}`,
          file: 'rubric.yaml',
          suggestion: 'Include structure, completeness, and best_practices for template katas'
        })
      }
    }

    // Check threshold values
    if (rubric.threshold.min_total > 100) {
      errors.push({
        type: 'structure',
        message: 'min_total threshold cannot exceed 100',
        file: 'rubric.yaml'
      })
    }

    if (rubric.threshold.min_correctness > rubric.threshold.min_total) {
      warnings.push({
        type: 'clarity',
        message: 'min_correctness is higher than min_total',
        file: 'rubric.yaml',
        suggestion: 'Ensure threshold values are logically consistent'
      })
    }

    return {
      isValid: validationResult.isValid && errors.length === 0,
      errors,
      warnings,
      suggestions
    }
  }

  /**
   * Validate Python code syntax
   */
  private async validatePythonCode(code: string): Promise<ContentValidationResult> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    const suggestions: string[] = []

    try {
      // Create temporary file for syntax checking
      const tempDir = join(tmpdir(), `python-validation-${Date.now()}`)
      mkdirSync(tempDir, { recursive: true })
      
      try {
        const tempFile = join(tempDir, 'temp.py')
        writeFileSync(tempFile, code)

        // Use Python's py_compile module to check syntax
        const result = await this.runProcess('python', ['-m', 'py_compile', tempFile], tempDir, 5000)
        
        if (!result.success) {
          // Parse Python syntax errors
          const syntaxErrors = this.parsePythonSyntaxErrors(result.stderr)
          errors.push(...syntaxErrors)
        }

        // Additional Python-specific checks
        const pythonWarnings = this.checkPythonStyle(code)
        warnings.push(...pythonWarnings)

      } finally {
        if (existsSync(tempDir)) {
          rmSync(tempDir, { recursive: true, force: true })
        }
      }

    } catch (error) {
      errors.push({
        type: 'syntax',
        message: `Python validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }

    return { isValid: errors.length === 0, errors, warnings, suggestions }
  }

  /**
   * Validate JavaScript code syntax
   */
  private async validateJavaScriptCode(code: string): Promise<ContentValidationResult> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    const suggestions: string[] = []

    try {
      // Use Node.js to check syntax
      const tempDir = join(tmpdir(), `js-validation-${Date.now()}`)
      mkdirSync(tempDir, { recursive: true })
      
      try {
        const tempFile = join(tempDir, 'temp.js')
        writeFileSync(tempFile, code)

        const result = await this.runProcess('node', ['--check', tempFile], tempDir, 5000)
        
        if (!result.success) {
          const syntaxErrors = this.parseJavaScriptSyntaxErrors(result.stderr)
          errors.push(...syntaxErrors)
        }

        // Additional JavaScript-specific checks
        const jsWarnings = this.checkJavaScriptStyle(code)
        warnings.push(...jsWarnings)

      } finally {
        if (existsSync(tempDir)) {
          rmSync(tempDir, { recursive: true, force: true })
        }
      }

    } catch (error) {
      errors.push({
        type: 'syntax',
        message: `JavaScript validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }

    return { isValid: errors.length === 0, errors, warnings, suggestions }
  }

  /**
   * Validate TypeScript code syntax
   */
  private async validateTypeScriptCode(code: string): Promise<ContentValidationResult> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    const suggestions: string[] = []

    try {
      // Use TypeScript compiler to check syntax
      const tempDir = join(tmpdir(), `ts-validation-${Date.now()}`)
      mkdirSync(tempDir, { recursive: true })
      
      try {
        const tempFile = join(tempDir, 'temp.ts')
        writeFileSync(tempFile, code)

        // Try npx tsc first, then fall back to tsc
        let result = await this.runProcess('npx', ['tsc', '--noEmit', '--skipLibCheck', tempFile], tempDir, 10000)
        
        if (!result.success && result.stderr.includes('ENOENT')) {
          // Fallback to direct tsc
          result = await this.runProcess('tsc', ['--noEmit', '--skipLibCheck', tempFile], tempDir, 10000)
        }
        
        if (!result.success) {
          if (result.stderr.includes('ENOENT') || result.stderr.includes('not found')) {
            errors.push({
              type: 'syntax',
              message: 'TypeScript compiler not available. Please install TypeScript globally: npm install -g typescript'
            })
          } else {
            const syntaxErrors = this.parseTypeScriptSyntaxErrors(result.stderr)
            errors.push(...syntaxErrors)
          }
        }

        // Additional TypeScript-specific checks
        const tsWarnings = this.checkTypeScriptStyle(code)
        warnings.push(...tsWarnings)

      } finally {
        if (existsSync(tempDir)) {
          rmSync(tempDir, { recursive: true, force: true })
        }
      }

    } catch (error) {
      errors.push({
        type: 'syntax',
        message: `TypeScript validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }

    return { isValid: errors.length === 0, errors, warnings, suggestions }
  }

  /**
   * Validate C++ code syntax
   */
  private async validateCppCode(code: string): Promise<ContentValidationResult> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    const suggestions: string[] = []

    try {
      // Use g++ to check syntax
      const tempDir = join(tmpdir(), `cpp-validation-${Date.now()}`)
      mkdirSync(tempDir, { recursive: true })
      
      try {
        const tempFile = join(tempDir, 'temp.cpp')
        writeFileSync(tempFile, code)

        const result = await this.runProcess('g++', ['-fsyntax-only', '-std=c++17', tempFile], tempDir, 10000)
        
        if (!result.success) {
          if (result.stderr.includes('g++') && result.stderr.includes('not found')) {
            errors.push({
              type: 'syntax',
              message: 'C++ compiler not available. Please install g++ or clang++'
            })
          } else {
            const syntaxErrors = this.parseCppSyntaxErrors(result.stderr)
            errors.push(...syntaxErrors)
          }
        }

        // Additional C++-specific checks
        const cppWarnings = this.checkCppStyle(code)
        warnings.push(...cppWarnings)

      } finally {
        if (existsSync(tempDir)) {
          rmSync(tempDir, { recursive: true, force: true })
        }
      }

    } catch (error) {
      errors.push({
        type: 'syntax',
        message: `C++ validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }

    return { isValid: errors.length === 0, errors, warnings, suggestions }
  }

  /**
   * Run a process with timeout
   */
  private runProcess(
    command: string,
    args: string[],
    cwd: string,
    timeoutMs: number
  ): Promise<{ success: boolean; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
      let stdout = ''
      let stderr = ''
      let isResolved = false

      const process = spawn(command, args, { cwd, stdio: ['pipe', 'pipe', 'pipe'] })

      const timeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true
          process.kill('SIGKILL')
          resolve({ success: false, stdout, stderr: stderr + '\nProcess timed out' })
        }
      }, timeoutMs)

      process.stdout?.on('data', (data) => {
        stdout += data.toString()
      })

      process.stderr?.on('data', (data) => {
        stderr += data.toString()
      })

      process.on('close', (code) => {
        if (!isResolved) {
          isResolved = true
          clearTimeout(timeout)
          resolve({ success: code === 0, stdout, stderr })
        }
      })

      process.on('error', (error) => {
        if (!isResolved) {
          isResolved = true
          clearTimeout(timeout)
          resolve({ success: false, stdout, stderr: stderr + `\nProcess error: ${error.message}` })
        }
      })
    })
  }

  /**
   * Get file extension for language
   */
  private getFileExtension(language: Language): string {
    switch (language) {
      case 'py': return 'py'
      case 'js': return 'js'
      case 'ts': return 'ts'
      case 'cpp': return 'cpp'
      default: return 'txt'
    }
  }

  /**
   * Parse Python syntax errors
   */
  private parsePythonSyntaxErrors(stderr: string): ValidationError[] {
    const errors: ValidationError[] = []
    const lines = stderr.split('\n')

    for (const line of lines) {
      if (line.includes('SyntaxError:') || line.includes('IndentationError:') || line.includes('TabError:')) {
        const lineMatch = line.match(/line (\d+)/)
        const lineNumber = lineMatch ? parseInt(lineMatch[1]) : undefined

        errors.push({
          type: 'syntax',
          message: line.trim(),
          file: 'entry.py',
          line: lineNumber
        })
      }
    }

    return errors
  }

  /**
   * Parse JavaScript syntax errors
   */
  private parseJavaScriptSyntaxErrors(stderr: string): ValidationError[] {
    const errors: ValidationError[] = []
    const lines = stderr.split('\n')

    for (const line of lines) {
      if (line.includes('SyntaxError:') || line.includes('ReferenceError:') || line.includes('TypeError:')) {
        const lineMatch = line.match(/:(\d+):/)
        const lineNumber = lineMatch ? parseInt(lineMatch[1]) : undefined

        errors.push({
          type: 'syntax',
          message: line.trim(),
          file: 'entry.js',
          line: lineNumber
        })
      }
    }

    return errors
  }

  /**
   * Parse TypeScript syntax errors
   */
  private parseTypeScriptSyntaxErrors(stderr: string): ValidationError[] {
    const errors: ValidationError[] = []
    const lines = stderr.split('\n')

    for (const line of lines) {
      if (line.includes('error TS')) {
        const lineMatch = line.match(/\((\d+),\d+\):/)
        const lineNumber = lineMatch ? parseInt(lineMatch[1]) : undefined

        errors.push({
          type: 'syntax',
          message: line.trim(),
          file: 'entry.ts',
          line: lineNumber
        })
      }
    }

    return errors
  }

  /**
   * Parse C++ syntax errors
   */
  private parseCppSyntaxErrors(stderr: string): ValidationError[] {
    const errors: ValidationError[] = []
    const lines = stderr.split('\n')

    for (const line of lines) {
      if (line.includes('error:') || line.includes('fatal error:')) {
        const lineMatch = line.match(/:(\d+):/)
        const lineNumber = lineMatch ? parseInt(lineMatch[1]) : undefined

        errors.push({
          type: 'syntax',
          message: line.trim(),
          file: 'entry.cpp',
          line: lineNumber
        })
      }
    }

    return errors
  }

  /**
   * Check Python code style
   */
  private checkPythonStyle(code: string): ValidationWarning[] {
    const warnings: ValidationWarning[] = []

    // Check for common Python style issues
    if (!code.includes('def ')) {
      warnings.push({
        type: 'style',
        message: 'No function definitions found',
        suggestion: 'Consider defining functions for better code organization'
      })
    }

    if (code.includes('\t')) {
      warnings.push({
        type: 'style',
        message: 'Tabs found in code',
        suggestion: 'Use spaces instead of tabs for indentation (PEP 8)'
      })
    }

    const lines = code.split('\n')
    const longLines = lines.filter(line => line.length > 79)
    if (longLines.length > 0) {
      warnings.push({
        type: 'style',
        message: `${longLines.length} line(s) exceed 79 characters`,
        suggestion: 'Consider breaking long lines (PEP 8 recommendation)'
      })
    }

    return warnings
  }

  /**
   * Check JavaScript code style
   */
  private checkJavaScriptStyle(code: string): ValidationWarning[] {
    const warnings: ValidationWarning[] = []

    // Check for common JavaScript style issues
    if (!code.includes('function') && !code.includes('=>')) {
      warnings.push({
        type: 'style',
        message: 'No function definitions found',
        suggestion: 'Consider defining functions for better code organization'
      })
    }

    if (code.includes('var ')) {
      warnings.push({
        type: 'style',
        message: 'var declarations found',
        suggestion: 'Consider using let or const instead of var'
      })
    }

    if (!code.includes('module.exports') && !code.includes('export')) {
      warnings.push({
        type: 'style',
        message: 'No exports found',
        suggestion: 'Consider exporting functions for testing'
      })
    }

    return warnings
  }

  /**
   * Check TypeScript code style
   */
  private checkTypeScriptStyle(code: string): ValidationWarning[] {
    const warnings: ValidationWarning[] = []

    // Check for TypeScript-specific style issues
    if (!code.includes(': ') && !code.includes('interface') && !code.includes('type ')) {
      warnings.push({
        type: 'style',
        message: 'No type annotations found',
        suggestion: 'Consider adding type annotations for better type safety'
      })
    }

    if (code.includes('any')) {
      warnings.push({
        type: 'style',
        message: 'any type found',
        suggestion: 'Consider using more specific types instead of any'
      })
    }

    if (!code.includes('export')) {
      warnings.push({
        type: 'style',
        message: 'No exports found',
        suggestion: 'Consider exporting functions for testing'
      })
    }

    return warnings
  }

  /**
   * Check C++ code style
   */
  private checkCppStyle(code: string): ValidationWarning[] {
    const warnings: ValidationWarning[] = []

    // Check for common C++ style issues
    if (!code.includes('#include')) {
      warnings.push({
        type: 'style',
        message: 'No include statements found',
        suggestion: 'Consider including necessary headers'
      })
    }

    if (!code.includes('std::') && code.includes('using namespace std')) {
      warnings.push({
        type: 'style',
        message: 'using namespace std found',
        suggestion: 'Consider using std:: prefix instead of using namespace std'
      })
    }

    if (code.includes('malloc') || code.includes('free')) {
      warnings.push({
        type: 'style',
        message: 'C-style memory management found',
        suggestion: 'Consider using new/delete or smart pointers in C++'
      })
    }

    return warnings
  }
}