import { describe, it, expect, beforeEach } from 'vitest'
import { PromptEngineService } from '../prompt-engine'
import { Language, KataType, Difficulty } from '@/types'

describe('PromptEngineService', () => {
  let service: PromptEngineService

  beforeEach(() => {
    service = PromptEngineService.getInstance()
  })

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = PromptEngineService.getInstance()
      const instance2 = PromptEngineService.getInstance()
      
      expect(instance1).toBe(instance2)
    })
  })

  describe('buildCodeKataPrompt', () => {
    it('should build a basic code kata prompt', () => {
      const request = {
        description: 'Create a function to reverse a string',
        language: 'py' as Language,
        difficulty: 'easy' as Difficulty,
        type: 'code' as KataType,
        generateHiddenTests: false
      }

      const prompt = service.buildCodeKataPrompt(request)

      expect(prompt).toContain('Create a function to reverse a string')
      expect(prompt).toContain('Python')
      expect(prompt).toContain('easy')
      expect(prompt).toContain('code')
      expect(prompt).toContain('py')
    })

    it('should include optional fields when provided', () => {
      const request = {
        description: 'Create a sorting algorithm',
        language: 'js' as Language,
        difficulty: 'medium' as Difficulty,
        type: 'code' as KataType,
        topics: ['algorithms', 'sorting'],
        constraints: 'Use O(n log n) time complexity',
        tags: ['algorithms', 'performance'],
        generateHiddenTests: true,
        additionalRequirements: 'Include edge cases for empty arrays'
      }

      const prompt = service.buildCodeKataPrompt(request)

      expect(prompt).toContain('algorithms, sorting')
      expect(prompt).toContain('Use O(n log n) time complexity')
      expect(prompt).toContain('algorithms, performance')
      expect(prompt).toContain('Include edge cases for empty arrays')
      expect(prompt).toContain('hidden tests')
    })

    it('should handle different languages correctly', () => {
      const languages: Language[] = ['py', 'js', 'ts', 'cpp']
      
      languages.forEach(language => {
        const request = {
          description: 'Test function',
          language,
          difficulty: 'easy' as Difficulty,
          type: 'code' as KataType,
          generateHiddenTests: false
        }

        const prompt = service.buildCodeKataPrompt(request)
        
        // Should contain language-specific information
        expect(prompt).toContain(language)
        
        // Should contain appropriate file extension
        const expectedExtensions = { py: 'py', js: 'js', ts: 'ts', cpp: 'cpp' }
        expect(prompt).toContain(expectedExtensions[language])
      })
    })

    it('should handle different difficulty levels', () => {
      const difficulties: Difficulty[] = ['easy', 'medium', 'hard']
      
      difficulties.forEach(difficulty => {
        const request = {
          description: 'Test function',
          language: 'py' as Language,
          difficulty,
          type: 'code' as KataType,
          generateHiddenTests: false
        }

        const prompt = service.buildCodeKataPrompt(request)
        
        expect(prompt).toContain(difficulty)
      })
    })
  })

  describe('buildExplanationKataPrompt', () => {
    it('should build an explanation kata prompt', () => {
      const request = {
        description: 'Explain the concept of recursion',
        language: 'none' as Language,
        difficulty: 'medium' as Difficulty,
        type: 'explain' as KataType,
        generateHiddenTests: false
      }

      const prompt = service.buildExplanationKataPrompt(request)

      expect(prompt).toContain('Explain the concept of recursion')
      expect(prompt).toContain('explanation')
      expect(prompt).toContain('medium')
      expect(prompt).toContain('rubric')
      expect(prompt).toContain('criteria')
    })

    it('should include evaluation criteria in explanation prompts', () => {
      const request = {
        description: 'Explain Big O notation',
        language: 'none' as Language,
        difficulty: 'hard' as Difficulty,
        type: 'explain' as KataType,
        generateHiddenTests: false
      }

      const prompt = service.buildExplanationKataPrompt(request)

      expect(prompt).toContain('accuracy')
      expect(prompt).toContain('clarity')
      expect(prompt).toContain('examples')
      expect(prompt).toContain('completeness')
    })
  })

  describe('buildTemplateKataPrompt', () => {
    it('should build a template kata prompt', () => {
      const request = {
        description: 'Create a React component library structure',
        language: 'js' as Language,
        difficulty: 'medium' as Difficulty,
        type: 'template' as KataType,
        generateHiddenTests: false
      }

      const prompt = service.buildTemplateKataPrompt(request)

      expect(prompt).toContain('Create a React component library structure')
      expect(prompt).toContain('template')
      expect(prompt).toContain('project structure')
      expect(prompt).toContain('configuration')
      expect(prompt).toContain('best practices')
    })

    it('should include project structure requirements', () => {
      const request = {
        description: 'Create a Node.js API project',
        language: 'js' as Language,
        difficulty: 'hard' as Difficulty,
        type: 'template' as KataType,
        generateHiddenTests: false
      }

      const prompt = service.buildTemplateKataPrompt(request)

      expect(prompt).toContain('directory structure')
      expect(prompt).toContain('configuration files')
      expect(prompt).toContain('documentation')
    })
  })

  describe('buildMultiQuestionKataPrompt', () => {
    it('should build a multi-question kata prompt', () => {
      const request = {
        description: 'JavaScript fundamentals assessment',
        language: 'none' as Language,
        difficulty: 'medium' as Difficulty,
        type: 'multi-question' as KataType,
        generateHiddenTests: false
      }

      const prompt = service.buildMultiQuestionKataPrompt(request)

      expect(prompt).toContain('JavaScript fundamentals assessment')
      expect(prompt).toContain('multi-question')
      expect(prompt).toContain('assessment')
      expect(prompt).toContain('multiple-choice')
      expect(prompt).toContain('shortform')
      expect(prompt).toContain('passingScore')
    })

    it('should include question type variety', () => {
      const request = {
        description: 'Python programming quiz',
        language: 'none' as Language,
        difficulty: 'easy' as Difficulty,
        type: 'multi-question' as KataType,
        generateHiddenTests: false
      }

      const prompt = service.buildMultiQuestionKataPrompt(request)

      expect(prompt).toContain('multiple-choice')
      expect(prompt).toContain('shortform')
      expect(prompt).toContain('code')
      expect(prompt).toContain('explanation')
    })
  })

  describe('buildShortformKataPrompt', () => {
    it('should build a shortform kata prompt', () => {
      const request = {
        description: 'Quick Python concepts quiz',
        language: 'none' as Language,
        difficulty: 'easy' as Difficulty,
        type: 'shortform' as KataType,
        generateHiddenTests: false
      }

      const prompt = service.buildShortformKataPrompt(request)

      expect(prompt).toContain('Quick Python concepts quiz')
      expect(prompt).toContain('shortform')
      expect(prompt).toContain('short text answer')
      expect(prompt).toContain('concise')
    })

    it('should include shortform-specific requirements', () => {
      const request = {
        description: 'Algorithm terminology quiz',
        language: 'none' as Language,
        difficulty: 'medium' as Difficulty,
        type: 'shortform' as KataType,
        generateHiddenTests: false
      }

      const prompt = service.buildShortformKataPrompt(request)

      expect(prompt).toContain('acceptableAnswers')
      expect(prompt).toContain('caseSensitive')
      expect(prompt).toContain('maxLength')
    })
  })

  describe('buildMultipleChoiceKataPrompt', () => {
    it('should build a multiple choice kata prompt', () => {
      const request = {
        description: 'Data structures knowledge test',
        language: 'none' as Language,
        difficulty: 'medium' as Difficulty,
        type: 'multiple-choice' as KataType,
        generateHiddenTests: false
      }

      const prompt = service.buildMultipleChoiceKataPrompt(request)

      expect(prompt).toContain('Data structures knowledge test')
      expect(prompt).toContain('multiple-choice')
      expect(prompt).toContain('plausible distractors')
      expect(prompt).toContain('options')
      expect(prompt).toContain('correctAnswers')
    })

    it('should include multiple choice best practices', () => {
      const request = {
        description: 'Programming concepts test',
        language: 'none' as Language,
        difficulty: 'hard' as Difficulty,
        type: 'multiple-choice' as KataType,
        generateHiddenTests: false
      }

      const prompt = service.buildMultipleChoiceKataPrompt(request)

      expect(prompt).toContain('allowMultiple')
      expect(prompt).toContain('explanation')
      expect(prompt).toContain('unambiguous')
    })
  })

  describe('buildVariationPrompt', () => {
    it('should build a variation prompt for easier difficulty', () => {
      const sourceKata = {
        slug: 'fibonacci-sequence',
        title: 'Fibonacci Sequence',
        language: 'py' as Language,
        type: 'code' as KataType,
        difficulty: 'medium' as Difficulty,
        tags: ['algorithms', 'recursion'],
        statement: 'Calculate the nth Fibonacci number using recursion.'
      }

      const options = {
        difficultyAdjustment: 'easier' as const,
        focusArea: 'basic implementation',
        parameterChanges: 'Smaller input range',
        seriesName: 'Fibonacci Basics'
      }

      const prompt = service.buildVariationPrompt(sourceKata, options)

      expect(prompt).toContain('Fibonacci Sequence')
      expect(prompt).toContain('easier')
      expect(prompt).toContain('easy') // Target difficulty
      expect(prompt).toContain('basic implementation')
      expect(prompt).toContain('Smaller input range')
      expect(prompt).toContain('Fibonacci Basics')
      expect(prompt).toContain('Simplify the problem constraints')
    })

    it('should build a variation prompt for harder difficulty', () => {
      const sourceKata = {
        slug: 'sorting-algorithm',
        title: 'Basic Sorting',
        language: 'js' as Language,
        type: 'code' as KataType,
        difficulty: 'easy' as Difficulty,
        tags: ['algorithms', 'sorting'],
        statement: 'Implement a simple sorting algorithm.'
      }

      const options = {
        difficultyAdjustment: 'harder' as const,
        focusArea: 'performance optimization'
      }

      const prompt = service.buildVariationPrompt(sourceKata, options)

      expect(prompt).toContain('Basic Sorting')
      expect(prompt).toContain('harder')
      expect(prompt).toContain('medium') // Target difficulty
      expect(prompt).toContain('performance optimization')
      expect(prompt).toContain('Add additional constraints')
      expect(prompt).toContain('sophisticated algorithms')
    })

    it('should build a variation prompt for same difficulty', () => {
      const sourceKata = {
        slug: 'string-manipulation',
        title: 'String Reversal',
        language: 'cpp' as Language,
        type: 'code' as KataType,
        difficulty: 'medium' as Difficulty,
        tags: ['strings'],
        statement: 'Reverse a string in place.'
      }

      const options = {
        difficultyAdjustment: 'same' as const
      }

      const prompt = service.buildVariationPrompt(sourceKata, options)

      expect(prompt).toContain('String Reversal')
      expect(prompt).toContain('same')
      expect(prompt).toContain('medium') // Same difficulty
      expect(prompt).toContain('Maintain similar complexity')
    })

    it('should handle variations without series name', () => {
      const sourceKata = {
        slug: 'array-operations',
        title: 'Array Sum',
        language: 'py' as Language,
        type: 'code' as KataType,
        difficulty: 'easy' as Difficulty,
        tags: ['arrays'],
        statement: 'Calculate the sum of array elements.'
      }

      const options = {
        difficultyAdjustment: 'harder' as const
      }

      const prompt = service.buildVariationPrompt(sourceKata, options)

      expect(prompt).toContain('Array Sum')
      expect(prompt).toContain('variation of the "Array Sum" kata')
      // Should not contain specific series name in the variation context
      expect(prompt).not.toContain('Series Name:')
    })
  })

  describe('buildKataPrompt (dynamic routing)', () => {
    it('should route to correct prompt builder based on type', () => {
      const types: KataType[] = ['code', 'explain', 'template', 'multi-question', 'shortform', 'multiple-choice']
      
      types.forEach(type => {
        const request = {
          description: `Test ${type} kata`,
          language: 'py' as Language,
          difficulty: 'medium' as Difficulty,
          type,
          generateHiddenTests: false
        }

        const prompt = service.buildKataPrompt(request)
        
        expect(prompt).toContain(`Test ${type} kata`)
        expect(prompt.length).toBeGreaterThan(0)
      })
    })

    it('should handle one-liner type as shortform', () => {
      const request = {
        description: 'Complete the code snippet',
        language: 'js' as Language,
        difficulty: 'easy' as Difficulty,
        type: 'one-liner' as KataType,
        generateHiddenTests: false
      }

      const prompt = service.buildKataPrompt(request)
      
      expect(prompt).toContain('Complete the code snippet')
      expect(prompt).toContain('shortform')
    })

    it('should handle codebase type as explanation', () => {
      const request = {
        description: 'Analyze this codebase structure',
        language: 'py' as Language,
        difficulty: 'medium' as Difficulty,
        type: 'codebase' as KataType,
        generateHiddenTests: false
      }

      const prompt = service.buildKataPrompt(request)
      
      expect(prompt).toContain('Analyze this codebase structure')
      expect(prompt).toContain('explanation')
    })

    it('should throw error for unsupported type', () => {
      const request = {
        description: 'Test kata',
        language: 'py' as Language,
        difficulty: 'medium' as Difficulty,
        type: 'unsupported' as any,
        generateHiddenTests: false
      }

      expect(() => service.buildKataPrompt(request)).toThrow('Unsupported kata type: unsupported')
    })
  })

  describe('buildSolutionPrompt', () => {
    it('should build a solution prompt', () => {
      const statement = 'Write a function to calculate factorial of a number'
      const language = 'py' as Language

      const prompt = service.buildSolutionPrompt(statement, language)

      expect(prompt).toContain('Write a function to calculate factorial of a number')
      expect(prompt).toContain('py')
      expect(prompt).toContain('complete, working solution')
      expect(prompt).toContain('best practices')
      expect(prompt).toContain('error handling')
    })

    it('should handle different languages in solution prompts', () => {
      const statement = 'Implement binary search'
      const languages: Language[] = ['py', 'js', 'ts', 'cpp']

      languages.forEach(language => {
        const prompt = service.buildSolutionPrompt(statement, language)
        
        expect(prompt).toContain('Implement binary search')
        expect(prompt).toContain(language)
      })
    })
  })

  describe('template processing', () => {
    it('should replace template variables correctly', () => {
      const request = {
        description: 'Test description',
        language: 'ts' as Language,
        difficulty: 'hard' as Difficulty,
        type: 'code' as KataType,
        generateHiddenTests: false
      }

      const prompt = service.buildCodeKataPrompt(request)

      expect(prompt).toContain('Test description')
      expect(prompt).toContain('TypeScript')
      expect(prompt).toContain('hard')
      expect(prompt).toContain('ts')
    })

    it('should handle language display names correctly', () => {
      const languageMap = {
        'py': 'Python',
        'js': 'JavaScript',
        'ts': 'TypeScript',
        'cpp': 'C++',
        'none': 'No Language'
      }

      Object.entries(languageMap).forEach(([code, displayName]) => {
        const request = {
          description: 'Test kata',
          language: code as Language,
          difficulty: 'medium' as Difficulty,
          type: 'code' as KataType,
          generateHiddenTests: false
        }

        const prompt = service.buildCodeKataPrompt(request)
        expect(prompt).toContain(displayName)
      })
    })

    it('should handle file extensions correctly', () => {
      const extensionMap = {
        'py': 'py',
        'js': 'js',
        'ts': 'ts',
        'cpp': 'cpp',
        'none': 'txt'
      }

      Object.entries(extensionMap).forEach(([language, extension]) => {
        const request = {
          description: 'Test kata',
          language: language as Language,
          difficulty: 'medium' as Difficulty,
          type: 'code' as KataType,
          generateHiddenTests: false
        }

        const prompt = service.buildCodeKataPrompt(request)
        expect(prompt).toContain(extension)
      })
    })
  })

  describe('difficulty adjustment guidelines', () => {
    it('should provide appropriate guidelines for easier variations', () => {
      const sourceKata = {
        slug: 'test',
        title: 'Test',
        language: 'py' as Language,
        type: 'code' as KataType,
        difficulty: 'hard' as Difficulty,
        tags: [],
        statement: 'Test statement'
      }

      const options = { difficultyAdjustment: 'easier' as const }
      const prompt = service.buildVariationPrompt(sourceKata, options)

      expect(prompt).toContain('Simplify the problem constraints')
      expect(prompt).toContain('Reduce the number of edge cases')
      expect(prompt).toContain('more guidance')
    })

    it('should provide appropriate guidelines for harder variations', () => {
      const sourceKata = {
        slug: 'test',
        title: 'Test',
        language: 'py' as Language,
        type: 'code' as KataType,
        difficulty: 'easy' as Difficulty,
        tags: [],
        statement: 'Test statement'
      }

      const options = { difficultyAdjustment: 'harder' as const }
      const prompt = service.buildVariationPrompt(sourceKata, options)

      expect(prompt).toContain('Add additional constraints')
      expect(prompt).toContain('more sophisticated algorithms')
      expect(prompt).toContain('performance requirements')
    })

    it('should provide appropriate guidelines for same difficulty variations', () => {
      const sourceKata = {
        slug: 'test',
        title: 'Test',
        language: 'py' as Language,
        type: 'code' as KataType,
        difficulty: 'medium' as Difficulty,
        tags: [],
        statement: 'Test statement'
      }

      const options = { difficultyAdjustment: 'same' as const }
      const prompt = service.buildVariationPrompt(sourceKata, options)

      expect(prompt).toContain('Maintain similar complexity')
      expect(prompt).toContain('Change the context or domain')
      expect(prompt).toContain('equivalent')
    })
  })

  describe('edge cases', () => {
    it('should handle empty optional fields gracefully', () => {
      const request = {
        description: 'Simple kata',
        language: 'py' as Language,
        difficulty: 'easy' as Difficulty,
        type: 'code' as KataType,
        topics: [],
        constraints: '',
        tags: [],
        generateHiddenTests: false,
        additionalRequirements: ''
      }

      const prompt = service.buildCodeKataPrompt(request)
      
      expect(prompt).toContain('Simple kata')
      expect(prompt.length).toBeGreaterThan(0)
    })

    it('should handle undefined optional fields gracefully', () => {
      const request = {
        description: 'Simple kata',
        language: 'py' as Language,
        difficulty: 'easy' as Difficulty,
        type: 'code' as KataType,
        generateHiddenTests: false
      }

      const prompt = service.buildCodeKataPrompt(request)
      
      expect(prompt).toContain('Simple kata')
      expect(prompt.length).toBeGreaterThan(0)
    })

    it('should handle very long descriptions', () => {
      const longDescription = 'A'.repeat(5000)
      const request = {
        description: longDescription,
        language: 'py' as Language,
        difficulty: 'easy' as Difficulty,
        type: 'code' as KataType,
        generateHiddenTests: false
      }

      const prompt = service.buildCodeKataPrompt(request)
      
      expect(prompt).toContain(longDescription)
      expect(prompt.length).toBeGreaterThan(5000)
    })

    it('should handle special characters in descriptions', () => {
      const specialDescription = 'Create a function with special chars: àáâãäåæçèéêë ñ 中文 🚀'
      const request = {
        description: specialDescription,
        language: 'py' as Language,
        difficulty: 'easy' as Difficulty,
        type: 'code' as KataType,
        generateHiddenTests: false
      }

      const prompt = service.buildCodeKataPrompt(request)
      
      expect(prompt).toContain(specialDescription)
    })
  })
})