import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'path'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { CodeExecutionService } from '../code-execution'

describe('CodeExecutionService', () => {
  let executionService: CodeExecutionService
  let testKataPath: string

  beforeEach(() => {
    executionService = CodeExecutionService.getInstance()
    
    // Create a temporary kata directory for testing
    testKataPath = join(tmpdir(), `test-kata-${Date.now()}-${Math.random()}`)
    mkdirSync(testKataPath, { recursive: true })
  })

  afterEach(() => {
    // Clean up temporary directory
    if (existsSync(testKataPath)) {
      rmSync(testKataPath, { recursive: true, force: true })
    }
  })

  describe('Python execution', () => {
    it('should execute Python code with passing tests', async () => {
      // Create test files
      const testCode = `
import sys
import os
sys.path.append(os.path.dirname(__file__))

from entry import add_numbers

def test_addition():
    """Test basic addition"""
    result = add_numbers(2, 3)
    assert result == 5, f"Expected 5, got {result}"

def test_negative_numbers():
    """Test with negative numbers"""
    result = add_numbers(-1, 1)
    assert result == 0, f"Expected 0, got {result}"

if __name__ == "__main__":
    test_addition()
    test_negative_numbers()
    print("All public tests passed!")
`

      const userCode = `
def add_numbers(a, b):
    """Add two numbers together"""
    return a + b
`

      // Write test file
      writeFileSync(join(testKataPath, 'tests.py'), testCode)

      // Execute the code
      const result = await executionService.executePython(
        userCode,
        'tests.py',
        testKataPath,
        false,
        5000
      )

      expect(result.success).toBe(true)
      expect(result.output).toContain('All public tests passed!')
      expect(result.testResults).toHaveLength(2)
      expect(result.testResults.every(t => t.passed)).toBe(true)
      expect(result.score).toBe(100)
      expect(result.duration).toBeGreaterThan(0)
    })

    it('should handle Python code with failing tests', async () => {
      const testCode = `
import sys
import os
sys.path.append(os.path.dirname(__file__))

from entry import multiply

def test_multiplication():
    """Test multiplication"""
    result = multiply(3, 4)
    assert result == 12, f"Expected 12, got {result}"

def test_zero_multiplication():
    """Test multiplication by zero"""
    result = multiply(5, 0)
    assert result == 0, f"Expected 0, got {result}"

if __name__ == "__main__":
    test_multiplication()
    test_zero_multiplication()
    print("All public tests passed!")
`

      const userCode = `
def multiply(a, b):
    """Multiply two numbers - but with a bug"""
    return a + b  # Bug: should be a * b
`

      // Write test file
      writeFileSync(join(testKataPath, 'tests.py'), testCode)

      // Execute the code
      const result = await executionService.executePython(
        userCode,
        'tests.py',
        testKataPath,
        false,
        5000
      )

      expect(result.success).toBe(false)
      expect(result.testResults.length).toBeGreaterThan(0)
      expect(result.testResults.some(t => !t.passed)).toBe(true)
      expect(result.score).toBeLessThan(100)
    })

    it('should handle syntax errors in user code', async () => {
      const testCode = `
import sys
import os
sys.path.append(os.path.dirname(__file__))

from entry import broken_function

def test_function():
    """Test function"""
    result = broken_function()
    assert result == "hello"

if __name__ == "__main__":
    test_function()
    print("All public tests passed!")
`

      const userCode = `
def broken_function():
    """Function with syntax error"""
    return "hello"
    # Missing closing quote and other syntax issues
    print("this is broken syntax
`

      // Write test file
      writeFileSync(join(testKataPath, 'tests.py'), testCode)

      // Execute the code
      const result = await executionService.executePython(
        userCode,
        'tests.py',
        testKataPath,
        false,
        5000
      )

      expect(result.success).toBe(false)
      expect(result.errors).toContain('SyntaxError')
    })

    it('should handle timeout for infinite loops', async () => {
      const testCode = `
import sys
import os
sys.path.append(os.path.dirname(__file__))

from entry import infinite_loop

def test_timeout():
    """Test that should timeout"""
    infinite_loop()

if __name__ == "__main__":
    test_timeout()
    print("All public tests passed!")
`

      const userCode = `
def infinite_loop():
    """Function that runs forever"""
    while True:
        pass
`

      // Write test file
      writeFileSync(join(testKataPath, 'tests.py'), testCode)

      // Execute with short timeout
      const result = await executionService.executePython(
        userCode,
        'tests.py',
        testKataPath,
        false,
        1000 // 1 second timeout
      )

      expect(result.success).toBe(false)
      expect(result.errors).toContain('timed out')
    }, 10000) // Give the test itself more time

    it('should handle missing test file', async () => {
      const userCode = `
def simple_function():
    return "hello"
`

      // Don't create the test file

      // Execute the code
      const result = await executionService.executePython(
        userCode,
        'tests.py',
        testKataPath,
        false,
        5000
      )

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Test file not found')
    })

    it('should execute hidden tests when requested', async () => {
      const publicTestCode = `
import sys
import os
sys.path.append(os.path.dirname(__file__))

from entry import calculate

def test_basic():
    """Basic test"""
    result = calculate(1, 2)
    assert result == 3

if __name__ == "__main__":
    test_basic()
    print("All public tests passed!")
`

      const hiddenTestCode = `
import sys
import os
sys.path.append(os.path.dirname(__file__))

from entry import calculate

def test_advanced():
    """Advanced test"""
    result = calculate(10, 20)
    assert result == 30

def test_edge_case():
    """Edge case test"""
    result = calculate(0, 0)
    assert result == 0

if __name__ == "__main__":
    test_advanced()
    test_edge_case()
    print("All hidden tests passed!")
`

      const userCode = `
def calculate(a, b):
    """Calculate sum"""
    return a + b
`

      // Write both test files
      writeFileSync(join(testKataPath, 'tests.py'), publicTestCode)
      writeFileSync(join(testKataPath, 'hidden_tests.py'), hiddenTestCode)

      // Execute hidden tests
      const result = await executionService.executePython(
        userCode,
        'hidden_tests.py',
        testKataPath,
        true, // hidden = true
        5000
      )

      expect(result.success).toBe(true)
      expect(result.output).toContain('All hidden tests passed!')
      expect(result.testResults).toHaveLength(2)
      expect(result.score).toBe(100)
    })
  })

  describe('executeCode method', () => {
    it('should route Python execution correctly', async () => {
      const testCode = `
import sys
import os
sys.path.append(os.path.dirname(__file__))

from entry import simple_func

def test_simple():
    result = simple_func()
    assert result == "test"

if __name__ == "__main__":
    test_simple()
    print("All public tests passed!")
`

      const userCode = `
def simple_func():
    return "test"
`

      writeFileSync(join(testKataPath, 'tests.py'), testCode)

      const result = await executionService.executeCode(
        'py',
        userCode,
        'tests.py',
        testKataPath,
        false,
        5000
      )

      expect(result.success).toBe(true)
      expect(result.score).toBe(100)
    })

    it('should return not implemented for unsupported languages', async () => {
      const result = await executionService.executeCode(
        'js',
        'console.log("test")',
        'test.js',
        testKataPath,
        false,
        5000
      )

      expect(result.success).toBe(false)
      expect(result.errors).toContain('not implemented yet')
    })
  })
})