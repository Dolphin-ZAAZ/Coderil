import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AIAuthoringDialog } from '../AIAuthoringDialog'
import type { AIGenerationConfig, GeneratedKata } from '@/types'

// Mock window.electronAPI
const mockElectronAPI = {
  getAiConfig: vi.fn(),
  generateKata: vi.fn(),
  generateVariation: vi.fn(),
  saveGeneratedKata: vi.fn(),
  generateAndSaveKata: vi.fn(),
  testOpenAIConnection: vi.fn()
}

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true
})

describe('AIAuthoringDialog Integration Tests', () => {
  const mockOnClose = vi.fn()
  const mockOnKataGenerated = vi.fn()

  const defaultAiConfig: AIGenerationConfig = {
    openaiApiKey: 'sk-test-key',
    model: 'gpt-4.1-mini',
    maxTokens: 4000,
    temperature: 0.7,
    retryAttempts: 3,
    timeoutMs: 30000
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockElectronAPI.getAiConfig.mockResolvedValue(defaultAiConfig)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Settings Integration', () => {
    it('should load AI configuration from settings on open', async () => {
      render(
        <AIAuthoringDialog
          isOpen={true}
          onClose={mockOnClose}
          onKataGenerated={mockOnKataGenerated}
        />
      )

      await waitFor(() => {
        expect(mockElectronAPI.getAiConfig).toHaveBeenCalled()
      })

      // Should not show API key warning when key is configured
      expect(screen.queryByText(/API Key Required/)).not.toBeInTheDocument()
    })

    it('should show API key warning when not configured', async () => {
      const configWithoutKey = { ...defaultAiConfig, openaiApiKey: '' }
      mockElectronAPI.getAiConfig.mockResolvedValue(configWithoutKey)

      render(
        <AIAuthoringDialog
          isOpen={true}
          onClose={mockOnClose}
          onKataGenerated={mockOnKataGenerated}
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/API Key Required/)).toBeInTheDocument()
      })

      // Generate button should be disabled
      const generateButton = screen.getByRole('button', { name: /generate kata/i })
      expect(generateButton).toBeDisabled()
    })

    it('should reference Settings panel for API key configuration', async () => {
      const configWithoutKey = { ...defaultAiConfig, openaiApiKey: '' }
      mockElectronAPI.getAiConfig.mockResolvedValue(configWithoutKey)

      render(
        <AIAuthoringDialog
          isOpen={true}
          onClose={mockOnClose}
          onKataGenerated={mockOnKataGenerated}
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/configure your OpenAI API key in Settings/)).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle API errors gracefully', async () => {
      const user = userEvent.setup()
      
      mockElectronAPI.generateAndSaveKata.mockRejectedValue(
        new Error('API rate limit exceeded')
      )

      render(
        <AIAuthoringDialog
          isOpen={true}
          onClose={mockOnClose}
          onKataGenerated={mockOnKataGenerated}
        />
      )

      // Fill in required fields
      await user.type(
        screen.getByLabelText(/kata description/i),
        'Create a simple sorting algorithm'
      )

      // Submit form
      const generateButton = screen.getByRole('button', { name: /generate kata/i })
      await user.click(generateButton)

      await waitFor(() => {
        expect(screen.getByText(/rate limit exceeded/i)).toBeInTheDocument()
      })
    })

    it('should show retry option for recoverable errors', async () => {
      const user = userEvent.setup()
      
      mockElectronAPI.generateAndSaveKata
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({
          kata: { slug: 'test-kata' } as GeneratedKata,
          fileResult: { success: true, path: '/path/to/kata' }
        })

      render(
        <AIAuthoringDialog
          isOpen={true}
          onClose={mockOnClose}
          onKataGenerated={mockOnKataGenerated}
        />
      )

      // Fill in required fields
      await user.type(
        screen.getByLabelText(/kata description/i),
        'Create a simple sorting algorithm'
      )

      // Submit form
      const generateButton = screen.getByRole('button', { name: /generate kata/i })
      await user.click(generateButton)

      // Wait for error
      await waitFor(() => {
        expect(screen.getByText(/network timeout/i)).toBeInTheDocument()
      })

      // Should show retry button
      const retryButton = screen.getByRole('button', { name: /retry/i })
      expect(retryButton).toBeInTheDocument()

      // Click retry
      await user.click(retryButton)

      await waitFor(() => {
        expect(mockElectronAPI.generateAndSaveKata).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Multi-Question Integration', () => {
    it('should generate multi-question katas compatible with MultiQuestionPanel', async () => {
      const user = userEvent.setup()
      
      const mockGeneratedKata: GeneratedKata = {
        slug: 'multi-question-test',
        content: {
          metadata: {
            slug: 'multi-question-test',
            title: 'Multi-Question Assessment',
            language: 'py',
            type: 'multi-question',
            difficulty: 'medium',
            tags: ['assessment'],
            entry: 'entry.py',
            test: { kind: 'none' },
            timeout_ms: 5000
          },
          statement: '# Multi-Question Assessment\n\nComplete the following questions.',
          multiQuestionConfig: {
            title: 'Python Fundamentals Assessment',
            description: 'Test your Python knowledge',
            questions: [
              {
                id: 'q1',
                type: 'multiple-choice',
                question: 'What is the output of print(type([]))?',
                options: [
                  { id: 'a', text: '<class \'list\'>' },
                  { id: 'b', text: '<class \'dict\'>' },
                  { id: 'c', text: '<class \'tuple\'>' }
                ],
                correctAnswers: ['a'],
                points: 10
              },
              {
                id: 'q2',
                type: 'shortform',
                question: 'What is list comprehension?',
                expectedAnswer: 'A concise way to create lists',
                acceptableAnswers: ['concise list creation', 'compact list syntax'],
                points: 15
              }
            ],
            passingScore: 70,
            allowReview: true,
            showProgressBar: true
          }
        },
        generationMetadata: {
          timestamp: new Date(),
          model: 'gpt-4.1-mini',
          promptVersion: '1.0',
          originalRequest: {} as any,
          tokensUsed: 1500,
          generationTime: 5000
        }
      }

      mockElectronAPI.generateAndSaveKata.mockResolvedValue({
        kata: mockGeneratedKata,
        fileResult: { success: true, path: '/path/to/kata' }
      })

      render(
        <AIAuthoringDialog
          isOpen={true}
          onClose={mockOnClose}
          onKataGenerated={mockOnKataGenerated}
        />
      )

      // Select multi-question type
      const typeSelect = screen.getByLabelText(/kata type/i)
      await user.selectOptions(typeSelect, 'multi-question')

      // Fill in description
      await user.type(
        screen.getByLabelText(/kata description/i),
        'Create a Python fundamentals assessment'
      )

      // Configure multi-question settings
      await user.clear(screen.getByLabelText(/number of questions/i))
      await user.type(screen.getByLabelText(/number of questions/i), '2')

      await user.clear(screen.getByLabelText(/passing score/i))
      await user.type(screen.getByLabelText(/passing score/i), '70')

      // Submit form
      const generateButton = screen.getByRole('button', { name: /generate kata/i })
      await user.click(generateButton)

      await waitFor(() => {
        expect(mockOnKataGenerated).toHaveBeenCalledWith(mockGeneratedKata)
      })

      // Verify the generated config is compatible with MultiQuestionPanel
      const generatedConfig = mockGeneratedKata.content.multiQuestionConfig!
      expect(generatedConfig.title).toBeDefined()
      expect(generatedConfig.questions).toBeInstanceOf(Array)
      expect(generatedConfig.questions.length).toBe(2)
      expect(generatedConfig.passingScore).toBe(70)
      expect(generatedConfig.allowReview).toBe(true)
      
      // Verify question structure
      const multipleChoiceQ = generatedConfig.questions[0]
      expect(multipleChoiceQ.type).toBe('multiple-choice')
      expect(multipleChoiceQ.options).toBeInstanceOf(Array)
      expect(multipleChoiceQ.correctAnswers).toBeInstanceOf(Array)
      
      const shortformQ = generatedConfig.questions[1]
      expect(shortformQ.type).toBe('shortform')
      expect(shortformQ.expectedAnswer).toBeDefined()
      expect(shortformQ.acceptableAnswers).toBeInstanceOf(Array)
    })
  })

  describe('AutoContinue Integration', () => {
    it('should generate katas that work with AutoContinueService', async () => {
      const user = userEvent.setup()
      
      const mockGeneratedKata: GeneratedKata = {
        slug: 'auto-continue-test',
        content: {
          metadata: {
            slug: 'auto-continue-test',
            title: 'Auto Continue Test Kata',
            language: 'js',
            type: 'code',
            difficulty: 'easy',
            tags: ['algorithms', 'ai-generated'],
            entry: 'entry.js',
            test: { kind: 'programmatic', file: 'tests.js' },
            timeout_ms: 5000
          },
          statement: '# Auto Continue Test\n\nImplement a simple function.',
          starterCode: 'function solution() {\n  // Your code here\n}',
          testCode: 'test("solution works", () => {\n  expect(solution()).toBe(true);\n});'
        },
        generationMetadata: {
          timestamp: new Date(),
          model: 'gpt-4.1-mini',
          promptVersion: '1.0',
          originalRequest: {} as any,
          tokensUsed: 800,
          generationTime: 3000
        }
      }

      mockElectronAPI.generateAndSaveKata.mockResolvedValue({
        kata: mockGeneratedKata,
        fileResult: { success: true, path: '/path/to/kata' }
      })

      render(
        <AIAuthoringDialog
          isOpen={true}
          onClose={mockOnClose}
          onKataGenerated={mockOnKataGenerated}
        />
      )

      // Fill in form for code kata
      await user.type(
        screen.getByLabelText(/kata description/i),
        'Create a simple algorithm challenge'
      )

      const languageSelect = screen.getByLabelText(/programming language/i)
      await user.selectOptions(languageSelect, 'js')

      const difficultySelect = screen.getByLabelText(/difficulty/i)
      await user.selectOptions(difficultySelect, 'easy')

      // Submit form
      const generateButton = screen.getByRole('button', { name: /generate kata/i })
      await user.click(generateButton)

      await waitFor(() => {
        expect(mockOnKataGenerated).toHaveBeenCalledWith(mockGeneratedKata)
      })

      // Verify the generated kata has properties needed for AutoContinue
      const kata = mockGeneratedKata.content.metadata
      expect(kata.slug).toBeDefined()
      expect(kata.title).toBeDefined()
      expect(kata.language).toBe('js')
      expect(kata.difficulty).toBe('easy')
      expect(kata.type).toBe('code')
      expect(kata.tags).toContain('ai-generated')
    })
  })

  describe('Variation Generation Integration', () => {
    it('should generate variations from existing katas', async () => {
      const user = userEvent.setup()
      
      const sourceKata = {
        slug: 'original-kata',
        title: 'Original Kata',
        language: 'py',
        difficulty: 'medium',
        type: 'code',
        tags: ['algorithms'],
        path: '/path/to/original'
      }

      const mockVariation: GeneratedKata = {
        slug: 'original-kata-variation-123',
        content: {
          metadata: {
            slug: 'original-kata-variation-123',
            title: 'Original Kata - Harder Variation',
            language: 'py',
            type: 'code',
            difficulty: 'hard',
            tags: ['algorithms', 'variation'],
            entry: 'entry.py',
            test: { kind: 'programmatic', file: 'tests.py' },
            timeout_ms: 5000
          },
          statement: '# Original Kata - Harder Variation\n\nA more challenging version.',
          starterCode: 'def solution():\n    pass',
          testCode: 'def test_solution():\n    assert solution() == expected'
        },
        generationMetadata: {
          timestamp: new Date(),
          model: 'gpt-4.1-mini',
          promptVersion: '1.0',
          originalRequest: {} as any,
          tokensUsed: 1200,
          generationTime: 4000
        }
      }

      mockElectronAPI.generateVariation.mockResolvedValue(mockVariation)

      render(
        <AIAuthoringDialog
          isOpen={true}
          onClose={mockOnClose}
          onKataGenerated={mockOnKataGenerated}
          sourceKata={sourceKata}
        />
      )

      // Should show variation mode
      expect(screen.getByText(/generate variation/i)).toBeInTheDocument()
      expect(screen.getByText(/original kata/i)).toBeInTheDocument()

      // Fill in variation options
      await user.type(
        screen.getByLabelText(/focus area/i),
        'Increase algorithmic complexity'
      )

      const difficultySelect = screen.getByLabelText(/difficulty adjustment/i)
      await user.selectOptions(difficultySelect, 'harder')

      // Submit form
      const generateButton = screen.getByRole('button', { name: /generate variation/i })
      await user.click(generateButton)

      await waitFor(() => {
        expect(mockElectronAPI.generateVariation).toHaveBeenCalledWith(
          sourceKata,
          expect.objectContaining({
            difficultyAdjustment: 'harder',
            focusArea: 'Increase algorithmic complexity'
          })
        )
      })

      expect(mockOnKataGenerated).toHaveBeenCalledWith(mockVariation)
    })
  })

  describe('Progress Tracking Integration', () => {
    it('should show generation progress with token usage', async () => {
      const user = userEvent.setup()
      
      // Mock a slow generation process
      mockElectronAPI.generateAndSaveKata.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              kata: { slug: 'test-kata' } as GeneratedKata,
              fileResult: { success: true, path: '/path/to/kata' }
            })
          }, 100)
        })
      })

      render(
        <AIAuthoringDialog
          isOpen={true}
          onClose={mockOnClose}
          onKataGenerated={mockOnKataGenerated}
        />
      )

      // Fill in form
      await user.type(
        screen.getByLabelText(/kata description/i),
        'Create a test kata'
      )

      // Submit form
      const generateButton = screen.getByRole('button', { name: /generate kata/i })
      await user.click(generateButton)

      // Should show progress indicator
      expect(screen.getByText(/generating/i)).toBeInTheDocument()
      
      // Wait for completion
      await waitFor(() => {
        expect(mockOnKataGenerated).toHaveBeenCalled()
      }, { timeout: 2000 })
    })
  })
})