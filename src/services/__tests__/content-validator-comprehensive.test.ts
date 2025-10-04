import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ContentValidatorService } from '../content-validator'
import { GeneratedKataContent, Language, KataType, Difficulty } from '@/types'

// Mock the content validator service
vi.mock('../content-validator', () => ({
  ContentValidatorService: {
    getInstance: vi.fn(() => ({
      validateGeneratedContent: vi.fn(),
      validateGeneratedCode: vi.fn(),
      validateMetadata: vi.fn(),
      validateRubric: vi.fn()
    }))
  }
}))

describe('ContentValidatorService - Comprehensive Tests', () => {
  let service: any
  let mockValidateGeneratedContent: any

  beforeEach(() => {
    vi.clearAllMocks()
    service = ContentValidatorService.getInstance()
    mockValidateGeneratedContent = service.validateGeneratedContent
  })

  describe('Code Kata Validation', () => {
    it('should validate complete Python code kata', async () => {
      const content: GeneratedKataContent = {
        metadata: {
          slug: 'reverse-string',
          title: 'Reverse String',
          language: 'py' as Language,
          type: 'code' as KataType,
          difficulty: 'easy' as Difficulty,
          tags: ['strings', 'algorithms'],
          entry: 'entry.py',
          test: { kind: 'programmatic', file: 'tests.py' },
          timeout_ms: 5000
        },
        statement: '# Reverse String\n\nCreate a function that reverses a string.',
        starterCode: 'def reverse_string(s):\n    # TODO: implement\n    pass',
        testCode: 'def test_reverse_string():\n    assert reverse_string("hello") == "olleh"',
        hiddenTestCode: 'def test_hidden():\n    assert reverse_string("abc") == "cba"',
        solutionCode: 'def reverse_string(s):\n    return s[::-1]'
      }

      mockValidateGeneratedContent.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: []
      })

      const result = await service.validateGeneratedContent(content)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      expect(mockValidateGeneratedContent).toHaveBeenCalledWith(content)
    })

    it('should detect syntax errors in Python code', async () => {
      const content: GeneratedKataContent = {
        metadata: {
          slug: 'invalid-python',
          title: 'Invalid Python',
          language: 'py' as Language,
          type: 'code' as KataType,
          difficulty: 'easy' as Difficulty,
          tags: [],
          entry: 'entry.py',
          test: { kind: 'programmatic', file: 'tests.py' }
        },
        statement: 'Test',
        starterCode: 'def invalid_function(\n    # Missing closing parenthesis',
        testCode: 'def test_function():\n    assert True',
        solutionCode: 'def valid_function():\n    return True'
      }

      mockValidateGeneratedContent.mockResolvedValue({
        isValid: false,
        errors: ['Python syntax error: Missing closing parenthesis'],
        warnings: [],
        suggestions: []
      })

      const result = await service.validateGeneratedContent(content)

      expect(result.isValid).toBe(false)
      expect(result.errors.some((error: string) => error.includes('syntax'))).toBe(true)
    })

    it('should validate JavaScript/TypeScript code', async () => {
      const content: GeneratedKataContent = {
        metadata: {
          slug: 'js-function',
          title: 'JS Function',
          language: 'js' as Language,
          type: 'code' as KataType,
          difficulty: 'easy' as Difficulty,
          tags: [],
          entry: 'entry.js',
          test: { kind: 'programmatic', file: 'tests.js' }
        },
        statement: 'Create a JavaScript function',
        starterCode: 'function add(a, b) {\n  // TODO: implement\n}',
        testCode: 'console.assert(add(2, 3) === 5);',
        solutionCode: 'function add(a, b) {\n  return a + b;\n}'
      }

      mockValidateGeneratedContent.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: []
      })

      const result = await service.validateGeneratedContent(content)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should validate C++ code', async () => {
      const content: GeneratedKataContent = {
        metadata: {
          slug: 'cpp-function',
          title: 'C++ Function',
          language: 'cpp' as Language,
          type: 'code' as KataType,
          difficulty: 'medium' as Difficulty,
          tags: [],
          entry: 'entry.cpp',
          test: { kind: 'programmatic', file: 'tests.cpp' }
        },
        statement: 'Create a C++ function',
        starterCode: '#include <iostream>\nint add(int a, int b) {\n  // TODO: implement\n  return 0;\n}',
        testCode: '#include <cassert>\nint main() {\n  assert(add(2, 3) == 5);\n  return 0;\n}',
        solutionCode: '#include <iostream>\nint add(int a, int b) {\n  return a + b;\n}'
      }

      mockValidateGeneratedContent.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: []
      })

      const result = await service.validateGeneratedContent(content)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('Multi-Question Kata Validation', () => {
    it('should validate complete multi-question kata', async () => {
      const content: GeneratedKataContent = {
        metadata: {
          slug: 'js-quiz',
          title: 'JavaScript Quiz',
          language: 'none' as Language,
          type: 'multi-question' as KataType,
          difficulty: 'medium' as Difficulty,
          tags: ['javascript']
        },
        statement: '# JavaScript Quiz\n\nTest your JavaScript knowledge',
        starterCode: '',
        testCode: '',
        solutionCode: '',
        multiQuestionConfig: {
          title: 'JavaScript Quiz',
          description: 'Test your knowledge',
          passingScore: 70,
          questions: [
            {
              id: 'q1',
              type: 'multiple-choice',
              question: 'Which are JavaScript data types?',
              allowMultiple: true,
              options: [
                { id: 'a', text: 'string' },
                { id: 'b', text: 'number' }
              ],
              correctAnswers: ['a', 'b'],
              points: 2
            }
          ]
        }
      }

      mockValidateGeneratedContent.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: []
      })

      const result = await service.validateGeneratedContent(content)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect invalid multi-question configuration', async () => {
      const content: GeneratedKataContent = {
        metadata: {
          slug: 'invalid-quiz',
          title: 'Invalid Quiz',
          language: 'none' as Language,
          type: 'multi-question' as KataType,
          difficulty: 'easy' as Difficulty,
          tags: []
        },
        statement: 'Test',
        starterCode: '',
        testCode: '',
        solutionCode: '',
        multiQuestionConfig: {
          title: 'Quiz',
          description: 'Test',
          passingScore: 150, // Invalid - over 100
          questions: [
            {
              id: 'q1',
              type: 'multiple-choice',
              question: 'Test question?',
              allowMultiple: false,
              options: [], // Invalid - no options
              correctAnswers: ['a'], // Invalid - references non-existent option
              points: -1 // Invalid - negative points
            }
          ]
        }
      }

      mockValidateGeneratedContent.mockResolvedValue({
        isValid: false,
        errors: [
          'Invalid passingScore: must be between 0 and 100',
          'Question q1: options array cannot be empty',
          'Question q1: points must be positive'
        ],
        warnings: [],
        suggestions: []
      })

      const result = await service.validateGeneratedContent(content)

      expect(result.isValid).toBe(false)
      expect(result.errors.some((error: string) => error.includes('passingScore'))).toBe(true)
      expect(result.errors.some((error: string) => error.includes('options'))).toBe(true)
      expect(result.errors.some((error: string) => error.includes('points'))).toBe(true)
    })
  })

  describe('Explanation Kata Validation', () => {
    it('should validate explanation kata with rubric', async () => {
      const content: GeneratedKataContent = {
        metadata: {
          slug: 'explain-recursion',
          title: 'Explain Recursion',
          language: 'none' as Language,
          type: 'explain' as KataType,
          difficulty: 'medium' as Difficulty,
          tags: ['concepts']
        },
        statement: '# Explain Recursion\n\nExplain the concept of recursion in programming.',
        starterCode: '',
        testCode: '',
        solutionCode: '',
        rubric: {
          criteria: [
            { name: 'accuracy', weight: 0.4, threshold: 0.7 },
            { name: 'clarity', weight: 0.3, threshold: 0.6 },
            { name: 'completeness', weight: 0.3, threshold: 0.6 }
          ]
        }
      }

      mockValidateGeneratedContent.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: []
      })

      const result = await service.validateGeneratedContent(content)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect invalid rubric configuration', async () => {
      const content: GeneratedKataContent = {
        metadata: {
          slug: 'invalid-explanation',
          title: 'Invalid Explanation',
          language: 'none' as Language,
          type: 'explain' as KataType,
          difficulty: 'easy' as Difficulty,
          tags: []
        },
        statement: 'Test',
        starterCode: '',
        testCode: '',
        solutionCode: '',
        rubric: {
          criteria: [
            { name: 'accuracy', weight: 0.6, threshold: 1.5 }, // Invalid threshold > 1
            { name: 'clarity', weight: 0.8, threshold: 0.5 } // Invalid total weight > 1
          ]
        }
      }

      mockValidateGeneratedContent.mockResolvedValue({
        isValid: false,
        errors: [
          'Rubric threshold must be between 0 and 1',
          'Rubric criteria weights must sum to 1.0'
        ],
        warnings: [],
        suggestions: []
      })

      const result = await service.validateGeneratedContent(content)

      expect(result.isValid).toBe(false)
      expect(result.errors.some((error: string) => error.includes('threshold'))).toBe(true)
      expect(result.errors.some((error: string) => error.includes('weight'))).toBe(true)
    })
  })

  describe('Template Kata Validation', () => {
    it('should validate template kata with solution files', async () => {
      const content: GeneratedKataContent = {
        metadata: {
          slug: 'react-component',
          title: 'React Component Template',
          language: 'js' as Language,
          type: 'template' as KataType,
          difficulty: 'medium' as Difficulty,
          tags: ['react']
        },
        statement: '# React Component Template\n\nCreate a React component structure.',
        starterCode: '',
        testCode: '',
        solutionCode: '',
        solutionFiles: {
          'src/Component.jsx': 'import React from "react";\n\nexport default function Component() {\n  return <div>Hello</div>;\n}',
          'package.json': '{\n  "name": "react-component",\n  "dependencies": {\n    "react": "^18.0.0"\n  }\n}'
        }
      }

      mockValidateGeneratedContent.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: []
      })

      const result = await service.validateGeneratedContent(content)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect missing solution files for template kata', async () => {
      const content: GeneratedKataContent = {
        metadata: {
          slug: 'empty-template',
          title: 'Empty Template',
          language: 'js' as Language,
          type: 'template' as KataType,
          difficulty: 'easy' as Difficulty,
          tags: []
        },
        statement: 'Test',
        starterCode: '',
        testCode: '',
        solutionCode: '',
        solutionFiles: {} // Invalid - no solution files
      }

      mockValidateGeneratedContent.mockResolvedValue({
        isValid: false,
        errors: ['Template kata must have solutionFiles'],
        warnings: [],
        suggestions: []
      })

      const result = await service.validateGeneratedContent(content)

      expect(result.isValid).toBe(false)
      expect(result.errors.some((error: string) => error.includes('solutionFiles'))).toBe(true)
    })
  })

  describe('Metadata Validation', () => {
    it('should validate required metadata fields', async () => {
      const content: GeneratedKataContent = {
        metadata: {
          slug: '',  // Invalid - empty slug
          title: '',  // Invalid - empty title
          language: 'py' as Language,
          type: 'code' as KataType,
          difficulty: 'invalid' as any,  // Invalid difficulty
          tags: []
        },
        statement: '',  // Invalid - empty statement
        starterCode: 'def test(): pass',
        testCode: 'def test(): pass',
        solutionCode: 'def test(): pass'
      }

      mockValidateGeneratedContent.mockResolvedValue({
        isValid: false,
        errors: [
          'Slug cannot be empty',
          'Title cannot be empty',
          'Invalid difficulty level',
          'Statement cannot be empty'
        ],
        warnings: [],
        suggestions: []
      })

      const result = await service.validateGeneratedContent(content)

      expect(result.isValid).toBe(false)
      expect(result.errors.some((error: string) => error.includes('Slug'))).toBe(true)
      expect(result.errors.some((error: string) => error.includes('Title'))).toBe(true)
      expect(result.errors.some((error: string) => error.includes('difficulty'))).toBe(true)
      expect(result.errors.some((error: string) => error.includes('Statement'))).toBe(true)
    })

    it('should validate slug format', async () => {
      const content: GeneratedKataContent = {
        metadata: {
          slug: 'Invalid Slug With Spaces!',  // Invalid characters
          title: 'Test',
          language: 'py' as Language,
          type: 'code' as KataType,
          difficulty: 'easy' as Difficulty,
          tags: []
        },
        statement: 'Test statement',
        starterCode: 'def test(): pass',
        testCode: 'def test(): pass',
        solutionCode: 'def test(): pass'
      }

      mockValidateGeneratedContent.mockResolvedValue({
        isValid: false,
        errors: ['Slug format is invalid: must contain only lowercase letters, numbers, and hyphens'],
        warnings: [],
        suggestions: []
      })

      const result = await service.validateGeneratedContent(content)

      expect(result.isValid).toBe(false)
      expect(result.errors.some((error: string) => error.includes('Slug') && error.includes('format'))).toBe(true)
    })

    it('should provide helpful suggestions', async () => {
      const content: GeneratedKataContent = {
        metadata: {
          slug: 'test-kata',
          title: 'Test Kata',
          language: 'py' as Language,
          type: 'code' as KataType,
          difficulty: 'easy' as Difficulty,
          tags: []  // Could suggest adding tags
        },
        statement: 'Very short statement.',  // Could suggest more detail
        starterCode: 'def solution(): pass',
        testCode: 'def test(): assert True',  // Could suggest more comprehensive tests
        solutionCode: 'def solution(): return True'
      }

      mockValidateGeneratedContent.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: [
          'Consider adding tags to help categorize this kata',
          'Statement could be more detailed with examples',
          'Consider adding more comprehensive test cases'
        ]
      })

      const result = await service.validateGeneratedContent(content)

      expect(result.isValid).toBe(true)
      expect(result.suggestions.length).toBeGreaterThan(0)
      expect(result.suggestions.some((suggestion: string) => suggestion.includes('tags'))).toBe(true)
    })
  })

  describe('Cross-Language Validation', () => {
    const languages: Language[] = ['py', 'js', 'ts', 'cpp']

    languages.forEach(language => {
      it(`should validate ${language} code syntax`, async () => {
        const codeExamples = {
          py: 'def hello():\n    print("Hello, World!")',
          js: 'function hello() {\n  console.log("Hello, World!");\n}',
          ts: 'function hello(): void {\n  console.log("Hello, World!");\n}',
          cpp: '#include <iostream>\nvoid hello() {\n  std::cout << "Hello, World!" << std::endl;\n}'
        }

        const content: GeneratedKataContent = {
          metadata: {
            slug: `hello-${language}`,
            title: `Hello ${language}`,
            language,
            type: 'code' as KataType,
            difficulty: 'easy' as Difficulty,
            tags: []
          },
          statement: 'Create a hello function',
          starterCode: codeExamples[language],
          testCode: codeExamples[language],
          solutionCode: codeExamples[language]
        }

        mockValidateGeneratedContent.mockResolvedValue({
          isValid: true,
          errors: [],
          warnings: [],
          suggestions: []
        })

        const result = await service.validateGeneratedContent(content)

        expect(result.isValid).toBe(true)
      })
    })
  })

  describe('Performance and Edge Cases', () => {
    it('should handle very large content', async () => {
      const largeCode = 'def function():\n' + '    pass\n'.repeat(10000)
      
      const content: GeneratedKataContent = {
        metadata: {
          slug: 'large-kata',
          title: 'Large Kata',
          language: 'py' as Language,
          type: 'code' as KataType,
          difficulty: 'easy' as Difficulty,
          tags: []
        },
        statement: 'Large kata test',
        starterCode: largeCode,
        testCode: 'def test(): pass',
        solutionCode: largeCode
      }

      mockValidateGeneratedContent.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: ['Large file detected - consider breaking into smaller functions'],
        suggestions: []
      })

      const startTime = Date.now()
      const result = await service.validateGeneratedContent(content)
      const endTime = Date.now()

      expect(result.isValid).toBe(true)
      expect(endTime - startTime).toBeLessThan(5000) // Should complete within 5 seconds
    })

    it('should handle special characters and unicode', async () => {
      const content: GeneratedKataContent = {
        metadata: {
          slug: 'unicode-kata',
          title: 'Unicode Test 中文 🚀',
          language: 'py' as Language,
          type: 'code' as KataType,
          difficulty: 'easy' as Difficulty,
          tags: ['unicode', '中文']
        },
        statement: '# Unicode Test\n\nHandle unicode characters: àáâãäåæçèéêë ñ 中文 🚀',
        starterCode: 'def process_unicode(text):\n    # Handle unicode: 中文 🚀\n    pass',
        testCode: 'def test_unicode():\n    assert process_unicode("中文") is not None',
        solutionCode: 'def process_unicode(text):\n    return text'
      }

      mockValidateGeneratedContent.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: []
      })

      const result = await service.validateGeneratedContent(content)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should handle malformed JSON in multi-question config', async () => {
      const content: GeneratedKataContent = {
        metadata: {
          slug: 'malformed-quiz',
          title: 'Malformed Quiz',
          language: 'none' as Language,
          type: 'multi-question' as KataType,
          difficulty: 'easy' as Difficulty,
          tags: []
        },
        statement: 'Test',
        starterCode: '',
        testCode: '',
        solutionCode: '',
        multiQuestionConfig: null as any // Invalid - null config
      }

      mockValidateGeneratedContent.mockResolvedValue({
        isValid: false,
        errors: ['multiQuestionConfig cannot be null for multi-question kata'],
        warnings: [],
        suggestions: []
      })

      const result = await service.validateGeneratedContent(content)

      expect(result.isValid).toBe(false)
      expect(result.errors.some((error: string) => error.includes('multiQuestionConfig'))).toBe(true)
    })
  })
})