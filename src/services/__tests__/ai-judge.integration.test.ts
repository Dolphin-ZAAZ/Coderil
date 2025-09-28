import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { AIJudgeService } from '../ai-judge'
import type { Rubric } from '../../types'

describe('AIJudgeService Integration Tests', () => {
  let service: AIJudgeService

  beforeAll(() => {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required for integration tests. Please set it in your environment.')
    }

    service = new AIJudgeService({
      apiKey,
      model: 'gpt-3.5-turbo', // Use cheaper model for testing
      maxRetries: 1,
      timeout: 30000
    })
  })

  afterAll(() => {
    // Cleanup if needed
  })

  describe('judgeExplanation integration', () => {
    it('should judge a real explanation about recursion', async () => {
      const rubric: Rubric = {
        keys: ['clarity', 'correctness', 'completeness', 'examples'],
        threshold: {
          min_total: 70,
          min_correctness: 60
        }
      }

      const explanation = `
# Recursion Explained

Recursion is a programming technique where a function calls itself to solve a problem by breaking it down into smaller, similar subproblems.

## How it works
A recursive function has two main components:
1. **Base case**: A condition that stops the recursion
2. **Recursive case**: The function calls itself with modified parameters

## Example
Here's a simple example calculating factorial:

\`\`\`python
def factorial(n):
    # Base case
    if n <= 1:
        return 1
    # Recursive case
    return n * factorial(n - 1)
\`\`\`

## Use cases
- Tree traversal
- Mathematical calculations (factorial, fibonacci)
- Divide and conquer algorithms

## Common pitfalls
- Forgetting the base case leads to infinite recursion
- Stack overflow with deep recursion
- Performance issues due to repeated calculations
      `

      const result = await service.judgeExplanation({
        explanation,
        rubric,
        topic: 'recursion',
        context: 'Programming fundamentals course'
      })

      expect(result).toBeDefined()
      expect(result.scores).toBeDefined()
      expect(result.feedback).toBeDefined()
      expect(typeof result.pass).toBe('boolean')
      expect(typeof result.totalScore).toBe('number')
      
      // Check that all rubric keys have scores
      for (const key of rubric.keys) {
        expect(result.scores[key]).toBeDefined()
        expect(typeof result.scores[key]).toBe('number')
        expect(result.scores[key]).toBeGreaterThanOrEqual(0)
        expect(result.scores[key]).toBeLessThanOrEqual(100)
      }

      // This should be a decent explanation, so expect reasonable scores
      expect(result.totalScore).toBeGreaterThan(50)
      expect(result.feedback.length).toBeGreaterThan(50)
      
      console.log('Recursion explanation judgment:', {
        pass: result.pass,
        totalScore: result.totalScore,
        scores: result.scores,
        feedback: result.feedback.substring(0, 200) + '...'
      })
    }, 45000) // 45 second timeout for API call

    it('should judge a poor explanation and provide constructive feedback', async () => {
      const rubric: Rubric = {
        keys: ['clarity', 'correctness', 'completeness'],
        threshold: {
          min_total: 70,
          min_correctness: 60
        }
      }

      const poorExplanation = `
Recursion is when function calls itself. It's used sometimes.

Example:
def func(x):
    return func(x)
      `

      const result = await service.judgeExplanation({
        explanation: poorExplanation,
        rubric,
        topic: 'recursion'
      })

      expect(result).toBeDefined()
      expect(result.pass).toBe(false) // Should fail due to poor quality
      expect(result.totalScore).toBeLessThan(70) // Below threshold
      expect(result.feedback.length).toBeGreaterThan(50) // Should provide detailed feedback
      
      console.log('Poor explanation judgment:', {
        pass: result.pass,
        totalScore: result.totalScore,
        scores: result.scores,
        feedback: result.feedback.substring(0, 200) + '...'
      })
    }, 45000)
  })

  describe('judgeTemplate integration', () => {
    it('should judge a React component template', async () => {
      const rubric: Rubric = {
        keys: ['structure', 'completeness', 'best_practices', 'functionality'],
        threshold: {
          min_total: 75,
          min_structure: 70
        }
      }

      const reactTemplate = `
# React Component Template

## Project Structure
\`\`\`
src/
  components/
    Button/
      Button.tsx
      Button.module.css
      Button.test.tsx
      index.ts
  hooks/
    useCounter.ts
  utils/
    helpers.ts
  App.tsx
  index.tsx
package.json
tsconfig.json
README.md
\`\`\`

## Button Component
\`\`\`tsx
import React from 'react';
import styles from './Button.module.css';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  disabled = false
}) => {
  return (
    <button
      className={\`\${styles.button} \${styles[variant]}\`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};
\`\`\`

## Package.json
\`\`\`json
{
  "name": "react-component-template",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "typescript": "^4.9.0",
    "vite": "^4.0.0"
  },
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest"
  }
}
\`\`\`

## Setup Instructions
1. Clone the repository
2. Run \`npm install\`
3. Run \`npm run dev\` to start development server
4. Run \`npm test\` to run tests
      `

      const result = await service.judgeTemplate({
        templateContent: reactTemplate,
        rubric,
        templateType: 'React Component Library',
        expectedStructure: {
          folders: ['src', 'components'],
          files: ['package.json', 'tsconfig.json'],
          patterns: ['TypeScript', 'CSS modules', 'tests']
        },
        context: 'Modern React development with TypeScript'
      })

      expect(result).toBeDefined()
      expect(result.scores).toBeDefined()
      expect(result.feedback).toBeDefined()
      expect(typeof result.pass).toBe('boolean')
      expect(typeof result.totalScore).toBe('number')
      
      // Check that all rubric keys have scores
      for (const key of rubric.keys) {
        expect(result.scores[key]).toBeDefined()
        expect(typeof result.scores[key]).toBe('number')
        expect(result.scores[key]).toBeGreaterThanOrEqual(0)
        expect(result.scores[key]).toBeLessThanOrEqual(100)
      }

      // This should be a good template, so expect reasonable scores
      expect(result.totalScore).toBeGreaterThan(60)
      expect(result.feedback.length).toBeGreaterThan(50)
      
      console.log('React template judgment:', {
        pass: result.pass,
        totalScore: result.totalScore,
        scores: result.scores,
        feedback: result.feedback.substring(0, 200) + '...'
      })
    }, 45000)

    it('should judge an incomplete template and suggest improvements', async () => {
      const rubric: Rubric = {
        keys: ['structure', 'completeness', 'best_practices'],
        threshold: {
          min_total: 75,
          min_structure: 70
        }
      }

      const incompleteTemplate = `
# Basic Template

Just a simple file:

\`\`\`js
console.log('hello world');
\`\`\`

That's it.
      `

      const result = await service.judgeTemplate({
        templateContent: incompleteTemplate,
        rubric,
        templateType: 'Node.js Project',
        context: 'Should be a complete project template'
      })

      expect(result).toBeDefined()
      expect(result.pass).toBe(false) // Should fail due to incompleteness
      expect(result.totalScore).toBeLessThan(75) // Below threshold
      expect(result.feedback.length).toBeGreaterThan(50) // Should provide detailed feedback about issues
      
      console.log('Incomplete template judgment:', {
        pass: result.pass,
        totalScore: result.totalScore,
        scores: result.scores,
        feedback: result.feedback.substring(0, 200) + '...'
      })
    }, 45000)
  })

  describe('error handling integration', () => {
    it('should handle invalid API key gracefully', async () => {
      const invalidService = new AIJudgeService({
        apiKey: 'invalid-key',
        maxRetries: 1,
        timeout: 10000
      })

      const rubric: Rubric = {
        keys: ['clarity'],
        threshold: { min_total: 70, min_correctness: 60 }
      }

      await expect(invalidService.judgeExplanation({
        explanation: 'Test explanation',
        rubric
      })).rejects.toThrow(/AI API request failed/)
    }, 15000)
  })

  describe('judgeCodebase integration', () => {
    it('should judge a real codebase analysis', async () => {
      const rubric: Rubric = {
        keys: ['comprehension', 'structure', 'detail', 'accuracy', 'insights'],
        threshold: {
          min_total: 70,
          min_correctness: 60
        }
      }

      const analysis = `
# Simple Web Server Analysis

## Project Overview
This codebase implements a simple HTTP server in Python using the built-in http.server module. The server provides basic routing capabilities, API endpoints, and static file serving functionality.

## Architecture & Structure
The code is organized into a single main file (server.py) with a custom request handler class that extends BaseHTTPRequestHandler. The structure includes:
- Main server class: SimpleHTTPRequestHandler
- Route handling methods for different endpoints
- Static file serving functionality
- JSON API endpoints

## Key Components
1. **SimpleHTTPRequestHandler**: Main request handler class
2. **Route methods**: do_GET() and do_POST() for handling different HTTP methods
3. **API endpoints**: /api/status, /api/time, /api/echo
4. **Static file serving**: Handles CSS, JS, and other static assets

## Data Flow
1. Client sends HTTP request
2. Server routes request based on URL path
3. Appropriate handler method processes the request
4. Response is generated and sent back to client

## Potential Improvements
- Add proper logging
- Implement error handling middleware
- Add request validation
- Consider using a proper web framework for larger applications
      `

      const result = await service.judgeCodebase({
        analysis,
        rubric,
        codebaseDescription: 'Simple HTTP Server',
        context: 'Educational Python web server example'
      })

      expect(result).toBeDefined()
      expect(result.scores).toBeDefined()
      expect(result.feedback).toBeDefined()
      expect(typeof result.pass).toBe('boolean')
      expect(typeof result.totalScore).toBe('number')
      
      // Check that all rubric keys have scores
      rubric.keys.forEach(key => {
        expect(result.scores[key]).toBeDefined()
        expect(typeof result.scores[key]).toBe('number')
        expect(result.scores[key]).toBeGreaterThanOrEqual(0)
        expect(result.scores[key]).toBeLessThanOrEqual(100)
      })

      console.log('Codebase Analysis Judgment Result:', {
        pass: result.pass,
        totalScore: result.totalScore,
        scores: result.scores,
        feedback: result.feedback.substring(0, 200) + '...'
      })
    }, 15000)
  })
})