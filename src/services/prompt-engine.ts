import { Language, KataType, Difficulty } from '@/types'
import { 
  codeKataExamples, 
  explanationKataExamples, 
  templateKataExamples,
  multiQuestionKataExamples,
  shortformKataExamples,
  multipleChoiceKataExamples
} from './prompt-examples'

export interface KataGenerationRequest {
  description: string
  language: Language
  difficulty: Difficulty
  type: KataType
  topics?: string[]
  constraints?: string
  tags?: string[]
  generateHiddenTests: boolean
  additionalRequirements?: string
}

export interface VariationOptions {
  difficultyAdjustment: 'easier' | 'harder' | 'same'
  focusArea?: string
  parameterChanges?: string
  seriesName?: string
}

export interface PromptTemplate {
  system: string
  user: string
  examples?: PromptExample[]
}

export interface PromptExample {
  input: string
  output: string
}

export class PromptEngineService {
  private static instance: PromptEngineService

  static getInstance(): PromptEngineService {
    if (!PromptEngineService.instance) {
      PromptEngineService.instance = new PromptEngineService()
    }
    return PromptEngineService.instance
  }

  buildCodeKataPrompt(request: KataGenerationRequest): string {
    const template = this.getCodeKataTemplate()
    const systemPrompt = this.processTemplate(template.system, request)
    const userPrompt = this.processTemplate(template.user, request)
    
    return `${systemPrompt}\n\n${userPrompt}`
  }

  buildExplanationKataPrompt(request: KataGenerationRequest): string {
    const template = this.getExplanationKataTemplate()
    const systemPrompt = this.processTemplate(template.system, request)
    const userPrompt = this.processTemplate(template.user, request)
    
    return `${systemPrompt}\n\n${userPrompt}`
  }

  buildTemplateKataPrompt(request: KataGenerationRequest): string {
    const template = this.getTemplateKataTemplate()
    const systemPrompt = this.processTemplate(template.system, request)
    const userPrompt = this.processTemplate(template.user, request)
    
    return `${systemPrompt}\n\n${userPrompt}`
  }

  buildMultiQuestionKataPrompt(request: KataGenerationRequest): string {
    const template = this.getMultiQuestionKataTemplate()
    const systemPrompt = this.processTemplate(template.system, request)
    const userPrompt = this.processTemplate(template.user, request)
    
    return `${systemPrompt}\n\n${userPrompt}`
  }

  buildShortformKataPrompt(request: KataGenerationRequest): string {
    const template = this.getShortformKataTemplate()
    const systemPrompt = this.processTemplate(template.system, request)
    const userPrompt = this.processTemplate(template.user, request)
    
    return `${systemPrompt}\n\n${userPrompt}`
  }

  buildMultipleChoiceKataPrompt(request: KataGenerationRequest): string {
    const template = this.getMultipleChoiceKataTemplate()
    const systemPrompt = this.processTemplate(template.system, request)
    const userPrompt = this.processTemplate(template.user, request)
    
    return `${systemPrompt}\n\n${userPrompt}`
  }

  buildVariationPrompt(sourceKata: any, options: VariationOptions): string {
    const template = this.getVariationTemplate()
    const systemPrompt = template.system
    
    // Determine target difficulty
    const targetDifficulty = this.calculateTargetDifficulty(sourceKata.difficulty, options.difficultyAdjustment)
    
    // Build series context
    const seriesContext = options.seriesName ? 
      `This variation is part of the "${options.seriesName}" series.` : 
      `This is a variation of the "${sourceKata.title}" kata.`
    
    const userPrompt = `
Generate a variation of the following kata:

**Original Kata Information:**
- Title: ${sourceKata.title}
- Language: ${sourceKata.language}
- Type: ${sourceKata.type}
- Current Difficulty: ${sourceKata.difficulty}
- Tags: ${sourceKata.tags?.join(', ') || 'None'}

**Original Problem Statement:**
${sourceKata.statement || 'No statement available'}

**Variation Requirements:**
- Target Difficulty: ${targetDifficulty} (${options.difficultyAdjustment} than original)
- Series Context: ${seriesContext}
${options.focusArea ? `- Focus Area: ${options.focusArea}` : ''}
${options.parameterChanges ? `- Parameter Changes: ${options.parameterChanges}` : ''}

**Difficulty Adjustment Guidelines:**
${this.getDifficultyAdjustmentGuidelines(options.difficultyAdjustment)}

**Requirements:**
1. Maintain the same kata type (${sourceKata.type}) and language (${sourceKata.language})
2. Keep the core learning objectives while adjusting complexity
3. Generate a complete kata with all necessary files
4. Ensure the variation provides educational value
5. Follow the same structured format as the original
6. Create a new, unique title that reflects the variation
7. Update tags appropriately for the new difficulty and focus

Please generate the complete variation following the exact format requirements for ${sourceKata.type} katas.
    `.trim()
    
    return `${systemPrompt}\n\n${userPrompt}`
  }

  buildKataPrompt(request: KataGenerationRequest): string {
    switch (request.type) {
      case 'code':
        return this.buildCodeKataPrompt(request)
      case 'explain':
        return this.buildExplanationKataPrompt(request)
      case 'template':
        return this.buildTemplateKataPrompt(request)
      case 'multi-question':
        return this.buildMultiQuestionKataPrompt(request)
      case 'shortform':
        return this.buildShortformKataPrompt(request)
      case 'multiple-choice':
        return this.buildMultipleChoiceKataPrompt(request)
      case 'one-liner':
        // One-liner katas are handled as shortform with specific configuration
        return this.buildShortformKataPrompt(request)
      case 'codebase':
        // Codebase katas are similar to explanation katas but focus on code analysis
        return this.buildExplanationKataPrompt(request)
      default:
        throw new Error(`Unsupported kata type: ${request.type}`)
    }
  }

  buildSolutionPrompt(statement: string, language: Language): string {
    return `
You are an expert programmer. Generate a complete, working solution for the following coding problem.

**Problem Statement:**
${statement}

**Language:** ${language}

**Requirements:**
- Provide a complete, working solution
- Include proper error handling where appropriate
- Use best practices for the specified language
- Add brief comments explaining key logic
- Ensure the solution is efficient and readable

Please provide only the code solution without additional explanation.
    `.trim()
  }

  private processTemplate(template: string, request: KataGenerationRequest): string {
    const languageDisplayName = this.getLanguageDisplayName(request.language)
    const fileExtension = this.getFileExtension(request.language)
    
    let prompt = template
      .replace(/{description}/g, request.description)
      .replace(/{language}/g, languageDisplayName)
      .replace(/{difficulty}/g, request.difficulty)
      .replace(/{type}/g, request.type)
      .replace(/{ext}/g, fileExtension)
      .replace(/LANGUAGE_CODE/g, request.language)
      .replace(/DIFFICULTY_LEVEL/g, request.difficulty)
      .replace(/FILE_EXT/g, fileExtension)

    // Add optional sections
    if (request.topics && request.topics.length > 0) {
      prompt += `\n\n**Topics to focus on:** ${request.topics.join(', ')}`
    }

    if (request.constraints) {
      prompt += `\n\n**Constraints:** ${request.constraints}`
    }

    if (request.tags && request.tags.length > 0) {
      prompt += `\n\n**Tags:** ${request.tags.join(', ')}`
    }

    if (request.additionalRequirements) {
      prompt += `\n\n**Additional Requirements:** ${request.additionalRequirements}`
    }

    if (request.generateHiddenTests) {
      prompt += `\n\n**Note:** Please include both public tests and additional hidden tests for more comprehensive validation.`
    }

    return prompt
  }

  private getLanguageDisplayName(language: Language): string {
    const languageMap: Record<Language, string> = {
      'py': 'Python',
      'js': 'JavaScript', 
      'ts': 'TypeScript',
      'cpp': 'C++',
      'none': 'No Language'
    }
    return languageMap[language] || language
  }

  private getFileExtension(language: Language): string {
    const extensionMap: Record<Language, string> = {
      'py': 'py',
      'js': 'js',
      'ts': 'ts',
      'cpp': 'cpp',
      'none': 'txt'
    }
    return extensionMap[language] || language
  }

  private getCodeKataTemplate(): PromptTemplate {
    return {
      system: `You are an expert coding instructor creating programming challenges. Generate a complete kata (coding challenge) with all necessary files.

**Output Format Requirements:**
Your response must be structured as follows:

\`\`\`yaml
# meta.yaml
slug: kata-slug-name
title: "Kata Title"
language: LANGUAGE_CODE
type: "code"
difficulty: DIFFICULTY_LEVEL
testKind: "programmatic"
tags: [tag1, tag2]
\`\`\`

\`\`\`markdown
# statement.md
# Kata Title

Brief description of the problem...

## Requirements
- Requirement 1
- Requirement 2

## Examples
\`\`\`
Input: example input
Output: expected output
\`\`\`

## Notes
Any additional notes or constraints...
\`\`\`

\`\`\`LANGUAGE_CODE
// entry.FILE_EXT - Starter code
function/class stub with TODO comments
\`\`\`

\`\`\`LANGUAGE_CODE
// tests.FILE_EXT - Public test cases
Test cases that validate the solution
\`\`\`

\`\`\`LANGUAGE_CODE
// hidden_tests.FILE_EXT - Additional validation (if requested)
More comprehensive test cases
\`\`\`

\`\`\`LANGUAGE_CODE
// solution.FILE_EXT - Reference solution
Complete working implementation
\`\`\`

**Important Guidelines:**
- Create realistic, educational programming challenges
- ALWAYS include a complete working solution - solutions are mandatory for all code katas
- Ensure all test cases pass with the provided solution
- Use appropriate difficulty level for the target audience
- Include edge cases in hidden tests
- Follow language-specific best practices
- Make the problem statement clear and unambiguous
- The solution should demonstrate best practices and be well-commented`,

      user: `Create a {difficulty} difficulty {language} coding kata based on this description:

{description}

Please generate all required files following the exact format specified above.`,
      
      examples: codeKataExamples
    }
  }

  private getExplanationKataTemplate(): PromptTemplate {
    return {
      system: `You are an expert technical educator creating explanation-based learning challenges. Generate a complete explanation kata with all necessary files.

**Output Format Requirements:**
Your response must be structured as follows:

\`\`\`yaml
# meta.yaml
slug: kata-slug-name
title: "Explanation Title"
language: "md"
type: "explain"
difficulty: DIFFICULTY_LEVEL
testKind: "none"
tags: [tag1, tag2]
\`\`\`

\`\`\`markdown
# statement.md
# Explanation Challenge Title

## Task
Explain the following concept/problem in detail...

## Requirements
Your explanation should cover:
- Key concept 1
- Key concept 2
- Practical examples
- Common pitfalls or misconceptions

## Format
Write your explanation in the explanation.md file. Your response should be:
- Clear and well-structured
- Include relevant examples
- Be appropriate for the target difficulty level
- Demonstrate deep understanding of the topic

## Evaluation Criteria
Your explanation will be evaluated on:
- Accuracy and correctness
- Clarity and organization
- Use of examples
- Completeness of coverage
\`\`\`

\`\`\`markdown
# explanation.md
<!-- Write your explanation here -->

Your explanation goes here...
\`\`\`

\`\`\`yaml
# rubric.yaml (optional)
criteria:
  accuracy:
    weight: 40
    description: "Technical accuracy and correctness"
  clarity:
    weight: 30
    description: "Clear communication and organization"
  examples:
    weight: 20
    description: "Effective use of examples"
  completeness:
    weight: 10
    description: "Comprehensive coverage of the topic"
threshold: 70
\`\`\`

\`\`\`markdown
# solution.md
# Reference Explanation

[Exemplar explanation that demonstrates the expected quality and depth]
\`\`\`

**Important Guidelines:**
- Create thought-provoking explanation challenges
- Focus on conceptual understanding
- Provide clear evaluation criteria
- Make the topic appropriate for the difficulty level
- Include specific requirements for what to cover`,

      user: `Create a {difficulty} difficulty explanation kata based on this description:

{description}

Please generate all required files following the exact format specified above.`,
      
      examples: explanationKataExamples
    }
  }

  private getTemplateKataTemplate(): PromptTemplate {
    return {
      system: `You are an expert software architect creating project template challenges. Generate a complete template kata with all necessary files.

**Output Format Requirements:**
Your response must be structured as follows:

\`\`\`yaml
# meta.yaml
slug: kata-slug-name
title: "Template Project Title"
language: LANGUAGE_CODE
type: "template"
difficulty: DIFFICULTY_LEVEL
testKind: "none"
tags: [tag1, tag2]
\`\`\`

\`\`\`markdown
# statement.md
# Project Template Challenge

## Objective
Create a project structure for [specific type of application/library]...

## Requirements
Your project should include:
- Requirement 1 (e.g., proper directory structure)
- Requirement 2 (e.g., configuration files)
- Requirement 3 (e.g., basic implementation files)
- Requirement 4 (e.g., documentation)

## Technical Specifications
- Language: {language}
- Framework/Tools: [if applicable]
- Key features to implement: [list]

## Deliverables
Create the following structure:
\`\`\`
project-name/
├── [expected directory structure]
\`\`\`

## Evaluation
Your project will be evaluated on:
- Correct directory structure
- Proper configuration files
- Code organization and best practices
- Documentation quality
\`\`\`

\`\`\`yaml
# rubric.yaml
criteria:
  structure:
    weight: 30
    description: "Correct directory structure and organization"
  configuration:
    weight: 25
    description: "Proper configuration files and setup"
  implementation:
    weight: 25
    description: "Quality of code implementation"
  documentation:
    weight: 20
    description: "Clear documentation and README"
threshold: 75
\`\`\`

\`\`\`LANGUAGE_CODE
// solution.FILE_EXT - Reference implementation
[Main implementation file showing expected structure]
\`\`\`

**Additional solution files as needed for the template structure**

**Important Guidelines:**
- Create realistic project scaffolding challenges
- Focus on industry best practices
- Include proper configuration and setup files
- Make requirements clear and specific
- Ensure the template is practical and educational`,

      user: `Create a {difficulty} difficulty {language} template kata based on this description:

{description}

Please generate all required files following the exact format specified above.`,
      
      examples: templateKataExamples
    }
  }

  private getVariationTemplate(): PromptTemplate {
    return {
      system: `You are an expert coding instructor and curriculum designer specializing in creating educational variations of programming challenges. Your goal is to generate complete, high-quality kata variations that provide fresh learning experiences while maintaining pedagogical value.

**Core Principles:**
1. **Educational Continuity**: Preserve the fundamental learning objectives and concepts
2. **Progressive Difficulty**: Adjust complexity appropriately based on target difficulty level
3. **Contextual Variation**: Change scenarios, domains, or parameters while keeping core algorithms/concepts
4. **Complete Implementation**: Generate all necessary files with proper structure and content
5. **Quality Assurance**: Ensure all generated code compiles, tests pass, and solutions are correct

**Variation Strategies:**
- **Parameter Scaling**: Adjust input ranges, data sizes, or numerical constraints
- **Context Shifting**: Change the problem domain (e.g., from math to real-world scenarios)
- **Constraint Modification**: Add/remove limitations, time/space complexity requirements
- **Edge Case Expansion**: Include more boundary conditions and special cases
- **Algorithm Variation**: Suggest different approaches while maintaining core concepts
- **Input/Output Evolution**: Modify data formats or interaction patterns

**Quality Standards:**
- All generated code must be syntactically correct and follow language best practices
- Test cases must comprehensively validate the solution
- Solutions must pass all generated tests
- Problem statements must be clear, unambiguous, and well-structured
- Metadata must be accurate and properly formatted
- Difficulty progression must be logical and educationally sound

**File Structure Requirements:**
Generate the complete kata structure following the exact format requirements for the specified kata type:
- meta.yaml with proper metadata and configuration
- statement.md with clear problem description and examples
- Language-specific entry files with appropriate starter code
- Comprehensive test suites (both public and hidden if applicable)
- Complete reference solutions
- Additional files as required by the kata type (rubrics, configurations, etc.)

**Series Progression Logic:**
When creating variations for a series:
- Maintain consistent naming conventions
- Ensure logical difficulty progression
- Build upon concepts from previous variations
- Create meaningful connections between related challenges
- Provide clear learning pathways for students`,

      user: `Generate a variation of the provided kata following the guidelines above.`
    }
  }

  private getMultiQuestionKataTemplate(): PromptTemplate {
    return {
      system: `You are an expert educational content creator specializing in comprehensive assessments. Generate a complete multi-question kata that combines different question types to thoroughly test knowledge in a specific domain.

**Output Format Requirements:**
Your response must be structured as follows:

\`\`\`yaml
# meta.yaml
slug: kata-slug-name
title: "Multi-Question Assessment Title"
language: none
type: "multi-question"
difficulty: DIFFICULTY_LEVEL
tags: [tag1, tag2, domain-specific-tags]
entry: answer.md
test:
  kind: none
  file: none
timeout_ms: 0

multiQuestion:
  title: "Assessment Title"
  description: "Brief description of what this assessment covers"
  passingScore: 70
  showProgressBar: true
  allowReview: true
  questions:
    - id: "q1"
      type: "multiple-choice"
      question: "Question text here"
      allowMultiple: false
      options:
        - id: "a"
          text: "Option A"
        - id: "b"
          text: "Option B"
      correctAnswers: ["a"]
      points: 2
      explanation: "Explanation of correct answer"
    
    - id: "q2"
      type: "shortform"
      question: "Short answer question"
      expectedAnswer: "expected answer"
      acceptableAnswers: ["answer1", "answer2"]
      caseSensitive: false
      maxLength: 100
      points: 1
      explanation: "Why this is the correct answer"
    
    - id: "q3"
      type: "code"
      question: "Write code to solve this problem"
      language: "LANGUAGE_CODE"
      starterCode: "// Starter code here"
      points: 5
      explanation: "Expected solution approach"
\`\`\`

\`\`\`markdown
# statement.md
# Assessment Title

Brief introduction to the assessment...

## Instructions
- Answer all questions to the best of your ability
- Some questions allow multiple attempts
- Review your answers before final submission

## Topics Covered
- Topic 1
- Topic 2
- Topic 3

## Scoring
- Total points: [sum of all question points]
- Passing score: [passingScore]%
- Time limit: No time limit
\`\`\`

\`\`\`markdown
# answer.md
<!-- This file will contain student answers -->
# Your Answers

This file will be populated with your responses to each question.
\`\`\`

**Important Guidelines:**
- Create comprehensive assessments that test multiple aspects of knowledge
- Include a variety of question types (multiple-choice, shortform, code, explanation)
- Ensure questions build upon each other logically
- Provide clear explanations for all answers
- Set appropriate point values based on question difficulty
- Make the assessment challenging but fair for the specified difficulty level`,

      user: `Create a {difficulty} difficulty multi-question assessment based on this description:

{description}

Please generate all required files following the exact format specified above.`,
      
      examples: multiQuestionKataExamples
    }
  }

  private getShortformKataTemplate(): PromptTemplate {
    return {
      system: `You are an expert educator creating focused short-answer assessments. Generate a complete shortform kata with concise questions that test specific knowledge or concepts.

**Output Format Requirements:**
Your response must be structured as follows:

\`\`\`yaml
# meta.yaml
slug: kata-slug-name
title: "Shortform Assessment Title"
language: none
type: "shortform"
difficulty: DIFFICULTY_LEVEL
tags: [tag1, tag2, concept-tags]
entry: answer.md
test:
  kind: none
  file: none
timeout_ms: 0

multiQuestion:
  title: "Shortform Quiz Title"
  description: "Quick assessment of key concepts"
  passingScore: 75
  showProgressBar: true
  allowReview: true
  questions:
    - id: "q1"
      type: "shortform"
      question: "Question requiring a short text answer"
      expectedAnswer: "expected answer"
      acceptableAnswers: ["answer1", "answer2", "synonym"]
      caseSensitive: false
      maxLength: 100
      points: 1
      explanation: "Explanation of the concept"
    
    - id: "q2"
      type: "one-liner"
      question: "Complete this statement: ___"
      expectedAnswer: "completion"
      acceptableAnswers: ["completion", "alternative"]
      caseSensitive: false
      points: 1
      explanation: "Why this completion is correct"
\`\`\`

\`\`\`markdown
# statement.md
# Shortform Assessment Title

Quick assessment focusing on [specific topic/concept]...

## Instructions
- Provide concise, accurate answers
- Most questions require only a few words or a short phrase
- Focus on demonstrating understanding of key concepts

## Format
- Short text answers
- Fill-in-the-blank completions
- Brief explanations where requested
\`\`\`

\`\`\`markdown
# answer.md
<!-- This file will contain student answers -->
# Your Answers

Provide your answers to each question below.
\`\`\`

**Important Guidelines:**
- Focus on testing specific, well-defined concepts
- Keep questions concise and unambiguous
- Provide multiple acceptable answers where appropriate
- Include brief but informative explanations
- Ensure questions are appropriate for the difficulty level
- Test understanding rather than memorization`,

      user: `Create a {difficulty} difficulty shortform assessment based on this description:

{description}

Please generate all required files following the exact format specified above.`,
      
      examples: shortformKataExamples
    }
  }

  private calculateTargetDifficulty(currentDifficulty: Difficulty, adjustment: 'easier' | 'harder' | 'same'): Difficulty {
    if (adjustment === 'same') {
      return currentDifficulty
    }
    
    const difficultyOrder: Difficulty[] = ['easy', 'medium', 'hard']
    const currentIndex = difficultyOrder.indexOf(currentDifficulty)
    
    if (adjustment === 'easier') {
      return difficultyOrder[Math.max(0, currentIndex - 1)]
    } else {
      return difficultyOrder[Math.min(difficultyOrder.length - 1, currentIndex + 1)]
    }
  }

  private getDifficultyAdjustmentGuidelines(adjustment: 'easier' | 'harder' | 'same'): string {
    switch (adjustment) {
      case 'easier':
        return `- Simplify the problem constraints and requirements
- Reduce the number of edge cases to handle
- Provide more guidance in the problem statement
- Use simpler algorithms or data structures
- Add more examples and hints
- Reduce the complexity of input/output formats`
      
      case 'harder':
        return `- Add additional constraints and requirements
- Include more edge cases and corner cases
- Require more sophisticated algorithms or optimizations
- Add time/space complexity requirements
- Introduce multiple solution approaches
- Make the problem statement more challenging to interpret
- Add performance requirements or larger input sizes`
      
      case 'same':
        return `- Maintain similar complexity and difficulty level
- Change the context or domain while keeping core concepts
- Modify parameters without changing fundamental difficulty
- Ensure the learning objectives remain equivalent
- Keep similar cognitive load and problem-solving requirements`
      
      default:
        return 'Maintain appropriate difficulty level for the target audience'
    }
  }

  private getMultipleChoiceKataTemplate(): PromptTemplate {
    return {
      system: `You are an expert test creator specializing in multiple-choice assessments. Generate a complete multiple-choice kata with well-crafted questions and plausible distractors.

**Output Format Requirements:**
Your response must be structured as follows:

\`\`\`yaml
# meta.yaml
slug: kata-slug-name
title: "Multiple Choice Assessment Title"
language: none
type: "multiple-choice"
difficulty: DIFFICULTY_LEVEL
tags: [tag1, tag2, subject-tags]
entry: answer.md
test:
  kind: none
  file: none
timeout_ms: 0

multiQuestion:
  title: "Multiple Choice Quiz Title"
  description: "Test your knowledge with multiple choice questions"
  passingScore: 70
  showProgressBar: true
  allowReview: true
  questions:
    - id: "q1"
      type: "multiple-choice"
      question: "Question text with clear, unambiguous wording"
      allowMultiple: false
      options:
        - id: "a"
          text: "Correct answer option"
        - id: "b"
          text: "Plausible distractor 1"
        - id: "c"
          text: "Plausible distractor 2"
        - id: "d"
          text: "Plausible distractor 3"
      correctAnswers: ["a"]
      points: 1
      explanation: "Clear explanation of why option A is correct and why others are incorrect"
    
    - id: "q2"
      type: "multiple-choice"
      question: "Multi-select question allowing multiple correct answers"
      allowMultiple: true
      options:
        - id: "a"
          text: "Correct option 1"
        - id: "b"
          text: "Incorrect option"
        - id: "c"
          text: "Correct option 2"
        - id: "d"
          text: "Correct option 3"
      correctAnswers: ["a", "c", "d"]
      points: 2
      explanation: "Explanation covering all correct options and why the incorrect option is wrong"
\`\`\`

\`\`\`markdown
# statement.md
# Multiple Choice Assessment Title

Comprehensive multiple choice assessment covering [subject area]...

## Instructions
- Read each question carefully
- Select the best answer(s) for each question
- Some questions may have multiple correct answers
- Review your selections before submitting

## Question Types
- Single-select: Choose one correct answer
- Multi-select: Choose all correct answers (will be clearly indicated)

## Scoring
- Each question has a point value
- Partial credit may be awarded for multi-select questions
- Passing score: [passingScore]%
\`\`\`

\`\`\`markdown
# answer.md
<!-- This file will contain student answers -->
# Your Answers

Your selected answers will be recorded here.
\`\`\`

**Important Guidelines:**
- Write clear, unambiguous questions
- Create plausible distractors that test common misconceptions
- Ensure all options are grammatically consistent with the question stem
- Avoid "all of the above" or "none of the above" unless necessary
- Provide thorough explanations that educate beyond just identifying the correct answer
- Balance single-select and multi-select questions appropriately
- Test understanding and application, not just recall`,

      user: `Create a {difficulty} difficulty multiple-choice assessment based on this description:

{description}

Please generate all required files following the exact format specified above.`,
      
      examples: multipleChoiceKataExamples
    }
  }
}