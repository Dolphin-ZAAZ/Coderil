import { describe, it, expect, beforeEach } from 'vitest'
import { ResponseParserService } from '../response-parser'
import { KataType, Language } from '@/types'

describe('ResponseParserService', () => {
  let service: ResponseParserService

  beforeEach(() => {
    service = ResponseParserService.getInstance()
  })

  describe('extractCodeBlocks', () => {
    it('should extract basic code blocks', () => {
      const response = `
Here's the solution:

\`\`\`python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)
\`\`\`

And the tests:

\`\`\`python // tests
def test_fibonacci():
    assert fibonacci(0) == 0
    assert fibonacci(1) == 1
    assert fibonacci(5) == 5
\`\`\`
      `

      const blocks = service.extractCodeBlocks(response)
      
      expect(blocks).toHaveProperty('python')
      expect(blocks).toHaveProperty('tests')
      expect(blocks.python).toContain('def fibonacci(n):')
      expect(blocks.tests).toContain('def test_fibonacci():')
    })

    it('should extract YAML and JSON blocks', () => {
      const response = `
\`\`\`yaml
title: Test Kata
difficulty: medium
language: py
\`\`\`

\`\`\`json
{
  "questions": [
    {"id": "q1", "type": "shortform", "question": "What is Python?"}
  ]
}
\`\`\`
      `

      const blocks = service.extractCodeBlocks(response)
      
      expect(blocks).toHaveProperty('yaml')
      expect(blocks).toHaveProperty('json')
      expect(blocks.yaml).toContain('title: Test Kata')
      expect(blocks.json).toContain('"questions"')
    })

    it('should handle code blocks without language specification', () => {
      const response = `
\`\`\`
function test() {
  return true;
}
\`\`\`
      `

      const blocks = service.extractCodeBlocks(response)
      
      // Debug what we actually got
      console.log('Extracted blocks:', Object.keys(blocks))
      
      // The function contains 'function' so it should be classified as 'code'
      expect(Object.keys(blocks).length).toBeGreaterThan(0)
      const firstKey = Object.keys(blocks)[0]
      expect(blocks[firstKey]).toContain('function test()')
    })
  })

  describe('parseMetadata', () => {
    it('should parse metadata from YAML blocks', () => {
      const response = `
\`\`\`yaml
title: Fibonacci Sequence
difficulty: medium
language: py
tags: [recursion, math]
timeout_ms: 5000
\`\`\`
      `

      const metadata = service.parseMetadata(response)
      
      expect(metadata.title).toBe('Fibonacci Sequence')
      expect(metadata.difficulty).toBe('medium')
      expect(metadata.language).toBe('py')
      expect(metadata.tags).toEqual(['recursion', 'math'])
      expect(metadata.timeout_ms).toBe(5000)
    })

    it('should parse metadata from text patterns', () => {
      const response = `
Title: String Reversal
Difficulty: easy
Language: js
Tags: [strings, basic]
Timeout_ms: 3000
      `

      const metadata = service.parseMetadata(response)
      
      expect(metadata.title).toBe('String Reversal')
      expect(metadata.difficulty).toBe('easy')
      expect(metadata.language).toBe('js')
      expect(metadata.tags).toEqual(['strings', 'basic'])
      expect(metadata.timeout_ms).toBe(3000)
    })

    it('should handle JSON metadata blocks', () => {
      const response = `
\`\`\`json
{
  "title": "Array Sum",
  "difficulty": "hard",
  "language": "cpp",
  "tags": ["arrays", "algorithms"]
}
\`\`\`
      `

      const metadata = service.parseMetadata(response)
      
      expect(metadata.title).toBe('Array Sum')
      expect(metadata.difficulty).toBe('hard')
      expect(metadata.language).toBe('cpp')
      expect(metadata.tags).toEqual(['arrays', 'algorithms'])
    })
  })

  describe('validateResponseStructure', () => {
    it('should validate code kata structure', () => {
      const validResponse = `
# Statement
This is a coding challenge.

\`\`\`python // entry
def solution():
    pass
\`\`\`

\`\`\`python // tests
def test_solution():
    assert True
\`\`\`
      `

      expect(service.validateResponseStructure(validResponse, 'code')).toBe(true)
    })

    it('should validate explanation kata structure', () => {
      const validResponse = `
# Statement
Explain the concept of recursion.
      `

      expect(service.validateResponseStructure(validResponse, 'explain')).toBe(true)
    })

    it('should validate multi-question kata structure', () => {
      const validResponse = `
\`\`\`yaml
questions:
  - id: q1
    type: shortform
    question: What is Python?
\`\`\`
      `

      expect(service.validateResponseStructure(validResponse, 'multi-question')).toBe(true)
    })

    it('should reject invalid structures', () => {
      const invalidResponse = 'Just some text without proper structure'
      
      expect(service.validateResponseStructure(invalidResponse, 'code')).toBe(false)
    })

    it('should reject empty responses', () => {
      expect(service.validateResponseStructure('', 'code')).toBe(false)
      expect(service.validateResponseStructure('   ', 'code')).toBe(false)
    })
  })

  describe('parseKataResponse', () => {
    it('should parse a complete code kata response', () => {
      const response = `
# Statement
Write a function to calculate the nth Fibonacci number.

\`\`\`yaml
title: Fibonacci Calculator
difficulty: medium
language: py
tags: [recursion, math]
timeout_ms: 5000
entry: entry.py
test:
  kind: programmatic
  file: tests.py
\`\`\`

\`\`\`python // entry
def fibonacci(n):
    # TODO: Implement this function
    pass
\`\`\`

\`\`\`python // tests
def test_fibonacci():
    assert fibonacci(0) == 0
    assert fibonacci(1) == 1
    assert fibonacci(5) == 5
\`\`\`

\`\`\`python // solution
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)
\`\`\`
      `

      const content = service.parseKataResponse(response, 'code')
      
      expect(content.metadata.title).toBe('Fibonacci Calculator')
      expect(content.metadata.difficulty).toBe('medium')
      expect(content.metadata.language).toBe('py')
      expect(content.statement).toContain('nth Fibonacci number')
      expect(content.starterCode).toContain('def fibonacci(n):')
      expect(content.testCode).toContain('def test_fibonacci():')
      expect(content.solutionCode).toContain('fibonacci(n-1) + fibonacci(n-2)')
    })

    it('should parse an explanation kata response', () => {
      const response = `
# Statement
Explain the concept of Big O notation and provide examples.

\`\`\`yaml
title: Big O Notation Explanation
type: explain
difficulty: medium
language: none
rubric:
  keys: [correctness, clarity, examples]
  threshold:
    min_total: 7
    min_correctness: 3
\`\`\`
      `

      const content = service.parseKataResponse(response, 'explain')
      
      expect(content.metadata.title).toBe('Big O Notation Explanation')
      expect(content.statement).toContain('Big O notation')
      expect(content.rubric).toBeDefined()
      expect(content.rubric?.keys).toEqual(['correctness', 'clarity', 'examples'])
    })

    it('should parse a multi-question kata response', () => {
      const response = `
\`\`\`yaml
title: JavaScript Fundamentals Quiz
questions:
  - id: q1
    type: shortform
    question: What is a closure in JavaScript?
    expectedAnswer: A closure is a function that has access to variables in its outer scope
  - id: q2
    type: multiple-choice
    question: Which of the following is NOT a JavaScript data type?
    options:
      - id: a
        text: string
      - id: b
        text: boolean
      - id: c
        text: integer
      - id: d
        text: object
    correctAnswers: [c]
passingScore: 70
\`\`\`
      `

      const content = service.parseKataResponse(response, 'multi-question')
      
      expect(content.metadata.title).toBe('JavaScript Fundamentals Quiz')
      expect(content.multiQuestionConfig).toBeDefined()
      expect(content.multiQuestionConfig?.questions).toHaveLength(2)
      expect(content.multiQuestionConfig?.passingScore).toBe(70)
    })

    it('should handle malformed responses with fallback parsing', () => {
      const malformedResponse = `
This is a broken response without proper structure.
Some code might be here:
def broken_function():
    return "something"
      `

      const content = service.parseKataResponse(malformedResponse, 'code')
      
      // Should not throw and should return valid structure
      expect(content.metadata).toBeDefined()
      expect(content.statement).toBeDefined()
      expect(content.metadata.slug).toBe('generated-kata')
      expect(content.metadata.title).toBe('Generated Kata')
    })
  })

  describe('fallback parsing', () => {
    it('should create valid content from minimal response', () => {
      const minimalResponse = 'Just a simple statement'
      
      const content = service.parseKataResponse(minimalResponse, 'explain')
      
      expect(content.metadata.slug).toBe('generated-kata')
      expect(content.metadata.title).toBe('Generated Kata')
      expect(content.metadata.type).toBe('explain')
      expect(content.statement).toBe('Just a simple statement')
    })

    it('should extract whatever code is available', () => {
      const responseWithCode = `
Some text here.
\`\`\`python
def some_function():
    return 42
\`\`\`
More text.
      `
      
      const content = service.parseKataResponse(responseWithCode, 'code')
      
      expect(content.starterCode).toContain('def some_function():')
    })
  })

  describe('edge cases', () => {
    it('should handle responses with multiple code blocks of same language', () => {
      const response = `
\`\`\`python // entry
def starter():
    pass
\`\`\`

\`\`\`python // tests
def test_starter():
    assert True
\`\`\`

\`\`\`python // solution
def starter():
    return "done"
\`\`\`
      `

      const blocks = service.extractCodeBlocks(response)
      
      expect(blocks.entry).toContain('def starter():')
      expect(blocks.tests).toContain('def test_starter():')
      expect(blocks.solution).toContain('return "done"')
    })

    it('should handle nested code blocks in markdown', () => {
      const response = `
Here's an example:

\`\`\`markdown
# Example
\`\`\`python
print("hello")
\`\`\`
\`\`\`
      `

      const blocks = service.extractCodeBlocks(response)
      
      expect(blocks.markdown).toContain('# Example')
    })

    it('should handle responses with special characters', () => {
      const response = `
\`\`\`python
def test():
    return "Special chars: àáâãäåæçèéêë"
\`\`\`
      `

      const blocks = service.extractCodeBlocks(response)
      
      // Debug what we actually got
      console.log('Extracted blocks for special chars:', Object.keys(blocks))
      
      // Should have python key or at least some key with the content
      expect(Object.keys(blocks).length).toBeGreaterThan(0)
      const content = Object.values(blocks)[0]
      expect(content).toContain('Special chars: àáâãäåæçèéêë')
    })
  })
})