import { PromptExample } from './prompt-engine'

export const codeKataExamples: PromptExample[] = [
  {
    input: "Create a beginner Python function that finds the maximum number in a list",
    output: `\`\`\`yaml
# meta.yaml
slug: find-maximum-number
title: "Find Maximum Number"
language: py
type: "code"
difficulty: "beginner"
testKind: "programmatic"
tags: [arrays, basic-algorithms]
\`\`\`

\`\`\`markdown
# statement.md
# Find Maximum Number

Write a function that finds the maximum number in a list of integers.

## Requirements
- Function should be named \`find_max\`
- Accept a list of integers as parameter
- Return the maximum number in the list
- Handle empty lists by returning None

## Examples
\`\`\`
Input: [1, 3, 2, 8, 5]
Output: 8

Input: [-1, -5, -2]
Output: -1

Input: []
Output: None
\`\`\`

## Notes
You may assume the input list contains only integers.
\`\`\`

\`\`\`py
# entry.py
def find_max(numbers):
    """
    Find the maximum number in a list of integers.
    
    Args:
        numbers (list): List of integers
        
    Returns:
        int or None: Maximum number or None if list is empty
    """
    # TODO: Implement this function
    pass
\`\`\`

\`\`\`py
# tests.py
import pytest
from entry import find_max

def test_find_max_basic():
    assert find_max([1, 3, 2, 8, 5]) == 8

def test_find_max_negative():
    assert find_max([-1, -5, -2]) == -1

def test_find_max_single():
    assert find_max([42]) == 42

def test_find_max_empty():
    assert find_max([]) is None
\`\`\`

\`\`\`py
# hidden_tests.py
import pytest
from entry import find_max

def test_find_max_duplicates():
    assert find_max([5, 5, 5]) == 5

def test_find_max_large_numbers():
    assert find_max([1000000, 999999, 1000001]) == 1000001

def test_find_max_mixed_positive_negative():
    assert find_max([-10, 5, -3, 0, 2]) == 5

def test_find_max_all_negative():
    assert find_max([-1, -2, -3, -4]) == -1
\`\`\`

\`\`\`py
# solution.py
def find_max(numbers):
    """
    Find the maximum number in a list of integers.
    
    Args:
        numbers (list): List of integers
        
    Returns:
        int or None: Maximum number or None if list is empty
    """
    if not numbers:
        return None
    
    max_num = numbers[0]
    for num in numbers[1:]:
        if num > max_num:
            max_num = num
    
    return max_num
\`\`\``
  }
]

export const explanationKataExamples: PromptExample[] = [
  {
    input: "Explain how binary search works for intermediate level",
    output: `\`\`\`yaml
# meta.yaml
slug: explain-binary-search
title: "Explain Binary Search Algorithm"
language: md
type: "explain"
difficulty: "intermediate"
testKind: "none"
tags: [algorithms, searching, divide-and-conquer]
\`\`\`

\`\`\`markdown
# statement.md
# Explain Binary Search Algorithm

## Task
Explain how the binary search algorithm works, including its implementation, time complexity, and when to use it.

## Requirements
Your explanation should cover:
- The basic concept and how binary search works
- Step-by-step process with an example
- Time and space complexity analysis
- Prerequisites (why the array must be sorted)
- Advantages and disadvantages compared to linear search
- Common use cases and variations

## Format
Write your explanation in the explanation.md file. Your response should be:
- Clear and well-structured with appropriate headings
- Include a concrete example with step-by-step walkthrough
- Explain the algorithm's efficiency and complexity
- Appropriate for someone with intermediate programming knowledge

## Evaluation Criteria
Your explanation will be evaluated on:
- Technical accuracy and correctness
- Clarity of explanation and logical flow
- Effective use of examples and illustrations
- Completeness of coverage including edge cases
\`\`\`

\`\`\`markdown
# explanation.md
<!-- Write your explanation here -->

# Binary Search Algorithm

## Overview
[Your explanation of what binary search is and its purpose]

## How It Works
[Step-by-step explanation of the algorithm]

## Example
[Concrete example with walkthrough]

## Complexity Analysis
[Time and space complexity discussion]

## When to Use
[Use cases and comparison with other search methods]
\`\`\`

\`\`\`yaml
# rubric.yaml
criteria:
  accuracy:
    weight: 40
    description: "Technical accuracy of algorithm explanation and complexity analysis"
  clarity:
    weight: 30
    description: "Clear communication, logical flow, and appropriate structure"
  examples:
    weight: 20
    description: "Effective use of concrete examples and step-by-step walkthrough"
  completeness:
    weight: 10
    description: "Comprehensive coverage including prerequisites, advantages, and use cases"
threshold: 75
\`\`\`

\`\`\`markdown
# solution.md
# Binary Search Algorithm

## Overview
Binary search is an efficient algorithm for finding a target value in a sorted array. It works by repeatedly dividing the search interval in half, comparing the target with the middle element, and eliminating half of the remaining elements at each step.

## How It Works
1. Start with the entire sorted array
2. Find the middle element
3. Compare the target with the middle element:
   - If equal: target found, return index
   - If target is smaller: search the left half
   - If target is larger: search the right half
4. Repeat until target is found or search space is empty

## Example
Let's search for 7 in the array [1, 3, 5, 7, 9, 11, 13]:

Step 1: Array [1, 3, 5, 7, 9, 11, 13], middle = 7 (index 3)
- Target 7 == middle 7: Found! Return index 3

For a more complex example, searching for 5:
Step 1: Array [1, 3, 5, 7, 9, 11, 13], middle = 7 (index 3)
- Target 5 < middle 7: search left half [1, 3, 5]

Step 2: Array [1, 3, 5], middle = 3 (index 1)
- Target 5 > middle 3: search right half [5]

Step 3: Array [5], middle = 5 (index 2)
- Target 5 == middle 5: Found! Return index 2

## Complexity Analysis
- **Time Complexity**: O(log n) - we eliminate half the elements at each step
- **Space Complexity**: O(1) for iterative implementation, O(log n) for recursive due to call stack

## When to Use
**Advantages:**
- Much faster than linear search for large datasets
- Predictable performance
- Simple to implement and understand

**Prerequisites:**
- Array must be sorted
- Random access to elements (works well with arrays, not linked lists)

**Use Cases:**
- Searching in large sorted datasets
- Finding insertion points
- Range queries
- Dictionary lookups in sorted data structures
\`\`\``
  }
]

export const multiQuestionKataExamples: PromptExample[] = [
  {
    input: "Create an intermediate JavaScript fundamentals assessment",
    output: `\`\`\`yaml
# meta.yaml
slug: javascript-fundamentals-quiz
title: "JavaScript Fundamentals Assessment"
language: none
type: "multi-question"
difficulty: medium
tags: [javascript, fundamentals, assessment, programming]
entry: answer.md
test:
  kind: none
  file: none
timeout_ms: 0

multiQuestion:
  title: "JavaScript Fundamentals Assessment"
  description: "Test your knowledge of JavaScript basics including data types, functions, and DOM manipulation"
  passingScore: 75
  showProgressBar: true
  allowReview: true
  questions:
    - id: "data_types"
      type: "multiple-choice"
      question: "Which of the following are primitive data types in JavaScript?"
      allowMultiple: true
      options:
        - id: "a"
          text: "string"
        - id: "b"
          text: "object"
        - id: "c"
          text: "number"
        - id: "d"
          text: "boolean"
      correctAnswers: ["a", "c", "d"]
      points: 2
      explanation: "string, number, and boolean are primitive types. object is a reference type."
    
    - id: "variable_declaration"
      type: "shortform"
      question: "What keyword creates a block-scoped variable that cannot be reassigned?"
      expectedAnswer: "const"
      acceptableAnswers: ["const"]
      caseSensitive: false
      maxLength: 20
      points: 1
      explanation: "const creates block-scoped constants that cannot be reassigned after declaration."
    
    - id: "function_syntax"
      type: "code"
      question: "Write an arrow function called 'double' that takes a number and returns its double"
      language: "js"
      starterCode: "// Write your arrow function here\\nconst double = "
      points: 3
      explanation: "Arrow function syntax: const double = (num) => num * 2"
\`\`\`

\`\`\`markdown
# statement.md
# JavaScript Fundamentals Assessment

Test your understanding of core JavaScript concepts including data types, variables, functions, and basic programming constructs.

## Instructions
- Answer all questions to demonstrate your JavaScript knowledge
- Some questions allow multiple correct answers
- Code questions should use proper JavaScript syntax
- Review your answers before final submission

## Topics Covered
- Primitive and reference data types
- Variable declarations (var, let, const)
- Function syntax and arrow functions
- Basic programming concepts

## Scoring
- Total points: 6
- Passing score: 75%
- No time limit - focus on accuracy
\`\`\`

\`\`\`markdown
# answer.md
<!-- This file will contain student answers -->
# Your Answers

This file will be populated with your responses to each question.
\`\`\``
  }
]

export const shortformKataExamples: PromptExample[] = [
  {
    input: "Create a beginner programming concepts shortform quiz",
    output: `\`\`\`yaml
# meta.yaml
slug: programming-concepts-shortform
title: "Programming Concepts Quick Quiz"
language: none
type: "shortform"
difficulty: easy
tags: [programming, concepts, basics, terminology]
entry: answer.md
test:
  kind: none
  file: none
timeout_ms: 0

multiQuestion:
  title: "Programming Concepts Quick Quiz"
  description: "Test your knowledge of fundamental programming terminology and concepts"
  passingScore: 80
  showProgressBar: true
  allowReview: true
  questions:
    - id: "algorithm_definition"
      type: "shortform"
      question: "What is an algorithm?"
      expectedAnswer: "a step-by-step procedure for solving a problem"
      acceptableAnswers: 
        - "a step-by-step procedure for solving a problem"
        - "a set of instructions to solve a problem"
        - "a sequence of steps to solve a problem"
      caseSensitive: false
      maxLength: 100
      points: 1
      explanation: "An algorithm is a finite sequence of well-defined instructions for solving a problem."
    
    - id: "variable_purpose"
      type: "one-liner"
      question: "Complete this statement: A variable is used to _____ data in a program."
      expectedAnswer: "store"
      acceptableAnswers: ["store", "hold", "contain", "save"]
      caseSensitive: false
      points: 1
      explanation: "Variables are containers that store data values that can be used and modified throughout a program."
\`\`\`

\`\`\`markdown
# statement.md
# Programming Concepts Quick Quiz

A focused assessment of fundamental programming terminology and concepts.

## Instructions
- Provide concise, accurate answers
- Focus on demonstrating understanding of core concepts
- Most answers should be brief phrases or single words

## Format
- Short text answers
- Fill-in-the-blank completions
- Focus on key programming terminology
\`\`\`

\`\`\`markdown
# answer.md
<!-- This file will contain student answers -->
# Your Answers

Provide your answers to each question below.
\`\`\``
  }
]

export const multipleChoiceKataExamples: PromptExample[] = [
  {
    input: "Create a beginner web development multiple choice quiz",
    output: `\`\`\`yaml
# meta.yaml
slug: web-dev-multiple-choice
title: "Web Development Basics Quiz"
language: none
type: "multiple-choice"
difficulty: easy
tags: [web-development, html, css, basics, quiz]
entry: answer.md
test:
  kind: none
  file: none
timeout_ms: 0

multiQuestion:
  title: "Web Development Basics Quiz"
  description: "Test your knowledge of HTML and CSS fundamentals"
  passingScore: 70
  showProgressBar: true
  allowReview: true
  questions:
    - id: "html_structure"
      type: "multiple-choice"
      question: "Which HTML element represents the main content of a document?"
      allowMultiple: false
      options:
        - id: "a"
          text: "<main>"
        - id: "b"
          text: "<content>"
        - id: "c"
          text: "<body>"
        - id: "d"
          text: "<section>"
      correctAnswers: ["a"]
      points: 1
      explanation: "<main> represents the dominant content of the document body, excluding headers, footers, and navigation."
    
    - id: "css_selectors"
      type: "multiple-choice"
      question: "Which CSS selectors target elements by their attributes?"
      allowMultiple: true
      options:
        - id: "a"
          text: "Class selector (.class)"
        - id: "b"
          text: "ID selector (#id)"
        - id: "c"
          text: "Attribute selector [attr]"
        - id: "d"
          text: "Type selector (element)"
      correctAnswers: ["a", "b", "c"]
      points: 2
      explanation: "Class, ID, and attribute selectors all target elements based on their attributes. Type selectors target by element name."
\`\`\`

\`\`\`markdown
# statement.md
# Web Development Basics Quiz

Test your understanding of fundamental HTML and CSS concepts through multiple choice questions.

## Instructions
- Read each question carefully
- Select the best answer(s) for each question
- Some questions may have multiple correct answers (clearly indicated)
- Review your selections before submitting

## Question Types
- Single-select: Choose one correct answer
- Multi-select: Choose all correct answers

## Topics Covered
- HTML structure and semantic elements
- CSS selectors and properties
- Web development best practices

## Scoring
- Total points: 3
- Passing score: 70%
- Partial credit for multi-select questions
\`\`\`

\`\`\`markdown
# answer.md
<!-- This file will contain student answers -->
# Your Answers

Your selected answers will be recorded here.
\`\`\``
  }
]

export const templateKataExamples: PromptExample[] = [
  {
    input: "Create a beginner JavaScript Express.js REST API project template",
    output: `\`\`\`yaml
# meta.yaml
slug: express-rest-api-template
title: "Express.js REST API Template"
language: js
type: "template"
difficulty: "beginner"
testKind: "none"
tags: [nodejs, express, rest-api, backend]
\`\`\`

\`\`\`markdown
# statement.md
# Express.js REST API Template

## Objective
Create a basic Express.js REST API project structure with proper organization, configuration, and essential middleware setup.

## Requirements
Your project should include:
- Proper directory structure for a Node.js/Express application
- Package.json with necessary dependencies
- Basic Express server setup with middleware
- Route organization and basic CRUD endpoints
- Environment configuration
- Basic error handling
- README with setup instructions

## Technical Specifications
- Language: JavaScript (Node.js)
- Framework: Express.js
- Key features to implement:
  - RESTful API endpoints
  - JSON request/response handling
  - Environment variable configuration
  - Basic logging
  - Error handling middleware

## Deliverables
Create the following structure:
\`\`\`
express-api/
├── src/
│   ├── routes/
│   ├── middleware/
│   ├── controllers/
│   └── app.js
├── package.json
├── .env.example
├── .gitignore
├── server.js
└── README.md
\`\`\`

## Evaluation
Your project will be evaluated on:
- Correct directory structure and file organization
- Proper Express.js setup and configuration
- Implementation of basic REST endpoints
- Code quality and best practices
- Clear documentation and setup instructions
\`\`\`

\`\`\`yaml
# rubric.yaml
criteria:
  structure:
    weight: 30
    description: "Correct directory structure and file organization"
  configuration:
    weight: 25
    description: "Proper package.json, environment setup, and Express configuration"
  implementation:
    weight: 25
    description: "Quality of Express setup, routes, and middleware implementation"
  documentation:
    weight: 20
    description: "Clear README with setup instructions and code comments"
threshold: 75
\`\`\`

\`\`\`js
// solution.js - Main server file
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/users', require('./src/routes/users'));
app.use('/api/posts', require('./src/routes/posts'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});

module.exports = app;
\`\`\``
  }
]