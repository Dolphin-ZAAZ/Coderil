import { describe, it, expect, beforeEach } from 'vitest'
import { PromptEngineService, KataGenerationRequest, VariationOptions } from '../prompt-engine'
import { Language } from 'highlight.js'
import { Language } from 'highlight.js'

describe('PromptEngineService', () => {
  let service: PromptEngineService

  beforeEach(() => {
    service = PromptEngineService.getInstance()
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = PromptEngineService.getInstance()
      const instance2 = PromptEngineService.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('buildCodeKataPrompt', () => {
    it('should generate a complete code kata prompt', () => {
      const request: KataGenerationRequest = {
        description: 'Create a function that reverses a string',
        language: 'py',
        difficulty: 'beginner',
        type: 'code',
        generateHiddenTests: true
      }

      const prompt = service.buildCodeKataPrompt(request)

      expect(prompt).toContain('expert coding instructor')
      expect(prompt).toContain('Python')
      expect(prompt).toContain('beginner')
      expect(prompt).toContain('reverses a string')
      expect(prompt).toContain('meta.yaml')
      expect(prompt).toContain('statement.md')
      expect(prompt).toContain('entry.py')
      expect(prompt).toContain('tests.py')
      expect(prompt).toContain('hidden tests')
    })

    it('should include optional parameters when provided', () => {
      const request: KataGenerationRequest = {
        description: 'Array manipulation challenge',
        language: 'js',
        difficulty: 'intermediate',
        type: 'code',
        topics: ['arrays', 'algorithms'],
        constraints: 'O(n) time complexity',
        tags: ['sorting', 'searching'],
        additionalRequirements: 'Include input validation',
        generateHiddenTests: false
      }

      const prompt = service.buildCodeKataPrompt(request)

      expect(prompt).toContain('arrays, algorithms')
      expect(prompt).toContain('O(n) time complexity')
      expect(prompt).toContain('sorting, searching')
      expect(prompt).toContain('Include input validation')
      expect(prompt).toContain('JavaScript')
    })

    it('should handle different languages correctly', () => {
      const languages = ['py', 'js', 'ts', 'cpp'] as const
      const expectedNames = ['Python', 'JavaScript', 'TypeScript', 'C++']

      languages.forEach((lang, index) => {
        const request: KataGenerationRequest = {
          description: 'Test kata',
          language: lang,
          difficulty: 'beginner',
          type: 'code',
          generateHiddenTests: false
        }

        const prompt = service.buildCodeKataPrompt(request)
        expect(prompt).toContain(expectedNames[index])
      })
    })
  })

  describe('buildExplanationKataPrompt', () => {
    it('should generate a complete explanation kata prompt', () => {
      const request: KataGenerationRequest = {
        description: 'Explain how recursion works',
        language: 'py',
        difficulty: 'intermediate',
        type: 'explain',
        generateHiddenTests: false
      }

      const prompt = service.buildExplanationKataPrompt(request)

      expect(prompt).toContain('technical educator')
      expect(prompt).toContain('explanation-based learning')
      expect(prompt).toContain('recursion works')
      expect(prompt).toContain('intermediate')
      expect(prompt).toContain('explanation.md')
      expect(prompt).toContain('rubric.yaml')
      expect(prompt).toContain('solution.md')
    })

    it('should include evaluation criteria', () => {
      const request: KataGenerationRequest = {
        description: 'Explain sorting algorithms',
        language: 'py',
        difficulty: 'advanced',
        type: 'explain',
        generateHiddenTests: false
      }

      const prompt = service.buildExplanationKataPrompt(request)

      expect(prompt).toContain('Accuracy and correctness')
      expect(prompt).toContain('Clear communication')
      expect(prompt).toContain('Effective use of examples')
      expect(prompt).toContain('Comprehensive coverage')
    })
  })

  describe('buildMultiQuestionKataPrompt', () => {
    it('should generate a complete multi-question kata prompt', () => {
      const request: KataGenerationRequest = {
        description: 'Create a JavaScript fundamentals assessment',
        language: 'js',
        difficulty: 'intermediate',
        type: 'multi-question',
        generateHiddenTests: false
      }

      const prompt = service.buildMultiQuestionKataPrompt(request)

      expect(prompt).toContain('educational content creator')
      expect(prompt).toContain('multi-question kata')
      expect(prompt).toContain('JavaScript fundamentals assessment')
      expect(prompt).toContain('multiQuestion:')
      expect(prompt).toContain('questions:')
      expect(prompt).toContain('multiple-choice')
      expect(prompt).toContain('shortform')
    })
  })

  describe('buildShortformKataPrompt', () => {
    it('should generate a complete shortform kata prompt', () => {
      const request: KataGenerationRequest = {
        description: 'Test programming concepts knowledge',
        language: 'py',
        difficulty: 'beginner',
        type: 'shortform',
        generateHiddenTests: false
      }

      const prompt = service.buildShortformKataPrompt(request)

      expect(prompt).toContain('expert educator')
      expect(prompt).toContain('shortform kata')
      expect(prompt).toContain('programming concepts knowledge')
      expect(prompt).toContain('shortform')
      expect(prompt).toContain('one-liner')
    })
  })

  describe('buildMultipleChoiceKataPrompt', () => {
    it('should generate a complete multiple choice kata prompt', () => {
      const request: KataGenerationRequest = {
        description: 'Web development basics quiz',
        language: 'js',
        difficulty: 'beginner',
        type: 'multiple-choice',
        generateHiddenTests: false
      }

      const prompt = service.buildMultipleChoiceKataPrompt(request)

      expect(prompt).toContain('expert test creator')
      expect(prompt).toContain('multiple-choice kata')
      expect(prompt).toContain('Web development basics quiz')
      expect(prompt).toContain('multiple-choice')
      expect(prompt).toContain('allowMultiple')
      expect(prompt).toContain('correctAnswers')
    })
  })

  describe('buildTemplateKataPrompt', () => {
    it('should generate a complete template kata prompt', () => {
      const request: KataGenerationRequest = {
        description: 'Create a REST API project structure',
        language: 'js',
        difficulty: 'intermediate',
        type: 'template',
        generateHiddenTests: false
      }

      const prompt = service.buildTemplateKataPrompt(request)

      expect(prompt).toContain('software architect')
      expect(prompt).toContain('project template challenges')
      expect(prompt).toContain('REST API project structure')
      expect(prompt).toContain('JavaScript')
      expect(prompt).toContain('rubric.yaml')
      expect(prompt).toContain('directory structure')
    })

    it('should include project evaluation criteria', () => {
      const request: KataGenerationRequest = {
        description: 'Flask web application template',
        language: 'py',
        difficulty: 'advanced',
        type: 'template',
        generateHiddenTests: false
      }

      const prompt = service.buildTemplateKataPrompt(request)

      expect(prompt).toContain('Correct directory structure')
      expect(prompt).toContain('Proper configuration files')
      expect(prompt).toContain('Quality of code implementation')
      expect(prompt).toContain('Clear documentation')
    })
  })

  describe('buildVariationPrompt', () => {
    it('should generate a variation prompt with source kata context', () => {
      const sourceKata = {
        title: 'Two Sum Problem',
        statement: 'Find two numbers that add up to a target',
        language: 'py',
        difficulty: 'beginner'
      }

      const options: VariationOptions = {
        difficultyAdjustment: 'harder',
        focusArea: 'optimization',
        parameterChanges: 'Use three numbers instead of two'
      }

      const prompt = service.buildVariationPrompt(sourceKata, options)

      expect(prompt).toContain('Two Sum Problem')
      expect(prompt).toContain('Find two numbers that add up to a target')
      expect(prompt).toContain('harder')
      expect(prompt).toContain('optimization')
      expect(prompt).toContain('three numbers instead of two')
    })

    it('should handle optional variation parameters', () => {
      const sourceKata = {
        title: 'String Reversal',
        statement: 'Reverse a given string',
        language: 'js',
        difficulty: 'beginner'
      }

      const options: VariationOptions = {
        difficultyAdjustment: 'same',
        seriesName: 'String Manipulation Series'
      }

      const prompt = service.buildVariationPrompt(sourceKata, options)

      expect(prompt).toContain('String Reversal')
      expect(prompt).toContain('same')
      expect(prompt).toContain('String Manipulation Series')
      expect(prompt).not.toContain('Focus area:')
      expect(prompt).not.toContain('Parameter changes:')
    })
  })

  describe('buildKataPrompt', () => {
    it('should route to correct prompt builder based on kata type', () => {
      const baseRequest = {
        description: 'Test kata',
        language: 'py' as Language,
        difficulty: 'beginner' as Difficulty,
        generateHiddenTests: false
      }

      // Test code kata routing
      const codeRequest = { ...baseRequest, type: 'code' as KataType }
      const codePrompt = service.buildKataPrompt(codeRequest)
      expect(codePrompt).toContain('coding instructor')

      // Test explanation kata routing
      const explainRequest = { ...baseRequest, type: 'explain' as KataType }
      const explainPrompt = service.buildKataPrompt(explainRequest)
      expect(explainPrompt).toContain('technical educator')

      // Test multi-question kata routing
      const multiRequest = { ...baseRequest, type: 'multi-question' as KataType }
      const multiPrompt = service.buildKataPrompt(multiRequest)
      expect(multiPrompt).toContain('educational content creator')
    })

    it('should throw error for unsupported kata types', () => {
      const request = {
        description: 'Test kata',
        language: 'py' as Language,
        difficulty: 'beginner' as Difficulty,
        type: 'unsupported' as any,
        generateHiddenTests: false
      }

      expect(() => service.buildKataPrompt(request)).toThrow('Unsupported kata type: unsupported')
    })
  })

  describe('buildSolutionPrompt', () => {
    it('should generate a solution prompt for a given problem', () => {
      const statement = 'Write a function that finds the maximum element in an array'
      const language = 'py'

      const prompt = service.buildSolutionPrompt(statement, language)

      expect(prompt).toContain('expert programmer')
      expect(prompt).toContain('maximum element in an array')
      expect(prompt).toContain('py')
      expect(prompt).toContain('working solution')
      expect(prompt).toContain('error handling')
      expect(prompt).toContain('best practices')
    })

    it('should work with different languages', () => {
      const statement = 'Implement a binary search algorithm'
      
      const languages = ['js', 'ts', 'cpp'] as const
      
      languages.forEach(lang => {
        const prompt = service.buildSolutionPrompt(statement, lang)
        expect(prompt).toContain('binary search algorithm')
        expect(prompt).toContain(lang)
        expect(prompt).toContain('complete, working solution')
      })
    })
  })

  describe('Language Display Names', () => {
    it('should correctly map language codes to display names', () => {
      const testCases = [
        { code: 'py', expected: 'Python' },
        { code: 'js', expected: 'JavaScript' },
        { code: 'ts', expected: 'TypeScript' },
        { code: 'cpp', expected: 'C++' }
      ] as const

      testCases.forEach(({ code, expected }) => {
        const request: KataGenerationRequest = {
          description: 'Test',
          language: code,
          difficulty: 'beginner',
          type: 'code',
          generateHiddenTests: false
        }

        const prompt = service.buildCodeKataPrompt(request)
        expect(prompt).toContain(expected)
      })
    })
  })

  describe('Prompt Structure Validation', () => {
    it('should include required sections in code kata prompts', () => {
      const request: KataGenerationRequest = {
        description: 'Test kata',
        language: 'py',
        difficulty: 'beginner',
        type: 'code',
        generateHiddenTests: true
      }

      const prompt = service.buildCodeKataPrompt(request)

      // Check for required file sections
      expect(prompt).toContain('meta.yaml')
      expect(prompt).toContain('statement.md')
      expect(prompt).toContain('entry.')
      expect(prompt).toContain('tests.')
      expect(prompt).toContain('hidden_tests.')
      expect(prompt).toContain('solution.')

      // Check for metadata structure
      expect(prompt).toContain('slug:')
      expect(prompt).toContain('title:')
      expect(prompt).toContain('language:')
      expect(prompt).toContain('type:')
      expect(prompt).toContain('difficulty:')
      expect(prompt).toContain('testKind:')
    })

    it('should include required sections in explanation kata prompts', () => {
      const request: KataGenerationRequest = {
        description: 'Explain concept',
        language: 'py',
        difficulty: 'intermediate',
        type: 'explain',
        generateHiddenTests: false
      }

      const prompt = service.buildExplanationKataPrompt(request)

      expect(prompt).toContain('explanation.md')
      expect(prompt).toContain('rubric.yaml')
      expect(prompt).toContain('solution.md')
      expect(prompt).toContain('criteria:')
      expect(prompt).toContain('weight:')
      expect(prompt).toContain('threshold:')
    })

    it('should include required sections in template kata prompts', () => {
      const request: KataGenerationRequest = {
        description: 'Create project template',
        language: 'js',
        difficulty: 'advanced',
        type: 'template',
        generateHiddenTests: false
      }

      const prompt = service.buildTemplateKataPrompt(request)

      expect(prompt).toContain('rubric.yaml')
      expect(prompt).toContain('solution.')
      expect(prompt).toContain('directory structure')
      expect(prompt).toContain('configuration files')
    })
  })
})