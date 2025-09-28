import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AIJudgeService } from '../ai-judge'
import type { Rubric, AIJudgment } from '@/types'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

/**
 * Comprehensive AI Judge Service Tests
 * 
 * This test suite simulates real frontend usage patterns and ensures
 * the AI judging system works correctly for both passes and failures.
 * Tests cover all kata types with realistic scenarios.
 */
describe('AIJudgeService - Comprehensive Testing', () => {
  let service: AIJudgeService

  beforeEach(() => {
    service = new AIJudgeService({
      apiKey: 'test-api-key',
      baseUrl: 'https://api.test.com/v1',
      model: 'gpt-4',
      maxRetries: 2,
      timeout: 10000
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // Helper function to create mock AI responses
  const createMockResponse = (scores: Record<string, number>, feedback: string, reasoning?: string) => ({
    choices: [{
      message: {
        content: JSON.stringify({
          scores,
          feedback,
          reasoning: reasoning || 'AI assessment reasoning'
        })
      }
    }]
  })

  // Helper function to setup successful fetch mock
  const mockSuccessfulResponse = (scores: Record<string, number>, feedback: string, reasoning?: string) => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(createMockResponse(scores, feedback, reasoning))
    })
  }

  describe('Explanation Kata Judging - Comprehensive Scenarios', () => {
    const explanationRubric: Rubric = {
      keys: ['clarity', 'correctness', 'completeness', 'examples'],
      threshold: {
        min_total: 70,
        min_correctness: 60
      }
    }

    describe('Passing Scenarios', () => {
      it('should pass excellent explanation with high scores', async () => {
        const excellentScores = {
          clarity: 95,
          correctness: 92,
          completeness: 88,
          examples: 90
        }
        
        mockSuccessfulResponse(
          excellentScores,
          'Excellent explanation with clear structure, accurate technical details, comprehensive coverage, and great examples.',
          'This explanation demonstrates mastery of the topic with exceptional clarity and depth.'
        )

        const result = await service.judgeExplanation({
          explanation: `
# Understanding Recursion

Recursion is a fundamental programming concept where a function calls itself to solve a problem by breaking it down into smaller, similar subproblems.

## Key Components

### Base Case
The base case is the condition that stops the recursion. Without it, the function would call itself infinitely, leading to a stack overflow.

### Recursive Case
The recursive case is where the function calls itself with modified parameters, gradually moving toward the base case.

## Example: Factorial Function

\`\`\`python
def factorial(n):
    # Base case: factorial of 0 or 1 is 1
    if n <= 1:
        return 1
    # Recursive case: n! = n * (n-1)!
    return n * factorial(n - 1)

# Usage
print(factorial(5))  # Output: 120
\`\`\`

## How It Works
1. factorial(5) calls factorial(4)
2. factorial(4) calls factorial(3)
3. factorial(3) calls factorial(2)
4. factorial(2) calls factorial(1)
5. factorial(1) returns 1 (base case)
6. Results bubble back up: 2*1, 3*2, 4*6, 5*24 = 120

## Common Use Cases
- Tree traversal (DFS)
- Mathematical calculations (factorial, fibonacci)
- Divide and conquer algorithms (merge sort, quick sort)
- Parsing nested structures

## Best Practices
- Always define a clear base case
- Ensure progress toward the base case
- Consider iterative alternatives for performance
- Be mindful of stack depth limitations
          `,
          rubric: explanationRubric,
          topic: 'recursion',
          context: 'Computer Science fundamentals course'
        })

        expect(result.pass).toBe(true)
        expect(result.totalScore).toBe(91.25) // Average of scores
        expect(result.scores).toEqual(excellentScores)
        expect(result.feedback).toContain('Excellent explanation')
        
        // Verify API call structure
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.test.com/v1/chat/completions',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer test-api-key'
            }
          })
        )

        const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body)
        expect(requestBody.messages[0].content).toContain('recursion')
        expect(requestBody.messages[0].content).toContain('clarity')
        expect(requestBody.messages[0].content).toContain('correctness')
      })

      it('should pass good explanation meeting minimum thresholds', async () => {
        const goodScores = {
          clarity: 75,
          correctness: 80,
          completeness: 70,
          examples: 65
        }
        
        mockSuccessfulResponse(
          goodScores,
          'Good explanation that covers the basics well. Could benefit from more detailed examples.',
          'Meets requirements with solid understanding demonstrated.'
        )

        const result = await service.judgeExplanation({
          explanation: `
# Recursion Basics

Recursion is when a function calls itself. It needs a base case to stop and a recursive case to continue.

## Example
\`\`\`python
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)
\`\`\`

This calculates factorial by calling itself with n-1 until reaching the base case.

## Uses
- Tree operations
- Mathematical calculations
- Sorting algorithms
          `,
          rubric: explanationRubric
        })

        expect(result.pass).toBe(true)
        expect(result.totalScore).toBe(72.5)
        expect(result.scores.correctness).toBeGreaterThanOrEqual(60) // Meets min threshold
      })

      it('should pass explanation with borderline scores', async () => {
        const borderlineScores = {
          clarity: 70,
          correctness: 60, // Exactly at minimum
          completeness: 75,
          examples: 75
        }
        
        mockSuccessfulResponse(
          borderlineScores,
          'Adequate explanation that meets minimum requirements but could be improved.',
          'Borderline pass - meets thresholds but has room for improvement.'
        )

        const result = await service.judgeExplanation({
          explanation: 'Basic recursion explanation that just meets requirements...',
          rubric: explanationRubric
        })

        expect(result.pass).toBe(true)
        expect(result.totalScore).toBe(70) // Exactly at min_total threshold
        expect(result.scores.correctness).toBe(60) // Exactly at min_correctness threshold
      })
    })

    describe('Failing Scenarios', () => {
      it('should fail explanation with low total score', async () => {
        const lowScores = {
          clarity: 50,
          correctness: 65, // Above min_correctness but total is low
          completeness: 45,
          examples: 40
        }
        
        mockSuccessfulResponse(
          lowScores,
          'The explanation lacks clarity and completeness. Many important concepts are missing or poorly explained.',
          'Below passing threshold due to insufficient detail and poor organization.'
        )

        const result = await service.judgeExplanation({
          explanation: 'Recursion is when function calls itself. Sometimes used.',
          rubric: explanationRubric
        })

        expect(result.pass).toBe(false)
        expect(result.totalScore).toBe(50) // Below min_total threshold of 70
        expect(result.feedback).toContain('lacks clarity')
      })

      it('should fail explanation with low correctness score', async () => {
        const incorrectScores = {
          clarity: 80,
          correctness: 45, // Below min_correctness threshold
          completeness: 75,
          examples: 70
        }
        
        mockSuccessfulResponse(
          incorrectScores,
          'While the explanation is clear and complete, it contains significant technical inaccuracies that make it misleading.',
          'Fails due to technical errors despite good presentation.'
        )

        const result = await service.judgeExplanation({
          explanation: `
# Recursion (Incorrect Information)

Recursion is when a function calls other functions repeatedly. You don't need a base case because the computer will automatically stop when it runs out of memory.

## Example
\`\`\`python
def factorial(n):
    return n * factorial(n + 1)  # This is wrong - should be n-1
\`\`\`
          `,
          rubric: explanationRubric
        })

        expect(result.pass).toBe(false)
        expect(result.totalScore).toBe(67.5) // Above min_total but fails on min_correctness
        expect(result.scores.correctness).toBeLessThan(60)
      })

      it('should fail completely inadequate explanation', async () => {
        const terribleScores = {
          clarity: 20,
          correctness: 15,
          completeness: 10,
          examples: 25
        }
        
        mockSuccessfulResponse(
          terribleScores,
          'This explanation is severely inadequate. It shows no understanding of recursion and provides no useful information.',
          'Complete failure - does not demonstrate any understanding of the topic.'
        )

        const result = await service.judgeExplanation({
          explanation: 'idk what recursion is lol',
          rubric: explanationRubric
        })

        expect(result.pass).toBe(false)
        expect(result.totalScore).toBe(17.5)
        expect(result.scores.correctness).toBeLessThan(60)
      })
    })
  })

  describe('Template Kata Judging - Comprehensive Scenarios', () => {
    const templateRubric: Rubric = {
      keys: ['structure', 'completeness', 'best_practices', 'documentation', 'functionality'],
      threshold: {
        min_total: 75,
        min_correctness: 70 // Using correctness as structure threshold
      }
    }

    describe('Passing Scenarios', () => {
      it('should pass excellent React template', async () => {
        const excellentScores = {
          structure: 90,
          completeness: 85,
          best_practices: 88,
          documentation: 82,
          functionality: 92
        }
        
        mockSuccessfulResponse(
          excellentScores,
          'Excellent React template with modern best practices, comprehensive structure, and clear documentation.',
          'Professional-quality template that follows all modern React conventions.'
        )

        const result = await service.judgeTemplate({
          templateContent: `
# Modern React TypeScript Template

## Project Structure
\`\`\`
src/
  components/
    ui/
      Button/
        Button.tsx
        Button.module.css
        Button.test.tsx
        index.ts
    layout/
      Header/
        Header.tsx
        Header.module.css
  hooks/
    useLocalStorage.ts
    useDebounce.ts
  utils/
    api.ts
    helpers.ts
  types/
    index.ts
  App.tsx
  main.tsx
public/
  index.html
  favicon.ico
package.json
tsconfig.json
vite.config.ts
.eslintrc.json
.gitignore
README.md
\`\`\`

## Key Files

### package.json
\`\`\`json
{
  "name": "react-typescript-template",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "lint": "eslint src --ext ts,tsx",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "eslint": "^8.45.0",
    "typescript": "^5.0.2",
    "vite": "^4.4.5",
    "vitest": "^0.34.0"
  }
}
\`\`\`

### Button Component
\`\`\`tsx
import React from 'react'
import styles from './Button.module.css'

interface ButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
  onClick?: () => void
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  onClick
}) => {
  return (
    <button
      className={\`\${styles.button} \${styles[variant]} \${styles[size]}\`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
\`\`\`

## Setup Instructions
1. Clone the repository
2. Install dependencies: \`npm install\`
3. Start development server: \`npm run dev\`
4. Run tests: \`npm test\`
5. Build for production: \`npm run build\`

## Features
- TypeScript for type safety
- Vite for fast development and building
- CSS Modules for scoped styling
- ESLint for code quality
- Vitest for testing
- Component-based architecture
          `,
          rubric: templateRubric,
          templateType: 'React TypeScript Application',
          expectedStructure: {
            folders: ['src', 'components', 'hooks', 'utils'],
            files: ['package.json', 'tsconfig.json', 'README.md'],
            patterns: ['TypeScript', 'CSS Modules', 'Testing']
          }
        })

        expect(result.pass).toBe(true)
        expect(result.totalScore).toBe(87.4)
        expect(result.scores.structure).toBeGreaterThanOrEqual(70)
      })

      it('should pass adequate template meeting minimum requirements', async () => {
        const adequateScores = {
          structure: 75,
          completeness: 70,
          best_practices: 78,
          documentation: 72,
          functionality: 80
        }
        
        mockSuccessfulResponse(
          adequateScores,
          'Adequate template that meets basic requirements. Structure is reasonable and functionality is sound.',
          'Meets minimum standards for a working template.'
        )

        const result = await service.judgeTemplate({
          templateContent: `
# Basic Express API Template

## Structure
\`\`\`
src/
  routes/
    users.js
  app.js
package.json
README.md
\`\`\`

## app.js
\`\`\`javascript
const express = require('express')
const app = express()

app.use(express.json())
app.use('/users', require('./routes/users'))

module.exports = app
\`\`\`

## Setup
1. npm install
2. npm start
          `,
          rubric: templateRubric,
          templateType: 'Express API'
        })

        expect(result.pass).toBe(true)
        expect(result.totalScore).toBe(75) // Exactly at threshold
      })
    })

    describe('Failing Scenarios', () => {
      it('should fail template with poor structure', async () => {
        const poorStructureScores = {
          structure: 45, // Below threshold
          completeness: 80,
          best_practices: 75,
          documentation: 70,
          functionality: 85
        }
        
        mockSuccessfulResponse(
          poorStructureScores,
          'While the template has good functionality, the project structure is poorly organized and does not follow conventions.',
          'Fails due to inadequate project organization despite other strengths.'
        )

        const result = await service.judgeTemplate({
          templateContent: `
# Messy Template

Just put everything in one file:

\`\`\`javascript
// everything.js - contains routes, models, controllers, everything!
const express = require('express')
// ... 500 lines of mixed code
\`\`\`

Run with: node everything.js
          `,
          rubric: templateRubric
        })

        expect(result.pass).toBe(false)
        expect(result.scores.structure).toBeLessThan(70)
      })

      it('should fail incomplete template', async () => {
        const incompleteScores = {
          structure: 80,
          completeness: 30, // Very incomplete
          best_practices: 70,
          documentation: 40,
          functionality: 50
        }
        
        mockSuccessfulResponse(
          incompleteScores,
          'Template is severely incomplete. Missing essential files, configuration, and documentation.',
          'Fails due to incompleteness - not usable as a starting point.'
        )

        const result = await service.judgeTemplate({
          templateContent: `
# Incomplete Template

Here's a file:

\`\`\`javascript
console.log('hello')
\`\`\`

That's it.
          `,
          rubric: templateRubric
        })

        expect(result.pass).toBe(false)
        expect(result.totalScore).toBe(54) // Below min_total threshold
      })
    })
  })

  describe('Codebase Analysis Judging - Comprehensive Scenarios', () => {
    const codebaseRubric: Rubric = {
      keys: ['comprehension', 'structure', 'detail', 'accuracy', 'insights'],
      threshold: {
        min_total: 70,
        min_correctness: 60,
        min_comprehension: 65
      }
    }

    describe('Passing Scenarios', () => {
      it('should pass excellent codebase analysis', async () => {
        const excellentScores = {
          comprehension: 90,
          structure: 85,
          detail: 88,
          accuracy: 92,
          insights: 87
        }
        
        mockSuccessfulResponse(
          excellentScores,
          'Excellent analysis demonstrating deep understanding of the codebase architecture and providing valuable insights.',
          'Shows mastery-level comprehension with thoughtful analysis and practical suggestions.'
        )

        const result = await service.judgeCodebase({
          analysis: `
# Web Server Codebase Analysis

## Overview
This codebase implements a lightweight HTTP server in Python using the built-in \`http.server\` module. The architecture follows a request-response pattern with custom routing capabilities.

## Architecture Analysis

### Core Components
1. **SimpleHTTPRequestHandler**: Custom request handler extending \`BaseHTTPRequestHandler\`
2. **Route Dispatcher**: Method-based routing system (\`do_GET\`, \`do_POST\`)
3. **Static File Server**: Built-in capability for serving static assets
4. **API Endpoints**: RESTful endpoints for dynamic content

### Request Flow
1. Client initiates HTTP request
2. Server receives request and parses URL/method
3. Request router determines appropriate handler
4. Handler processes request and generates response
5. Response sent back to client with appropriate headers

### Key Design Patterns
- **Template Method Pattern**: BaseHTTPRequestHandler defines the request processing template
- **Strategy Pattern**: Different handlers for different HTTP methods
- **Factory Pattern**: Response generation based on request type

## Code Quality Assessment

### Strengths
- Clean separation of concerns between routing and business logic
- Proper HTTP status code usage
- Good error handling for file operations
- Extensible design for adding new endpoints

### Areas for Improvement
1. **Logging**: No structured logging system for debugging/monitoring
2. **Configuration**: Hard-coded values should be externalized
3. **Security**: Missing input validation and sanitization
4. **Performance**: No caching mechanism for static files
5. **Testing**: Lacks unit tests for reliability

## Scalability Considerations
- Current single-threaded design limits concurrent request handling
- Memory usage could be optimized for large file serving
- Consider migration to production WSGI server for real deployments

## Recommended Enhancements
1. Implement proper logging with configurable levels
2. Add request/response middleware system
3. Include comprehensive error handling and user-friendly error pages
4. Add configuration file support (JSON/YAML)
5. Implement basic security headers and input validation
6. Add unit and integration test suite
          `,
          rubric: codebaseRubric,
          codebaseDescription: 'Python HTTP Server',
          context: 'Educational web server implementation'
        })

        expect(result.pass).toBe(true)
        expect(result.totalScore).toBe(88.4)
        expect(result.scores.comprehension).toBeGreaterThanOrEqual(65)
        expect(result.scores.accuracy).toBeGreaterThanOrEqual(60)
      })

      it('should pass good analysis meeting thresholds', async () => {
        const goodScores = {
          comprehension: 75,
          structure: 70,
          detail: 68,
          accuracy: 80,
          insights: 72
        }
        
        mockSuccessfulResponse(
          goodScores,
          'Good analysis showing solid understanding. Covers key components and provides useful observations.',
          'Demonstrates good comprehension with adequate detail and accuracy.'
        )

        const result = await service.judgeCodebase({
          analysis: `
# Server Analysis

## What it does
This is a Python web server that handles HTTP requests. It can serve files and has some API endpoints.

## Main parts
- Request handler class that processes incoming requests
- Methods for GET and POST requests
- File serving functionality
- JSON API responses

## How it works
1. Server starts and listens for connections
2. When request comes in, it checks the URL
3. Serves files or API responses based on the path
4. Sends response back to client

## Good things
- Simple and easy to understand
- Works for basic web serving needs
- Has both static and dynamic content

## Could be better
- Needs better error handling
- Should have logging
- Could use configuration files
          `,
          rubric: codebaseRubric
        })

        expect(result.pass).toBe(true)
        expect(result.totalScore).toBe(73)
      })
    })

    describe('Failing Scenarios', () => {
      it('should fail analysis with poor comprehension', async () => {
        const poorComprehensionScores = {
          comprehension: 45, // Below min_comprehension threshold
          structure: 70,
          detail: 60,
          accuracy: 75,
          insights: 65
        }
        
        mockSuccessfulResponse(
          poorComprehensionScores,
          'Analysis shows limited understanding of the codebase. Many key concepts are misunderstood or missing.',
          'Fails due to insufficient comprehension of the code architecture and functionality.'
        )

        const result = await service.judgeCodebase({
          analysis: `
# Server Thing

I think this code makes a website or something. There are some functions that do stuff with the internet.

It has files and they get sent to people who ask for them. Not sure how it works exactly but it seems to use Python.

Maybe it's good? Hard to tell.
          `,
          rubric: codebaseRubric
        })

        expect(result.pass).toBe(false)
        expect(result.scores.comprehension).toBeLessThan(65)
      })

      it('should fail analysis with low accuracy', async () => {
        const inaccurateScores = {
          comprehension: 70,
          structure: 75,
          detail: 80,
          accuracy: 35, // Very inaccurate
          insights: 65
        }
        
        mockSuccessfulResponse(
          inaccurateScores,
          'While the analysis is well-structured, it contains significant technical inaccuracies that make it misleading.',
          'Fails due to technical errors despite good organization and detail.'
        )

        const result = await service.judgeCodebase({
          analysis: `
# Web Server Analysis (Incorrect)

This server uses Node.js and Express framework to handle requests. It connects to a MySQL database for data storage.

The main component is the React frontend that renders the user interface. When users click buttons, it sends AJAX requests to the backend API.

The server uses WebSockets for real-time communication and Redis for session management.
          `,
          rubric: codebaseRubric
        })

        expect(result.pass).toBe(false)
        expect(result.scores.accuracy).toBeLessThan(60)
      })
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed JSON responses with retry', async () => {
      // First call returns malformed JSON
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{
            message: {
              content: 'This is not valid JSON for our format'
            }
          }]
        })
      })

      // Second call returns valid response
      mockSuccessfulResponse(
        { clarity: 75, correctness: 80 },
        'Valid response after retry'
      )

      const rubric: Rubric = {
        keys: ['clarity', 'correctness'],
        threshold: { min_total: 70, min_correctness: 60 }
      }

      const result = await service.judgeExplanation({
        explanation: 'Test explanation',
        rubric
      })

      expect(result.pass).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should handle API rate limiting with exponential backoff', async () => {
      // Mock rate limit error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: () => Promise.resolve('Rate limit exceeded')
      })

      // Second call succeeds
      mockSuccessfulResponse(
        { clarity: 80, correctness: 85 },
        'Success after rate limit'
      )

      const rubric: Rubric = {
        keys: ['clarity', 'correctness'],
        threshold: { min_total: 70, min_correctness: 60 }
      }

      const result = await service.judgeExplanation({
        explanation: 'Test explanation',
        rubric
      })

      expect(result.pass).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should handle authentication errors appropriately', async () => {
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

      await expect(service.judgeExplanation({
        explanation: 'Test explanation',
        rubric
      })).rejects.toThrow(/AI service authentication failed|Failed to get valid AI response after.*attempts.*401 Unauthorized/)
    })

    it('should handle network timeouts', async () => {
      const abortError = new Error('Request timeout')
      abortError.name = 'AbortError'
      
      mockFetch.mockRejectedValue(abortError)

      const rubric: Rubric = {
        keys: ['clarity'],
        threshold: { min_total: 70, min_correctness: 60 }
      }

      await expect(service.judgeExplanation({
        explanation: 'Test explanation',
        rubric
      })).rejects.toThrow('AI request timed out')
    })

    it('should validate response format strictly', () => {
      // Test various invalid response formats
      const invalidResponses = [
        'Not JSON at all',
        '{"scores": "not an object"}',
        '{"scores": {"clarity": 150}}', // Score > 100
        '{"scores": {"clarity": -10}}', // Score < 0
        '{"scores": {"clarity": 80}}', // Missing feedback
        '{"feedback": "test"}', // Missing scores
        '{"scores": {"clarity": "not a number"}, "feedback": "test"}'
      ]

      invalidResponses.forEach(response => {
        const result = service.validateResponse(response)
        expect(result).toBeNull()
      })
    })

    it('should handle complex rubric thresholds correctly', async () => {
      const complexRubric: Rubric = {
        keys: ['clarity', 'correctness', 'completeness', 'examples'],
        threshold: {
          min_total: 75,
          min_correctness: 70,
          min_comprehension: 65 // This should be ignored for explanation katas
        }
      }

      // Scores that meet total and correctness but would fail comprehension
      mockSuccessfulResponse(
        {
          clarity: 80,
          correctness: 75, // Meets min_correctness
          completeness: 70,
          examples: 80
        },
        'Good explanation meeting thresholds'
      )

      const result = await service.judgeExplanation({
        explanation: 'Test explanation',
        rubric: complexRubric
      })

      expect(result.pass).toBe(true) // Should pass since comprehension threshold doesn't apply
      expect(result.totalScore).toBe(76.25)
    })
  })

  describe('Response Parsing Edge Cases', () => {
    it('should extract JSON from markdown code blocks', () => {
      const markdownResponse = `
Here is my assessment:

\`\`\`json
{
  "scores": {
    "clarity": 85,
    "correctness": 90
  },
  "feedback": "Good explanation with clear examples"
}
\`\`\`

Hope this helps!
      `

      const result = service.validateResponse(markdownResponse)
      expect(result).toBeTruthy()
      expect(result!.scores.clarity).toBe(85)
    })

    it('should extract JSON from mixed content', () => {
      const mixedResponse = `
Based on my analysis, here are the scores:

{
  "scores": {
    "clarity": 75,
    "correctness": 80
  },
  "feedback": "Adequate explanation"
}

Let me know if you need clarification.
      `

      const result = service.validateResponse(mixedResponse)
      expect(result).toBeTruthy()
      expect(result!.scores.clarity).toBe(75)
    })

    it('should handle responses with extra whitespace', () => {
      const whitespaceResponse = `


      {
        "scores": {
          "clarity": 70
        },
        "feedback": "Test feedback"
      }


      `

      const result = service.validateResponse(whitespaceResponse)
      expect(result).toBeTruthy()
      expect(result!.scores.clarity).toBe(70)
    })
  })

  describe('Prompt Generation Verification', () => {
    it('should include all rubric keys in explanation prompt', async () => {
      const rubric: Rubric = {
        keys: ['clarity', 'correctness', 'completeness', 'examples', 'depth'],
        threshold: { min_total: 70, min_correctness: 60 }
      }

      mockSuccessfulResponse(
        { clarity: 80, correctness: 85, completeness: 75, examples: 70, depth: 80 },
        'Test feedback'
      )

      await service.judgeExplanation({
        explanation: 'Test explanation',
        rubric,
        topic: 'test topic',
        context: 'test context'
      })

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      const prompt = requestBody.messages[0].content

      // Verify all rubric keys are mentioned
      rubric.keys.forEach(key => {
        expect(prompt).toContain(key)
      })

      // Verify context is included
      expect(prompt).toContain('test topic')
      expect(prompt).toContain('test context')
    })

    it('should include template-specific guidance in template prompt', async () => {
      const rubric: Rubric = {
        keys: ['structure', 'completeness'],
        threshold: { min_total: 75, min_correctness: 70 }
      }

      mockSuccessfulResponse(
        { structure: 80, completeness: 85 },
        'Test feedback'
      )

      await service.judgeTemplate({
        templateContent: 'Test template',
        rubric,
        templateType: 'React App',
        expectedStructure: { folders: ['src'], files: ['package.json'] },
        context: 'Modern React development'
      })

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      const prompt = requestBody.messages[0].content

      expect(prompt).toContain('Template type: React App')
      expect(prompt).toContain('Modern React development')
      expect(prompt).toContain('close enough')
      expect(prompt).toContain('structure')
      expect(prompt).toContain('completeness')
    })
  })
})