import { spawn } from 'child_process'
import { join, dirname } from 'path'
import { writeFileSync, existsSync, readFileSync } from 'fs'
import { ExecutionResult, TestResult, Language } from '@/types'

export class CodeExecutionService {
  private static instance: CodeExecutionService | null = null

  static getInstance(): CodeExecutionService {
    if (!CodeExecutionService.instance) {
      CodeExecutionService.instance = new CodeExecutionService()
    }
    return CodeExecutionService.instance
  }

  /**
   * Execute Python code with tests
   */
  async executePython(
    userCode: string,
    _testFilePath: string,
    kataPath: string,
    hidden: boolean = false,
    timeoutMs: number = 5000
  ): Promise<ExecutionResult> {
    const startTime = Date.now()
    
    try {
      // Determine which test file to use
      const testFileName = hidden ? 'hidden_tests.py' : 'tests.py'
      const fullTestPath = join(kataPath, testFileName)

      // Check if test file exists
      if (!existsSync(fullTestPath)) {
        return {
          success: false,
          output: '',
          errors: `Test file not found: ${testFileName}`,
          testResults: [],
          duration: Date.now() - startTime
        }
      }

      // Write user code directly to the kata directory (overwrite entry.py)
      const userCodePath = join(kataPath, 'entry.py')
      const originalCode = existsSync(userCodePath) ? readFileSync(userCodePath, 'utf8') : null
      
      try {
        // Write user code temporarily
        writeFileSync(userCodePath, userCode)

        // Execute Python tests from the kata directory
        const result = await this.runPythonProcess(fullTestPath, kataPath, timeoutMs)
        
        // Read test file to get accurate test count
        const testFileContent = readFileSync(fullTestPath, 'utf8')
        
        // Parse test results from output
        const testResults = this.parsePythonTestResults(result.stdout, result.stderr, result.success, testFileContent)
        
        // Calculate score if tests passed
        let score: number | undefined
        if (testResults.length > 0) {
          const passedTests = testResults.filter(t => t.passed).length
          score = (passedTests / testResults.length) * 100
        }

        return {
          success: result.success,
          output: result.stdout,
          errors: result.stderr,
          testResults,
          score,
          duration: Date.now() - startTime
        }
      } finally {
        // Restore original code if it existed
        if (originalCode !== null) {
          writeFileSync(userCodePath, originalCode)
        }
      }

    } catch (error: any) {
      return {
        success: false,
        output: '',
        errors: `Execution error: ${error.message}`,
        testResults: [],
        duration: Date.now() - startTime
      }
    }
  }

  /**
   * Run Python process with timeout
   */
  private runPythonProcess(
    testFilePath: string,
    workingDir: string,
    timeoutMs: number
  ): Promise<{ success: boolean; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
      let stdout = ''
      let stderr = ''
      let isResolved = false

      // Set up environment to include the working directory in Python path
      const env = {
        ...process.env,
        PYTHONPATH: `${workingDir};${dirname(testFilePath)};${process.env.PYTHONPATH || ''}` // Use semicolon for Windows
      }

      const pythonProcess = spawn('python', [testFilePath], {
        cwd: workingDir,
        env,
        stdio: ['pipe', 'pipe', 'pipe']
      })

      // Set up timeout
      const timeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true
          pythonProcess.kill('SIGKILL')
          resolve({
            success: false,
            stdout,
            stderr: stderr + '\nExecution timed out'
          })
        }
      }, timeoutMs)

      // Collect stdout
      pythonProcess.stdout?.on('data', (data) => {
        stdout += data.toString()
      })

      // Collect stderr
      pythonProcess.stderr?.on('data', (data) => {
        stderr += data.toString()
      })

      // Handle process completion
      pythonProcess.on('close', (code) => {
        if (!isResolved) {
          isResolved = true
          clearTimeout(timeout)
          resolve({
            success: code === 0,
            stdout,
            stderr
          })
        }
      })

      // Handle process errors
      pythonProcess.on('error', (error) => {
        if (!isResolved) {
          isResolved = true
          clearTimeout(timeout)
          resolve({
            success: false,
            stdout,
            stderr: stderr + `\nProcess error: ${error.message}`
          })
        }
      })
    })
  }

  /**
   * Parse Python test results from output
   */
  private parsePythonTestResults(stdout: string, stderr: string, success: boolean, testFileContent?: string): TestResult[] {
    const testResults: TestResult[] = []

    if (success && stdout.includes('All') && stdout.includes('tests passed!')) {
      // If all tests passed, we need to infer the test count
      const testCount = this.estimateTestCount(stdout, stderr, testFileContent)
      
      for (let i = 1; i <= testCount; i++) {
        testResults.push({
          name: `test_${i}`,
          passed: true,
          message: 'Test passed'
        })
      }
    } else {
      // Parse failures from traceback
      const allOutput = stdout + '\n' + stderr
      const lines = allOutput.split('\n')
      
      // Look for function calls in traceback to identify which test failed
      let failedTest = 'unknown_test'
      let errorMessage = 'Test failed'
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        
        // Look for test function calls in traceback
        const testCallMatch = line.match(/(\w*test_\w+)\(\)/)
        if (testCallMatch) {
          failedTest = testCallMatch[1]
        }
        
        // Look for the actual error line
        if (line.includes('AssertionError:')) {
          errorMessage = line.replace('AssertionError:', '').trim()
        } else if (line.includes('TypeError:') || line.includes('ValueError:') || line.includes('AttributeError:')) {
          errorMessage = line
        }
      }
      
      // Create a test result for the failure
      testResults.push({
        name: failedTest,
        passed: false,
        message: errorMessage
      })
      
      // If we can estimate total test count, add the remaining as not run
      const totalTests = this.estimateTestCount(allOutput, '', testFileContent)
      if (totalTests > 1) {
        for (let i = 2; i <= totalTests; i++) {
          testResults.push({
            name: `test_${i}`,
            passed: false,
            message: 'Test not executed due to earlier failure'
          })
        }
      }
    }

    return testResults
  }

  /**
   * Estimate test count from output when all tests pass
   */
  private estimateTestCount(stdout: string, stderr: string, testFileContent?: string): number {
    // First try to count from test file content if available
    if (testFileContent) {
      const testMatches = testFileContent.match(/def test_\w+/g)
      if (testMatches) {
        return testMatches.length
      }
    }
    
    const output = stdout + stderr
    
    // Look for test function definitions in the output
    const testMatches = output.match(/def test_\w+/g)
    if (testMatches) {
      return testMatches.length
    }

    // Look for test execution patterns
    const testCallMatches = output.match(/test_\w+\(\)/g)
    if (testCallMatches) {
      return testCallMatches.length
    }

    // Default assumption
    return 3
  }



  /**
   * Execute code for any supported language (placeholder for other languages)
   */
  async executeCode(
    language: Language,
    userCode: string,
    testFilePath: string,
    kataPath: string,
    hidden: boolean = false,
    timeoutMs: number = 5000
  ): Promise<ExecutionResult> {
    switch (language) {
      case 'py':
        return this.executePython(userCode, testFilePath, kataPath, hidden, timeoutMs)
      
      case 'js':
      case 'ts':
        // TODO: Implement in task 10
        return {
          success: false,
          output: '',
          errors: 'JavaScript/TypeScript execution not implemented yet',
          testResults: [],
          duration: 0
        }
      
      case 'cpp':
        // TODO: Implement in task 11
        return {
          success: false,
          output: '',
          errors: 'C++ execution not implemented yet',
          testResults: [],
          duration: 0
        }
      
      default:
        return {
          success: false,
          output: '',
          errors: `Unsupported language: ${language}`,
          testResults: [],
          duration: 0
        }
    }
  }
}