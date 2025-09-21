/**
 * Example usage of the AI Judge Service
 * 
 * This file demonstrates how to use the AIJudgeService for both
 * explanation and template katas. It's not a test file but rather
 * documentation through code examples.
 */

import { AIJudgeService } from '../ai-judge'
import type { Rubric } from '@/types'

// Example: Setting up the AI Judge Service
function createAIJudgeService() {
  return new AIJudgeService({
    apiKey: process.env.OPENAI_API_KEY || 'your-api-key-here',
    model: 'gpt-4', // or 'gpt-3.5-turbo' for faster/cheaper responses
    maxRetries: 3,
    timeout: 30000 // 30 seconds
  })
}

// Example: Judging an explanation kata
async function judgeExplanationExample() {
  const service = createAIJudgeService()
  
  const rubric: Rubric = {
    keys: ['clarity', 'correctness', 'completeness', 'examples'],
    threshold: {
      min_total: 70,
      min_correctness: 60
    }
  }

  const explanation = `
# Understanding Async/Await in JavaScript

Async/await is a syntax that makes it easier to work with promises in JavaScript.

## How it works
- async functions always return a promise
- await pauses execution until the promise resolves
- Error handling uses try/catch blocks

## Example
\`\`\`javascript
async function fetchData() {
  try {
    const response = await fetch('/api/data')
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Failed to fetch data:', error)
  }
}
\`\`\`

## Benefits
- More readable than promise chains
- Better error handling
- Easier debugging
  `

  try {
    const judgment = await service.judgeExplanation({
      explanation,
      rubric,
      topic: 'async/await',
      context: 'JavaScript fundamentals course'
    })

    console.log('Explanation Judgment Result:')
    console.log('Pass:', judgment.pass)
    console.log('Total Score:', judgment.totalScore)
    console.log('Individual Scores:', judgment.scores)
    console.log('Feedback:', judgment.feedback)
    
    return judgment
  } catch (error) {
    console.error('Failed to judge explanation:', error)
    throw error
  }
}

// Example: Judging a template kata
async function judgeTemplateExample() {
  const service = createAIJudgeService()
  
  const rubric: Rubric = {
    keys: ['structure', 'completeness', 'best_practices', 'documentation', 'functionality'],
    threshold: {
      min_total: 75,
      min_correctness: 70
    }
  }

  const templateContent = `
# Express.js API Template

## Project Structure
\`\`\`
src/
  controllers/
    userController.js
  middleware/
    auth.js
    errorHandler.js
  models/
    User.js
  routes/
    users.js
  app.js
  server.js
package.json
.env.example
README.md
\`\`\`

## Main Application (app.js)
\`\`\`javascript
const express = require('express')
const cors = require('cors')
const userRoutes = require('./routes/users')
const errorHandler = require('./middleware/errorHandler')

const app = express()

app.use(cors())
app.use(express.json())
app.use('/api/users', userRoutes)
app.use(errorHandler)

module.exports = app
\`\`\`

## Package.json
\`\`\`json
{
  "name": "express-api-template",
  "version": "1.0.0",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.0",
    "jest": "^29.0.0"
  }
}
\`\`\`

## Setup Instructions
1. Clone the repository
2. Run \`npm install\`
3. Copy \`.env.example\` to \`.env\` and configure
4. Run \`npm run dev\` to start development server
  `

  try {
    const judgment = await service.judgeTemplate({
      templateContent,
      rubric,
      templateType: 'Express.js REST API',
      expectedStructure: {
        folders: ['src', 'controllers', 'routes', 'middleware'],
        files: ['package.json', 'README.md', '.env.example'],
        patterns: ['MVC structure', 'error handling', 'middleware']
      },
      context: 'Node.js backend development template for REST APIs'
    })

    console.log('Template Judgment Result:')
    console.log('Pass:', judgment.pass)
    console.log('Total Score:', judgment.totalScore)
    console.log('Individual Scores:', judgment.scores)
    console.log('Feedback:', judgment.feedback)
    
    return judgment
  } catch (error) {
    console.error('Failed to judge template:', error)
    throw error
  }
}

// Example: Error handling
async function errorHandlingExample() {
  const service = new AIJudgeService({
    apiKey: 'invalid-key', // This will cause an error
    maxRetries: 1
  })
  
  const rubric: Rubric = {
    keys: ['clarity'],
    threshold: { min_total: 70, min_correctness: 60 }
  }

  try {
    await service.judgeExplanation({
      explanation: 'Test explanation',
      rubric
    })
  } catch (error) {
    console.log('Expected error caught:', (error as Error).message)
    
    // The service provides structured error responses
    // that can be used to show user-friendly messages
    if ((error as any).retryable) {
      console.log('This error is retryable - could try again later')
    } else {
      console.log('This error is not retryable - likely a configuration issue')
    }
  }
}

// Example: Using the validation utility
function validationExample() {
  const service = createAIJudgeService()
  
  // Test valid response
  const validResponse = JSON.stringify({
    scores: { clarity: 85, correctness: 90 },
    feedback: 'Good explanation with clear examples'
  })
  
  const validResult = service.validateResponse(validResponse)
  console.log('Valid response result:', validResult)
  
  // Test invalid response
  const invalidResponse = 'This is not JSON'
  const invalidResult = service.validateResponse(invalidResponse)
  console.log('Invalid response result:', invalidResult) // Should be null
}

// Export examples for potential use in documentation or testing
export {
  createAIJudgeService,
  judgeExplanationExample,
  judgeTemplateExample,
  errorHandlingExample,
  validationExample
}

// Example usage patterns:
/*

// Basic explanation judging
const service = createAIJudgeService()
const result = await service.judgeExplanation({
  explanation: userSubmission,
  rubric: kataRubric,
  topic: 'recursion'
})

// Template judging with structure validation
const templateResult = await service.judgeTemplate({
  templateContent: userTemplate,
  rubric: templateRubric,
  templateType: 'React Component',
  expectedStructure: { folders: ['src'], files: ['package.json'] }
})

// Error handling
try {
  const result = await service.judgeExplanation(request)
  // Handle successful judgment
} catch (error) {
  if (error.retryable) {
    // Show retry option to user
  } else {
    // Show configuration error message
  }
}

*/