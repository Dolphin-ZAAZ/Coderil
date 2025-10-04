import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { FileGeneratorService } from '../file-generator'
import { GeneratedKataContent, Language, KataType, Difficulty } from '@/types'
import * as fs from 'fs'
import * as path from 'path'

// Mock fs operations
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    readFileSync: vi.fn(),
    readdirSync: vi.fn()
  }
})

// Mock path operations
vi.mock('path', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    join: vi.fn((...args) => args.join('/')),
    dirname: vi.fn((p) => p.split('/').slice(0, -1).join('/')),
    basename: vi.fn((p) => p.split('/').pop()),
    resolve: vi.fn((...args) => args.join('/'))
  }
})

describe('FileGeneratorService - Comprehensive Tests', () => {
  let service: FileGeneratorService
  const mockFs = fs as any
  const mockPath = path as any

  beforeEach(() => {
    vi.clearAllMocks()
    service = FileGeneratorService.getInstance()
    
    // Default mock implementations
    mockFs.existsSync.mockReturnValue(false)
    mockFs.mkdirSync.mockReturnValue(undefined)
    mockFs.writeFileSync.mockReturnValue(undefined)
    mockFs.readFileSync.mockReturnValue('')
    mockFs.readdirSync.mockReturnValue([])
    
    mockPath.join.mockImplementation((...args: string[]) => args.join('/'))
    mockPath.dirname.mockImplementation((p: string) => p.split('/').slice(0, -1).join('/'))
    mockPath.basename.mockImplementation((p: string) => p.split('/').pop())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Code Kata File Generation', () => {
    it('should generate complete Python code kata files', async () => {
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

      const result = await service.generateKataFiles(content)

      expect(result.success).toBe(true)
      expect(result.slug).toBe('reverse-string')
      expect(result.path).toContain('reverse-string')
      expect(result.filesCreated).toEqual([
        'meta.yaml',
        'statement.md',
        'entry.py',
        'tests.py',
        'hidden_tests.py',
        'solution.py'
      ])

      // Verify directory creation
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('reverse-string'),
        { recursive: true }
      )

      // Verify file writes
      expect(mockFs.writeFileSync).toHaveBeenCalledTimes(6)
      
      // Check meta.yaml content
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('meta.yaml'),
        expect.stringContaining('slug: reverse-string')
      )
      
      // Check statement.md
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('statement.md'),
        '# Reverse String\n\nCreate a function that reverses a string.'
      )
      
      // Check entry.py
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('entry.py'),
        'def reverse_string(s):\n    # TODO: implement\n    pass'
      )
    })

    it('should generate JavaScript kata with package.json', async () => {
      const content: GeneratedKataContent = {
        metadata: {
          slug: 'array-sum',
          title: 'Array Sum',
          language: 'js' as Language,
          type: 'code' as KataType,
          difficulty: 'easy' as Difficulty,
          tags: ['arrays'],
          entry: 'entry.js',
          test: { kind: 'programmatic', file: 'tests.js' }
        },
        statement: '# Array Sum\n\nSum array elements.',
        starterCode: 'function arraySum(arr) {\n  // TODO\n}',
        testCode: 'console.assert(arraySum([1,2,3]) === 6);',
        solutionCode: 'function arraySum(arr) {\n  return arr.reduce((a,b) => a+b, 0);\n}',
        solutionFiles: {
          'package.json': '{\n  "name": "array-sum",\n  "version": "1.0.0"\n}'
        }
      }

      const result = await service.generateKataFiles(content)

      expect(result.success).toBe(true)
      expect(result.filesCreated).toContain('package.json')
      
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('package.json'),
        '{\n  "name": "array-sum",\n  "version": "1.0.0"\n}'
      )
    })

    it('should generate C++ kata files', async () => {
      const content: GeneratedKataContent = {
        metadata: {
          slug: 'fibonacci-cpp',
          title: 'Fibonacci C++',
          language: 'cpp' as Language,
          type: 'code' as KataType,
          difficulty: 'medium' as Difficulty,
          tags: ['algorithms'],
          entry: 'entry.cpp',
          test: { kind: 'programmatic', file: 'tests.cpp' }
        },
        statement: '# Fibonacci\n\nImplement Fibonacci.',
        starterCode: '#include <iostream>\nint fib(int n) {\n  return 0;\n}',
        testCode: '#include <cassert>\nint main() {\n  assert(fib(5) == 5);\n}',
        solutionCode: 'int fib(int n) {\n  if(n<=1) return n;\n  return fib(n-1)+fib(n-2);\n}'
      }

      const result = await service.generateKataFiles(content)

      expect(result.success).toBe(true)
      expect(result.filesCreated).toEqual([
        'meta.yaml',
        'statement.md',
        'entry.cpp',
        'tests.cpp',
        'solution.cpp'
      ])
    })
  })

  describe('Multi-Question Kata File Generation', () => {
    it('should generate multi-question kata files', async () => {
      const content: GeneratedKataContent = {
        metadata: {
          slug: 'js-quiz',
          title: 'JavaScript Quiz',
          language: 'none' as Language,
          type: 'multi-question' as KataType,
          difficulty: 'medium' as Difficulty,
          tags: ['javascript', 'quiz']
        },
        statement: '# JavaScript Quiz\n\nTest your knowledge.',
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
              question: 'Which are JS data types?',
              allowMultiple: true,
              options: [
                { id: 'a', text: 'string' },
                { id: 'b', text: 'number' }
              ],
              correctAnswers: ['a', 'b'],
              points: 2
            },
            {
              id: 'q2',
              type: 'shortform',
              question: 'What does DOM stand for?',
              acceptableAnswers: ['Document Object Model'],
              caseSensitive: false,
              points: 1
            }
          ]
        }
      }

      const result = await service.generateKataFiles(content)

      expect(result.success).toBe(true)
      expect(result.filesCreated).toEqual([
        'meta.yaml',
        'statement.md',
        'multiQuestion.json'
      ])

      // Verify multiQuestion.json content
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('multiQuestion.json'),
        expect.stringContaining('"title": "JavaScript Quiz"')
      )
    })

    it('should generate shortform kata files', async () => {
      const content: GeneratedKataContent = {
        metadata: {
          slug: 'quick-facts',
          title: 'Quick Facts',
          language: 'none' as Language,
          type: 'shortform' as KataType,
          difficulty: 'easy' as Difficulty,
          tags: ['facts']
        },
        statement: '# Quick Facts\n\nAnswer quickly.',
        starterCode: '',
        testCode: '',
        solutionCode: '',
        shortformConfig: {
          question: 'What is the capital of France?',
          acceptableAnswers: ['Paris', 'paris'],
          caseSensitive: false,
          maxLength: 20
        }
      }

      const result = await service.generateKataFiles(content)

      expect(result.success).toBe(true)
      expect(result.filesCreated).toEqual([
        'meta.yaml',
        'statement.md',
        'shortform.json'
      ])
    })

    it('should generate multiple choice kata files', async () => {
      const content: GeneratedKataContent = {
        metadata: {
          slug: 'data-structures-quiz',
          title: 'Data Structures Quiz',
          language: 'none' as Language,
          type: 'multiple-choice' as KataType,
          difficulty: 'medium' as Difficulty,
          tags: ['data-structures']
        },
        statement: '# Data Structures Quiz\n\nChoose the correct answers.',
        starterCode: '',
        testCode: '',
        solutionCode: '',
        multipleChoiceConfig: {
          question: 'Which are linear data structures?',
          options: [
            { id: 'a', text: 'Array' },
            { id: 'b', text: 'Tree' },
            { id: 'c', text: 'Stack' },
            { id: 'd', text: 'Graph' }
          ],
          correctAnswers: ['a', 'c'],
          allowMultiple: true,
          explanation: 'Arrays and stacks are linear data structures.'
        }
      }

      const result = await service.generateKataFiles(content)

      expect(result.success).toBe(true)
      expect(result.filesCreated).toEqual([
        'meta.yaml',
        'statement.md',
        'multipleChoice.json'
      ])
    })
  })

  describe('Explanation Kata File Generation', () => {
    it('should generate explanation kata with rubric', async () => {
      const content: GeneratedKataContent = {
        metadata: {
          slug: 'explain-recursion',
          title: 'Explain Recursion',
          language: 'none' as Language,
          type: 'explain' as KataType,
          difficulty: 'medium' as Difficulty,
          tags: ['concepts']
        },
        statement: '# Explain Recursion\n\nExplain recursion concepts.',
        starterCode: '',
        testCode: '',
        solutionCode: 'Recursion is a technique where...',
        rubric: {
          criteria: [
            { name: 'accuracy', weight: 0.4, threshold: 0.7 },
            { name: 'clarity', weight: 0.3, threshold: 0.6 },
            { name: 'completeness', weight: 0.3, threshold: 0.6 }
          ]
        }
      }

      const result = await service.generateKataFiles(content)

      expect(result.success).toBe(true)
      expect(result.filesCreated).toEqual([
        'meta.yaml',
        'statement.md',
        'explanation.md',
        'rubric.yaml',
        'solution.md'
      ])

      // Verify rubric.yaml content
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('rubric.yaml'),
        expect.stringContaining('accuracy')
      )
    })
  })

  describe('Template Kata File Generation', () => {
    it('should generate template kata with multiple solution files', async () => {
      const content: GeneratedKataContent = {
        metadata: {
          slug: 'react-component',
          title: 'React Component',
          language: 'js' as Language,
          type: 'template' as KataType,
          difficulty: 'medium' as Difficulty,
          tags: ['react']
        },
        statement: '# React Component\n\nCreate a React component.',
        starterCode: '',
        testCode: '',
        solutionCode: '',
        solutionFiles: {
          'src/Button.jsx': 'import React from "react";\n\nexport default function Button() {\n  return <button>Click me</button>;\n}',
          'src/Button.test.jsx': 'import { render } from "@testing-library/react";\nimport Button from "./Button";\n\ntest("renders", () => {\n  render(<Button />);\n});',
          'package.json': '{\n  "name": "react-button",\n  "dependencies": {\n    "react": "^18.0.0"\n  }\n}',
          'README.md': '# React Button Component\n\nA simple button component.'
        }
      }

      const result = await service.generateKataFiles(content)

      expect(result.success).toBe(true)
      expect(result.filesCreated).toEqual([
        'meta.yaml',
        'statement.md',
        'src/Button.jsx',
        'src/Button.test.jsx',
        'package.json',
        'README.md'
      ])

      // Verify nested directory creation
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('src'),
        { recursive: true }
      )

      // Verify solution files
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('src/Button.jsx'),
        expect.stringContaining('export default function Button')
      )
    })
  })

  describe('Slug Generation and Conflict Resolution', () => {
    it('should generate unique slug when original exists', () => {
      mockFs.existsSync.mockImplementation((path: string) => {
        return path.includes('existing-kata') && !path.includes('existing-kata-2')
      })

      const uniqueSlug = service.generateUniqueSlug('existing-kata')

      expect(uniqueSlug).toBe('existing-kata-2')
    })

    it('should handle multiple conflicts', () => {
      mockFs.existsSync.mockImplementation((path: string) => {
        return path.includes('popular-kata') && 
               !path.includes('popular-kata-5')
      })

      const uniqueSlug = service.generateUniqueSlug('popular-kata')

      expect(uniqueSlug).toBe('popular-kata-5')
    })

    it('should return original slug if no conflict', () => {
      mockFs.existsSync.mockReturnValue(false)

      const uniqueSlug = service.generateUniqueSlug('new-kata')

      expect(uniqueSlug).toBe('new-kata')
    })

    it('should check slug existence correctly', () => {
      mockFs.existsSync.mockReturnValue(true)

      const exists = service.slugExists('existing-kata')

      expect(exists).toBe(true)
      expect(mockFs.existsSync).toHaveBeenCalledWith(
        expect.stringContaining('existing-kata')
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle directory creation failures', async () => {
      const content: GeneratedKataContent = {
        metadata: {
          slug: 'test-kata',
          title: 'Test Kata',
          language: 'py' as Language,
          type: 'code' as KataType,
          difficulty: 'easy' as Difficulty,
          tags: []
        },
        statement: 'Test',
        starterCode: 'def test(): pass',
        testCode: 'def test(): pass',
        solutionCode: 'def test(): pass'
      }

      mockFs.mkdirSync.mockImplementation(() => {
        throw new Error('Permission denied')
      })

      const result = await service.generateKataFiles(content)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Permission denied')
    })

    it('should handle file write failures', async () => {
      const content: GeneratedKataContent = {
        metadata: {
          slug: 'test-kata',
          title: 'Test Kata',
          language: 'py' as Language,
          type: 'code' as KataType,
          difficulty: 'easy' as Difficulty,
          tags: []
        },
        statement: 'Test',
        starterCode: 'def test(): pass',
        testCode: 'def test(): pass',
        solutionCode: 'def test(): pass'
      }

      mockFs.writeFileSync.mockImplementation((path: string) => {
        if (path.includes('meta.yaml')) {
          throw new Error('Disk full')
        }
      })

      const result = await service.generateKataFiles(content)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Disk full')
    })

    it('should handle invalid file paths', async () => {
      const content: GeneratedKataContent = {
        metadata: {
          slug: 'invalid/slug',
          title: 'Invalid Slug',
          language: 'py' as Language,
          type: 'code' as KataType,
          difficulty: 'easy' as Difficulty,
          tags: []
        },
        statement: 'Test',
        starterCode: 'def test(): pass',
        testCode: 'def test(): pass',
        solutionCode: 'def test(): pass'
      }

      const result = await service.generateKataFiles(content)

      expect(result.success).toBe(false)
      expect(result.errors.some(error => error.includes('Invalid slug'))).toBe(true)
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
        multiQuestionConfig: {
          title: 'Test',
          description: 'Test',
          passingScore: 70,
          questions: [] as any // Invalid - circular reference would cause JSON.stringify to fail
        }
      }

      // Mock JSON.stringify to throw
      const originalStringify = JSON.stringify
      JSON.stringify = vi.fn().mockImplementation(() => {
        throw new Error('Converting circular structure to JSON')
      })

      const result = await service.generateKataFiles(content)

      expect(result.success).toBe(false)
      expect(result.errors.some(error => error.includes('JSON'))).toBe(true)

      // Restore original
      JSON.stringify = originalStringify
    })
  })

  describe('File Content Validation', () => {
    it('should validate YAML metadata format', async () => {
      const content: GeneratedKataContent = {
        metadata: {
          slug: 'test-kata',
          title: 'Test Kata',
          language: 'py' as Language,
          type: 'code' as KataType,
          difficulty: 'easy' as Difficulty,
          tags: ['test'],
          entry: 'entry.py',
          test: { kind: 'programmatic', file: 'tests.py' }
        },
        statement: 'Test statement',
        starterCode: 'def test(): pass',
        testCode: 'def test(): pass',
        solutionCode: 'def test(): pass'
      }

      const result = await service.generateKataFiles(content)

      expect(result.success).toBe(true)
      
      // Check that meta.yaml was written with proper YAML format
      const metaYamlCall = mockFs.writeFileSync.mock.calls.find(
        call => call[0].includes('meta.yaml')
      )
      expect(metaYamlCall).toBeDefined()
      expect(metaYamlCall[1]).toContain('slug: test-kata')
      expect(metaYamlCall[1]).toContain('title: "Test Kata"')
      expect(metaYamlCall[1]).toContain('language: py')
    })

    it('should handle special characters in metadata', async () => {
      const content: GeneratedKataContent = {
        metadata: {
          slug: 'unicode-kata',
          title: 'Unicode Test 中文 🚀',
          language: 'py' as Language,
          type: 'code' as KataType,
          difficulty: 'easy' as Difficulty,
          tags: ['unicode', '中文'],
          description: 'Test with unicode: àáâãäåæçèéêë'
        },
        statement: '# Unicode Test 中文 🚀\n\nHandle unicode characters.',
        starterCode: 'def process_unicode(text):\n    # Handle: 中文 🚀\n    pass',
        testCode: 'def test(): pass',
        solutionCode: 'def process_unicode(text): return text'
      }

      const result = await service.generateKataFiles(content)

      expect(result.success).toBe(true)
      
      // Verify unicode characters are preserved
      const metaCall = mockFs.writeFileSync.mock.calls.find(
        call => call[0].includes('meta.yaml')
      )
      expect(metaCall[1]).toContain('中文')
      expect(metaCall[1]).toContain('🚀')
    })
  })

  describe('Performance and Large Files', () => {
    it('should handle large kata content efficiently', async () => {
      const largeCode = 'def function():\n' + '    pass\n'.repeat(10000)
      const largeStatement = '# Large Kata\n\n' + 'This is content. '.repeat(5000)
      
      const content: GeneratedKataContent = {
        metadata: {
          slug: 'large-kata',
          title: 'Large Kata',
          language: 'py' as Language,
          type: 'code' as KataType,
          difficulty: 'easy' as Difficulty,
          tags: []
        },
        statement: largeStatement,
        starterCode: largeCode,
        testCode: 'def test(): pass',
        solutionCode: largeCode
      }

      const startTime = Date.now()
      const result = await service.generateKataFiles(content)
      const endTime = Date.now()

      expect(result.success).toBe(true)
      expect(endTime - startTime).toBeLessThan(1000) // Should complete within 1 second
    })

    it('should handle many solution files efficiently', async () => {
      const solutionFiles: Record<string, string> = {}
      
      // Generate 100 solution files
      for (let i = 0; i < 100; i++) {
        solutionFiles[`src/file${i}.js`] = `// File ${i}\nexport default function file${i}() {\n  return ${i};\n}`
      }

      const content: GeneratedKataContent = {
        metadata: {
          slug: 'many-files-kata',
          title: 'Many Files Kata',
          language: 'js' as Language,
          type: 'template' as KataType,
          difficulty: 'medium' as Difficulty,
          tags: []
        },
        statement: 'Template with many files',
        starterCode: '',
        testCode: '',
        solutionCode: '',
        solutionFiles
      }

      const result = await service.generateKataFiles(content)

      expect(result.success).toBe(true)
      expect(result.filesCreated).toHaveLength(102) // meta.yaml + statement.md + 100 solution files
      expect(mockFs.writeFileSync).toHaveBeenCalledTimes(102)
    })
  })
})