import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ContentValidatorService } from '../content-validator'
import { CodeExecutionService } from '../code-execution'
import { 
  Language, 
  KataMetadata, 
  Rubric, 
  KataType,
  ExecutionResult,
  TestResult
} from '@/types'
import * as fs from 'fs'
import * as os from 'os'

// Mock dependencies
vi.mock('../code-execution')
vi.mock('../error-handler', () => ({
  errorHandler: {
    handleError: vi.fn()
  }
}))

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    existsSync: vi.fn(),
    rmSync: vi.fn()
  }
})

vi.mock('os', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    tmpdir: vi.fn(() => '/tmp')
  }
})

vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    spawn: vi.fn()
  }
})

describe('ContentValidatorService', () => {
  let service: ContentValidatorService
  let mockCodeExecutionService: any

  beforeEach(() => {
    // Set up the mock before getting the service instance
    mockCodeExecutionService = {
      executeCode: vi.fn()
    }
    vi.mocked(CodeExecutionService.getInstance).mockReturnValue(mockCodeExecutionService)
    
    // Reset the singleton instance to ensure fresh instance with mocked dependencies
    ;(ContentValidatorService as any).instance = null
    service = ContentValidatorService.getInstance()
    
    // Mock fs functions
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.mkdirSync).mockImplementation(() => undefined)
    vi.mocked(fs.writeFileSync).mockImplementation(() => undefined)
    vi.mocked(fs.rmSync).mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('validateGeneratedCode', () => {
    it('should return valid for none language', async () => {
      const result = await service.validateGeneratedCode('any code', 'none')
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
    })

    it('should handle unsupported language', async () => {
      const result = await service.validateGeneratedCode('code', 'invalid' as Language)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].type).toBe('syntax')
      expect(result.errors[0].message).toContain('Unsupported language')
    })

    it('should validate Python code syntax', async () => {
      const validPythonCode = `
def hello_world():
    return "Hello, World!"
`
      
      // Mock successful Python validation
      const mockSpawn = vi.fn().mockImplementation(() => {
        const mockProcess = {
          stdout: { on: vi.fn() },
          stderr: { on: vi.fn() },
          on: vi.fn((event, callback) => {
            if (event === 'close') {
              setTimeout(() => callback(0), 0) // Success exit code
            }
          }),
          kill: vi.fn()
        }
        return mockProcess
      })
      
      const { spawn } = await import('child_process')
      vi.mocked(spawn).mockImplementation(mockSpawn)

      const result = await service.validateGeneratedCode(validPythonCode, 'py')
      
      expect(result.isValid).toBe(true)
    })

    it('should detect Python syntax errors', async () => {
      const invalidPythonCode = `
def hello_world(
    return "Hello, World!"
`
      
      // Mock Python syntax error
      const mockSpawn = vi.fn().mockImplementation(() => {
        const mockProcess = {
          stdout: { on: vi.fn() },
          stderr: { 
            on: vi.fn((event, callback) => {
              if (event === 'data') {
                callback('  File "temp.py", line 2\n    def hello_world(\n                   ^\nSyntaxError: unexpected EOF while parsing')
              }
            })
          },
          on: vi.fn((event, callback) => {
            if (event === 'close') {
              setTimeout(() => callback(1), 0) // Error exit code
            }
          }),
          kill: vi.fn()
        }
        return mockProcess
      })
      
      const { spawn } = await import('child_process')
      vi.mocked(spawn).mockImplementation(mockSpawn)

      const result = await service.validateGeneratedCode(invalidPythonCode, 'py')
      
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0].type).toBe('syntax')
    })

    it('should validate JavaScript code syntax', async () => {
      const validJavaScriptCode = `
function helloWorld() {
    return "Hello, World!";
}
module.exports = { helloWorld };
`
      
      // Mock successful JavaScript validation
      const mockSpawn = vi.fn().mockImplementation(() => {
        const mockProcess = {
          stdout: { on: vi.fn() },
          stderr: { on: vi.fn() },
          on: vi.fn((event, callback) => {
            if (event === 'close') {
              setTimeout(() => callback(0), 0) // Success exit code
            }
          }),
          kill: vi.fn()
        }
        return mockProcess
      })
      
      const { spawn } = await import('child_process')
      vi.mocked(spawn).mockImplementation(mockSpawn)

      const result = await service.validateGeneratedCode(validJavaScriptCode, 'js')
      
      expect(result.isValid).toBe(true)
    })

    it('should provide style warnings for JavaScript', async () => {
      const codeWithStyleIssues = `
var x = 5;
function test() {
    return x;
}
`
      
      // Mock successful validation but with style issues
      const mockSpawn = vi.fn().mockImplementation(() => {
        const mockProcess = {
          stdout: { on: vi.fn() },
          stderr: { on: vi.fn() },
          on: vi.fn((event, callback) => {
            if (event === 'close') {
              setTimeout(() => callback(0), 0) // Success exit code
            }
          }),
          kill: vi.fn()
        }
        return mockProcess
      })
      
      const { spawn } = await import('child_process')
      vi.mocked(spawn).mockImplementation(mockSpawn)

      const result = await service.validateGeneratedCode(codeWithStyleIssues, 'js')
      
      expect(result.isValid).toBe(true)
      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.warnings.some(w => w.message.includes('var declarations'))).toBe(true)
    })
  })

  describe('validateTestCases', () => {
    it('should return valid for none language', async () => {
      const result = await service.validateTestCases('tests', 'solution', 'none')
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should validate successful test execution', async () => {
      const tests = 'test code'
      const solution = 'solution code'

      const mockExecutionResult: ExecutionResult = {
        success: true,
        output: 'All tests passed!',
        errors: '',
        testResults: [
          { name: 'test_addition', passed: true, message: 'Test passed' },
          { name: 'test_edge_case', passed: true, message: 'Test passed' },
          { name: 'test_negative', passed: true, message: 'Test passed' }
        ],
        duration: 100,
        score: 100
      }

      // Reset the mock and set up the return value
      mockCodeExecutionService.executeCode.mockReset()
      mockCodeExecutionService.executeCode.mockResolvedValue(mockExecutionResult)

      const result = await service.validateTestCases(tests, solution, 'js')
      
      // Verify the mock was called
      expect(mockCodeExecutionService.executeCode).toHaveBeenCalled()
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect test failures', async () => {
      const tests = `
function test_addition() {
    const result = add(2, 3);
    if (result !== 6) { // Wrong expected value
        throw new Error('Expected 6, got ' + result);
    }
}
test_addition();
`
      
      const solution = `
function add(a, b) {
    return a + b;
}
module.exports = { add };
`

      const mockExecutionResult: ExecutionResult = {
        success: false,
        output: '',
        errors: 'Expected 6, got 5',
        testResults: [
          { name: 'test_addition', passed: false, message: 'Expected 6, got 5' }
        ],
        duration: 100
      }

      mockCodeExecutionService.executeCode.mockResolvedValue(mockExecutionResult)

      const result = await service.validateTestCases(tests, solution, 'js')
      
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors.some(e => e.type === 'logic')).toBe(true)
    })

    it('should warn about insufficient test coverage', async () => {
      const mockExecutionResult: ExecutionResult = {
        success: true,
        output: 'All tests passed!',
        errors: '',
        testResults: [
          { name: 'test_1', passed: true, message: 'Test passed' }
        ], // Only 1 test
        duration: 100,
        score: 100
      }

      mockCodeExecutionService.executeCode.mockReset()
      mockCodeExecutionService.executeCode.mockResolvedValue(mockExecutionResult)

      const result = await service.validateTestCases('test', 'solution', 'py')
      
      expect(mockCodeExecutionService.executeCode).toHaveBeenCalled()
      expect(result.isValid).toBe(true)
      expect(result.warnings.some(w => w.message.includes('more test cases'))).toBe(true)
    })

    it('should warn about generic test names', async () => {
      const mockExecutionResult: ExecutionResult = {
        success: true,
        output: 'All tests passed!',
        errors: '',
        testResults: [
          { name: 'test_1', passed: true, message: 'Test passed' },
          { name: 'test_2', passed: true, message: 'Test passed' },
          { name: 'test_3', passed: true, message: 'Test passed' }
        ],
        duration: 100,
        score: 100
      }

      mockCodeExecutionService.executeCode.mockReset()
      mockCodeExecutionService.executeCode.mockResolvedValue(mockExecutionResult)

      const result = await service.validateTestCases('tests', 'solution', 'py')
      
      expect(mockCodeExecutionService.executeCode).toHaveBeenCalled()
      expect(result.isValid).toBe(true)
      expect(result.warnings.some(w => w.message.includes('more descriptive'))).toBe(true)
    })
  })

  describe('validateMetadata', () => {
    it('should validate correct metadata', () => {
      const validMetadata: KataMetadata = {
        slug: 'test-kata',
        title: 'Test Kata for Validation',
        language: 'py',
        type: 'code',
        difficulty: 'easy',
        tags: ['algorithms', 'beginner'],
        entry: 'entry.py',
        test: {
          kind: 'programmatic',
          file: 'tests.py'
        },
        timeout_ms: 5000
      }

      const result = service.validateMetadata(validMetadata)
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect missing required fields', () => {
      const invalidMetadata = {
        slug: 'test-kata',
        // Missing title, language, type, difficulty
        tags: [],
        entry: 'entry.py',
        test: {
          kind: 'programmatic',
          file: 'tests.py'
        },
        timeout_ms: 5000
      } as any

      const result = service.validateMetadata(invalidMetadata)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors.some(e => e.message.includes('title'))).toBe(true)
    })

    it('should warn about short titles', () => {
      const metadata: KataMetadata = {
        slug: 'test',
        title: 'Short', // Very short title
        language: 'py',
        type: 'code',
        difficulty: 'easy',
        tags: ['test'],
        entry: 'entry.py',
        test: {
          kind: 'programmatic',
          file: 'tests.py'
        },
        timeout_ms: 5000
      }

      const result = service.validateMetadata(metadata)
      
      expect(result.isValid).toBe(true)
      expect(result.warnings.some(w => w.message.includes('short'))).toBe(true)
    })

    it('should warn about long titles', () => {
      const metadata: KataMetadata = {
        slug: 'test',
        title: 'This is a very long title that exceeds the recommended length for kata titles and should trigger a warning', // Very long title
        language: 'py',
        type: 'code',
        difficulty: 'easy',
        tags: ['test'],
        entry: 'entry.py',
        test: {
          kind: 'programmatic',
          file: 'tests.py'
        },
        timeout_ms: 5000
      }

      const result = service.validateMetadata(metadata)
      
      expect(result.isValid).toBe(true)
      expect(result.warnings.some(w => w.message.includes('long'))).toBe(true)
    })

    it('should warn about short timeout for code katas', () => {
      const metadata: KataMetadata = {
        slug: 'test',
        title: 'Test Kata',
        language: 'py',
        type: 'code',
        difficulty: 'easy',
        tags: ['test'],
        entry: 'entry.py',
        test: {
          kind: 'programmatic',
          file: 'tests.py'
        },
        timeout_ms: 500 // Very short timeout
      }

      const result = service.validateMetadata(metadata)
      
      expect(result.isValid).toBe(true)
      expect(result.warnings.some(w => w.message.includes('short'))).toBe(true)
    })

    it('should warn about long timeout', () => {
      const metadata: KataMetadata = {
        slug: 'test',
        title: 'Test Kata',
        language: 'py',
        type: 'code',
        difficulty: 'easy',
        tags: ['test'],
        entry: 'entry.py',
        test: {
          kind: 'programmatic',
          file: 'tests.py'
        },
        timeout_ms: 60000 // Very long timeout
      }

      const result = service.validateMetadata(metadata)
      
      expect(result.isValid).toBe(true)
      expect(result.warnings.some(w => w.message.includes('long'))).toBe(true)
    })
  })

  describe('validateRubric', () => {
    it('should validate correct rubric', () => {
      const validRubric: Rubric = {
        keys: ['correctness', 'clarity', 'completeness'],
        threshold: {
          min_total: 70,
          min_correctness: 50
        }
      }

      const result = service.validateRubric(validRubric, 'explain')
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect invalid threshold values', () => {
      const invalidRubric: Rubric = {
        keys: ['correctness'],
        threshold: {
          min_total: 150, // Invalid: > 100
          min_correctness: 50
        }
      }

      const result = service.validateRubric(invalidRubric, 'explain')
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.message.includes('exceed 100'))).toBe(true)
    })

    it('should warn about inconsistent thresholds', () => {
      const rubric: Rubric = {
        keys: ['correctness', 'clarity'],
        threshold: {
          min_total: 60,
          min_correctness: 80 // Higher than min_total
        }
      }

      const result = service.validateRubric(rubric, 'explain')
      
      expect(result.isValid).toBe(true)
      expect(result.warnings.some(w => w.message.includes('higher than min_total'))).toBe(true)
    })

    it('should suggest standard criteria for explanation katas', () => {
      const rubric: Rubric = {
        keys: ['custom_criteria'], // Missing standard criteria
        threshold: {
          min_total: 70,
          min_correctness: 50
        }
      }

      const result = service.validateRubric(rubric, 'explain')
      
      expect(result.isValid).toBe(true)
      expect(result.warnings.some(w => w.message.includes('standard explanation criteria'))).toBe(true)
    })

    it('should suggest standard criteria for template katas', () => {
      const rubric: Rubric = {
        keys: ['custom_criteria'], // Missing standard criteria
        threshold: {
          min_total: 70,
          min_correctness: 50
        }
      }

      const result = service.validateRubric(rubric, 'template')
      
      expect(result.isValid).toBe(true)
      expect(result.warnings.some(w => w.message.includes('standard template criteria'))).toBe(true)
    })
  })

  describe('error handling', () => {
    it('should handle validation errors gracefully', async () => {
      // Mock an error in code execution
      mockCodeExecutionService.executeCode.mockRejectedValue(new Error('Execution failed'))

      const result = await service.validateTestCases('test', 'solution', 'py')
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.message.includes('Test validation failed'))).toBe(true)
    })

    it('should handle unsupported language gracefully', async () => {
      const result = await service.validateGeneratedCode('code', 'unsupported' as Language)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.message.includes('Unsupported language'))).toBe(true)
    })
  })

  describe('language-specific validation', () => {
    it('should handle TypeScript compiler not found', async () => {
      const mockSpawn = vi.fn().mockImplementation(() => {
        const mockProcess = {
          stdout: { on: vi.fn() },
          stderr: { 
            on: vi.fn((event, callback) => {
              if (event === 'data') {
                callback('spawn ENOENT')
              }
            })
          },
          on: vi.fn((event, callback) => {
            if (event === 'error') {
              setTimeout(() => callback(new Error('spawn ENOENT')), 0)
            }
          }),
          kill: vi.fn()
        }
        return mockProcess
      })
      
      const { spawn } = await import('child_process')
      vi.mocked(spawn).mockImplementation(mockSpawn)

      const result = await service.validateGeneratedCode('const x: number = 5;', 'ts')
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.message.includes('TypeScript compiler not available'))).toBe(true)
    })

    it('should validate basic code structure', async () => {
      // Test basic validation without relying on external compilers
      const result = await service.validateGeneratedCode('function test() { return true; }', 'js')
      
      // Should pass basic validation (mocked spawn returns success)
      expect(result.isValid).toBe(true)
    })
  })
})