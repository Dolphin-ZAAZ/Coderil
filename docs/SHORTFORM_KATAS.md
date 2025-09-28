# Shortform Kata Types

The Code Kata App now supports three new shortform kata types designed for quick knowledge checks, concept validation, and rapid learning assessments. These types complement the existing code, explanation, template, and codebase katas.

## Overview

Shortform katas are perfect for:
- Quick concept checks during learning sessions
- Knowledge validation and recall exercises  
- Rapid assessment of understanding
- Building confidence with bite-sized challenges
- Creating learning paths with mixed content types

## Kata Types

### 1. Shortform Katas (`shortform`)

**Purpose**: Brief text-based questions expecting concise answers (typically 1-3 words or short phrases).

**Best for**:
- Time complexity questions ("What is the time complexity of binary search?")
- Definition recall ("What does API stand for?")
- Quick factual questions ("Which HTTP status code indicates 'Not Found'?")
- Concept identification ("What sorting algorithm has O(n log n) average case?")

**Configuration** (in `meta.yaml`):
```yaml
shortform:
  question: "What is the time complexity of binary search?"
  expectedAnswer: "O(log n)"
  acceptableAnswers: 
    - "O(log n)"
    - "logarithmic"
    - "log n"
  caseSensitive: false
  maxLength: 100
  explanation: "Binary search divides the search space in half with each comparison."
```

### 2. Multiple Choice Katas (`multiple-choice`)

**Purpose**: Questions with predefined answer options, supporting single or multiple correct answers.

**Best for**:
- Testing conceptual understanding
- Comparing similar concepts
- Identifying correct/incorrect statements
- Knowledge assessment with guided options

**Configuration** (in `meta.yaml`):
```yaml
multipleChoice:
  question: "Which of the following are built-in Python data types?"
  allowMultiple: true
  options:
    - id: "a"
      text: "list"
    - id: "b" 
      text: "dict"
    - id: "c"
      text: "array"
    - id: "d"
      text: "set"
  correctAnswers: ["a", "b", "d"]
  explanation: "Python's built-in types include list, dict, and set. Arrays require importing."
```

### 3. One-Liner Katas (`one-liner`)

**Purpose**: Questions expecting a single, complete sentence or phrase as an answer.

**Best for**:
- Fill-in-the-blank questions
- Definition completion
- Principle explanations
- Acronym expansions

**Configuration** (in `meta.yaml`):
```yaml
oneLiner:
  question: "What does the acronym DRY stand for in software development?"
  expectedAnswer: "Don't Repeat Yourself"
  acceptableAnswers:
    - "Don't Repeat Yourself"
    - "Do not Repeat Yourself"
    - "Don't repeat yourself"
  caseSensitive: false
  explanation: "DRY is a principle aimed at reducing repetition in software patterns."
```

## Creating Shortform Katas

### Using the CLI Script

Create shortform katas using the existing `new-kata` script:

```bash
# Shortform kata
npm run new-kata my-shortform-kata --type shortform --difficulty easy --title "Big O Complexity"

# Multiple choice kata  
npm run new-kata my-multiple-choice --type multiple-choice --difficulty medium --title "Python Data Types"

# One-liner kata
npm run new-kata my-one-liner --type one-liner --difficulty easy --title "DRY Principle"
```

### Manual Creation

1. Create a directory in `katas/`
2. Add `meta.yaml` with appropriate configuration
3. Create `statement.md` with the question context
4. Create `answer.md` as the entry file
5. Optionally add solution files for reference

### File Structure

```
katas/my-shortform-kata/
├── meta.yaml          # Kata metadata and configuration
├── statement.md       # Question context and instructions  
├── answer.md          # Entry file (UI handles actual input)
└── solution.md        # Optional reference answer (optional)
```

## Configuration Reference

### Common Fields

All shortform types share these `meta.yaml` fields:

```yaml
slug: "kata-identifier"
title: "Human Readable Title"
language: "none"           # Always "none" for shortform types
type: "shortform"          # or "multiple-choice" or "one-liner"
difficulty: "easy"         # easy, medium, hard
tags: ["concept", "quick"] # Suggested tags
entry: "answer.md"         # Always "answer.md"
test:
  kind: "none"            # No code execution
  file: "none"
timeout_ms: 0             # No timeout needed
```

### Shortform Configuration

```yaml
shortform:
  question: "The main question text"
  expectedAnswer: "Primary correct answer"
  acceptableAnswers:      # List of acceptable variations
    - "Primary answer"
    - "Alternative phrasing"
  caseSensitive: false    # Case-sensitive matching (default: false)
  maxLength: 100          # Maximum character limit (optional)
  explanation: "Explanation shown after submission (optional)"
```

### Multiple Choice Configuration

```yaml
multipleChoice:
  question: "The main question text"
  allowMultiple: false    # Allow multiple selections (default: false)
  options:
    - id: "a"            # Unique identifier
      text: "Option text"
    - id: "b"
      text: "Another option"
  correctAnswers: ["a"]   # Array of correct option IDs
  explanation: "Explanation shown after submission (optional)"
```

### One-Liner Configuration

```yaml
oneLiner:
  question: "The main question text"
  expectedAnswer: "Primary correct answer"
  acceptableAnswers:      # List of acceptable variations
    - "Primary answer"
    - "Alternative phrasing"
  caseSensitive: false    # Case-sensitive matching (default: false)
  explanation: "Explanation shown after submission (optional)"
```

## Evaluation and Scoring

### Shortform & One-Liner Evaluation

- **Exact matching**: User answer compared against expected and acceptable answers
- **Case sensitivity**: Configurable (default: case-insensitive)
- **Whitespace**: Automatically trimmed from user input
- **Scoring**: Binary (100% for correct, 0% for incorrect)

### Multiple Choice Evaluation

- **Single selection**: Must match the one correct answer
- **Multiple selection**: Must match all correct answers (no partial credit)
- **Scoring**: Binary (100% for correct, 0% for incorrect)

## UI Integration

Shortform katas use a specialized `ShortformAnswerPanel` component that provides:

- **Text input**: For shortform and one-liner answers
- **Multiple choice interface**: Radio buttons (single) or checkboxes (multiple)
- **Character counting**: For shortform answers with length limits
- **Real-time validation**: Input validation before submission
- **Immediate feedback**: Results and explanations after submission

## Best Practices

### Question Design

1. **Be specific**: Clear, unambiguous questions
2. **Appropriate scope**: Match difficulty to target audience
3. **Good distractors**: For multiple choice, include plausible wrong answers
4. **Consistent format**: Use consistent phrasing patterns

### Answer Configuration

1. **Cover variations**: Include common alternative phrasings
2. **Consider case**: Set appropriate case sensitivity
3. **Reasonable limits**: Set appropriate character limits for shortform
4. **Helpful explanations**: Provide context and learning value

### Content Strategy

1. **Mixed difficulty**: Combine easy recall with harder concepts
2. **Progressive complexity**: Build from simple to complex topics
3. **Complementary content**: Use alongside code katas for complete coverage
4. **Regular updates**: Keep content current and relevant

## Examples

See the following example katas:
- `katas/big-o-complexity/` - Shortform example
- `katas/python-data-types/` - Multiple choice example  
- `katas/dry-principle/` - One-liner example

## Templates

Template katas are available in:
- `kata-templates/shortform-kata/`
- `kata-templates/multiple-choice-kata/`
- `kata-templates/one-liner-kata/`

These provide starting points for creating new shortform katas with proper structure and configuration examples.