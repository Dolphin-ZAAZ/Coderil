import { describe, it, expect, beforeEach } from 'vitest'
import { ResponseParserService } from '../response-parser'
import { Language, KataType, Difficulty } from '@/types'

describe('ResponseParserService - Comprehensive Tests', () => {
  let service: ResponseParserService

  beforeEach(() => {
    service = ResponseParserService.getInstance()
  })

  describe('Code Kata Response Parsing', () => {
    it('should parse complete Python code kata response', () => {
      const response = `\`\`\`yaml
slug: reverse-string
title: "Reverse String"
language: py
type: code
difficulty: easy
tags: [strings, algorithms]
entry: entry.py
test:
  kind: programmatic
  file: tests.py
timeout_ms: 5000
\`\`\`

# Reverse String

Create a function that reverses a string.

## Examples

\`\`\`python
reverse_string("hello") # Returns "olleh"
reverse_string("") # Returns ""
\`\`\`

\`\`\`python
def reverse_string(s):
    # TODO: implement
    pass
\`\`\`

\`\`\`python
def test_reverse_string():
    assert reverse_string("hello") == "olleh"
    assert reverse_string("") == ""
    assert reverse_string("a") == "a"
\`\`\`

\`\`\`python
def test_hidden_cases():
    assert reverse_string("12345") == "54321"
    assert reverse_string("  spaces  ") == "  secaps  "
\`\`\`

\`\`\`python
def reverse_string(s):
    return s[::-1]
\`\`\``

      const result = service.parseKataResponse(response)

      expect(result.metadata.slug).toBe('reverse-string')
      expect(result.metadata.title).toBe('Reverse String')
      expect(result.metadata.language).toBe('py')
      expect(result.metadata.type).toBe('code')
      expect(result.metadata.difficulty).toBe('easy')
      expect(result.metadata.tags).toEqual(['strings', 'algorithms'])
      expect(result.metadata.entry).toBe('entry.py')
      expect(result.metadata.test).toEqual({ kind: 'programmatic', file: 'tests.py' })
      expect(result.metadata.timeout_ms).toBe(5000)

      expect(result.statement).toContain('# Reverse String')
      expect(result.statement).toContain('Create a function that reverses a string')
      expect(result.statement).toContain('## Examples')

      expect(result.starterCode).toContain('def reverse_string(s):')
      expect(result.starterCode).toContain('# TODO: implement')

      expect(result.testCode).toContain('def test_reverse_string():')
      expect(result.testCode).toContain('assert reverse_string("hello") == "olleh"')

      expect(result.hiddenTestCode).toContain('def test_hidden_cases():')
      expect(result.hiddenTestCode).toContain('assert reverse_string("12345") == "54321"')

      expect(result.solutionCode).toContain('def reverse_string(s):')
      expect(result.solutionCode).toContain('return s[::-1]')
    })

    it('should parse JavaScript code kata with package.json', () => {
      const response = `\`\`\`yaml
slug: array-sum
title: "Array Sum"
language: js
type: code
difficulty: easy
tags: [arrays, math]
entry: entry.js
test:
  kind: programmatic
  file: tests.js
\`\`\`

# Array Sum

Calculate the sum of all numbers in an array.

\`\`\`javascript
function arraySum(numbers) {
  // TODO: implement
  return 0;
}
\`\`\`

\`\`\`javascript
const assert = require('assert');

function test_arraySum() {
  assert.strictEqual(arraySum([1, 2, 3]), 6);
  assert.strictEqual(arraySum([]), 0);
}

test_arraySum();
\`\`\`

\`\`\`javascript
function arraySum(numbers) {
  return numbers.reduce((sum, num) => sum + num, 0);
}
\`\`\`

\`\`\`json
{
  "name": "array-sum-kata",
  "version": "1.0.0",
  "scripts": {
    "test": "node tests.js"
  },
  "dependencies": {}
}
\`\`\``

      const result = service.parseKataResponse(response)

      expect(result.metadata.language).toBe('js')
      expect(result.starterCode).toContain('function arraySum(numbers)')
      expect(result.testCode).toContain('assert.strictEqual')
      expect(result.solutionCode).toContain('reduce')
      expect(result.solutionFiles).toBeDefined()
      expect(result.solutionFiles!['package.json']).toContain('"name": "array-sum-kata"')
    })

    it('should parse C++ code kata', () => {
      const response = `\`\`\`yaml
slug: fibonacci-cpp
title: "Fibonacci in C++"
language: cpp
type: code
difficulty: medium
tags: [algorithms, recursion]
entry: entry.cpp
test:
  kind: programmatic
  file: tests.cpp
\`\`\`

# Fibonacci in C++

Implement the Fibonacci sequence.

\`\`\`cpp
#include <iostream>

int fibonacci(int n) {
    // TODO: implement
    return 0;
}
\`\`\`

\`\`\`cpp
#include <cassert>

int main() {
    assert(fibonacci(0) == 0);
    assert(fibonacci(1) == 1);
    assert(fibonacci(5) == 5);
    return 0;
}
\`\`\`

\`\`\`cpp
#include <iostream>

int fibonacci(int n) {
    if (n <= 1) return n;
    return fibonacci(n-1) + fibonacci(n-2);
}
\`\`\``

      const result = service.parseKataResponse(response)

      expect(result.metadata.language).toBe('cpp')
      expect(result.starterCode).toContain('#include <iostream>')
      expect(result.testCode).toContain('#include <cassert>')
      expect(result.solutionCode).toContain('fibonacci(n-1) + fibonacci(n-2)')
    })
  })

  describe('Multi-Question Kata Response Parsing', () => {
    it('should parse complete multi-question kata', () => {
      const response = `\`\`\`yaml
slug: js-fundamentals-quiz
title: "JavaScript Fundamentals Quiz"
language: none
type: multi-question
difficulty: medium
tags: [javascript, fundamentals, quiz]
\`\`\`

# JavaScript Fundamentals Quiz

Test your knowledge of JavaScript fundamentals with this comprehensive assessment.

\`\`\`json
{
  "title": "JavaScript Fundamentals Assessment",
  "description": "Test your JavaScript knowledge with multiple question types",
  "passingScore": 70,
  "showProgressBar": true,
  "allowReview": true,
  "questions": [
    {
      "id": "q1",
      "type": "multiple-choice",
      "question": "Which of the following are JavaScript data types?",
      "allowMultiple": true,
      "options": [
        {"id": "a", "text": "string"},
        {"id": "b", "text": "number"},
        {"id": "c", "text": "integer"},
        {"id": "d", "text": "boolean"},
        {"id": "e", "text": "undefined"}
      ],
      "correctAnswers": ["a", "b", "d", "e"],
      "points": 3,
      "explanation": "JavaScript has string, number, boolean, and undefined as primitive data types. There is no separate integer type."
    },
    {
      "id": "q2",
      "type": "shortform",
      "question": "What does 'DOM' stand for?",
      "acceptableAnswers": ["Document Object Model", "document object model"],
      "caseSensitive": false,
      "maxLength": 50,
      "points": 2,
      "explanation": "DOM stands for Document Object Model, which represents the structure of HTML documents."
    },
    {
      "id": "q3",
      "type": "code",
      "question": "Write a function that returns the sum of two numbers",
      "language": "js",
      "starterCode": "function sum(a, b) {\\n  // TODO: implement\\n}",
      "testCode": "console.assert(sum(2, 3) === 5);\\nconsole.assert(sum(-1, 1) === 0);",
      "points": 5,
      "explanation": "A simple addition function that takes two parameters and returns their sum."
    },
    {
      "id": "q4",
      "type": "explanation",
      "question": "Explain the difference between 'let' and 'var' in JavaScript",
      "minLength": 50,
      "maxLength": 200,
      "points": 4,
      "rubric": {
        "criteria": [
          {"name": "accuracy", "weight": 0.4, "threshold": 0.7},
          {"name": "clarity", "weight": 0.3, "threshold": 0.6},
          {"name": "completeness", "weight": 0.3, "threshold": 0.6}
        ]
      },
      "explanation": "Should cover scope differences, hoisting behavior, and temporal dead zone."
    }
  ]
}
\`\`\``

      const result = service.parseKataResponse(response)

      expect(result.metadata.type).toBe('multi-question')
      expect(result.multiQuestionConfig).toBeDefined()
      expect(result.multiQuestionConfig!.title).toBe('JavaScript Fundamentals Assessment')
      expect(result.multiQuestionConfig!.passingScore).toBe(70)
      expect(result.multiQuestionConfig!.questions).toHaveLength(4)

      const questions = result.multiQuestionConfig!.questions
      
      // Multiple choice question
      expect(questions[0].type).toBe('multiple-choice')
      expect(questions[0].allowMultiple).toBe(true)
      expect(questions[0].options).toHaveLength(5)
      expect(questions[0].correctAnswers).toEqual(['a', 'b', 'd', 'e'])

      // Shortform question
      expect(questions[1].type).toBe('shortform')
      expect(questions[1].acceptableAnswers).toEqual(['Document Object Model', 'document object model'])
      expect(questions[1].caseSensitive).toBe(false)

      // Code question
      expect(questions[2].type).toBe('code')
      expect(questions[2].language).toBe('js')
      expect(questions[2].starterCode).toContain('function sum(a, b)')

      // Explanation question
      expect(questions[3].type).toBe('explanation')
      expect(questions[3].rubric).toBeDefined()
      expect(questions[3].rubric!.criteria).toHaveLength(3)
    })

    it('should parse shortform-only multi-question kata', () => {
      const response = `\`\`\`yaml
slug: quick-facts
title: "Quick Facts Quiz"
language: none
type: multi-question
difficulty: easy
tags: [facts, quick]
\`\`\`

# Quick Facts Quiz

Answer these quick questions.

\`\`\`json
{
  "title": "Quick Facts",
  "description": "Short answer questions",
  "passingScore": 60,
  "questions": [
    {
      "id": "q1",
      "type": "shortform",
      "question": "What is the capital of France?",
      "acceptableAnswers": ["Paris", "paris"],
      "caseSensitive": false,
      "points": 1
    },
    {
      "id": "q2",
      "type": "shortform",
      "question": "What is 2 + 2?",
      "acceptableAnswers": ["4", "four"],
      "caseSensitive": false,
      "points": 1
    }
  ]
}
\`\`\``

      const result = service.parseKataResponse(response)

      expect(result.multiQuestionConfig!.questions).toHaveLength(2)
      expect(result.multiQuestionConfig!.questions.every(q => q.type === 'shortform')).toBe(true)
    })
  })

  describe('Explanation Kata Response Parsing', () => {
    it('should parse explanation kata with rubric', () => {
      const response = `\`\`\`yaml
slug: explain-recursion
title: "Explain Recursion"
language: none
type: explain
difficulty: medium
tags: [concepts, recursion]
\`\`\`

# Explain Recursion

Explain the concept of recursion in programming, including its benefits and potential drawbacks.

\`\`\`yaml
criteria:
  - name: accuracy
    weight: 0.4
    threshold: 0.7
    description: "Technical accuracy of the explanation"
  - name: clarity
    weight: 0.3
    threshold: 0.6
    description: "Clarity and readability of the explanation"
  - name: completeness
    weight: 0.2
    threshold: 0.6
    description: "Coverage of key concepts"
  - name: examples
    weight: 0.1
    threshold: 0.5
    description: "Quality of examples provided"
\`\`\`

\`\`\`markdown
# Sample Solution

Recursion is a programming technique where a function calls itself to solve a problem. It consists of two main components:

1. **Base case**: A condition that stops the recursion
2. **Recursive case**: The function calling itself with modified parameters

## Benefits:
- Elegant solutions for problems with recursive structure
- Cleaner code for tree/graph traversals
- Natural fit for mathematical sequences

## Drawbacks:
- Can be memory intensive due to call stack
- Risk of stack overflow with deep recursion
- Sometimes less efficient than iterative solutions

## Example:
\`\`\`python
def factorial(n):
    if n <= 1:  # Base case
        return 1
    return n * factorial(n - 1)  # Recursive case
\`\`\`
\`\`\``

      const result = service.parseKataResponse(response)

      expect(result.metadata.type).toBe('explain')
      expect(result.rubric).toBeDefined()
      expect(result.rubric!.criteria).toHaveLength(4)
      expect(result.rubric!.criteria[0].name).toBe('accuracy')
      expect(result.rubric!.criteria[0].weight).toBe(0.4)
      expect(result.solutionCode).toContain('# Sample Solution')
      expect(result.solutionCode).toContain('Recursion is a programming technique')
    })
  })

  describe('Template Kata Response Parsing', () => {
    it('should parse template kata with multiple files', () => {
      const response = `\`\`\`yaml
slug: react-component-template
title: "React Component Template"
language: js
type: template
difficulty: medium
tags: [react, components, template]
\`\`\`

# React Component Template

Create a complete React component with tests and documentation.

\`\`\`jsx
// src/Button.jsx
import React from 'react';
import PropTypes from 'prop-types';
import './Button.css';

const Button = ({ children, variant = 'primary', onClick, disabled = false }) => {
  return (
    <button 
      className={\`btn btn-\${variant}\`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

Button.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger']),
  onClick: PropTypes.func,
  disabled: PropTypes.bool
};

export default Button;
\`\`\`

\`\`\`css
/* src/Button.css */
.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-danger {
  background-color: #dc3545;
  color: white;
}

.btn:hover:not(:disabled) {
  opacity: 0.8;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
\`\`\`

\`\`\`jsx
// src/Button.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import Button from './Button';

describe('Button', () => {
  test('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  test('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('applies variant class', () => {
    render(<Button variant="danger">Delete</Button>);
    expect(screen.getByText('Delete')).toHaveClass('btn-danger');
  });
});
\`\`\`

\`\`\`json
{
  "name": "react-button-component",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.0.0",
    "prop-types": "^15.8.0"
  },
  "devDependencies": {
    "@testing-library/react": "^13.0.0",
    "@testing-library/jest-dom": "^5.16.0",
    "jest": "^28.0.0"
  },
  "scripts": {
    "test": "jest"
  }
}
\`\`\`

\`\`\`markdown
# Button Component

A reusable React button component with multiple variants.

## Usage

\`\`\`jsx
import Button from './Button';

function App() {
  return (
    <div>
      <Button variant="primary" onClick={() => console.log('Primary clicked')}>
        Primary Button
      </Button>
      <Button variant="secondary">Secondary Button</Button>
      <Button variant="danger" disabled>Disabled Button</Button>
    </div>
  );
}
\`\`\`

## Props

- \`children\` (required): Button content
- \`variant\`: Button style variant ('primary', 'secondary', 'danger')
- \`onClick\`: Click handler function
- \`disabled\`: Whether the button is disabled
\`\`\``

      const result = service.parseKataResponse(response)

      expect(result.metadata.type).toBe('template')
      expect(result.solutionFiles).toBeDefined()
      expect(Object.keys(result.solutionFiles!)).toHaveLength(5)
      expect(result.solutionFiles!['src/Button.jsx']).toContain('const Button = ({')
      expect(result.solutionFiles!['src/Button.css']).toContain('.btn {')
      expect(result.solutionFiles!['src/Button.test.jsx']).toContain('describe(\'Button\'')
      expect(result.solutionFiles!['package.json']).toContain('"react": "^18.0.0"')
      expect(result.solutionFiles!['README.md']).toContain('# Button Component')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed YAML metadata', () => {
      const response = `\`\`\`yaml
slug: test-kata
title: "Test Kata
language: py
type: code
\`\`\`

# Test Kata

Test content.`

      expect(() => service.parseKataResponse(response)).toThrow()
    })

    it('should handle missing code blocks', () => {
      const response = `\`\`\`yaml
slug: incomplete-kata
title: "Incomplete Kata"
language: py
type: code
difficulty: easy
\`\`\`

# Incomplete Kata

This kata is missing code blocks.`

      const result = service.parseKataResponse(response)

      expect(result.metadata.slug).toBe('incomplete-kata')
      expect(result.starterCode).toBe('')
      expect(result.testCode).toBe('')
      expect(result.solutionCode).toBe('')
    })

    it('should handle malformed JSON in multi-question config', () => {
      const response = `\`\`\`yaml
slug: malformed-quiz
title: "Malformed Quiz"
language: none
type: multi-question
difficulty: easy
\`\`\`

# Malformed Quiz

Test quiz.

\`\`\`json
{
  "title": "Test Quiz",
  "questions": [
    {
      "id": "q1",
      "type": "shortform",
      "question": "Test question?"
      // Missing comma and other fields
    }
  ]
}
\`\`\``

      expect(() => service.parseKataResponse(response)).toThrow()
    })

    it('should handle empty response', () => {
      expect(() => service.parseKataResponse('')).toThrow()
    })

    it('should handle response with only metadata', () => {
      const response = `\`\`\`yaml
slug: metadata-only
title: "Metadata Only"
language: py
type: code
difficulty: easy
\`\`\``

      const result = service.parseKataResponse(response)

      expect(result.metadata.slug).toBe('metadata-only')
      expect(result.statement).toBe('')
      expect(result.starterCode).toBe('')
    })

    it('should handle mixed language code blocks', () => {
      const response = `\`\`\`yaml
slug: mixed-languages
title: "Mixed Languages"
language: py
type: code
difficulty: easy
\`\`\`

# Mixed Languages

Test with multiple languages.

\`\`\`python
def python_function():
    pass
\`\`\`

\`\`\`javascript
function jsFunction() {
  return true;
}
\`\`\`

\`\`\`python
def test_function():
    assert python_function() is None
\`\`\`

\`\`\`python
def python_function():
    return "solution"
\`\`\``

      const result = service.parseKataResponse(response)

      // Should prioritize Python code blocks for Python kata
      expect(result.starterCode).toContain('def python_function():')
      expect(result.starterCode).toContain('pass')
      expect(result.testCode).toContain('def test_function():')
      expect(result.solutionCode).toContain('return "solution"')
    })

    it('should handle very large responses', () => {
      const largeStatement = '# Large Kata\n\n' + 'This is a very long statement. '.repeat(1000)
      const largeCode = 'def function():\n' + '    pass\n'.repeat(1000)
      
      const response = `\`\`\`yaml
slug: large-kata
title: "Large Kata"
language: py
type: code
difficulty: easy
\`\`\`

${largeStatement}

\`\`\`python
${largeCode}
\`\`\`

\`\`\`python
def test():
    assert True
\`\`\`

\`\`\`python
${largeCode}
\`\`\``

      const result = service.parseKataResponse(response)

      expect(result.metadata.slug).toBe('large-kata')
      expect(result.statement.length).toBeGreaterThan(10000)
      expect(result.starterCode.length).toBeGreaterThan(10000)
    })

    it('should handle unicode and special characters', () => {
      const response = `\`\`\`yaml
slug: unicode-kata
title: "Unicode Test 中文 🚀"
language: py
type: code
difficulty: easy
tags: [unicode, 中文]
\`\`\`

# Unicode Test 中文 🚀

Handle unicode characters: àáâãäåæçèéêë ñ 中文 🚀

\`\`\`python
def process_unicode(text):
    # Handle unicode: 中文 🚀
    pass
\`\`\`

\`\`\`python
def test_unicode():
    assert process_unicode("中文") is not None
\`\`\`

\`\`\`python
def process_unicode(text):
    return f"Processed: {text} 🚀"
\`\`\``

      const result = service.parseKataResponse(response)

      expect(result.metadata.title).toBe('Unicode Test 中文 🚀')
      expect(result.metadata.tags).toContain('中文')
      expect(result.statement).toContain('中文 🚀')
      expect(result.starterCode).toContain('# Handle unicode: 中文 🚀')
      expect(result.solutionCode).toContain('🚀')
    })
  })

  describe('Code Block Language Detection', () => {
    it('should detect and extract code blocks by language', () => {
      const response = `\`\`\`yaml
slug: multi-lang-test
title: "Multi Language Test"
language: js
type: code
difficulty: easy
\`\`\`

# Multi Language Test

\`\`\`javascript
function starter() {
  // TODO
}
\`\`\`

\`\`\`js
function test() {
  assert(starter() !== undefined);
}
\`\`\`

\`\`\`typescript
function solution(): string {
  return "solution";
}
\`\`\`

\`\`\`python
# This should be ignored for JS kata
def python_function():
    pass
\`\`\``

      const result = service.parseKataResponse(response)

      expect(result.starterCode).toContain('function starter()')
      expect(result.testCode).toContain('function test()')
      expect(result.solutionCode).toContain('function solution()')
      expect(result.solutionCode).not.toContain('def python_function')
    })

    it('should handle code blocks without language specification', () => {
      const response = `\`\`\`yaml
slug: no-lang-test
title: "No Language Test"
language: py
type: code
difficulty: easy
\`\`\`

# No Language Test

\`\`\`
def starter():
    pass
\`\`\`

\`\`\`
def test():
    assert starter() is None
\`\`\`

\`\`\`
def starter():
    return "solution"
\`\`\``

      const result = service.parseKataResponse(response)

      expect(result.starterCode).toContain('def starter():')
      expect(result.starterCode).toContain('pass')
      expect(result.testCode).toContain('def test():')
      expect(result.solutionCode).toContain('return "solution"')
    })
  })
})