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
   * Execute JavaScript code with tests
   */
  async executeJavaScript(
    userCode: string,
    _testFilePath: string,
    kataPath: string,
    hidden: boolean = false,
    timeoutMs: number = 5000
  ): Promise<ExecutionResult> {
    const startTime = Date.now()
    
    try {
      // Determine which test file to use
      const testFileName = hidden ? 'hidden_tests.js' : 'tests.js'
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

      // Write user code directly to the kata directory (overwrite entry.js)
      const userCodePath = join(kataPath, 'entry.js')
      const originalCode = existsSync(userCodePath) ? readFileSync(userCodePath, 'utf8') : null
      
      try {
        // Write user code temporarily
        writeFileSync(userCodePath, userCode)

        // Execute JavaScript tests from the kata directory
        const result = await this.runNodeProcess(fullTestPath, kataPath, timeoutMs)
        
        // Read test file to get accurate test count
        const testFileContent = readFileSync(fullTestPath, 'utf8')
        
        // Parse test results from output
        const testResults = this.parseJavaScriptTestResults(result.stdout, result.stderr, result.success, testFileContent)
        
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
   * Execute TypeScript code with tests
   */
  async executeTypeScript(
    userCode: string,
    _testFilePath: string,
    kataPath: string,
    hidden: boolean = false,
    timeoutMs: number = 5000
  ): Promise<ExecutionResult> {
    const startTime = Date.now()
    
    try {
      // Determine which test file to use
      const testFileName = hidden ? 'hidden_tests.ts' : 'tests.ts'
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

      // Write user code directly to the kata directory (overwrite entry.ts)
      const userCodePath = join(kataPath, 'entry.ts')
      const originalCode = existsSync(userCodePath) ? readFileSync(userCodePath, 'utf8') : null
      
      try {
        // Write user code temporarily
        writeFileSync(userCodePath, userCode)

        // Try to compile TypeScript to JavaScript
        const compileResult = await this.compileTypeScript(kataPath, timeoutMs, testFileName)
        if (!compileResult.success) {
          // If compilation fails, check if it's due to missing TypeScript compiler
          if (compileResult.stderr.includes('ENOENT') || compileResult.stderr.includes('spawn')) {
            return {
              success: false,
              output: '',
              errors: 'TypeScript compiler not available. Please install TypeScript globally: npm install -g typescript',
              testResults: [{
                name: 'compilation',
                passed: false,
                message: 'TypeScript compiler not found'
              }],
              duration: Date.now() - startTime
            }
          }
          
          return {
            success: false,
            output: compileResult.stdout,
            errors: compileResult.stderr,
            testResults: [{
              name: 'compilation',
              passed: false,
              message: 'TypeScript compilation failed'
            }],
            duration: Date.now() - startTime
          }
        }

        // Execute the compiled JavaScript test file
        const compiledTestPath = fullTestPath.replace('.ts', '.js')
        const result = await this.runNodeProcess(compiledTestPath, kataPath, timeoutMs)
        
        // Read test file to get accurate test count
        const testFileContent = readFileSync(fullTestPath, 'utf8')
        
        // Parse test results from output
        const testResults = this.parseJavaScriptTestResults(result.stdout, result.stderr, result.success, testFileContent)
        
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
   * Compile TypeScript files in the kata directory
   */
  private compileTypeScript(
    kataPath: string,
    timeoutMs: number,
    testFileName: string = 'tests.ts'
  ): Promise<{ success: boolean; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
      let stdout = ''
      let stderr = ''
      let isResolved = false

      // Use tsc directly to compile TypeScript files
      const tscProcess = spawn('tsc', [
        '--target', 'es2020', 
        '--module', 'commonjs', 
        '--esModuleInterop', 
        '--allowSyntheticDefaultImports',
        '--moduleResolution', 'node',
        '--skipLibCheck',
        'entry.ts',
        testFileName
      ], {
        cwd: kataPath,
        stdio: ['pipe', 'pipe', 'pipe']
      })

      // Set up timeout
      const timeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true
          tscProcess.kill('SIGKILL')
          resolve({
            success: false,
            stdout,
            stderr: stderr + '\nTypeScript compilation timed out'
          })
        }
      }, timeoutMs)

      // Collect stdout
      tscProcess.stdout?.on('data', (data) => {
        stdout += data.toString()
      })

      // Collect stderr
      tscProcess.stderr?.on('data', (data) => {
        stderr += data.toString()
      })

      // Handle process completion
      tscProcess.on('close', (code) => {
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
      tscProcess.on('error', (error) => {
        if (!isResolved) {
          isResolved = true
          clearTimeout(timeout)
          resolve({
            success: false,
            stdout,
            stderr: stderr + `\nTypeScript compilation error: ${error.message}`
          })
        }
      })
    })
  }

  /**
   * Run Node.js process with timeout
   */
  private runNodeProcess(
    testFilePath: string,
    workingDir: string,
    timeoutMs: number
  ): Promise<{ success: boolean; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
      let stdout = ''
      let stderr = ''
      let isResolved = false

      const nodeProcess = spawn('node', [testFilePath], {
        cwd: workingDir,
        stdio: ['pipe', 'pipe', 'pipe']
      })

      // Set up timeout
      const timeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true
          nodeProcess.kill('SIGKILL')
          resolve({
            success: false,
            stdout,
            stderr: stderr + '\nExecution timed out'
          })
        }
      }, timeoutMs)

      // Collect stdout
      nodeProcess.stdout?.on('data', (data) => {
        stdout += data.toString()
      })

      // Collect stderr
      nodeProcess.stderr?.on('data', (data) => {
        stderr += data.toString()
      })

      // Handle process completion
      nodeProcess.on('close', (code) => {
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
      nodeProcess.on('error', (error) => {
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
   * Parse JavaScript/TypeScript test results from output
   */
  private parseJavaScriptTestResults(stdout: string, stderr: string, success: boolean, testFileContent?: string): TestResult[] {
    const testResults: TestResult[] = []

    if (success && (stdout.includes('All') && (stdout.includes('tests passed!') || stdout.includes('public tests passed!') || stdout.includes('hidden tests passed!')))) {
      // If all tests passed, we need to infer the test count
      const testCount = this.estimateJavaScriptTestCount(stdout, stderr, testFileContent)
      
      for (let i = 1; i <= testCount; i++) {
        testResults.push({
          name: `test_${i}`,
          passed: true,
          message: 'Test passed'
        })
      }
    } else {
      // Parse failures from error output
      const allOutput = stdout + '\n' + stderr
      const lines = allOutput.split('\n')
      
      // Look for function calls or error messages to identify which test failed
      let failedTest = 'unknown_test'
      let errorMessage = 'Test failed'
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        
        // Look for test function calls in output
        const testCallMatch = line.match(/(\w*test_\w+)\(\)/)
        if (testCallMatch) {
          failedTest = testCallMatch[1]
        }
        
        // Look for Error messages
        if (line.includes('Error:')) {
          errorMessage = line
        } else if (line.includes('TypeError:') || line.includes('ReferenceError:') || line.includes('SyntaxError:')) {
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
      const totalTests = this.estimateJavaScriptTestCount(allOutput, '', testFileContent)
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
   * Estimate JavaScript test count from output when all tests pass
   */
  private estimateJavaScriptTestCount(stdout: string, stderr: string, testFileContent?: string): number {
    // First try to count from test file content if available
    if (testFileContent) {
      const testMatches = testFileContent.match(/function test_\w+/g)
      if (testMatches) {
        return testMatches.length
      }
    }
    
    const output = stdout + stderr
    
    // Look for test function definitions in the output
    const testMatches = output.match(/function test_\w+/g)
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
   * Execute C++ code with tests
   */
  async executeCpp(
    userCode: string,
    _testFilePath: string,
    kataPath: string,
    hidden: boolean = false,
    timeoutMs: number = 5000
  ): Promise<ExecutionResult> {
    const startTime = Date.now()
    
    try {
      // Determine which test file to use
      const testFileName = hidden ? 'hidden_tests.txt' : 'tests.txt'
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

      // Write user code directly to the kata directory (overwrite entry.cpp)
      const userCodePath = join(kataPath, 'entry.cpp')
      const originalCode = existsSync(userCodePath) ? readFileSync(userCodePath, 'utf8') : null
      
      try {
        // Write user code temporarily
        writeFileSync(userCodePath, userCode)

        // Compile the C++ code
        const compileResult = await this.compileCpp(kataPath, timeoutMs)
        if (!compileResult.success) {
          return {
            success: false,
            output: compileResult.stdout,
            errors: compileResult.stderr,
            testResults: [{
              name: 'compilation',
              passed: false,
              message: 'C++ compilation failed'
            }],
            duration: Date.now() - startTime
          }
        }

        // Execute the compiled binary with test cases
        const result = await this.runCppTests(kataPath, fullTestPath, timeoutMs)
        
        // Parse test results from output - the success status is already determined in runCppTests
        const testResults = result.testResults
        
        // Calculate score if tests passed
        let score: number | undefined
        if (testResults.length > 0) {
          const passedTests = testResults.filter(t => t.passed).length
          score = (passedTests / testResults.length) * 100
        }

        // Determine overall success based on test results
        const overallSuccess = testResults.length > 0 && testResults.every(t => t.passed)
        
        return {
          success: overallSuccess,
          output: result.output,
          errors: result.errors,
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
   * Compile C++ code using g++
   */
  private compileCpp(
    kataPath: string,
    timeoutMs: number
  ): Promise<{ success: boolean; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
      let stdout = ''
      let stderr = ''
      let isResolved = false

      // Use g++ to compile the C++ code
      const gppProcess = spawn('g++', [
        '-std=c++20',
        '-O2',
        '-Wall',
        '-Wextra',
        '-o', 'solution.exe',
        'entry.cpp'
      ], {
        cwd: kataPath,
        stdio: ['pipe', 'pipe', 'pipe']
      })

      // Set up timeout
      const timeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true
          gppProcess.kill('SIGKILL')
          resolve({
            success: false,
            stdout,
            stderr: stderr + '\nC++ compilation timed out'
          })
        }
      }, timeoutMs)

      // Collect stdout
      gppProcess.stdout?.on('data', (data) => {
        stdout += data.toString()
      })

      // Collect stderr
      gppProcess.stderr?.on('data', (data) => {
        stderr += data.toString()
      })

      // Handle process completion
      gppProcess.on('close', (code) => {
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
      gppProcess.on('error', (error) => {
        if (!isResolved) {
          isResolved = true
          clearTimeout(timeout)
          resolve({
            success: false,
            stdout,
            stderr: stderr + `\nC++ compilation error: ${error.message}`
          })
        }
      })
    })
  }

  /**
   * Run C++ tests by feeding input to the compiled binary and comparing output
   */
  private async runCppTests(
    kataPath: string,
    testFilePath: string,
    timeoutMs: number
  ): Promise<{ success: boolean; output: string; errors: string; testResults: Array<{ name: string; passed: boolean; message: string; input?: string; expected?: string; actual?: string }> }> {
    try {
      // Read and parse test file
      const testContent = readFileSync(testFilePath, 'utf8')
      const testCases = this.parseCppTestFile(testContent)
      
      if (testCases.length === 0) {
        return {
          success: false,
          output: '',
          errors: 'No test cases found in test file',
          testResults: []
        }
      }

      const testResults: Array<{ name: string; passed: boolean; message: string; input?: string; expected?: string; actual?: string }> = []
      let allPassed = true
      let combinedOutput = ''
      let combinedErrors = ''

      // Run each test case
      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i]
        const testName = `test_${i + 1}`
        
        try {
          const result = await this.runCppBinary(kataPath, testCase.input, timeoutMs)
          
          // Trim whitespace from both expected and actual output for comparison
          const expectedTrimmed = testCase.expectedOutput.trim()
          const actualTrimmed = result.stdout.trim()
          
          const passed = actualTrimmed === expectedTrimmed
          
          testResults.push({
            name: testName,
            passed,
            message: passed ? 'Test passed' : `Expected: "${expectedTrimmed}", Got: "${actualTrimmed}"`,
            input: testCase.input,
            expected: expectedTrimmed,
            actual: actualTrimmed
          })
          
          if (!passed) {
            allPassed = false
          }
          
          combinedOutput += `Test ${i + 1}:\n${result.stdout}\n`
          if (result.stderr) {
            combinedErrors += `Test ${i + 1} stderr:\n${result.stderr}\n`
          }
          
        } catch (error: any) {
          testResults.push({
            name: testName,
            passed: false,
            message: `Test execution failed: ${error.message}`,
            input: testCase.input,
            expected: testCase.expectedOutput,
            actual: ''
          })
          allPassed = false
          combinedErrors += `Test ${i + 1} error: ${error.message}\n`
        }
      }

      return {
        success: allPassed,
        output: combinedOutput,
        errors: combinedErrors,
        testResults
      }
      
    } catch (error: any) {
      return {
        success: false,
        output: '',
        errors: `Test execution error: ${error.message}`,
        testResults: []
      }
    }
  }

  /**
   * Parse C++ test file format (input --- expected output === next test)
   */
  private parseCppTestFile(content: string): Array<{ input: string; expectedOutput: string }> {
    const testCases: Array<{ input: string; expectedOutput: string }> = []
    
    // Split by === to get individual test cases
    const rawTestCases = content.split('===').map(tc => tc.trim()).filter(tc => tc.length > 0)
    
    for (const rawTestCase of rawTestCases) {
      // Split by --- to separate input from expected output
      const parts = rawTestCase.split('---')
      if (parts.length === 2) {
        const input = parts[0].trim()
        const expectedOutput = parts[1].trim()
        testCases.push({ input, expectedOutput })
      }
    }
    
    return testCases
  }

  /**
   * Run the compiled C++ binary with given input
   */
  private runCppBinary(
    kataPath: string,
    input: string,
    timeoutMs: number
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      let stdout = ''
      let stderr = ''
      let isResolved = false

      // Run the compiled executable
      const binaryProcess = spawn('./solution.exe', [], {
        cwd: kataPath,
        stdio: ['pipe', 'pipe', 'pipe']
      })

      // Set up timeout
      const timeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true
          binaryProcess.kill('SIGKILL')
          reject(new Error('Execution timed out'))
        }
      }, timeoutMs)

      // Send input to the process
      if (binaryProcess.stdin) {
        binaryProcess.stdin.write(input)
        binaryProcess.stdin.end()
      }

      // Collect stdout
      binaryProcess.stdout?.on('data', (data) => {
        stdout += data.toString()
      })

      // Collect stderr
      binaryProcess.stderr?.on('data', (data) => {
        stderr += data.toString()
      })

      // Handle process completion
      binaryProcess.on('close', (code) => {
        if (!isResolved) {
          isResolved = true
          clearTimeout(timeout)
          if (code === 0) {
            resolve({ stdout, stderr })
          } else {
            reject(new Error(`Process exited with code ${code}. stderr: ${stderr}`))
          }
        }
      })

      // Handle process errors
      binaryProcess.on('error', (error) => {
        if (!isResolved) {
          isResolved = true
          clearTimeout(timeout)
          reject(error)
        }
      })
    })
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
        return this.executeJavaScript(userCode, testFilePath, kataPath, hidden, timeoutMs)
      
      case 'ts':
        return this.executeTypeScript(userCode, testFilePath, kataPath, hidden, timeoutMs)
      
      case 'cpp':
        return this.executeCpp(userCode, testFilePath, kataPath, hidden, timeoutMs)
      
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