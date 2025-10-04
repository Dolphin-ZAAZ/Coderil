import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import { FileGeneratorService } from '../file-generator'
import { 
  GeneratedKataContent, 
  KataMetadata, 
  MultiQuestionConfig,
  ShortformConfig,
  OneLinerConfig,
  MultipleChoiceConfig,
  Rubric
} from '@/types'

// Mock fs module
vi.mock('fs')
vi.mock('path')
vi.mock('js-yaml')

const mockFs = fs as any
const mockPath = path as any
const mockYaml = yaml as any

describe('FileGeneratorService', () => {
  let service: FileGeneratorService
  let mockKatasDir: string

  beforeEach(() => {
    vi.clearAllMocks()
    mockKatasDir = '/test/katas'
    
    // Reset singleton
    ;(FileGeneratorService as any).instance = undefined
    service = FileGeneratorService.getInstance(mockKatasDir)

    // Setup default path mocks
    mockPath.join.mockImplementation((...args: string[]) => args.join('/'))
    mockPath.dirname.mockImplementation((p: string) => p.split('/').slice(0, -1).join('/'))
    mockPath.basename.mockImplementation((p: string) => p.split('/').pop() || '')
    
    // Setup default yaml mock
    mockYaml.dump.mockImplementation((obj: any) => `yaml: ${JSON.stringify(obj)}`)
  })

  describe('generateKataFiles', () => {
    it('should generate files for a code kata', async () => {
      const content: GeneratedKataContent = {
        metadata: {
          slug: 'test-kata',
          title: 'Test Kata',
          language: 'py',
          type: 'code',
          difficulty: 'easy',
          tags: ['test'],
          entry: 'entry.py',
          test: { kind: 'programmatic', file: 'tests.py' },
          timeout_ms: 5000
        },
        statement: '# Test Statement',
        starterCode: 'def test(): pass',
        testCode: 'def test_test(): assert True',
        solutionCode: 'def test(): return True'
      }

      mockFs.existsSync.mockReturnValue(false)
      mockFs.mkdirSync.mockImplementation()
      mockFs.writeFileSync.mockImplementation()

      const result = await service.generateKataFiles(content)

      expect(result.success).toBe(true)
      expect(result.slug).toBe('test-kata')
      expect(result.filesCreated).toContain('meta.yaml')
      expect(result.filesCreated).toContain('statement.md')
      expect(result.filesCreated).toContain('entry.py')
      expect(result.filesCreated).toContain('tests.py')
      expect(result.filesCreated).toContain('solution.py')
      expect(result.errors).toHaveLength(0)
    })

    it('should generate files for a multi-question kata', async () => {
      const multiQuestionConfig: MultiQuestionConfig = {
        title: 'Test Assessment',
        questions: [
          {
            id: 'q1',
            type: 'shortform',
            question: 'What is 2+2?',
            expectedAnswer: '4',
            points: 1
          },
          {
            id: 'q2',
            type: 'multiple-choice',
            question: 'Which is correct?',
            options: [
              { id: 'a', text: 'Option A' },
              { id: 'b', text: 'Option B' }
            ],
            correctAnswers: ['a'],
            points: 2
          }
        ],
        passingScore: 70
      }

      const content: GeneratedKataContent = {
        metadata: {
          slug: 'test-assessment',
          title: 'Test Assessment',
          language: 'none',
          type: 'multi-question',
          difficulty: 'medium',
          tags: ['assessment'],
          entry: 'answer.md',
          test: { kind: 'none', file: 'none' },
          timeout_ms: 0
        },
        statement: '# Test Assessment',
        starterCode: '',
        testCode: '',
        multiQuestionConfig
      }

      mockFs.existsSync.mockReturnValue(false)
      mockFs.mkdirSync.mockImplementation()
      mockFs.writeFileSync.mockImplementation()

      const result = await service.generateKataFiles(content)

      expect(result.success).toBe(true)
      expect(result.filesCreated).toContain('meta.yaml')
      expect(result.filesCreated).toContain('statement.md')
      expect(result.filesCreated).toContain('answer.md')
      expect(result.filesCreated).toContain('config.yaml')
      expect(result.errors).toHaveLength(0)
    })

    it('should generate files for an explanation kata', async () => {
      const rubric: Rubric = {
        keys: ['clarity', 'correctness', 'completeness'],
        threshold: {
          min_total: 70,
          min_correctness: 60
        }
      }

      const content: GeneratedKataContent = {
        metadata: {
          slug: 'explain-test',
          title: 'Explain Test',
          language: 'none',
          type: 'explain',
          difficulty: 'medium',
          tags: ['explanation'],
          entry: 'explanation.md',
          test: { kind: 'none', file: '' },
          timeout_ms: 0
        },
        statement: '# Explain This Concept',
        starterCode: '',
        testCode: '',
        solutionCode: '# Reference explanation',
        rubric
      }

      mockFs.existsSync.mockReturnValue(false)
      mockFs.mkdirSync.mockImplementation()
      mockFs.writeFileSync.mockImplementation()

      const result = await service.generateKataFiles(content)

      expect(result.success).toBe(true)
      expect(result.filesCreated).toContain('meta.yaml')
      expect(result.filesCreated).toContain('statement.md')
      expect(result.filesCreated).toContain('explanation.md')
      expect(result.filesCreated).toContain('solution.md')
      expect(result.filesCreated).toContain('rubric.yaml')
      expect(result.errors).toHaveLength(0)
    })

    it('should generate files for a template kata', async () => {
      const content: GeneratedKataContent = {
        metadata: {
          slug: 'template-test',
          title: 'Template Test',
          language: 'py',
          type: 'template',
          difficulty: 'hard',
          tags: ['template'],
          entry: 'template/',
          test: { kind: 'none', file: '' },
          timeout_ms: 10000
        },
        statement: '# Create This Template',
        starterCode: '',
        testCode: '',
        solutionCode: '# Reference implementation',
        solutionFiles: {
          'app.py': 'from flask import Flask\napp = Flask(__name__)',
          'requirements.txt': 'flask==2.0.0',
          'config/settings.py': 'DEBUG = True'
        },
        rubric: {
          keys: ['structure', 'completeness'],
          threshold: { min_total: 70, min_correctness: 60 }
        }
      }

      mockFs.existsSync.mockReturnValue(false)
      mockFs.mkdirSync.mockImplementation()
      mockFs.writeFileSync.mockImplementation()

      const result = await service.generateKataFiles(content)

      expect(result.success).toBe(true)
      expect(result.filesCreated).toContain('meta.yaml')
      expect(result.filesCreated).toContain('statement.md')
      expect(result.filesCreated).toContain('template/app.py')
      expect(result.filesCreated).toContain('template/requirements.txt')
      expect(result.filesCreated).toContain('template/config/settings.py')
      expect(result.filesCreated).toContain('solution.py')
      expect(result.filesCreated).toContain('rubric.yaml')
      expect(result.errors).toHaveLength(0)
    })

    it('should handle slug conflicts with overwrite resolution', async () => {
      const content: GeneratedKataContent = {
        metadata: {
          slug: 'existing-kata',
          title: 'Existing Kata',
          language: 'js',
          type: 'code',
          difficulty: 'easy',
          tags: ['test'],
          entry: 'entry.js',
          test: { kind: 'programmatic', file: 'tests.js' },
          timeout_ms: 3000
        },
        statement: '# Test Statement',
        starterCode: 'function test() {}',
        testCode: 'test();'
      }

      // Mock existing directory - first call returns true (exists), subsequent calls return false (after removal)
      let callCount = 0
      mockFs.existsSync.mockImplementation((path: string) => {
        if (path.includes('existing-kata')) {
          callCount++
          return callCount === 1 // Only first call returns true
        }
        if (path.includes('/test/katas')) {
          return true // Katas directory exists
        }
        return false
      })
      mockFs.rmSync.mockImplementation(() => {})
      mockFs.mkdirSync.mockImplementation(() => {})
      mockFs.writeFileSync.mockImplementation(() => {})

      const result = await service.generateKataFiles(content, {
        action: 'overwrite'
      })

      expect(result.success).toBe(true)
      expect(result.slug).toBe('existing-kata')
      expect(mockFs.rmSync).toHaveBeenCalledWith(
        expect.stringContaining('existing-kata'),
        { recursive: true, force: true }
      )
    })

    it('should handle slug conflicts with rename resolution', async () => {
      const content: GeneratedKataContent = {
        metadata: {
          slug: 'existing-kata',
          title: 'Existing Kata',
          language: 'js',
          type: 'code',
          difficulty: 'easy',
          tags: ['test'],
          entry: 'entry.js',
          test: { kind: 'programmatic', file: 'tests.js' },
          timeout_ms: 3000
        },
        statement: '# Test Statement',
        starterCode: 'function test() {}',
        testCode: 'test();'
      }

      // Mock existing directory for original slug only
      mockFs.existsSync.mockImplementation((path) => {
        return path.toString().includes('existing-kata') && !path.toString().includes('new-kata')
      })
      mockFs.mkdirSync.mockImplementation()
      mockFs.writeFileSync.mockImplementation()

      const result = await service.generateKataFiles(content, {
        action: 'rename',
        newSlug: 'new-kata'
      })

      expect(result.success).toBe(true)
      expect(result.slug).toBe('new-kata')
      expect(content.metadata.slug).toBe('new-kata')
    })

    it('should handle file write errors gracefully', async () => {
      const content: GeneratedKataContent = {
        metadata: {
          slug: 'error-kata',
          title: 'Error Kata',
          language: 'py',
          type: 'code',
          difficulty: 'easy',
          tags: ['test'],
          entry: 'entry.py',
          test: { kind: 'programmatic', file: 'tests.py' },
          timeout_ms: 5000
        },
        statement: '# Test Statement',
        starterCode: 'def test(): pass',
        testCode: 'def test_test(): assert True'
      }

      mockFs.existsSync.mockReturnValue(false)
      mockFs.mkdirSync.mockImplementation()
      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('Write failed')
      })

      const result = await service.generateKataFiles(content)

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toContain('Write failed')
    })
  })

  describe('slug management', () => {
    it('should detect existing slugs', () => {
      mockFs.existsSync.mockReturnValue(true)
      
      const exists = service.slugExists('existing-kata')
      
      expect(exists).toBe(true)
      expect(mockFs.existsSync).toHaveBeenCalledWith(
        expect.stringContaining('existing-kata')
      )
    })

    it('should generate unique slugs', () => {
      mockFs.existsSync.mockImplementation((path) => {
        const pathStr = path.toString()
        return pathStr.includes('base-kata') && !pathStr.includes('base-kata-2')
      })

      const uniqueSlug = service.generateUniqueSlug('base-kata')
      
      expect(uniqueSlug).toBe('base-kata-2')
    })

    it('should return original slug if no conflict', () => {
      mockFs.existsSync.mockReturnValue(false)

      const uniqueSlug = service.generateUniqueSlug('unique-kata')
      
      expect(uniqueSlug).toBe('unique-kata')
    })
  })

  describe('directory management', () => {
    it('should get and set katas directory', () => {
      expect(service.getKatasDirectory()).toBe(mockKatasDir)
      
      service.setKatasDirectory('/new/path')
      expect(service.getKatasDirectory()).toBe('/new/path')
    })
  })

  describe('error handling', () => {
    it('should handle missing conflict resolution for existing slug', async () => {
      const content: GeneratedKataContent = {
        metadata: {
          slug: 'existing-kata',
          title: 'Existing Kata',
          language: 'js',
          type: 'code',
          difficulty: 'easy',
          tags: ['test'],
          entry: 'entry.js',
          test: { kind: 'programmatic', file: 'tests.js' },
          timeout_ms: 3000
        },
        statement: '# Test Statement',
        starterCode: 'function test() {}',
        testCode: 'test();'
      }

      mockFs.existsSync.mockReturnValue(true)

      const result = await service.generateKataFiles(content)

      expect(result.success).toBe(false)
      expect(result.errors[0]).toContain('already exists')
    })

    it('should handle invalid conflict resolution action', async () => {
      const content: GeneratedKataContent = {
        metadata: {
          slug: 'existing-kata',
          title: 'Existing Kata',
          language: 'js',
          type: 'code',
          difficulty: 'easy',
          tags: ['test'],
          entry: 'entry.js',
          test: { kind: 'programmatic', file: 'tests.js' },
          timeout_ms: 3000
        },
        statement: '# Test Statement',
        starterCode: 'function test() {}',
        testCode: 'test();'
      }

      mockFs.existsSync.mockReturnValue(true)

      const result = await service.generateKataFiles(content, {
        action: 'invalid' as any
      })

      expect(result.success).toBe(false)
      expect(result.errors[0]).toContain('Unknown conflict resolution action')
    })
  })
})