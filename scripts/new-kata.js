#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// CLI argument parsing
const args = process.argv.slice(2);

// Handle both direct calls and npm script calls
let startIndex = 0;
if (args[0] === 'new-kata') {
  startIndex = 1;
}

const kataName = args[startIndex];
if (!kataName) {
  console.error('Error: Kata name is required');
  console.error('Usage: node scripts/new-kata.js new-kata <kata-name> [options]');
  console.error('   or: npm run new-kata <kata-name> [options]');
  console.error('Options:');
  console.error('  --language, -l <lang>    Language (py, js, ts, cpp) [default: py]');
  console.error('  --type, -t <type>        Type (code, explain, template, codebase) [default: code]');
  console.error('  --difficulty, -d <diff>  Difficulty (easy, medium, hard) [default: easy]');
  console.error('  --title <title>          Custom title [default: derived from kata-name]');
  process.exit(1);
}

// Validation arrays
const validLanguages = ['py', 'js', 'ts', 'cpp'];
const validTypes = ['code', 'explain', 'template', 'codebase'];
const validDifficulties = ['easy', 'medium', 'hard'];

// Parse options
const options = {
  language: 'py',
  type: 'code',
  difficulty: 'easy',
  title: null
};

for (let i = startIndex + 1; i < args.length; i++) {
  const arg = args[i];
  const nextArg = args[i + 1];
  
  if ((arg === '--language' || arg === '-l') && nextArg) {
    options.language = nextArg;
    i++;
  } else if ((arg === '--type' || arg === '-t') && nextArg) {
    options.type = nextArg;
    i++;
  } else if ((arg === '--difficulty' || arg === '-d') && nextArg) {
    options.difficulty = nextArg;
    i++;
  } else if (arg === '--title' && nextArg) {
    options.title = nextArg;
    i++;
  } else if (!arg.startsWith('--') && !arg.startsWith('-')) {
    // Handle positional arguments (for npm run compatibility)
    if (i === startIndex + 1 && validLanguages.includes(arg)) {
      options.language = arg;
    } else if (i === startIndex + 2 && validTypes.includes(arg)) {
      options.type = arg;
    } else if (i === startIndex + 3 && validDifficulties.includes(arg)) {
      options.difficulty = arg;
    }
  }
}

// Validate options

if (!validLanguages.includes(options.language)) {
  console.error(`Error: Invalid language '${options.language}'. Valid options: ${validLanguages.join(', ')}`);
  process.exit(1);
}

if (!validTypes.includes(options.type)) {
  console.error(`Error: Invalid type '${options.type}'. Valid options: ${validTypes.join(', ')}`);
  process.exit(1);
}

if (!validDifficulties.includes(options.difficulty)) {
  console.error(`Error: Invalid difficulty '${options.difficulty}'. Valid options: ${validDifficulties.join(', ')}`);
  process.exit(1);
}

// Generate title from kata name if not provided
if (!options.title) {
  options.title = kataName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

console.log(`Creating new ${options.type} kata: ${kataName}`);
console.log(`Language: ${options.language}, Difficulty: ${options.difficulty}`);
console.log(`Title: ${options.title}`);

// Create kata directory
const projectRoot = path.resolve(__dirname, '..');
const kataDir = path.join(projectRoot, 'katas', kataName);

if (fs.existsSync(kataDir)) {
  console.error(`Error: Kata directory '${kataName}' already exists`);
  process.exit(1);
}

try {
  fs.mkdirSync(kataDir, { recursive: true });
  console.log(`Created directory: ${kataDir}`);
} catch (error) {
  console.error(`Error creating directory: ${error.message}`);
  process.exit(1);
}

// Template generation functions
function generateMetaYaml(kataName, options) {
  const entryFile = getEntryFileName(options.language);
  const testFile = getTestFileName(options.language);
  
  return `slug: "${kataName}"
title: "${options.title}"
language: "${options.language}"
type: "${options.type}"
difficulty: "${options.difficulty}"
tags: ["practice", "${options.language}"]
entry: "${entryFile}"
solution: "solution.${getFileExtension(options.language)}"
test:
  kind: "${getTestKind(options.type)}"
  file: "${testFile}"
timeout_ms: 5000
`;
}

function generateStatementMd(options) {
  if (options.type === 'explain') {
    return generateExplanationStatement(options);
  } else if (options.type === 'template') {
    return generateTemplateStatement(options);
  } else if (options.type === 'codebase') {
    return generateCodebaseStatement(options);
  } else {
    return generateCodeStatement(options);
  }
}

function generateCodeStatement(options) {
  return `# ${options.title}

## Problem Description

Describe the problem that needs to be solved. Be clear and concise about what the function should do.

## Requirements

- Implement the main function according to the specification
- Handle edge cases appropriately
- Follow best practices for ${getLanguageName(options.language)}

## Examples

### Example 1
\`\`\`
Input: example_input
Output: expected_output
Explanation: Why this output is correct
\`\`\`

### Example 2
\`\`\`
Input: another_input
Output: another_output
\`\`\`

## Constraints

- Add specific constraints here (e.g., input ranges, time complexity)
- Consider edge cases and boundary conditions

## Notes

Any additional helpful information or clarifications about the problem.
`;
}

function generateExplanationStatement(options) {
  return `# ${options.title}

## Task

Write a clear and comprehensive explanation of a technical concept, algorithm, or programming pattern.

## Requirements

Your explanation should:
- Be clear and easy to understand
- Include relevant examples
- Cover key concepts and principles
- Be technically accurate
- Be well-structured and organized

## Evaluation Criteria

Your explanation will be evaluated on:
- **Clarity**: How well you communicate the concept
- **Completeness**: Coverage of important aspects
- **Accuracy**: Technical correctness
- **Examples**: Quality and relevance of examples provided
- **Structure**: Organization and flow of the explanation

## Instructions

Write your explanation in the \`explanation.md\` file. Use markdown formatting to structure your content effectively.
`;
}

function generateTemplateStatement(options) {
  return `# ${options.title}

## Task

Create a project template or boilerplate code structure for a specific use case.

## Requirements

Your template should:
- Follow best practices and conventions
- Include necessary configuration files
- Provide a clear project structure
- Include appropriate documentation
- Be ready to use as a starting point

## Evaluation Criteria

Your template will be evaluated on:
- **Structure**: Proper organization of files and directories
- **Completeness**: All necessary components included
- **Best Practices**: Following language/framework conventions
- **Documentation**: Clear README and comments
- **Usability**: Ready to use without additional setup

## Instructions

Create your template files in the \`template/\` directory. Include a README.md explaining how to use the template.
`;
}

function generateCodebaseStatement(options) {
  return `# Analyze the Codebase: ${options.title}

## Task

Analyze the provided codebase and write a structured explanation of what the code does, how it's organized, and how the different components work together.

## Codebase Files

The following files make up this codebase:

<details>
<summary><strong>src/main.${getFileExtension(options.language)}</strong></summary>

\`\`\`${options.language === 'py' ? 'python' : options.language}
# TODO: Replace with actual codebase file content
# This is where you'll put the main application file
def main():
    print("Replace this with actual code")

if __name__ == "__main__":
    main()
\`\`\`

</details>

<details>
<summary><strong>src/utils.${getFileExtension(options.language)}</strong></summary>

\`\`\`${options.language === 'py' ? 'python' : options.language}
# TODO: Replace with actual utility file content
# This is where you'll put utility functions
def helper_function():
    return "Replace with actual implementation"
\`\`\`

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

## Evaluation Criteria

Your analysis will be evaluated on:
- **Comprehension**: How well you understand the codebase
- **Structure**: How well-organized your explanation is
- **Detail**: Appropriate level of technical detail
- **Accuracy**: Correctness of your technical analysis
- **Insights**: Quality of observations and improvement suggestions

## Instructions

Write your analysis in the \`analysis.md\` file using the structure provided above.
`;
}

function generateEntryFile(options) {
  switch (options.language) {
    case 'py':
      return generatePythonEntry(options);
    case 'js':
      return generateJavaScriptEntry(options);
    case 'ts':
      return generateTypeScriptEntry(options);
    case 'cpp':
      return generateCppEntry(options);
    default:
      throw new Error(`Unsupported language: ${options.language}`);
  }
}

function generatePythonEntry(options) {
  if (options.type === 'explain') {
    return '# Write your explanation in explanation.md\n';
  } else if (options.type === 'template') {
    return '# Create your template files in the template/ directory\n';
  } else if (options.type === 'codebase') {
    return '# Write your codebase analysis in analysis.md\n';
  }
  
  return `def solve(param):
    """
    Brief description of what this function should do.
    
    Args:
        param: Description of the parameter
        
    Returns:
        Description of what should be returned
    """
    # Write your solution here
    pass
`;
}

function generateJavaScriptEntry(options) {
  if (options.type === 'explain') {
    return '// Write your explanation in explanation.md\n';
  } else if (options.type === 'template') {
    return '// Create your template files in the template/ directory\n';
  } else if (options.type === 'codebase') {
    return '// Write your codebase analysis in analysis.md\n';
  }
  
  return `/**
 * Brief description of what this function should do.
 * @param {any} param - Description of the parameter
 * @returns {any} Description of what should be returned
 */
function solve(param) {
    // Write your solution here
}

module.exports = { solve };
`;
}

function generateTypeScriptEntry(options) {
  if (options.type === 'explain') {
    return '// Write your explanation in explanation.md\n';
  } else if (options.type === 'template') {
    return '// Create your template files in the template/ directory\n';
  } else if (options.type === 'codebase') {
    return '// Write your codebase analysis in analysis.md\n';
  }
  
  return `/**
 * Brief description of what this function should do.
 * @param param - Description of the parameter
 * @returns Description of what should be returned
 */
export function solve(param: any): any {
    // Write your solution here
}
`;
}

function generateCppEntry(options) {
  if (options.type === 'explain') {
    return '// Write your explanation in explanation.md\n';
  } else if (options.type === 'template') {
    return '// Create your template files in the template/ directory\n';
  } else if (options.type === 'codebase') {
    return '// Write your codebase analysis in analysis.md\n';
  }
  
  return `#include <iostream>
#include <vector>
#include <string>

/**
 * Brief description of what this function should do.
 * @param param Description of the parameter
 * @return Description of what should be returned
 */
auto solve(auto param) {
    // Write your solution here
}

int main() {
    // Test your solution here
    return 0;
}
`;
}

function generateSolutionFile(options) {
  switch (options.language) {
    case 'py':
      return generatePythonSolution(options);
    case 'js':
      return generateJavaScriptSolution(options);
    case 'ts':
      return generateTypeScriptSolution(options);
    case 'cpp':
      return generateCppSolution(options);
    default:
      throw new Error(`Unsupported language: ${options.language}`);
  }
}

function generatePythonSolution(options) {
  if (options.type === 'explain') {
    return `# Solution for ${options.title}

# This is a reference solution for the explanation kata.
# The actual solution is the explanation written in explanation.md

def example_function():
    """
    This is an example function that demonstrates the concept
    being explained in the kata.
    """
    pass
`;
  } else if (options.type === 'template') {
    return `# Solution for ${options.title}

# This is a reference implementation showing how the template
# should be structured and what files should be included.

# The actual solution is the complete template structure
# created in the template/ directory.

def template_example():
    """
    Example function showing proper Python project structure.
    """
    return "Template solution"
`;
  } else if (options.type === 'codebase') {
    return `# Solution for ${options.title}

# This is a reference solution for the codebase analysis kata.
# The actual solution is the structured analysis written in analysis.md

# This file demonstrates the expected depth of understanding
# and quality of analysis for the provided codebase.

def analysis_example():
    """
    Example showing the level of code comprehension expected.
    """
    return "Reference analysis"
`;
  }
  
  return `def solve(param):
    """
    Solution implementation for ${options.title}.
    
    Args:
        param: Description of the parameter
        
    Returns:
        Description of what should be returned
    """
    # TODO: Implement the actual solution
    # This is a placeholder - replace with working solution
    
    # Example implementation:
    if param == "test_input":
        return "expected_output"
    elif param == "edge_input":
        return "edge_output"
    elif param == "another_input":
        return "another_output"
    
    # Default case
    return "default_output"
`;
}

function generateJavaScriptSolution(options) {
  if (options.type === 'explain') {
    return `// Solution for ${options.title}

// This is a reference solution for the explanation kata.
// The actual solution is the explanation written in explanation.md

/**
 * Example function that demonstrates the concept being explained.
 */
function exampleFunction() {
    // Implementation example
}

module.exports = { exampleFunction };
`;
  } else if (options.type === 'template') {
    return `// Solution for ${options.title}

// This is a reference implementation showing how the template
// should be structured and what files should be included.

/**
 * Example function showing proper JavaScript project structure.
 */
function templateExample() {
    return "Template solution";
}

module.exports = { templateExample };
`;
  } else if (options.type === 'codebase') {
    return `// Solution for ${options.title}

// This is a reference solution for the codebase analysis kata.
// The actual solution is the structured analysis written in analysis.md

/**
 * Example showing the level of code comprehension expected.
 */
function analysisExample() {
    return "Reference analysis";
}

module.exports = { analysisExample };
`;
  }
  
  return `/**
 * Solution implementation for ${options.title}.
 * @param {any} param - Description of the parameter
 * @returns {any} Description of what should be returned
 */
function solve(param) {
    // TODO: Implement the actual solution
    // This is a placeholder - replace with working solution
    
    // Example implementation:
    if (param === "test_input") {
        return "expected_output";
    } else if (param === "edge_input") {
        return "edge_output";
    } else if (param === "another_input") {
        return "another_output";
    }
    
    // Default case
    return "default_output";
}

module.exports = { solve };
`;
}

function generateTypeScriptSolution(options) {
  if (options.type === 'explain') {
    return `// Solution for ${options.title}

// This is a reference solution for the explanation kata.
// The actual solution is the explanation written in explanation.md

/**
 * Example function that demonstrates the concept being explained.
 */
export function exampleFunction(): void {
    // Implementation example
}
`;
  } else if (options.type === 'template') {
    return `// Solution for ${options.title}

// This is a reference implementation showing how the template
// should be structured and what files should be included.

/**
 * Example function showing proper TypeScript project structure.
 */
export function templateExample(): string {
    return "Template solution";
}
`;
  } else if (options.type === 'codebase') {
    return `// Solution for ${options.title}

// This is a reference solution for the codebase analysis kata.
// The actual solution is the structured analysis written in analysis.md

/**
 * Example showing the level of code comprehension expected.
 */
export function analysisExample(): string {
    return "Reference analysis";
}
`;
  }
  
  return `/**
 * Solution implementation for ${options.title}.
 * @param param - Description of the parameter
 * @returns Description of what should be returned
 */
export function solve(param: any): any {
    // TODO: Implement the actual solution
    // This is a placeholder - replace with working solution
    
    // Example implementation:
    if (param === "test_input") {
        return "expected_output";
    } else if (param === "edge_input") {
        return "edge_output";
    } else if (param === "another_input") {
        return "another_output";
    }
    
    // Default case
    return "default_output";
}
`;
}

function generateCppSolution(options) {
  if (options.type === 'explain') {
    return `// Solution for ${options.title}

// This is a reference solution for the explanation kata.
// The actual solution is the explanation written in explanation.md

#include <iostream>
#include <vector>
#include <string>

/**
 * Example function that demonstrates the concept being explained.
 */
void exampleFunction() {
    // Implementation example
}

int main() {
    exampleFunction();
    return 0;
}
`;
  } else if (options.type === 'template') {
    return `// Solution for ${options.title}

// This is a reference implementation showing how the template
// should be structured and what files should be included.

#include <iostream>
#include <vector>
#include <string>

/**
 * Example function showing proper C++ project structure.
 */
std::string templateExample() {
    return "Template solution";
}

int main() {
    std::cout << templateExample() << std::endl;
    return 0;
}
`;
  } else if (options.type === 'codebase') {
    return `// Solution for ${options.title}

// This is a reference solution for the codebase analysis kata.
// The actual solution is the structured analysis written in analysis.md

#include <iostream>
#include <vector>
#include <string>

/**
 * Example showing the level of code comprehension expected.
 */
std::string analysisExample() {
    return "Reference analysis";
}

int main() {
    std::cout << analysisExample() << std::endl;
    return 0;
}
`;
  }
  
  return `#include <iostream>
#include <vector>
#include <string>

/**
 * Solution implementation for ${options.title}.
 * @param param Description of the parameter
 * @return Description of what should be returned
 */
auto solve(auto param) {
    // TODO: Implement the actual solution
    // This is a placeholder - replace with working solution
    
    // Example implementation:
    if (param == "test_input") {
        return "expected_output";
    } else if (param == "edge_input") {
        return "edge_output";
    } else if (param == "another_input") {
        return "another_output";
    }
    
    // Default case
    return "default_output";
}

int main() {
    // Test the solution
    std::cout << solve("test_input") << std::endl;
    return 0;
}
`;
}

function generateTestFile(options) {
  if (options.type === 'explain' || options.type === 'template') {
    return null; // No test files for explain/template katas
  }
  
  switch (options.language) {
    case 'py':
      return generatePythonTests(options);
    case 'js':
      return generateJavaScriptTests(options);
    case 'ts':
      return generateTypeScriptTests(options);
    case 'cpp':
      return generateCppTests(options);
    default:
      throw new Error(`Unsupported language: ${options.language}`);
  }
}

function generatePythonTests(options) {
  return `import sys
import os
sys.path.append(os.path.dirname(__file__))

from entry import solve

def test_basic_case():
    """Test basic functionality"""
    result = solve("test_input")
    expected = "expected_output"
    assert result == expected, f"Expected {expected}, got {result}"

def test_edge_case():
    """Test edge case or boundary condition"""
    result = solve("edge_input")
    expected = "edge_output"
    assert result == expected, f"Expected {expected}, got {result}"

def test_another_case():
    """Test another important scenario"""
    result = solve("another_input")
    expected = "another_output"
    assert result == expected, f"Expected {expected}, got {result}"

if __name__ == "__main__":
    test_basic_case()
    test_edge_case()
    test_another_case()
    print("All public tests passed!")
`;
}

function generateJavaScriptTests(options) {
  return `const { solve } = require('./entry');

function testBasicCase() {
    const result = solve("test_input");
    const expected = "expected_output";
    if (result !== expected) {
        throw new Error(\`Expected \${expected}, got \${result}\`);
    }
}

function testEdgeCase() {
    const result = solve("edge_input");
    const expected = "edge_output";
    if (result !== expected) {
        throw new Error(\`Expected \${expected}, got \${result}\`);
    }
}

function testAnotherCase() {
    const result = solve("another_input");
    const expected = "another_output";
    if (result !== expected) {
        throw new Error(\`Expected \${expected}, got \${result}\`);
    }
}

function runPublic() {
    try {
        testBasicCase();
        testEdgeCase();
        testAnotherCase();
        console.log("All public tests passed!");
        return true;
    } catch (error) {
        console.error("Test failed:", error.message);
        return false;
    }
}

function runHidden() {
    // Hidden tests would go here
    return runPublic();
}

module.exports = { runPublic, runHidden };

if (require.main === module) {
    runPublic();
}
`;
}

function generateTypeScriptTests(options) {
  return `import { solve } from './entry';

function testBasicCase(): void {
    const result = solve("test_input");
    const expected = "expected_output";
    if (result !== expected) {
        throw new Error(\`Expected \${expected}, got \${result}\`);
    }
}

function testEdgeCase(): void {
    const result = solve("edge_input");
    const expected = "edge_output";
    if (result !== expected) {
        throw new Error(\`Expected \${expected}, got \${result}\`);
    }
}

function testAnotherCase(): void {
    const result = solve("another_input");
    const expected = "another_output";
    if (result !== expected) {
        throw new Error(\`Expected \${expected}, got \${result}\`);
    }
}

export function runPublic(): boolean {
    try {
        testBasicCase();
        testEdgeCase();
        testAnotherCase();
        console.log("All public tests passed!");
        return true;
    } catch (error) {
        console.error("Test failed:", (error as Error).message);
        return false;
    }
}

export function runHidden(): boolean {
    // Hidden tests would go here
    return runPublic();
}

if (require.main === module) {
    runPublic();
}
`;
}

function generateCppTests(options) {
  return `#include <iostream>
#include <cassert>
#include <string>

// Include the solution
#include "entry.cpp"

void testBasicCase() {
    auto result = solve("test_input");
    auto expected = "expected_output";
    assert(result == expected);
    std::cout << "Basic case passed" << std::endl;
}

void testEdgeCase() {
    auto result = solve("edge_input");
    auto expected = "edge_output";
    assert(result == expected);
    std::cout << "Edge case passed" << std::endl;
}

void testAnotherCase() {
    auto result = solve("another_input");
    auto expected = "another_output";
    assert(result == expected);
    std::cout << "Another case passed" << std::endl;
}

int main() {
    try {
        testBasicCase();
        testEdgeCase();
        testAnotherCase();
        std::cout << "All public tests passed!" << std::endl;
        return 0;
    } catch (const std::exception& e) {
        std::cerr << "Test failed: " << e.what() << std::endl;
        return 1;
    }
}
`;
}

// Helper functions
function getEntryFileName(language) {
  switch (language) {
    case 'py': return 'entry.py';
    case 'js': return 'entry.js';
    case 'ts': return 'entry.ts';
    case 'cpp': return 'entry.cpp';
    default: return 'entry.txt';
  }
}

function getTestFileName(language) {
  switch (language) {
    case 'py': return 'tests.py';
    case 'js': return 'tests.js';
    case 'ts': return 'tests.ts';
    case 'cpp': return 'tests.cpp';
    default: return 'tests.txt';
  }
}

function getSolutionFileName(language) {
  switch (language) {
    case 'py': return 'solution.py';
    case 'js': return 'solution.js';
    case 'ts': return 'solution.ts';
    case 'cpp': return 'solution.cpp';
    default: return 'solution.txt';
  }
}

function getFileExtension(language) {
  switch (language) {
    case 'py': return 'py';
    case 'js': return 'js';
    case 'ts': return 'ts';
    case 'cpp': return 'cpp';
    default: return 'txt';
  }
}

function getTestKind(type) {
  if (type === 'explain' || type === 'template' || type === 'codebase') {
    return 'none';
  }
  return 'programmatic';
}

function getLanguageName(language) {
  switch (language) {
    case 'py': return 'Python';
    case 'js': return 'JavaScript';
    case 'ts': return 'TypeScript';
    case 'cpp': return 'C++';
    default: return language;
  }
}

// Generate and write files
try {
  // Generate meta.yaml
  const metaContent = generateMetaYaml(kataName, options);
  fs.writeFileSync(path.join(kataDir, 'meta.yaml'), metaContent);
  console.log('Created: meta.yaml');

  // Generate statement.md
  const statementContent = generateStatementMd(options);
  fs.writeFileSync(path.join(kataDir, 'statement.md'), statementContent);
  console.log('Created: statement.md');

  // Generate entry file
  const entryContent = generateEntryFile(options);
  const entryFileName = getEntryFileName(options.language);
  fs.writeFileSync(path.join(kataDir, entryFileName), entryContent);
  console.log(`Created: ${entryFileName}`);

  // Generate solution file
  const solutionContent = generateSolutionFile(options);
  const solutionFileName = getSolutionFileName(options.language);
  fs.writeFileSync(path.join(kataDir, solutionFileName), solutionContent);
  console.log(`Created: ${solutionFileName}`);

  // Generate test file (only for code katas)
  if (options.type === 'code') {
    const testContent = generateTestFile(options);
    if (testContent) {
      const testFileName = getTestFileName(options.language);
      fs.writeFileSync(path.join(kataDir, testFileName), testContent);
      console.log(`Created: ${testFileName}`);
      
      // Also create hidden_tests file
      const hiddenTestFileName = `hidden_${testFileName}`;
      fs.writeFileSync(path.join(kataDir, hiddenTestFileName), testContent);
      console.log(`Created: ${hiddenTestFileName}`);
    }
  }

  // Generate additional files for specific kata types
  if (options.type === 'explain') {
    const explanationContent = `# Your Explanation

Write your explanation here using markdown formatting.

## Key Points

- Point 1
- Point 2
- Point 3

## Examples

Provide relevant examples to illustrate your explanation.

## Conclusion

Summarize the main concepts.
`;
    fs.writeFileSync(path.join(kataDir, 'explanation.md'), explanationContent);
    console.log('Created: explanation.md');
    
    // Create rubric.yaml for explanation katas
    const rubricContent = `keys:
  - "clarity"
  - "completeness"
  - "accuracy"
  - "examples"
  - "structure"

threshold:
  min_total: 70
  min_correctness: 60

exemplar: |
  This is an exemplar explanation that demonstrates the expected quality and depth.
  It should cover all key concepts clearly and provide good examples.
`;
    fs.writeFileSync(path.join(kataDir, 'rubric.yaml'), rubricContent);
    console.log('Created: rubric.yaml');
  }

  if (options.type === 'template') {
    // Create template directory
    const templateDir = path.join(kataDir, 'template');
    fs.mkdirSync(templateDir, { recursive: true });
    console.log('Created: template/ directory');
    
    // Create a sample README in template directory
    const templateReadme = `# ${options.title} Template

This is a template for ${getLanguageName(options.language)} projects.

## Usage

1. Copy this template to your project directory
2. Customize the files according to your needs
3. Follow the established patterns and conventions

## Structure

- Add description of the template structure here
- Explain the purpose of each file/directory
`;
    fs.writeFileSync(path.join(templateDir, 'README.md'), templateReadme);
    console.log('Created: template/README.md');
    
    // Create rubric.yaml for template katas
    const rubricContent = `keys:
  - "structure"
  - "completeness"
  - "best_practices"
  - "documentation"
  - "usability"

threshold:
  min_total: 70
  min_correctness: 60

exemplar: |
  This template should demonstrate proper project structure, include all necessary
  configuration files, follow best practices, and be well-documented.
`;
    fs.writeFileSync(path.join(kataDir, 'rubric.yaml'), rubricContent);
    console.log('Created: rubric.yaml');
  }

  if (options.type === 'codebase') {
    // Create analysis.md starter file
    const analysisContent = `# Codebase Analysis: ${options.title}

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
`;
    fs.writeFileSync(path.join(kataDir, 'analysis.md'), analysisContent);
    console.log('Created: analysis.md');
    
    // Create rubric.yaml for codebase katas
    const rubricContent = `keys:
  - "comprehension"
  - "structure"
  - "detail"
  - "accuracy"
  - "insights"

threshold:
  min_total: 70
  min_comprehension: 60

exemplar: |
  A high-quality codebase analysis should clearly identify the project's purpose,
  explain the architecture and component interactions, provide specific examples
  from the code, demonstrate understanding of data flow, and offer thoughtful
  improvement suggestions. The analysis should be well-structured and technically accurate.
`;
    fs.writeFileSync(path.join(kataDir, 'rubric.yaml'), rubricContent);
    console.log('Created: rubric.yaml');
  }

  console.log(`\n✅ Successfully created kata: ${kataName}`);
  console.log(`📁 Location: ${kataDir}`);
  console.log(`\nNext steps:`);
  console.log(`1. Edit the statement.md file to describe your problem`);
  console.log(`2. Update the entry file with appropriate starter code`);
  console.log(`3. Implement the correct solution in the solution file`);
  if (options.type === 'code') {
    console.log(`4. Modify the test files with actual test cases`);
    console.log(`5. Test your kata in the application`);
  } else {
    console.log(`4. Test your kata in the application`);
  }

} catch (error) {
  console.error(`Error creating kata files: ${error.message}`);
  // Clean up directory if creation failed
  try {
    fs.rmSync(kataDir, { recursive: true, force: true });
  } catch (cleanupError) {
    console.error(`Error cleaning up directory: ${cleanupError.message}`);
  }
  process.exit(1);
}