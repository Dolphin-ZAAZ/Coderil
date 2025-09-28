import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AIJudgeService } from '../ai-judge'
import { KataManagerService } from '../kata-manager'
import { ProgressService } from '../progress'
import type { Rubric, KataDetails, AIJudgment } from '@/types'

/**
 * End-to-End AI Judge Tests
 * 
 * These tests simulate the complete frontend workflow:
 * 1. Load kata from filesystem
 * 2. User submits explanation/template
 * 3. AI judges the submission
 * 4. Results are processed and stored
 * 
 * This ensures the AI judging system works correctly in the real application context.
 */

// Mock the filesystem operations
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  readdirSync: vi.fn()
}))

vi.mock('path', () => ({
  default: {
    join: vi.fn((...args) => args.join('/')),
    resolve: vi.fn((...args) => args.join('/')),
    dirname: vi.fn(),
    basename: vi.fn()
  },
  join: vi.fn((...args) => args.join('/')),
  resolve: vi.fn((...args) => args.join('/')),
  dirname: vi.fn(),
  basename: vi.fn()
}))

// Mock database operations
vi.mock('../database', () => ({
  DatabaseService: {
    getInstance: vi.fn(() => ({
      initialize: vi.fn(),
      close: vi.fn()
    }))
  }
}))

// Mock progress service
vi.mock('../progress', () => ({
  ProgressService: {
    getInstance: vi.fn(() => ({
      saveAttempt: vi.fn(),
      getProgress: vi.fn(),
      updateProgress: vi.fn()
    }))
  }
}))

// Mock kata manager service
vi.mock('../kata-manager', () => ({
  KataManagerService: {
    getInstance: vi.fn(() => ({
      loadKata: vi.fn(),
      getAllKatas: vi.fn(),
      validateKata: vi.fn()
    }))
  }
}))

// Mock fetch for AI API calls
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('AI Judge E2E Workflow Tests', () => {
  let aiJudgeService: AIJudgeService
  let kataManagerService: KataManagerService
  let progressService: ProgressService

  beforeEach(() => {
    aiJudgeService = new AIJudgeService({
      apiKey: 'test-api-key',
      model: 'gpt-4',
      maxRetries: 2,
      timeout: 10000
    })

    kataManagerService = KataManagerService.getInstance()
    progressService = ProgressService.getInstance()

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // Helper to create mock AI responses
  const mockAIResponse = (scores: Record<string, number>, feedback: string, pass: boolean = true) => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        choices: [{
          message: {
            content: JSON.stringify({
              scores,
              feedback,
              reasoning: pass ? 'Meets requirements' : 'Below standards'
            })
          }
        }]
      })
    })
  }

  describe('Explanation Kata E2E Workflow', () => {
    it('should complete full workflow for passing explanation submission', async () => {
      // 1. Mock kata loading
      const mockExplanationKata: KataDetails = {
        slug: 'explain-recursion',
        title: 'Explain Recursion',
        language: 'none',
        type: 'explain',
        difficulty: 'medium',
        tags: ['recursion', 'algorithms'],
        path: 'katas/explain-recursion',
        statement: 'Explain how recursion works in programming...',
        metadata: {
          slug: 'explain-recursion',
          title: 'Explain Recursion',
          language: 'none',
          type: 'explain',
          difficulty: 'medium',
          tags: ['recursion', 'algorithms'],
          entry: 'explanation.md',
          test: { kind: 'none', file: 'none' },
          timeout_ms: 0
        },
        starterCode: '# Your explanation here...',
        testConfig: { kind: 'none', publicTestFile: 'none', timeoutMs: 0 },
        rubric: {
          keys: ['clarity', 'correctness', 'completeness', 'examples'],
          threshold: {
            min_total: 70,
            min_correctness: 60
          }
        }
      }

      // 2. Simulate user submission
      const userExplanation = `
# Understanding Recursion

Recursion is a programming technique where a function calls itself to solve a problem by breaking it down into smaller, similar subproblems.

## Key Components

### Base Case
The base case is the condition that stops the recursion. It's crucial because without it, the function would call itself infinitely, leading to a stack overflow error.

### Recursive Case
The recursive case is where the function calls itself with modified parameters, gradually moving toward the base case.

## Example: Calculating Factorial

\`\`\`python
def factorial(n):
    # Base case: factorial of 0 or 1 is 1
    if n <= 1:
        return 1
    # Recursive case: n! = n * (n-1)!
    return n * factorial(n - 1)

# Example usage
print(factorial(5))  # Output: 120
\`\`\`

## How the Factorial Example Works
1. factorial(5) calls factorial(4)
2. factorial(4) calls factorial(3)
3. factorial(3) calls factorial(2)
4. factorial(2) calls factorial(1)
5. factorial(1) returns 1 (base case reached)
6. The results bubble back up: 2×1=2, 3×2=6, 4×6=24, 5×24=120

## Common Applications
- Tree and graph traversal algorithms
- Mathematical calculations (factorial, Fibonacci sequence)
- Divide and conquer algorithms (merge sort, quicksort)
- Parsing nested data structures (JSON, XML)

## Best Practices and Considerations
- Always ensure there's a clear path to the base case
- Be mindful of stack depth limitations for deep recursion
- Consider iterative alternatives for performance-critical code
- Use memoization to optimize recursive algorithms with overlapping subproblems
      `

      // 3. Mock successful AI judgment
      const expectedScores = {
        clarity: 88,
        correctness: 92,
        completeness: 85,
        examples: 90
      }

      mockAIResponse(expectedScores, 'Excellent explanation with clear structure, accurate technical details, and great examples. The factorial example effectively demonstrates the concept.')

      // 4. Execute the judging workflow
      const judgment = await aiJudgeService.judgeExplanation({
        explanation: userExplanation,
        rubric: mockExplanationKata.rubric!,
        topic: 'recursion',
        context: 'Programming fundamentals course'
      })

      // 5. Verify judgment results
      expect(judgment.pass).toBe(true)
      expect(judgment.totalScore).toBe(88.75) // Average of scores
      expect(judgment.scores).toEqual(expectedScores)
      expect(judgment.feedback).toContain('Excellent explanation')

      // 6. Verify API call was made correctly
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('chat/completions'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key'
          })
        })
      )

      // 7. Verify prompt included kata context
      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      const prompt = requestBody.messages[0].content
      expect(prompt).toContain('recursion')
      expect(prompt).toContain('clarity')
      expect(prompt).toContain('correctness')
      expect(prompt).toContain('completeness')
      expect(prompt).toContain('examples')
    })

    it('should handle failing explanation submission correctly', async () => {
      const mockKata: KataDetails = {
        slug: 'explain-async-await',
        title: 'Explain Async/Await',
        language: 'none',
        type: 'explain',
        difficulty: 'medium',
        tags: ['javascript', 'async'],
        path: 'katas/explain-async-await',
        statement: 'Explain async/await in JavaScript...',
        metadata: {
          slug: 'explain-async-await',
          title: 'Explain Async/Await',
          language: 'none',
          type: 'explain',
          difficulty: 'medium',
          tags: ['javascript', 'async'],
          entry: 'explanation.md',
          test: { kind: 'none', file: 'none' },
          timeout_ms: 0
        },
        starterCode: '# Your explanation here...',
        testConfig: { kind: 'none', publicTestFile: 'none', timeoutMs: 0 },
        rubric: {
          keys: ['clarity', 'correctness', 'completeness'],
          threshold: {
            min_total: 70,
            min_correctness: 60
          }
        }
      }

      // Poor quality submission
      const poorExplanation = `
async await is for waiting. you use async on function and await on promises.

example:
async function getData() {
  const data = await fetch('/api')
  return data
}

its better than callbacks i think.
      `

      // Mock failing AI judgment
      const failingScores = {
        clarity: 45,
        correctness: 55, // Below min_correctness
        completeness: 40
      }

      mockAIResponse(
        failingScores,
        'The explanation lacks depth and contains inaccuracies. Missing key concepts like error handling, promise resolution, and proper async/await syntax.',
        false
      )

      const judgment = await aiJudgeService.judgeExplanation({
        explanation: poorExplanation,
        rubric: mockKata.rubric!,
        topic: 'async/await',
        context: 'JavaScript fundamentals'
      })

      expect(judgment.pass).toBe(false)
      expect(judgment.totalScore).toBe(46.67) // Below min_total
      expect(judgment.scores.correctness).toBeLessThan(60) // Below min_correctness
      expect(judgment.feedback).toContain('lacks depth')
    })
  })

  describe('Template Kata E2E Workflow', () => {
    it('should complete full workflow for passing template submission', async () => {
      const mockTemplateKata: KataDetails = {
        slug: 'react-component-template',
        title: 'React Component Template',
        language: 'js',
        type: 'template',
        difficulty: 'medium',
        tags: ['react', 'components'],
        path: 'katas/react-component-template',
        statement: 'Create a reusable React component template...',
        metadata: {
          slug: 'react-component-template',
          title: 'React Component Template',
          language: 'js',
          type: 'template',
          difficulty: 'medium',
          tags: ['react', 'components'],
          entry: 'template.md',
          test: { kind: 'none', file: 'none' },
          timeout_ms: 0
        },
        starterCode: '# Template structure here...',
        testConfig: { kind: 'none', publicTestFile: 'none', timeoutMs: 0 },
        rubric: {
          keys: ['structure', 'completeness', 'best_practices', 'documentation'],
          threshold: {
            min_total: 75,
            min_correctness: 70
          }
        }
      }

      const userTemplate = `
# React Button Component Template

## Project Structure
\`\`\`
src/
  components/
    Button/
      Button.jsx
      Button.module.css
      Button.test.js
      index.js
  hooks/
    useButton.js
  utils/
    classNames.js
  App.jsx
  index.js
package.json
README.md
\`\`\`

## Button Component (Button.jsx)
\`\`\`jsx
import React from 'react'
import PropTypes from 'prop-types'
import styles from './Button.module.css'
import { classNames } from '../../utils/classNames'

const Button = ({
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  onClick,
  className,
  ...props
}) => {
  const buttonClasses = classNames(
    styles.button,
    styles[variant],
    styles[size],
    { [styles.disabled]: disabled },
    className
  )

  return (
    <button
      className={buttonClasses}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  )
}

Button.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  disabled: PropTypes.bool,
  onClick: PropTypes.func,
  className: PropTypes.string
}

export default Button
\`\`\`

## CSS Module (Button.module.css)
\`\`\`css
.button {
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-family: inherit;
  font-weight: 500;
  transition: all 0.2s ease;
}

.button:hover:not(.disabled) {
  transform: translateY(-1px);
}

.primary {
  background-color: #007bff;
  color: white;
}

.secondary {
  background-color: #6c757d;
  color: white;
}

.danger {
  background-color: #dc3545;
  color: white;
}

.small {
  padding: 8px 16px;
  font-size: 14px;
}

.medium {
  padding: 12px 24px;
  font-size: 16px;
}

.large {
  padding: 16px 32px;
  font-size: 18px;
}

.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
\`\`\`

## Test File (Button.test.js)
\`\`\`javascript
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import Button from './Button'

describe('Button Component', () => {
  test('renders button with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  test('calls onClick when clicked', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    fireEvent.click(screen.getByText('Click me'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  test('applies variant classes correctly', () => {
    render(<Button variant="danger">Delete</Button>)
    const button = screen.getByText('Delete')
    expect(button).toHaveClass('danger')
  })
})
\`\`\`

## Package.json
\`\`\`json
{
  "name": "react-button-template",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "prop-types": "^15.8.1"
  },
  "devDependencies": {
    "@testing-library/react": "^13.4.0",
    "@testing-library/jest-dom": "^5.16.5",
    "jest": "^29.0.0"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test"
  }
}
\`\`\`

## Setup Instructions
1. Clone the repository
2. Install dependencies: \`npm install\`
3. Start development server: \`npm start\`
4. Run tests: \`npm test\`

## Usage Example
\`\`\`jsx
import Button from './components/Button'

function App() {
  return (
    <div>
      <Button variant="primary" size="large" onClick={() => alert('Clicked!')}>
        Primary Button
      </Button>
      <Button variant="secondary" disabled>
        Disabled Button
      </Button>
    </div>
  )
}
\`\`\`
      `

      const excellentScores = {
        structure: 90,
        completeness: 88,
        best_practices: 92,
        documentation: 85
      }

      mockAIResponse(excellentScores, 'Excellent React component template with proper structure, comprehensive testing, and clear documentation.')

      const judgment = await aiJudgeService.judgeTemplate({
        templateContent: userTemplate,
        rubric: mockTemplateKata.rubric!,
        templateType: 'React Component',
        expectedStructure: {
          folders: ['src', 'components'],
          files: ['package.json', 'README.md'],
          patterns: ['CSS Modules', 'PropTypes', 'Testing']
        },
        context: 'Modern React development with best practices'
      })

      expect(judgment.pass).toBe(true)
      expect(judgment.totalScore).toBe(88.75)
      expect(judgment.scores).toEqual(excellentScores)
      expect(judgment.feedback).toContain('Excellent React component')

      // Verify template-specific prompt elements
      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      const prompt = requestBody.messages[0].content
      expect(prompt).toContain('Template type: React Component')
      expect(prompt).toContain('close enough')
      expect(prompt).toContain('structure')
      expect(prompt).toContain('best_practices')
    })

    it('should handle failing template submission correctly', async () => {
      const mockKata: KataDetails = {
        slug: 'express-api-template',
        title: 'Express API Template',
        language: 'js',
        type: 'template',
        difficulty: 'easy',
        tags: ['express', 'api'],
        path: 'katas/express-api-template',
        statement: 'Create an Express.js API template...',
        metadata: {
          slug: 'express-api-template',
          title: 'Express API Template',
          language: 'js',
          type: 'template',
          difficulty: 'easy',
          tags: ['express', 'api'],
          entry: 'template.md',
          test: { kind: 'none', file: 'none' },
          timeout_ms: 0
        },
        starterCode: '# Template here...',
        testConfig: { kind: 'none', publicTestFile: 'none', timeoutMs: 0 },
        rubric: {
          keys: ['structure', 'completeness', 'best_practices'],
          threshold: {
            min_total: 75,
            min_correctness: 70
          }
        }
      }

      const poorTemplate = `
# Basic API

Just make a file called server.js:

\`\`\`javascript
const express = require('express')
const app = express()

app.get('/', (req, res) => {
  res.send('hello world')
})

app.listen(3000)
\`\`\`

Run it with: node server.js
      `

      const failingScores = {
        structure: 40, // Poor structure
        completeness: 30, // Very incomplete
        best_practices: 45 // Poor practices
      }

      mockAIResponse(
        failingScores,
        'Template is severely incomplete and lacks proper structure. Missing essential components like error handling, middleware, proper project organization, and documentation.',
        false
      )

      const judgment = await aiJudgeService.judgeTemplate({
        templateContent: poorTemplate,
        rubric: mockKata.rubric!,
        templateType: 'Express.js API',
        context: 'Production-ready API template'
      })

      expect(judgment.pass).toBe(false)
      expect(judgment.totalScore).toBe(38.33) // Below min_total
      expect(judgment.feedback).toContain('severely incomplete')
    })
  })

  describe('Codebase Analysis E2E Workflow', () => {
    it('should complete full workflow for passing codebase analysis', async () => {
      const mockCodebaseKata: KataDetails = {
        slug: 'analyze-web-server',
        title: 'Analyze Web Server',
        language: 'py',
        type: 'codebase',
        difficulty: 'medium',
        tags: ['python', 'web-server'],
        path: 'katas/analyze-web-server',
        statement: 'Analyze the provided web server implementation...',
        metadata: {
          slug: 'analyze-web-server',
          title: 'Analyze Web Server',
          language: 'py',
          type: 'codebase',
          difficulty: 'medium',
          tags: ['python', 'web-server'],
          entry: 'analysis.md',
          test: { kind: 'none', file: 'none' },
          timeout_ms: 0
        },
        starterCode: '# Your analysis here...',
        testConfig: { kind: 'none', publicTestFile: 'none', timeoutMs: 0 },
        rubric: {
          keys: ['comprehension', 'structure', 'detail', 'accuracy', 'insights'],
          threshold: {
            min_total: 70,
            min_correctness: 60,
            min_comprehension: 65
          }
        }
      }

      const userAnalysis = `
# Web Server Codebase Analysis

## Executive Summary
This codebase implements a lightweight HTTP server in Python using the built-in \`http.server\` module. The implementation provides both static file serving and dynamic API endpoints through a custom request handler architecture.

## Architecture Overview

### Core Components
1. **SimpleHTTPRequestHandler**: Custom request handler extending \`BaseHTTPRequestHandler\`
2. **Route Management**: Method-based routing system using \`do_GET\` and \`do_POST\`
3. **Static File Server**: Integrated static content delivery
4. **API Layer**: RESTful endpoints for dynamic responses

### Request Processing Flow
1. **Request Reception**: Server receives HTTP request on configured port
2. **Route Resolution**: URL path determines handler method (GET/POST)
3. **Content Processing**: Static files served directly, API requests processed dynamically
4. **Response Generation**: Appropriate HTTP response with headers and content
5. **Connection Management**: Request completed and connection handled

## Technical Implementation Analysis

### Design Patterns Identified
- **Template Method Pattern**: \`BaseHTTPRequestHandler\` provides request processing framework
- **Strategy Pattern**: Different handling strategies for static vs. dynamic content
- **Command Pattern**: HTTP methods mapped to specific handler functions

### Code Quality Assessment

#### Strengths
- **Simplicity**: Clean, readable implementation suitable for educational purposes
- **Extensibility**: Easy to add new endpoints by extending handler methods
- **Standards Compliance**: Proper HTTP status codes and header management
- **Error Handling**: Basic error responses for common failure scenarios

#### Areas for Improvement
1. **Security**: Missing input validation and sanitization
2. **Logging**: No structured logging for debugging and monitoring
3. **Configuration**: Hard-coded values should be externalized
4. **Performance**: Single-threaded design limits scalability
5. **Testing**: Lacks comprehensive test coverage

## Scalability and Performance Considerations

### Current Limitations
- **Concurrency**: Single-threaded request processing
- **Memory Usage**: No optimization for large file transfers
- **Caching**: Missing cache headers for static content
- **Connection Handling**: Basic connection management

### Recommended Improvements
1. **Threading**: Implement \`ThreadingHTTPServer\` for concurrent requests
2. **Caching**: Add appropriate cache headers for static resources
3. **Compression**: Implement gzip compression for text content
4. **Rate Limiting**: Add basic rate limiting for API endpoints

## Security Analysis

### Current Security Posture
- **Path Traversal**: Basic protection through standard library
- **Input Validation**: Minimal validation of request parameters
- **Authentication**: No authentication mechanism implemented
- **HTTPS**: No SSL/TLS support

### Security Recommendations
1. Implement input validation and sanitization
2. Add authentication for sensitive endpoints
3. Include security headers (CORS, CSP, etc.)
4. Consider HTTPS support for production use

## Deployment and Operational Considerations

### Production Readiness
- **Current State**: Suitable for development and educational use
- **Production Gaps**: Missing monitoring, logging, and error handling
- **Deployment**: Would require reverse proxy (nginx) for production

### Monitoring and Maintenance
- Add structured logging with configurable levels
- Implement health check endpoints
- Include metrics collection for performance monitoring
- Add graceful shutdown handling

## Conclusion
This web server implementation serves as an excellent educational example of HTTP server fundamentals. While not production-ready, it demonstrates core concepts clearly and provides a solid foundation for learning web server architecture. The code is well-structured and easily extensible for additional features.
      `

      const excellentScores = {
        comprehension: 92,
        structure: 88,
        detail: 90,
        accuracy: 94,
        insights: 87
      }

      mockAIResponse(excellentScores, 'Outstanding analysis demonstrating deep technical understanding and providing valuable insights for improvement.')

      const judgment = await aiJudgeService.judgeCodebase({
        analysis: userAnalysis,
        rubric: mockCodebaseKata.rubric!,
        codebaseDescription: 'Python HTTP Server Implementation',
        context: 'Educational web server analysis exercise'
      })

      expect(judgment.pass).toBe(true)
      expect(judgment.totalScore).toBe(90.2)
      expect(judgment.scores.comprehension).toBeGreaterThanOrEqual(65)
      expect(judgment.scores.accuracy).toBeGreaterThanOrEqual(60)
      expect(judgment.feedback).toContain('Outstanding analysis')
    })
  })

  describe('Error Recovery and Resilience', () => {
    it('should handle network failures gracefully in E2E workflow', async () => {
      const mockKata: KataDetails = {
        slug: 'test-kata',
        title: 'Test Kata',
        language: 'none',
        type: 'explain',
        difficulty: 'easy',
        tags: ['test'],
        path: 'katas/test-kata',
        statement: 'Test statement',
        metadata: {
          slug: 'test-kata',
          title: 'Test Kata',
          language: 'none',
          type: 'explain',
          difficulty: 'easy',
          tags: ['test'],
          entry: 'explanation.md',
          test: { kind: 'none', file: 'none' },
          timeout_ms: 0
        },
        starterCode: '# Test',
        testConfig: { kind: 'none', publicTestFile: 'none', timeoutMs: 0 },
        rubric: {
          keys: ['clarity'],
          threshold: { min_total: 70, min_correctness: 60 }
        }
      }

      // First call fails with network error
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      // Second call succeeds
      mockAIResponse({ clarity: 80 }, 'Success after retry')

      const judgment = await aiJudgeService.judgeExplanation({
        explanation: 'Test explanation',
        rubric: mockKata.rubric!
      })

      expect(judgment.pass).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should provide meaningful error messages for configuration issues', async () => {
      const invalidService = new AIJudgeService({
        apiKey: '', // Invalid API key
        maxRetries: 1
      })

      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: () => Promise.resolve('Invalid API key')
      })

      const rubric: Rubric = {
        keys: ['clarity'],
        threshold: { min_total: 70, min_correctness: 60 }
      }

      await expect(invalidService.judgeExplanation({
        explanation: 'Test',
        rubric
      })).rejects.toThrow(/AI service authentication failed|Failed to get valid AI response after.*attempts.*401 Unauthorized/)
    })
  })

  describe('Correctness Validation', () => {
    it('should consistently apply rubric thresholds', async () => {
      const rubric: Rubric = {
        keys: ['clarity', 'correctness'],
        threshold: { min_total: 70, min_correctness: 60 }
      }

      // Test case where total is high but correctness is low
      mockAIResponse(
        { clarity: 95, correctness: 45 }, // High clarity, low correctness
        'Clear but incorrect explanation'
      )

      const judgment = await aiJudgeService.judgeExplanation({
        explanation: 'Clear but wrong explanation',
        rubric
      })

      expect(judgment.pass).toBe(false) // Should fail due to low correctness
      expect(judgment.totalScore).toBe(70) // Total meets threshold but correctness doesn't
    })

    it('should handle edge cases in scoring', async () => {
      const rubric: Rubric = {
        keys: ['clarity', 'correctness'],
        threshold: { min_total: 70, min_correctness: 60 }
      }

      // Test exact threshold values
      mockAIResponse(
        { clarity: 80, correctness: 60 }, // Exactly at correctness threshold
        'Meets minimum requirements exactly'
      )

      const judgment = await aiJudgeService.judgeExplanation({
        explanation: 'Borderline explanation',
        rubric
      })

      expect(judgment.pass).toBe(true) // Should pass when exactly meeting thresholds
      expect(judgment.totalScore).toBe(70) // Exactly at total threshold
    })
  })
})