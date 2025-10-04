import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AIAuthoringDialog } from '../AIAuthoringDialog'
import { Language, KataType, Difficulty } from '@/types'

// Mock the services
vi.mock('@/services/ai-authoring', () => ({
  AIAuthoringService: {
    getInstance: () => ({
      generateKata: vi.fn(),
      onProgress: vi.fn(() => () => {}),
      getCurrentProgress: vi.fn(() => null),
      getSessionTokenUsage: vi.fn(() => ({
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCost: 0
      }))
    })
  }
}))

vi.mock('@/services/ai-config', () => ({
  AIConfigService: {
    getInstance: () => ({
      hasApiKey: vi.fn().mockResolvedValue(true),
      getConfig: vi.fn().mockResolvedValue({
        openaiApiKey: 'sk-test-key',
        model: 'gpt-4.1-mini'
      })
    })
  }
}))

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onKataGenerated: vi.fn()
}

describe('AIAuthoringDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders when open', () => {
      render(<AIAuthoringDialog {...defaultProps} />)
      
      expect(screen.getByText('AI Kata Authoring')).toBeInTheDocument()
      expect(screen.getByLabelText(/Kata Description/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Language/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Difficulty/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Kata Type/)).toBeInTheDocument()
    })

    it('does not render when closed', () => {
      render(<AIAuthoringDialog {...defaultProps} isOpen={false} />)
      
      expect(screen.queryByText('AI Kata Authoring')).not.toBeInTheDocument()
    })

    it('displays all language options', () => {
      render(<AIAuthoringDialog {...defaultProps} />)
      
      const languageSelect = screen.getByLabelText(/Language/)
      
      expect(languageSelect).toBeInTheDocument()
      // Check that options are available (they might be in a dropdown)
      fireEvent.click(languageSelect)
      
      // Common languages should be available
      expect(screen.getByText('Python') || screen.getByDisplayValue('py')).toBeInTheDocument()
    })

    it('displays all difficulty options', () => {
      render(<AIAuthoringDialog {...defaultProps} />)
      
      const difficultySelect = screen.getByLabelText(/Difficulty/)
      
      expect(difficultySelect).toBeInTheDocument()
      fireEvent.click(difficultySelect)
      
      // All difficulty levels should be available
      expect(screen.getByText('Easy') || screen.getByDisplayValue('easy')).toBeInTheDocument()
    })

    it('displays all kata type options', () => {
      render(<AIAuthoringDialog {...defaultProps} />)
      
      const typeSelect = screen.getByLabelText(/Kata Type/)
      
      expect(typeSelect).toBeInTheDocument()
      fireEvent.click(typeSelect)
      
      // Common kata types should be available
      expect(screen.getByText('Code') || screen.getByDisplayValue('code')).toBeInTheDocument()
    })

    it('shows optional fields', () => {
      render(<AIAuthoringDialog {...defaultProps} />)
      
      expect(screen.getByLabelText(/Topics/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Constraints/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Tags/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Additional Requirements/)).toBeInTheDocument()
    })

    it('shows generate hidden tests checkbox', () => {
      render(<AIAuthoringDialog {...defaultProps} />)
      
      expect(screen.getByLabelText(/Generate Hidden Tests/)).toBeInTheDocument()
    })
  })

  describe('form validation', () => {
    it('requires description', async () => {
      render(<AIAuthoringDialog {...defaultProps} />)
      
      const generateButton = screen.getByRole('button', { name: /Generate Kata/ })
      fireEvent.click(generateButton)
      
      await waitFor(() => {
        expect(screen.getByText(/Description is required/)).toBeInTheDocument()
      })
    })

    it('validates description length', async () => {
      render(<AIAuthoringDialog {...defaultProps} />)
      
      const descriptionInput = screen.getByLabelText(/Kata Description/)
      const longDescription = 'A'.repeat(5001) // Too long
      
      fireEvent.change(descriptionInput, { target: { value: longDescription } })
      
      const generateButton = screen.getByRole('button', { name: /Generate Kata/ })
      fireEvent.click(generateButton)
      
      await waitFor(() => {
        expect(screen.getByText(/Description is too long/)).toBeInTheDocument()
      })
    })

    it('validates required fields are selected', async () => {
      render(<AIAuthoringDialog {...defaultProps} />)
      
      const descriptionInput = screen.getByLabelText(/Kata Description/)
      fireEvent.change(descriptionInput, { target: { value: 'Valid description' } })
      
      // Don't select language, difficulty, or type
      const generateButton = screen.getByRole('button', { name: /Generate Kata/ })
      fireEvent.click(generateButton)
      
      await waitFor(() => {
        expect(screen.getByText(/Please select a language/) || 
               screen.getByText(/Please select a difficulty/) ||
               screen.getByText(/Please select a kata type/)).toBeInTheDocument()
      })
    })

    it('shows validation errors for invalid inputs', async () => {
      render(<AIAuthoringDialog {...defaultProps} />)
      
      const descriptionInput = screen.getByLabelText(/Kata Description/)
      fireEvent.change(descriptionInput, { target: { value: '' } })
      
      fireEvent.blur(descriptionInput)
      
      await waitFor(() => {
        expect(screen.getByText(/Description is required/)).toBeInTheDocument()
      })
    })
  })

  describe('form interaction', () => {
    it('updates form fields correctly', () => {
      render(<AIAuthoringDialog {...defaultProps} />)
      
      const descriptionInput = screen.getByLabelText(/Kata Description/)
      fireEvent.change(descriptionInput, { target: { value: 'Test description' } })
      
      expect(descriptionInput).toHaveValue('Test description')
    })

    it('handles language selection', () => {
      render(<AIAuthoringDialog {...defaultProps} />)
      
      const languageSelect = screen.getByLabelText(/Language/)
      fireEvent.change(languageSelect, { target: { value: 'py' } })
      
      expect(languageSelect).toHaveValue('py')
    })

    it('handles difficulty selection', () => {
      render(<AIAuthoringDialog {...defaultProps} />)
      
      const difficultySelect = screen.getByLabelText(/Difficulty/)
      fireEvent.change(difficultySelect, { target: { value: 'medium' } })
      
      expect(difficultySelect).toHaveValue('medium')
    })

    it('handles kata type selection', () => {
      render(<AIAuthoringDialog {...defaultProps} />)
      
      const typeSelect = screen.getByLabelText(/Kata Type/)
      fireEvent.change(typeSelect, { target: { value: 'explain' } })
      
      expect(typeSelect).toHaveValue('explain')
    })

    it('handles optional field inputs', () => {
      render(<AIAuthoringDialog {...defaultProps} />)
      
      const topicsInput = screen.getByLabelText(/Topics/)
      fireEvent.change(topicsInput, { target: { value: 'algorithms, data structures' } })
      
      const constraintsInput = screen.getByLabelText(/Constraints/)
      fireEvent.change(constraintsInput, { target: { value: 'O(n) time complexity' } })
      
      const tagsInput = screen.getByLabelText(/Tags/)
      fireEvent.change(tagsInput, { target: { value: 'beginner, arrays' } })
      
      expect(topicsInput).toHaveValue('algorithms, data structures')
      expect(constraintsInput).toHaveValue('O(n) time complexity')
      expect(tagsInput).toHaveValue('beginner, arrays')
    })

    it('handles checkbox inputs', () => {
      render(<AIAuthoringDialog {...defaultProps} />)
      
      const hiddenTestsCheckbox = screen.getByLabelText(/Generate Hidden Tests/)
      fireEvent.click(hiddenTestsCheckbox)
      
      expect(hiddenTestsCheckbox).toBeChecked()
      
      fireEvent.click(hiddenTestsCheckbox)
      expect(hiddenTestsCheckbox).not.toBeChecked()
    })
  })

  describe('form submission', () => {
    it('submits form with valid data', async () => {
      const mockAIService = {
        generateKata: vi.fn().mockResolvedValue({
          slug: 'test-kata',
          content: { metadata: { slug: 'test-kata' } },
          generationMetadata: {}
        }),
        onProgress: vi.fn(() => () => {}),
        getCurrentProgress: vi.fn(() => null),
        getSessionTokenUsage: vi.fn(() => ({ totalTokens: 0, estimatedCost: 0 }))
      }

      // Mock the service
      const { AIAuthoringService } = await import('@/services/ai-authoring')
      vi.mocked(AIAuthoringService.getInstance).mockReturnValue(mockAIService as any)

      render(<AIAuthoringDialog {...defaultProps} />)
      
      // Fill out the form
      fireEvent.change(screen.getByLabelText(/Kata Description/), {
        target: { value: 'Create a function to reverse a string' }
      })
      fireEvent.change(screen.getByLabelText(/Language/), {
        target: { value: 'py' }
      })
      fireEvent.change(screen.getByLabelText(/Difficulty/), {
        target: { value: 'easy' }
      })
      fireEvent.change(screen.getByLabelText(/Kata Type/), {
        target: { value: 'code' }
      })
      
      // Submit the form
      fireEvent.click(screen.getByRole('button', { name: /Generate Kata/ }))
      
      await waitFor(() => {
        expect(mockAIService.generateKata).toHaveBeenCalledWith({
          description: 'Create a function to reverse a string',
          language: 'py',
          difficulty: 'easy',
          type: 'code',
          topics: [],
          constraints: '',
          tags: [],
          generateHiddenTests: false,
          additionalRequirements: ''
        })
      })
    })

    it('submits form with all optional fields filled', async () => {
      const mockAIService = {
        generateKata: vi.fn().mockResolvedValue({
          slug: 'test-kata',
          content: { metadata: { slug: 'test-kata' } },
          generationMetadata: {}
        }),
        onProgress: vi.fn(() => () => {}),
        getCurrentProgress: vi.fn(() => null),
        getSessionTokenUsage: vi.fn(() => ({ totalTokens: 0, estimatedCost: 0 }))
      }

      const { AIAuthoringService } = await import('@/services/ai-authoring')
      vi.mocked(AIAuthoringService.getInstance).mockReturnValue(mockAIService as any)

      render(<AIAuthoringDialog {...defaultProps} />)
      
      // Fill out all fields
      fireEvent.change(screen.getByLabelText(/Kata Description/), {
        target: { value: 'Create a sorting algorithm' }
      })
      fireEvent.change(screen.getByLabelText(/Language/), {
        target: { value: 'js' }
      })
      fireEvent.change(screen.getByLabelText(/Difficulty/), {
        target: { value: 'medium' }
      })
      fireEvent.change(screen.getByLabelText(/Kata Type/), {
        target: { value: 'code' }
      })
      fireEvent.change(screen.getByLabelText(/Topics/), {
        target: { value: 'algorithms, sorting' }
      })
      fireEvent.change(screen.getByLabelText(/Constraints/), {
        target: { value: 'O(n log n) time complexity' }
      })
      fireEvent.change(screen.getByLabelText(/Tags/), {
        target: { value: 'algorithms, performance' }
      })
      fireEvent.change(screen.getByLabelText(/Additional Requirements/), {
        target: { value: 'Include edge cases' }
      })
      fireEvent.click(screen.getByLabelText(/Generate Hidden Tests/))
      
      // Submit the form
      fireEvent.click(screen.getByRole('button', { name: /Generate Kata/ }))
      
      await waitFor(() => {
        expect(mockAIService.generateKata).toHaveBeenCalledWith({
          description: 'Create a sorting algorithm',
          language: 'js',
          difficulty: 'medium',
          type: 'code',
          topics: ['algorithms', 'sorting'],
          constraints: 'O(n log n) time complexity',
          tags: ['algorithms', 'performance'],
          generateHiddenTests: true,
          additionalRequirements: 'Include edge cases'
        })
      })
    })

    it('disables form during generation', async () => {
      const mockAIService = {
        generateKata: vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000))),
        onProgress: vi.fn(() => () => {}),
        getCurrentProgress: vi.fn(() => ({ stage: 'generating', progress: 50 })),
        getSessionTokenUsage: vi.fn(() => ({ totalTokens: 0, estimatedCost: 0 }))
      }

      const { AIAuthoringService } = await import('@/services/ai-authoring')
      vi.mocked(AIAuthoringService.getInstance).mockReturnValue(mockAIService as any)

      render(<AIAuthoringDialog {...defaultProps} />)
      
      // Fill out required fields
      fireEvent.change(screen.getByLabelText(/Kata Description/), {
        target: { value: 'Test description' }
      })
      fireEvent.change(screen.getByLabelText(/Language/), {
        target: { value: 'py' }
      })
      fireEvent.change(screen.getByLabelText(/Difficulty/), {
        target: { value: 'easy' }
      })
      fireEvent.change(screen.getByLabelText(/Kata Type/), {
        target: { value: 'code' }
      })
      
      // Submit the form
      fireEvent.click(screen.getByRole('button', { name: /Generate Kata/ }))
      
      // Form should be disabled during generation
      await waitFor(() => {
        expect(screen.getByLabelText(/Kata Description/)).toBeDisabled()
        expect(screen.getByRole('button', { name: /Generating/ })).toBeDisabled()
      })
    })

    it('calls onKataGenerated when generation succeeds', async () => {
      const mockGeneratedKata = {
        slug: 'test-kata',
        content: { metadata: { slug: 'test-kata' } },
        generationMetadata: {}
      }

      const mockAIService = {
        generateKata: vi.fn().mockResolvedValue(mockGeneratedKata),
        onProgress: vi.fn(() => () => {}),
        getCurrentProgress: vi.fn(() => null),
        getSessionTokenUsage: vi.fn(() => ({ totalTokens: 0, estimatedCost: 0 }))
      }

      const { AIAuthoringService } = await import('@/services/ai-authoring')
      vi.mocked(AIAuthoringService.getInstance).mockReturnValue(mockAIService as any)

      const onKataGenerated = vi.fn()
      render(<AIAuthoringDialog {...defaultProps} onKataGenerated={onKataGenerated} />)
      
      // Fill and submit form
      fireEvent.change(screen.getByLabelText(/Kata Description/), {
        target: { value: 'Test description' }
      })
      fireEvent.change(screen.getByLabelText(/Language/), {
        target: { value: 'py' }
      })
      fireEvent.change(screen.getByLabelText(/Difficulty/), {
        target: { value: 'easy' }
      })
      fireEvent.change(screen.getByLabelText(/Kata Type/), {
        target: { value: 'code' }
      })
      
      fireEvent.click(screen.getByRole('button', { name: /Generate Kata/ }))
      
      await waitFor(() => {
        expect(onKataGenerated).toHaveBeenCalledWith(mockGeneratedKata)
      })
    })
  })

  describe('error handling', () => {
    it('displays error message when generation fails', async () => {
      const mockAIService = {
        generateKata: vi.fn().mockRejectedValue(new Error('Generation failed')),
        onProgress: vi.fn(() => () => {}),
        getCurrentProgress: vi.fn(() => null),
        getSessionTokenUsage: vi.fn(() => ({ totalTokens: 0, estimatedCost: 0 }))
      }

      const { AIAuthoringService } = await import('@/services/ai-authoring')
      vi.mocked(AIAuthoringService.getInstance).mockReturnValue(mockAIService as any)

      render(<AIAuthoringDialog {...defaultProps} />)
      
      // Fill and submit form
      fireEvent.change(screen.getByLabelText(/Kata Description/), {
        target: { value: 'Test description' }
      })
      fireEvent.change(screen.getByLabelText(/Language/), {
        target: { value: 'py' }
      })
      fireEvent.change(screen.getByLabelText(/Difficulty/), {
        target: { value: 'easy' }
      })
      fireEvent.change(screen.getByLabelText(/Kata Type/), {
        target: { value: 'code' }
      })
      
      fireEvent.click(screen.getByRole('button', { name: /Generate Kata/ }))
      
      await waitFor(() => {
        expect(screen.getByText(/Generation failed/)).toBeInTheDocument()
      })
    })

    it('handles API key not configured error', async () => {
      const { AIConfigService } = await import('@/services/ai-config')
      const mockConfigService = {
        hasApiKey: vi.fn().mockResolvedValue(false),
        getConfig: vi.fn().mockResolvedValue({ openaiApiKey: '' })
      }
      vi.mocked(AIConfigService.getInstance).mockReturnValue(mockConfigService as any)

      render(<AIAuthoringDialog {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText(/API key not configured/)).toBeInTheDocument()
        expect(screen.getByText(/Go to Settings/)).toBeInTheDocument()
      })
    })

    it('shows retry button on error', async () => {
      const mockAIService = {
        generateKata: vi.fn().mockRejectedValue(new Error('Network error')),
        onProgress: vi.fn(() => () => {}),
        getCurrentProgress: vi.fn(() => null),
        getSessionTokenUsage: vi.fn(() => ({ totalTokens: 0, estimatedCost: 0 }))
      }

      const { AIAuthoringService } = await import('@/services/ai-authoring')
      vi.mocked(AIAuthoringService.getInstance).mockReturnValue(mockAIService as any)

      render(<AIAuthoringDialog {...defaultProps} />)
      
      // Fill and submit form
      fireEvent.change(screen.getByLabelText(/Kata Description/), {
        target: { value: 'Test description' }
      })
      fireEvent.change(screen.getByLabelText(/Language/), {
        target: { value: 'py' }
      })
      fireEvent.change(screen.getByLabelText(/Difficulty/), {
        target: { value: 'easy' }
      })
      fireEvent.change(screen.getByLabelText(/Kata Type/), {
        target: { value: 'code' }
      })
      
      fireEvent.click(screen.getByRole('button', { name: /Generate Kata/ }))
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Retry/ })).toBeInTheDocument()
      })
    })
  })

  describe('progress tracking', () => {
    it('displays progress during generation', async () => {
      let progressCallback: any
      const mockAIService = {
        generateKata: vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000))),
        onProgress: vi.fn((callback) => {
          progressCallback = callback
          return () => {}
        }),
        getCurrentProgress: vi.fn(() => null),
        getSessionTokenUsage: vi.fn(() => ({ totalTokens: 0, estimatedCost: 0 }))
      }

      const { AIAuthoringService } = await import('@/services/ai-authoring')
      vi.mocked(AIAuthoringService.getInstance).mockReturnValue(mockAIService as any)

      render(<AIAuthoringDialog {...defaultProps} />)
      
      // Fill and submit form
      fireEvent.change(screen.getByLabelText(/Kata Description/), {
        target: { value: 'Test description' }
      })
      fireEvent.change(screen.getByLabelText(/Language/), {
        target: { value: 'py' }
      })
      fireEvent.change(screen.getByLabelText(/Difficulty/), {
        target: { value: 'easy' }
      })
      fireEvent.change(screen.getByLabelText(/Kata Type/), {
        target: { value: 'code' }
      })
      
      fireEvent.click(screen.getByRole('button', { name: /Generate Kata/ }))
      
      // Simulate progress update
      if (progressCallback) {
        progressCallback({
          stage: 'generating',
          message: 'Generating kata content...',
          progress: 50
        })
      }
      
      await waitFor(() => {
        expect(screen.getByText(/Generating kata content/)).toBeInTheDocument()
        expect(screen.getByText(/50%/)).toBeInTheDocument()
      })
    })

    it('displays token usage information', async () => {
      const mockAIService = {
        generateKata: vi.fn().mockResolvedValue({
          slug: 'test-kata',
          content: { metadata: { slug: 'test-kata' } },
          generationMetadata: { tokensUsed: 500 }
        }),
        onProgress: vi.fn(() => () => {}),
        getCurrentProgress: vi.fn(() => null),
        getSessionTokenUsage: vi.fn(() => ({
          promptTokens: 200,
          completionTokens: 300,
          totalTokens: 500,
          estimatedCost: 0.0075
        }))
      }

      const { AIAuthoringService } = await import('@/services/ai-authoring')
      vi.mocked(AIAuthoringService.getInstance).mockReturnValue(mockAIService as any)

      render(<AIAuthoringDialog {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText(/Tokens: 500/)).toBeInTheDocument()
        expect(screen.getByText(/Cost: \$0\.01/)).toBeInTheDocument()
      })
    })
  })

  describe('dialog controls', () => {
    it('calls onClose when close button is clicked', () => {
      const onClose = vi.fn()
      render(<AIAuthoringDialog {...defaultProps} onClose={onClose} />)
      
      fireEvent.click(screen.getByLabelText('Close dialog'))
      
      expect(onClose).toHaveBeenCalled()
    })

    it('calls onClose when cancel button is clicked', () => {
      const onClose = vi.fn()
      render(<AIAuthoringDialog {...defaultProps} onClose={onClose} />)
      
      fireEvent.click(screen.getByRole('button', { name: /Cancel/ }))
      
      expect(onClose).toHaveBeenCalled()
    })

    it('prevents closing during generation', async () => {
      const mockAIService = {
        generateKata: vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000))),
        onProgress: vi.fn(() => () => {}),
        getCurrentProgress: vi.fn(() => ({ stage: 'generating', progress: 50 })),
        getSessionTokenUsage: vi.fn(() => ({ totalTokens: 0, estimatedCost: 0 }))
      }

      const { AIAuthoringService } = await import('@/services/ai-authoring')
      vi.mocked(AIAuthoringService.getInstance).mockReturnValue(mockAIService as any)

      const onClose = vi.fn()
      render(<AIAuthoringDialog {...defaultProps} onClose={onClose} />)
      
      // Start generation
      fireEvent.change(screen.getByLabelText(/Kata Description/), {
        target: { value: 'Test description' }
      })
      fireEvent.change(screen.getByLabelText(/Language/), {
        target: { value: 'py' }
      })
      fireEvent.change(screen.getByLabelText(/Difficulty/), {
        target: { value: 'easy' }
      })
      fireEvent.change(screen.getByLabelText(/Kata Type/), {
        target: { value: 'code' }
      })
      
      fireEvent.click(screen.getByRole('button', { name: /Generate Kata/ }))
      
      // Try to close during generation
      fireEvent.click(screen.getByLabelText('Close dialog'))
      
      // Should not close
      expect(onClose).not.toHaveBeenCalled()
    })
  })

  describe('accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<AIAuthoringDialog {...defaultProps} />)
      
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby')
      expect(screen.getByLabelText(/Kata Description/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Language/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Difficulty/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Kata Type/)).toBeInTheDocument()
    })

    it('supports keyboard navigation', () => {
      render(<AIAuthoringDialog {...defaultProps} />)
      
      const descriptionInput = screen.getByLabelText(/Kata Description/)
      descriptionInput.focus()
      
      expect(document.activeElement).toBe(descriptionInput)
      
      // Tab to next field
      fireEvent.keyDown(descriptionInput, { key: 'Tab' })
      
      // Should move focus to next form element
      expect(document.activeElement).not.toBe(descriptionInput)
    })

    it('handles escape key to close dialog', () => {
      const onClose = vi.fn()
      render(<AIAuthoringDialog {...defaultProps} onClose={onClose} />)
      
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
      
      expect(onClose).toHaveBeenCalled()
    })
  })
})