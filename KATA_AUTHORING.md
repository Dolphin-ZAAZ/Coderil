# Kata Authoring Guide

This guide provides comprehensive instructions for creating new coding challenges (katas) for the Code Kata Electron App.

## Table of Contents

- [Overview](#overview)
- [Kata Types](#kata-types)
- [Directory Structure](#directory-structure)
- [Metadata Configuration](#metadata-configuration)
- [Writing Problem Statements](#writing-problem-statements)
- [Creating Code Katas](#creating-code-katas)
- [Creating Explanation Katas](#creating-explanation-katas)
- [Creating Template Katas](#creating-template-katas)
- [Creating Codebase Katas](#creating-codebase-katas)
- [Testing Your Katas](#testing-your-katas)
- [Best Practices](#best-practices)
- [Examples](#examples)

## Overview

Katas are self-contained coding challenges stored in the `/katas/` directory. Each kata consists of:

- **Metadata**: Configuration and challenge details
- **Problem Statement**: Description of what needs to be solved
- **Starter Code**: Initial code template for users
- **Test Cases**: Validation logic for submissions
- **Optional Files**: Additional resources or hidden tests

## Kata Types

The application supports four types of katas:

### 1. Code Katas
Traditional programming challenges where users write code to pass test cases.
- **Focus**: Algorithm implementation, problem-solving
- **Validation**: Automated test execution
- **Examples**: Two Sum, Binary Search, String Manipulation

### 2. Explanation Katas
Challenges where users write technical explanations evaluated by AI.
- **Focus**: Technical communication, concept understanding
- **Validation**: AI-powered evaluation for clarity and correctness
- **Examples**: Explain recursion, describe design patterns

### 3. Template Katas
Challenges where users create project structures, boilerplate code, or configuration files.
- **Focus**: Project setup, tooling, best practices
- **Validation**: AI evaluation of structure and completeness
- **Examples**: Docker setup, API boilerplate, build configurations

### 4. Codebase Katas
Challenges where users analyze existing codebases and write structured explanations of their functionality.
- **Focus**: Code comprehension, architecture analysis, technical documentation
- **Validation**: AI evaluation of analysis depth, accuracy, and structure
- **Examples**: Analyze web server, explain microservice architecture, review API design

## Directory Structure

Each kata must be in its own directory under `/katas/` with this structure:

```
katas/
└── your-kata-name/
    ├── meta.yaml          # Required: Kata metadata and configuration
    ├── statement.md       # Required: Problem description
    ├── entry.py           # Required: Starter code file
    ├── solution.py        # Optional: Reference solution (recommended)
    ├── tests.py           # Required for code katas: Public test cases
    ├── hidden_tests.py    # Optional: Hidden test cases for final evaluation
    └── rubric.yaml        # Required for explanation/template katas: AI evaluation criteria
```

### Naming Conventions

- **Directory names**: Use kebab-case (e.g., `two-sum-problem`, `explain-recursion`)
- **File names**: Use snake_case for Python files, follow language conventions for others
- **Kata slugs**: Must match directory name exactly

## Metadata Configuration

The `meta.yaml` file defines the kata's properties and behavior.

### Required Fields

```yaml
slug: "your-kata-name"              # Must match directory name
title: "Your Kata Title"            # Display name for users
language: "py"                      # Language: py, js, ts, cpp
type: "code"                        # Type: code, explain, template
difficulty: "easy"                  # Difficulty: easy, medium, hard
tags: ["arrays", "algorithms"]      # Searchable tags
entry: "entry.py"                   # Starter code filename
solution: "solution.py"             # Optional: Reference solution filename
test:
  kind: "programmatic"              # Test type: programmatic, io, none
  file: "tests.py"                  # Test file name
timeout_ms: 5000                    # Execution timeout in milliseconds
```

### Optional Fields

```yaml
solution: "solution.py"             # Reference solution file
description: "Short description"    # Brief kata summary
author: "Your Name"                 # Kata author
created: "2024-01-15"              # Creation date
updated: "2024-01-20"              # Last update date
prerequisites: ["basic-python"]     # Required knowledge/previous katas
hints: ["Consider using a hash map"] # Helpful hints for users
```

### Field Specifications

#### Language Options
- `py` - Python 3.8+
- `js` - JavaScript (Node.js)
- `ts` - TypeScript
- `cpp` - C++ with C++20 support

#### Type Options
- `code` - Programming challenge with test cases
- `explain` - Technical explanation evaluated by AI
- `template` - Project structure/boilerplate creation

#### Difficulty Levels
- `easy` - Beginner-friendly, basic concepts
- `medium` - Intermediate, requires problem-solving
- `hard` - Advanced, complex algorithms or concepts

#### Test Kinds
- `programmatic` - Automated test execution (most common)
- `io` - Input/output comparison (for simple programs)
- `none` - No automated testing (explanation/template katas)

#### Timeout Guidelines
- **Easy katas**: 3000-5000ms
- **Medium katas**: 5000-10000ms
- **Hard katas**: 10000-30000ms
- **Complex algorithms**: Up to 60000ms

## Writing Problem Statements

The `statement.md` file contains the problem description shown to users.

### Structure Template

```markdown
# Kata Title

## Problem Description

Clear, concise description of what needs to be solved.

## Requirements

- Specific requirement 1
- Specific requirement 2
- Edge cases to consider

## Examples

### Example 1
```
Input: [2, 7, 11, 15], target = 9
Output: [0, 1]
Explanation: nums[0] + nums[1] = 2 + 7 = 9
```

### Example 2
```
Input: [3, 2, 4], target = 6
Output: [1, 2]
```

## Constraints

- 1 ≤ nums.length ≤ 1000
- -10^9 ≤ nums[i] ≤ 10^9
- -10^9 ≤ target ≤ 10^9

## Notes

Additional helpful information or clarifications.
```

### Writing Guidelines

1. **Be Clear**: Use simple, unambiguous language
2. **Provide Examples**: Include multiple test cases with explanations
3. **Define Constraints**: Specify input limits and edge cases
4. **Use Formatting**: Code blocks, lists, and headers for readability
5. **Include Context**: Explain why this problem is useful to solve

## Solution Files

All katas should include a reference solution that demonstrates the expected implementation. This solution is displayed to users via a "Show Solution" button in the UI.

### Solution File Guidelines

1. **File Naming**: Use `solution.{ext}` where `{ext}` matches the kata language
2. **Complete Implementation**: Provide a fully working solution that passes all tests
3. **Best Practices**: Demonstrate optimal or recommended approaches
4. **Documentation**: Include comments explaining the approach and complexity
5. **Consistency**: Match the function signature and style of the starter code

### Example Solution Structure

```python
def two_sum(nums, target):
    """
    Find two numbers in the array that add up to the target.
    
    Time Complexity: O(n)
    Space Complexity: O(n)
    
    Args:
        nums: List of integers
        target: Target sum
        
    Returns:
        List of two indices whose values add up to target
    """
    # Hash map approach for optimal performance
    num_map = {}
    
    for i, num in enumerate(nums):
        complement = target - num
        if complement in num_map:
            return [num_map[complement], i]
        num_map[num] = i
    
    return []  # Should not reach here if valid solution exists
```

### Solution Display

- Solutions are accessible via a "Show Solution" button in the statement panel
- No restrictions are placed on when users can view solutions
- Solutions help users learn different approaches and best practices
- Consider providing multiple solution approaches for complex problems

## Creating Code Katas

Code katas are the most common type, focusing on algorithm implementation.

### Starter Code (`entry.py`)

Provide a function signature with docstring:

```python
def two_sum(nums, target):
    """
    Find two numbers in the array that add up to the target.
    
    Args:
        nums: List of integers
        target: Target sum
        
    Returns:
        List of two indices whose values add up to target
    """
    # Write your solution here
    pass
```

### Public Tests (`tests.py`)

Create comprehensive test cases that users can see:

```python
import sys
import os
sys.path.append(os.path.dirname(__file__))

from entry import two_sum

def test_example_1():
    """Test case 1: Basic example from problem statement"""
    result = two_sum([2, 7, 11, 15], 9)
    assert sorted(result) == [0, 1], f"Expected [0, 1], got {result}"

def test_example_2():
    """Test case 2: Different indices"""
    result = two_sum([3, 2, 4], 6)
    assert sorted(result) == [1, 2], f"Expected [1, 2], got {result}"

def test_duplicate_values():
    """Test case 3: Array with duplicate values"""
    result = two_sum([3, 3], 6)
    assert sorted(result) == [0, 1], f"Expected [0, 1], got {result}"

if __name__ == "__main__":
    test_example_1()
    test_example_2()
    test_duplicate_values()
    print("All public tests passed!")
```

### Hidden Tests (`hidden_tests.py`)

Create additional test cases for final evaluation:

```python
import sys
import os
sys.path.append(os.path.dirname(__file__))

from entry import two_sum

def test_negative_numbers():
    """Hidden test: Negative numbers"""
    result = two_sum([-1, -2, -3, -4, -5], -8)
    assert sorted(result) == [2, 4], f"Expected [2, 4], got {result}"

def test_zero_target():
    """Hidden test: Zero target"""
    result = two_sum([-1, 0, 1, 2], 0)
    assert sorted(result) == [0, 2], f"Expected [0, 2], got {result}"

def test_large_numbers():
    """Hidden test: Large numbers"""
    result = two_sum([1000000000, -1000000000, 500000000], 0)
    assert sorted(result) == [0, 1], f"Expected [0, 1], got {result}"

if __name__ == "__main__":
    test_negative_numbers()
    test_zero_target()
    test_large_numbers()
    print("All hidden tests passed!")
```

### Test Writing Best Practices

1. **Import Pattern**: Always include the sys.path setup for imports
2. **Descriptive Names**: Use clear function names that describe what's being tested
3. **Docstrings**: Document what each test validates
4. **Assertions**: Use descriptive assertion messages with expected vs actual values
5. **Edge Cases**: Test boundary conditions, empty inputs, and special values
6. **Progressive Difficulty**: Public tests should cover basic cases, hidden tests should be more challenging
7. **Final Print**: Always end with a success message for the execution engine

## Creating Explanation Katas

Explanation katas focus on technical communication and understanding.

### Metadata Example

```yaml
slug: "explain-recursion"
title: "Explain Recursion"
language: "py"  # Language for any code examples
type: "explain"
difficulty: "medium"
tags: ["recursion", "algorithms", "explanation"]
entry: "explanation.md"
test:
  kind: "none"
  file: ""
timeout_ms: 0  # No code execution
```

### Starter Template (`explanation.md`)

```markdown
# Explain Recursion

Write a comprehensive explanation of recursion in programming.

## Your Explanation

<!-- Write your explanation here -->

### What is Recursion?

[Your explanation here]

### How Does Recursion Work?

[Your explanation here]

### Example

```python
# Provide a code example with explanation
def factorial(n):
    # Your code and explanation here
    pass
```

### When to Use Recursion

[Your explanation here]

### Common Pitfalls

[Your explanation here]
```

### Rubric Configuration (`rubric.yaml`)

```yaml
keys:
  - "clarity"        # How clear and understandable is the explanation?
  - "correctness"    # Is the technical information accurate?
  - "completeness"   # Does it cover all important aspects?
  - "examples"       # Are code examples helpful and correct?
  - "depth"          # Does it show deep understanding?

threshold:
  min_total: 70      # Minimum total score to pass (out of 100)
  min_correctness: 80 # Minimum correctness score required

scoring:
  clarity:
    weight: 0.25     # 25% of total score
    description: "Clear, well-structured explanation that's easy to follow"
  
  correctness:
    weight: 0.30     # 30% of total score
    description: "Technically accurate information with no misconceptions"
  
  completeness:
    weight: 0.20     # 20% of total score
    description: "Covers all key aspects of the topic comprehensively"
  
  examples:
    weight: 0.15     # 15% of total score
    description: "Includes helpful, correct code examples with explanations"
  
  depth:
    weight: 0.10     # 10% of total score
    description: "Demonstrates deep understanding beyond surface level"
```

## Creating Template Katas

Template katas focus on creating project structures and boilerplate code.

### Metadata Example

```yaml
slug: "flask-api-template"
title: "Flask REST API Template"
language: "py"
type: "template"
difficulty: "medium"
tags: ["flask", "api", "template", "web"]
entry: "template/"
test:
  kind: "none"
  file: ""
timeout_ms: 0
```

### Starter Structure (`template/`)

```
template/
├── README.md          # Instructions for the user
├── requirements.txt   # Starter dependencies (optional)
└── app.py            # Basic starter file
```

### Instructions (`template/README.md`)

```markdown
# Flask REST API Template

Create a complete Flask REST API template with the following requirements:

## Requirements

1. **Project Structure**: Organize code into logical modules
2. **API Endpoints**: Create CRUD endpoints for a resource
3. **Error Handling**: Implement proper error responses
4. **Configuration**: Environment-based configuration
5. **Documentation**: API documentation
6. **Testing**: Unit test structure

## Expected Structure

```
flask-api/
├── app/
│   ├── __init__.py
│   ├── models/
│   ├── routes/
│   └── utils/
├── tests/
├── config.py
├── requirements.txt
├── README.md
└── run.py
```

## Deliverables

Create all necessary files for a production-ready Flask API template.
```

### Rubric Configuration (`rubric.yaml`)

```yaml
keys:
  - "structure"      # Is the project well-organized?
  - "completeness"   # Are all required components present?
  - "best_practices" # Does it follow Flask/Python best practices?
  - "documentation"  # Is it well-documented?
  - "functionality"  # Would this template actually work?

threshold:
  min_total: 75
  min_structure: 70

scoring:
  structure:
    weight: 0.30
    description: "Logical project organization and file structure"
  
  completeness:
    weight: 0.25
    description: "All required components and files are present"
  
  best_practices:
    weight: 0.25
    description: "Follows Flask and Python best practices"
  
  documentation:
    weight: 0.10
    description: "Clear documentation and comments"
  
  functionality:
    weight: 0.10
    description: "Template would work as a starting point"
```

## Creating Codebase Katas

Codebase katas focus on analyzing existing code and writing structured explanations of how it works.

### Metadata Example

```yaml
slug: "simple-web-server"
title: "Simple Web Server Analysis"
language: "py"
type: "codebase"
difficulty: "easy"
tags: ["web-server", "http", "analysis", "python"]
entry: "analysis.md"
test:
  kind: "none"
  file: ""
timeout_ms: 0
```

### Statement Structure (`statement.md`)

The statement should include the codebase files within collapsible sections:

```markdown
# Analyze the Codebase: Simple Web Server

## Task

Analyze the provided codebase and write a structured explanation of what the code does, how it's organized, and how the different components work together.

## Codebase Files

The following files make up this codebase:

<details>
<summary><strong>server.py</strong></summary>

```python
# Include the actual code here
import http.server
import socketserver

class SimpleHTTPRequestHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        # Implementation here
        pass
```

</details>

<details>
<summary><strong>static/style.css</strong></summary>

```css
/* Include CSS code here */
body {
    font-family: Arial, sans-serif;
}
```

</details>

## Analysis Requirements

Your analysis should include the following sections:

### 1. **Project Overview**
- What is the main purpose of this codebase?
- What type of application/system is it?
- What problem does it solve?

### 2. **Architecture & Structure**
- How is the code organized?
- What are the main modules/components?
- How do the different parts interact?

### 3. **Key Components**
- Identify and explain the most important files/classes/functions
- What role does each component play?
- How do they work together?

### 4. **Data Flow**
- How does data move through the system?
- What are the main inputs and outputs?
- Are there any important transformations?

### 5. **Configuration & Dependencies**
- What external dependencies does the project use?
- How is the application configured?
- Are there any environment-specific settings?

### 6. **Potential Improvements**
- What could be improved in this codebase?
- Are there any code quality issues?
- What would you change or refactor?

## Instructions

Write your analysis in the `analysis.md` file using the structure provided above.
```

### Starter File (`analysis.md`)

Provide a structured template for the analysis:

```markdown
# Codebase Analysis: [Project Name]

## 1. Project Overview

**What is the main purpose of this codebase?**
[Write your analysis here]

**What type of application/system is it?**
[Write your analysis here]

**What problem does it solve?**
[Write your analysis here]

## 2. Architecture & Structure

**How is the code organized?**
[Write your analysis here]

**What are the main modules/components?**
[Write your analysis here]

**How do the different parts interact?**
[Write your analysis here]

## 3. Key Components

**Identify and explain the most important files/classes/functions:**
[Write your analysis here]

**What role does each component play?**
[Write your analysis here]

**How do they work together?**
[Write your analysis here]

## 4. Data Flow

**How does data move through the system?**
[Write your analysis here]

**What are the main inputs and outputs?**
[Write your analysis here]

**Are there any important transformations?**
[Write your analysis here]

## 5. Configuration & Dependencies

**What external dependencies does the project use?**
[Write your analysis here]

**How is the application configured?**
[Write your analysis here]

**Are there any environment-specific settings?**
[Write your analysis here]

## 6. Potential Improvements

**What could be improved in this codebase?**
[Write your analysis here]

**Are there any code quality issues?**
[Write your analysis here]

**What would you change or refactor?**
[Write your analysis here]
```

### Rubric Configuration (`rubric.yaml`)

```yaml
keys:
  - "comprehension"    # How well they understand the codebase
  - "structure"        # How well-organized their analysis is
  - "detail"          # Appropriate level of technical detail
  - "accuracy"        # Correctness of technical analysis
  - "insights"        # Quality of observations and suggestions

threshold:
  min_total: 70
  min_comprehension: 60

scoring:
  comprehension:
    weight: 0.35
    description: "Understanding of codebase purpose, structure, and functionality"
  
  structure:
    weight: 0.20
    description: "Clear organization and logical flow of analysis"
  
  detail:
    weight: 0.20
    description: "Appropriate technical depth and specific examples"
  
  accuracy:
    weight: 0.15
    description: "Correctness of technical explanations and observations"
  
  insights:
    weight: 0.10
    description: "Quality of improvement suggestions and code quality observations"

exemplar: |
  A high-quality codebase analysis should clearly identify the project's purpose,
  explain the architecture and component interactions, provide specific examples
  from the code, demonstrate understanding of data flow, and offer thoughtful
  improvement suggestions. The analysis should be well-structured and technically accurate.
```

### Best Practices for Codebase Katas

1. **Choose Realistic Code**: Use actual, working code examples that represent real-world scenarios
2. **Appropriate Complexity**: Match the codebase complexity to the difficulty level
3. **Multiple Files**: Include 3-5 files to show different aspects (main logic, configuration, styling, etc.)
4. **Clear Structure**: Organize code in a logical way that students can follow
5. **Varied Languages**: Consider the target language and include relevant patterns
6. **Documentation**: Include some comments but not over-document - let students analyze
7. **Realistic Issues**: Include some areas for improvement to test critical thinking

## Testing Your Katas

Before submitting katas, thoroughly test them:

### 1. Metadata Validation

```bash
# Check if your kata loads correctly
npm run dev
# Select your kata in the UI
```

### 2. Code Execution Testing

For code katas, test the execution engine:

```bash
# Test with correct solution
# Test with incorrect solution
# Test with syntax errors
# Test timeout scenarios
```

### 3. Manual Testing Checklist

- [ ] Kata appears in the selector
- [ ] Statement renders correctly
- [ ] Starter code loads properly
- [ ] Public tests execute and provide feedback
- [ ] Hidden tests work for final evaluation
- [ ] Error messages are helpful
- [ ] Scoring works correctly

## Best Practices

### General Guidelines

1. **Start Simple**: Begin with easy katas to understand the system
2. **Test Thoroughly**: Verify all scenarios work correctly
3. **Clear Instructions**: Make requirements unambiguous
4. **Progressive Difficulty**: Build complexity gradually
5. **Educational Value**: Focus on learning outcomes

### Code Kata Best Practices

1. **Function Signatures**: Provide clear, typed function signatures
2. **Test Coverage**: Cover normal cases, edge cases, and error conditions
3. **Performance**: Consider time/space complexity in harder katas
4. **Multiple Solutions**: Design problems that allow different approaches
5. **Real-World Relevance**: Use practical, applicable problems

### Explanation Kata Best Practices

1. **Focused Topics**: One concept per kata
2. **Clear Rubrics**: Define exactly what constitutes a good explanation
3. **Example Requirements**: Specify if code examples are required
4. **Length Guidelines**: Provide word count or section expectations
5. **Audience Level**: Match explanation depth to difficulty level

### Template Kata Best Practices

1. **Realistic Scenarios**: Base on actual project needs
2. **Modern Practices**: Use current tools and conventions
3. **Scalable Structure**: Design for growth and maintenance
4. **Documentation**: Require proper README and comments
5. **Working Code**: Ensure templates actually run

### Common Pitfalls to Avoid

1. **Ambiguous Requirements**: Unclear or contradictory instructions
2. **Missing Edge Cases**: Tests that don't cover boundary conditions
3. **Overly Complex**: Too many requirements for the difficulty level
4. **Poor Error Messages**: Unhelpful assertion messages
5. **Inconsistent Naming**: Mismatched function/file names
6. **Missing Dependencies**: Required imports not available
7. **Platform Issues**: Code that only works on specific systems

## Examples

### Complete Code Kata Example

See the `two-sum-example` kata in `/katas/two-sum-example/` for a complete implementation including:
- Comprehensive metadata configuration
- Clear problem statement with examples
- Well-structured starter code
- Thorough public and hidden tests
- Proper error handling and edge cases

### File Templates

Use these as starting points for new katas:

#### Basic Code Kata Template

```bash
mkdir katas/your-kata-name
cd katas/your-kata-name

# Create meta.yaml
cat > meta.yaml << 'EOF'
slug: "your-kata-name"
title: "Your Kata Title"
language: "py"
type: "code"
difficulty: "easy"
tags: ["tag1", "tag2"]
entry: "entry.py"
test:
  kind: "programmatic"
  file: "tests.py"
timeout_ms: 5000
EOF

# Create statement.md
cat > statement.md << 'EOF'
# Your Kata Title

## Problem Description

Describe the problem here.

## Examples

```
Input: example input
Output: expected output
```

## Constraints

- List constraints here
EOF

# Create entry.py
cat > entry.py << 'EOF'
def your_function(param):
    """
    Function description.
    
    Args:
        param: Parameter description
        
    Returns:
        Return value description
    """
    # Write your solution here
    pass
EOF

# Create solution.py
cat > solution.py << 'EOF'
def your_function(param):
    """
    Function description.
    
    Time Complexity: O(?)
    Space Complexity: O(?)
    
    Args:
        param: Parameter description
        
    Returns:
        Return value description
    """
    # Reference solution implementation
    # TODO: Implement your solution here
    pass
EOF

# Create tests.py
cat > tests.py << 'EOF'
import sys
import os
sys.path.append(os.path.dirname(__file__))

from entry import your_function

def test_basic_case():
    """Test basic functionality"""
    result = your_function("input")
    assert result == "expected", f"Expected 'expected', got {result}"

if __name__ == "__main__":
    test_basic_case()
    print("All public tests passed!")
EOF
```

## Contributing

When contributing katas to the project:

1. **Follow Conventions**: Use the established patterns and naming
2. **Test Thoroughly**: Ensure your kata works in all scenarios
3. **Document Well**: Provide clear statements and helpful comments
4. **Review Others**: Learn from existing katas in the repository
5. **Iterate**: Be prepared to refine based on feedback

For questions or assistance with kata authoring, refer to the main project documentation or open an issue in the repository.