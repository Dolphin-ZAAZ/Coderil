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

  describe('JavaScript execution', () => {
    it('should execute JavaScript code with passing tests', async () => {
      // Create test files
      const testCode = `
const { addNumbers } = require('./entry.js');

function test_addition() {
    console.log('Testing addition...');
    const result = addNumbers(2, 3);
    if (result !== 5) {
        throw new Error(\`Expected 5, got \${result}\`);
    }
    console.log('Addition test passed!');
}

function test_negative_numbers() {
    console.log('Testing negative numbers...');
    const result = addNumbers(-1, 1);
    if (result !== 0) {
        throw new Error(\`Expected 0, got \${result}\`);
    }
    console.log('Negative numbers test passed!');
}

if (require.main === module) {
    try {
        test_addition();
        test_negative_numbers();
        console.log('All public tests passed!');
    } catch (error) {
        console.error('Test failed:', error.message);
        process.exit(1);
    }
}
`

      const userCode = `
function addNumbers(a, b) {
    return a + b;
}

module.exports = { addNumbers };
`

      // Write test file
      writeFileSync(join(testKataPath, 'tests.js'), testCode)

      // Execute the code
      const result = await executionService.executeJavaScript(
        userCode,
        'tests.js',
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

    it('should handle JavaScript code with failing tests', async () => {
      const testCode = `
const { multiply } = require('./entry.js');

function test_multiplication() {
    console.log('Testing multiplication...');
    const result = multiply(3, 4);
    if (result !== 12) {
        throw new Error(\`Expected 12, got \${result}\`);
    }
    console.log('Multiplication test passed!');
}

function test_zero_multiplication() {
    console.log('Testing zero multiplication...');
    const result = multiply(5, 0);
    if (result !== 0) {
        throw new Error(\`Expected 0, got \${result}\`);
    }
    console.log('Zero multiplication test passed!');
}

if (require.main === module) {
    try {
        test_multiplication();
        test_zero_multiplication();
        console.log('All public tests passed!');
    } catch (error) {
        console.error('Test failed:', error.message);
        process.exit(1);
    }
}
`

      const userCode = `
function multiply(a, b) {
    // Bug: should be a * b
    return a + b;
}

module.exports = { multiply };
`

      // Write test file
      writeFileSync(join(testKataPath, 'tests.js'), testCode)

      // Execute the code
      const result = await executionService.executeJavaScript(
        userCode,
        'tests.js',
        testKataPath,
        false,
        5000
      )

      expect(result.success).toBe(false)
      expect(result.testResults.length).toBeGreaterThan(0)
      expect(result.testResults.some(t => !t.passed)).toBe(true)
      expect(result.score).toBeLessThan(100)
    })

    it('should handle syntax errors in JavaScript code', async () => {
      const testCode = `
const { brokenFunction } = require('./entry.js');

function test_function() {
    console.log('Testing function...');
    const result = brokenFunction();
    if (result !== 'hello') {
        throw new Error(\`Expected 'hello', got \${result}\`);
    }
}

if (require.main === module) {
    try {
        test_function();
        console.log('All public tests passed!');
    } catch (error) {
        console.error('Test failed:', error.message);
        process.exit(1);
    }
}
`

      const userCode = `
function brokenFunction() {
    return "hello"
    // Missing closing brace and other syntax issues
    console.log("this is broken syntax
}

module.exports = { brokenFunction };
`

      // Write test file
      writeFileSync(join(testKataPath, 'tests.js'), testCode)

      // Execute the code
      const result = await executionService.executeJavaScript(
        userCode,
        'tests.js',
        testKataPath,
        false,
        5000
      )

      expect(result.success).toBe(false)
      expect(result.errors).toMatch(/SyntaxError|Error/)
    })

    it('should handle timeout for infinite loops', async () => {
      const testCode = `
const { infiniteLoop } = require('./entry.js');

function test_timeout() {
    console.log('Testing timeout...');
    infiniteLoop();
}

if (require.main === module) {
    try {
        test_timeout();
        console.log('All public tests passed!');
    } catch (error) {
        console.error('Test failed:', error.message);
        process.exit(1);
    }
}
`

      const userCode = `
function infiniteLoop() {
    while (true) {
        // Infinite loop
    }
}

module.exports = { infiniteLoop };
`

      // Write test file
      writeFileSync(join(testKataPath, 'tests.js'), testCode)

      // Execute with short timeout
      const result = await executionService.executeJavaScript(
        userCode,
        'tests.js',
        testKataPath,
        false,
        1000 // 1 second timeout
      )

      expect(result.success).toBe(false)
      expect(result.errors).toContain('timed out')
    }, 10000) // Give the test itself more time

    it('should handle missing test file', async () => {
      const userCode = `
function simpleFunction() {
    return "hello";
}

module.exports = { simpleFunction };
`

      // Don't create the test file

      // Execute the code
      const result = await executionService.executeJavaScript(
        userCode,
        'tests.js',
        testKataPath,
        false,
        5000
      )

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Test file not found')
    })

    it('should execute hidden tests when requested', async () => {
      const publicTestCode = `
const { calculate } = require('./entry.js');

function test_basic() {
    console.log('Testing basic...');
    const result = calculate(1, 2);
    if (result !== 3) {
        throw new Error(\`Expected 3, got \${result}\`);
    }
}

if (require.main === module) {
    try {
        test_basic();
        console.log('All public tests passed!');
    } catch (error) {
        console.error('Test failed:', error.message);
        process.exit(1);
    }
}
`

      const hiddenTestCode = `
const { calculate } = require('./entry.js');

function test_advanced() {
    console.log('Testing advanced...');
    const result = calculate(10, 20);
    if (result !== 30) {
        throw new Error(\`Expected 30, got \${result}\`);
    }
}

function test_edge_case() {
    console.log('Testing edge case...');
    const result = calculate(0, 0);
    if (result !== 0) {
        throw new Error(\`Expected 0, got \${result}\`);
    }
}

if (require.main === module) {
    try {
        test_advanced();
        test_edge_case();
        console.log('All hidden tests passed!');
    } catch (error) {
        console.error('Hidden test failed:', error.message);
        process.exit(1);
    }
}
`

      const userCode = `
function calculate(a, b) {
    return a + b;
}

module.exports = { calculate };
`

      // Write both test files
      writeFileSync(join(testKataPath, 'tests.js'), publicTestCode)
      writeFileSync(join(testKataPath, 'hidden_tests.js'), hiddenTestCode)

      // Execute hidden tests
      const result = await executionService.executeJavaScript(
        userCode,
        'hidden_tests.js',
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

  describe('TypeScript execution', () => {
    it('should execute TypeScript code with passing tests', async () => {
      // Create test files
      const testCode = `
import { addNumbers } from './entry';

function test_addition(): void {
    console.log('Testing addition...');
    const result: number = addNumbers(2, 3);
    if (result !== 5) {
        throw new Error(\`Expected 5, got \${result}\`);
    }
    console.log('Addition test passed!');
}

function test_negative_numbers(): void {
    console.log('Testing negative numbers...');
    const result: number = addNumbers(-1, 1);
    if (result !== 0) {
        throw new Error(\`Expected 0, got \${result}\`);
    }
    console.log('Negative numbers test passed!');
}

if (require.main === module) {
    try {
        test_addition();
        test_negative_numbers();
        console.log('All public tests passed!');
    } catch (error: any) {
        console.error('Test failed:', error.message);
        process.exit(1);
    }
}
`

      const userCode = `
export function addNumbers(a: number, b: number): number {
    return a + b;
}
`

      // Write test file
      writeFileSync(join(testKataPath, 'tests.ts'), testCode)

      // Execute the code
      const result = await executionService.executeTypeScript(
        userCode,
        'tests.ts',
        testKataPath,
        false,
        10000 // Longer timeout for compilation
      )

      // In test environment, TypeScript compiler may not be available
      if (result.errors.includes('TypeScript compiler not available')) {
        expect(result.success).toBe(false)
        expect(result.errors).toContain('TypeScript compiler not available')
        expect(result.testResults.some(t => t.name === 'compilation' && !t.passed)).toBe(true)
      } else {
        expect(result.success).toBe(true)
        expect(result.output).toContain('All public tests passed!')
        expect(result.testResults).toHaveLength(2)
        expect(result.testResults.every(t => t.passed)).toBe(true)
        expect(result.score).toBe(100)
        expect(result.duration).toBeGreaterThan(0)
      }
    }, 15000) // Give the test more time for TypeScript compilation

    it('should handle TypeScript compilation errors', async () => {
      const testCode = `
import { brokenFunction } from './entry';

function test_function(): void {
    console.log('Testing function...');
    const result: string = brokenFunction();
    if (result !== 'hello') {
        throw new Error(\`Expected 'hello', got \${result}\`);
    }
}

if (require.main === module) {
    try {
        test_function();
        console.log('All public tests passed!');
    } catch (error: any) {
        console.error('Test failed:', error.message);
        process.exit(1);
    }
}
`

      const userCode = `
export function brokenFunction(): string {
    // Type error: returning number instead of string
    return 42;
}
`

      // Write test file
      writeFileSync(join(testKataPath, 'tests.ts'), testCode)

      // Execute the code
      const result = await executionService.executeTypeScript(
        userCode,
        'tests.ts',
        testKataPath,
        false,
        10000
      )

      expect(result.success).toBe(false)
      // Should either fail due to compilation error or missing TypeScript compiler
      expect(result.testResults.some(t => t.name === 'compilation' && !t.passed)).toBe(true)
    }, 15000)

    it('should handle missing TypeScript test file', async () => {
      const userCode = `
export function simpleFunction(): string {
    return "hello";
}
`

      // Don't create the test file

      // Execute the code
      const result = await executionService.executeTypeScript(
        userCode,
        'tests.ts',
        testKataPath,
        false,
        5000
      )

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Test file not found')
    })
  })

  describe('C++ execution', () => {
    it('should execute C++ code with passing tests', async () => {
      // Create test file in the expected I/O format
      const testContent = `5
h e l l o
---
o l l e h
===
3
A B C
---
C B A
===
1
x
---
x`

      const userCode = `#include <iostream>
#include <vector>
#include <string>

using namespace std;

void reverseString(vector<char>& s) {
    int left = 0;
    int right = s.size() - 1;
    
    while (left < right) {
        char temp = s[left];
        s[left] = s[right];
        s[right] = temp;
        left++;
        right--;
    }
}

int main() {
    int n;
    cin >> n;
    
    vector<char> s(n);
    for (int i = 0; i < n; i++) {
        cin >> s[i];
    }
    
    reverseString(s);
    
    for (int i = 0; i < n; i++) {
        cout << s[i];
        if (i < n - 1) cout << " ";
    }
    cout << endl;
    
    return 0;
}`

      writeFileSync(join(testKataPath, 'tests.txt'), testContent)

      const result = await executionService.executeCpp(
        userCode,
        'tests.txt',
        testKataPath,
        false,
        10000
      )

      // In test environment, C++ compiler may not be available
      if (result.errors.includes('C++ compilation error') || result.errors.includes('spawn')) {
        expect(result.success).toBe(false)
        expect(result.testResults.some(t => t.name === 'compilation' && !t.passed)).toBe(true)
      } else {
        expect(result.success).toBe(true)
        expect(result.output).toBeTruthy()
        expect(result.testResults).toHaveLength(3)
        expect(result.testResults.every(t => t.passed)).toBe(true)
        expect(result.score).toBe(100)
        expect(result.duration).toBeGreaterThan(0)
      }
    }, 15000)

    it('should handle C++ code with failing tests', async () => {
      const testContent = `3
A B C
---
C B A
===
2
X Y
---
Y X`

      const userCode = `#include <iostream>
#include <vector>
#include <string>

using namespace std;

void reverseString(vector<char>& s) {
    // Bug: not actually reversing
    // Just leave the string as is
}

int main() {
    int n;
    cin >> n;
    
    vector<char> s(n);
    for (int i = 0; i < n; i++) {
        cin >> s[i];
    }
    
    reverseString(s);
    
    for (int i = 0; i < n; i++) {
        cout << s[i];
        if (i < n - 1) cout << " ";
    }
    cout << endl;
    
    return 0;
}`

      writeFileSync(join(testKataPath, 'tests.txt'), testContent)

      const result = await executionService.executeCpp(
        userCode,
        'tests.txt',
        testKataPath,
        false,
        10000
      )

      // In test environment, C++ compiler may not be available
      if (result.errors.includes('C++ compilation error') || result.errors.includes('spawn')) {
        expect(result.success).toBe(false)
        expect(result.testResults.some(t => t.name === 'compilation' && !t.passed)).toBe(true)
      } else {
        expect(result.success).toBe(false)
        expect(result.testResults.length).toBeGreaterThan(0)
        expect(result.testResults.some(t => !t.passed)).toBe(true)
        expect(result.score).toBeLessThan(100)
      }
    }, 15000)

    it('should handle C++ compilation errors', async () => {
      const testContent = `1
x
---
x`

      const userCode = `#include <iostream>
#include <vector>

using namespace std;

int main() {
    // Syntax error: missing semicolon and other issues
    int n
    cin >> n;
    
    // Undefined variable
    cout << undefined_variable << endl;
    
    return 0;
}`

      writeFileSync(join(testKataPath, 'tests.txt'), testContent)

      const result = await executionService.executeCpp(
        userCode,
        'tests.txt',
        testKataPath,
        false,
        10000
      )

      expect(result.success).toBe(false)
      expect(result.testResults.some(t => t.name === 'compilation' && !t.passed)).toBe(true)
    }, 15000)

    it('should handle timeout for infinite loops in C++', async () => {
      const testContent = `1
x
---
x`

      const userCode = `#include <iostream>

using namespace std;

int main() {
    // Infinite loop
    while (true) {
        // Do nothing forever
    }
    
    return 0;
}`

      writeFileSync(join(testKataPath, 'tests.txt'), testContent)

      const result = await executionService.executeCpp(
        userCode,
        'tests.txt',
        testKataPath,
        false,
        2000 // Short timeout
      )

      // In test environment, C++ compiler may not be available
      if (result.errors.includes('C++ compilation error') || result.errors.includes('spawn')) {
        expect(result.success).toBe(false)
        expect(result.testResults.some(t => t.name === 'compilation' && !t.passed)).toBe(true)
      } else {
        expect(result.success).toBe(false)
        expect(result.testResults.some(t => t.message?.includes('timed out') || t.message?.includes('Execution timed out'))).toBe(true)
      }
    }, 15000)

    it('should handle missing C++ test file', async () => {
      const userCode = `#include <iostream>

using namespace std;

int main() {
    cout << "Hello World" << endl;
    return 0;
}`

      // Don't create the test file

      const result = await executionService.executeCpp(
        userCode,
        'tests.txt',
        testKataPath,
        false,
        5000
      )

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Test file not found')
    })

    it('should execute hidden tests when requested', async () => {
      const publicTestContent = `2
A B
---
B A`

      const hiddenTestContent = `4
1 2 3 4
---
4 3 2 1
===
6
a b c d e f
---
f e d c b a`

      const userCode = `#include <iostream>
#include <vector>

using namespace std;

void reverseString(vector<char>& s) {
    int left = 0;
    int right = s.size() - 1;
    
    while (left < right) {
        char temp = s[left];
        s[left] = s[right];
        s[right] = temp;
        left++;
        right--;
    }
}

int main() {
    int n;
    cin >> n;
    
    vector<char> s(n);
    for (int i = 0; i < n; i++) {
        cin >> s[i];
    }
    
    reverseString(s);
    
    for (int i = 0; i < n; i++) {
        cout << s[i];
        if (i < n - 1) cout << " ";
    }
    cout << endl;
    
    return 0;
}`

      writeFileSync(join(testKataPath, 'tests.txt'), publicTestContent)
      writeFileSync(join(testKataPath, 'hidden_tests.txt'), hiddenTestContent)

      const result = await executionService.executeCpp(
        userCode,
        'hidden_tests.txt',
        testKataPath,
        true, // hidden = true
        10000
      )

      // In test environment, C++ compiler may not be available
      if (result.errors.includes('C++ compilation error') || result.errors.includes('spawn')) {
        expect(result.success).toBe(false)
        expect(result.testResults.some(t => t.name === 'compilation' && !t.passed)).toBe(true)
      } else {
        expect(result.success).toBe(true)
        expect(result.testResults).toHaveLength(2)
        expect(result.testResults.every(t => t.passed)).toBe(true)
        expect(result.score).toBe(100)
      }
    }, 15000)

    it('should handle malformed test file format', async () => {
      const testContent = `This is not a valid test file format
No separators here
Just random text`

      const userCode = `#include <iostream>

using namespace std;

int main() {
    cout << "Hello" << endl;
    return 0;
}`

      writeFileSync(join(testKataPath, 'tests.txt'), testContent)

      const result = await executionService.executeCpp(
        userCode,
        'tests.txt',
        testKataPath,
        false,
        5000
      )

      expect(result.success).toBe(false)
      expect(result.errors).toContain('No test cases found')
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

    it('should route JavaScript execution correctly', async () => {
      const testCode = `
const { simpleFunc } = require('./entry.js');

function test_simple() {
    console.log('Testing simple function...');
    const result = simpleFunc();
    if (result !== 'test') {
        throw new Error(\`Expected 'test', got \${result}\`);
    }
}

if (require.main === module) {
    try {
        test_simple();
        console.log('All public tests passed!');
    } catch (error) {
        console.error('Test failed:', error.message);
        process.exit(1);
    }
}
`

      const userCode = `
function simpleFunc() {
    return "test";
}

module.exports = { simpleFunc };
`

      writeFileSync(join(testKataPath, 'tests.js'), testCode)

      const result = await executionService.executeCode(
        'js',
        userCode,
        'tests.js',
        testKataPath,
        false,
        5000
      )

      expect(result.success).toBe(true)
      expect(result.score).toBe(100)
    })

    it('should route TypeScript execution correctly', async () => {
      const testCode = `
import { simpleFunc } from './entry';

function test_simple(): void {
    console.log('Testing simple function...');
    const result: string = simpleFunc();
    if (result !== 'test') {
        throw new Error(\`Expected 'test', got \${result}\`);
    }
}

if (require.main === module) {
    try {
        test_simple();
        console.log('All public tests passed!');
    } catch (error: any) {
        console.error('Test failed:', error.message);
        process.exit(1);
    }
}
`

      const userCode = `
export function simpleFunc(): string {
    return "test";
}
`

      writeFileSync(join(testKataPath, 'tests.ts'), testCode)

      const result = await executionService.executeCode(
        'ts',
        userCode,
        'tests.ts',
        testKataPath,
        false,
        10000
      )

      // In test environment, TypeScript compiler may not be available
      if (result.errors.includes('TypeScript compiler not available')) {
        expect(result.success).toBe(false)
        expect(result.errors).toContain('TypeScript compiler not available')
      } else {
        expect(result.success).toBe(true)
        expect(result.score).toBe(100)
      }
    }, 15000)

    it('should route C++ execution correctly', async () => {
      // Create test file in the expected format
      const testContent = `5
h e l l o
---
o l l e h
===
3
A B C
---
C B A`

      const userCode = `#include <iostream>
#include <vector>
#include <string>

using namespace std;

void reverseString(vector<char>& s) {
    int left = 0;
    int right = s.size() - 1;
    
    while (left < right) {
        char temp = s[left];
        s[left] = s[right];
        s[right] = temp;
        left++;
        right--;
    }
}

int main() {
    int n;
    cin >> n;
    
    vector<char> s(n);
    for (int i = 0; i < n; i++) {
        cin >> s[i];
    }
    
    reverseString(s);
    
    for (int i = 0; i < n; i++) {
        cout << s[i];
        if (i < n - 1) cout << " ";
    }
    cout << endl;
    
    return 0;
}`

      writeFileSync(join(testKataPath, 'tests.txt'), testContent)

      const result = await executionService.executeCode(
        'cpp',
        userCode,
        'tests.txt',
        testKataPath,
        false,
        10000
      )

      // In test environment, C++ compiler may not be available
      if (result.errors.includes('C++ compilation error') || result.errors.includes('spawn')) {
        expect(result.success).toBe(false)
        expect(result.testResults.some(t => t.name === 'compilation' && !t.passed)).toBe(true)
      } else {
        expect(result.success).toBe(true)
        expect(result.score).toBe(100)
        expect(result.testResults).toHaveLength(2)
        expect(result.testResults.every(t => t.passed)).toBe(true)
      }
    }, 15000)

    it('should return error for unsupported languages', async () => {
      const result = await executionService.executeCode(
        'rust' as any,
        'fn main() { println!("Hello"); }',
        'test.rs',
        testKataPath,
        false,
        5000
      )

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Unsupported language')
    })
  })
})