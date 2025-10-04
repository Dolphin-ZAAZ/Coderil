import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { AIAuthoringDialog } from '../AIAuthoringDialog'
// AI services are only available in main process via IPC
// import { AIAuthoringService } from '@/services/ai-authoring'
// import { AIConfigService } from '@/services/ai-config'
import type { GeneratedKata, AIGenerationConfig } from '@/types'

// Mock the services
vi.mock('@/services/ai-authoring')
vi.mock('@/services/ai-config')

const mockAIAuthoringService = {
  generateKata: vi.fn(),
  onProgress: vi.fn(() => () => {}), // Return unsubscribe function
  getInstance: vi.fn()
}

const mockAIConfigService = {
  getConfig: vi.fn(),
  getInstance: vi.fn()
}

// Mock the service instances
vi.mocked(AIAuthoringService.getInstance).mockReturnValue(mockAIAuthoringService as any)
vi.mocked(AIConfigService.getInstance).mockReturnValue(mockAIConfigService as any)

const mockGeneratedKata: GeneratedKata = {
  slug: 'test-kata',
  content: {
    metadata: {
      slug: 'test-kata',
      title: 'Test Kata',
      language: 'py',
      type: 'code',
      difficulty: 'medium',
      tags: ['test'],
      entry: 'entry.py',
      test: { kind: 'programmatic', file: 'tests.py' },
      timeout_ms: 5000
    },
    statement: 'Test statement',
    starterCode: 'def test(): pass',
    testCode: 'def test_test(): assert True',
    solutionCode: 'def test(): return True'
  },
  generationMetadata: {
    timestamp: new Date(),
    model: 'gpt-4.1-mini',
    promptVersion: '1.0',
    originalRequest: {
      description: 'Test kata',
      language: 'py',
      difficulty: 'medium',
      type: 'code',
      generateHiddenTests: true
    },
    tokensUsed: 100,
    generationTime: 1000
  }
}

const mockAIConfig: AIGenerationConfig = {
  openaiApiKey: 'sk-test-key',
  model: 'gpt-4.1-mini',
  maxTokens: 4000,
  temperature: 0.7,
  retryAttempts: 3,
  timeoutMs: 30000
}

describe('AIAuthoringDialog', () => {
  const mockProps = {
    isOpen: true,
    onClose: vi.fn(),
    onKataGenerated: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockAIConfigService.getConfig.mockResolvedValue(mockAIConfig)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders when open', async () => {
    render(<AIAuthoringDialog {...mockProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Generate Kata with AI')).toBeInTheDocument()
    })
  })

  it('does not render when closed', () => {
    render(<AIAuthoringDialog {...mockProps} isOpen={false} />)
    
    expect(screen.queryByText('Generate Kata with AI')).not.toBeInTheDocument()
  })

  it('loads AI configuration on mount', async () => {
    render(<AIAuthoringDialog {...mockProps} />)
    
    await waitFor(() => {
      expect(mockAIConfigService.getConfig).toHaveBeenCalled()
    })
  })

  it('displays form fields correctly', async () => {
    render(<AIAuthoringDialog {...mockProps} />)
    
    await waitFor(() => {
      expect(screen.getByLabelText(/kata description/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/kata type/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/difficulty/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/programming language/i)).toBeInTheDocument()
    })
  })

  it('shows multi-question controls when multi-question type is selected', async () => {
    render(<AIAuthoringDialog {...mockProps} />)
    
    const typeSelect = await screen.findByLabelText(/kata type/i)
    fireEvent.change(typeSelect, { target: { value: 'multi-question' } })
    
    await waitFor(() => {
      expect(screen.getByText('Multi-Question Assessment Settings')).toBeInTheDocument()
      expect(screen.getByLabelText(/number of questions/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/passing score/i)).toBeInTheDocument()
    })
  })

  it('shows shortform controls when shortform type is selected', async () => {
    render(<AIAuthoringDialog {...mockProps} />)
    
    const typeSelect = await screen.findByLabelText(/kata type/i)
    fireEvent.change(typeSelect, { target: { value: 'shortform' } })
    
    await waitFor(() => {
      expect(screen.getByText('Question Settings')).toBeInTheDocument()
      expect(screen.getByLabelText(/max answer length/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/case sensitive/i)).toBeInTheDocument()
    })
  })

  it('shows multiple choice specific controls', async () => {
    render(<AIAuthoringDialog {...mockProps} />)
    
    const typeSelect = await screen.findByLabelText(/kata type/i)
    fireEvent.change(typeSelect, { target: { value: 'multiple-choice' } })
    
    await waitFor(() => {
      expect(screen.getByLabelText(/number of options/i)).toBeInTheDocument()
    })
  })

  it('validates required fields', async () => {
    render(<AIAuthoringDialog {...mockProps} />)
    
    const submitButton = await screen.findByText('Generate Kata')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/please provide a description/i)).toBeInTheDocument()
    })
  })

  it('validates multi-question specific fields', async () => {
    render(<AIAuthoringDialog {...mockProps} />)
    
    // Set type to multi-question
    const typeSelect = await screen.findByLabelText(/kata type/i)
    fireEvent.change(typeSelect, { target: { value: 'multi-question' } })
    
    // Fill description but set invalid question count
    const descriptionField = await screen.findByLabelText(/kata description/i)
    fireEvent.change(descriptionField, { target: { value: 'Test description' } })
    
    const questionCountField = await screen.findByLabelText(/number of questions/i)
    fireEvent.change(questionCountField, { target: { value: '0' } })
    
    const submitButton = screen.getByText('Generate Kata')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Question count must be between 1 and 20')).toBeInTheDocument()
    })
  })

  it('shows API key warning when not configured', async () => {
    mockAIConfigService.getConfig.mockResolvedValue({
      ...mockAIConfig,
      openaiApiKey: ''
    })
    
    render(<AIAuthoringDialog {...mockProps} />)
    
    await waitFor(() => {
      expect(screen.getByText(/api key required/i)).toBeInTheDocument()
    })
  })

  it('disables submit button when no API key', async () => {
    mockAIConfigService.getConfig.mockResolvedValue({
      ...mockAIConfig,
      openaiApiKey: ''
    })
    
    render(<AIAuthoringDialog {...mockProps} />)
    
    const submitButton = await screen.findByText('Generate Kata')
    expect(submitButton).toBeDisabled()
  })

  it('handles file upload', async () => {
    render(<AIAuthoringDialog {...mockProps} />)
    
    const fileInput = await screen.findByLabelText(/context files/i)
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
    
    fireEvent.change(fileInput, { target: { files: [file] } })
    
    await waitFor(() => {
      expect(screen.getByText('test.txt')).toBeInTheDocument()
    })
  })

  it('removes uploaded files', async () => {
    render(<AIAuthoringDialog {...mockProps} />)
    
    const fileInput = await screen.findByLabelText(/context files/i)
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
    
    fireEvent.change(fileInput, { target: { files: [file] } })
    
    await waitFor(() => {
      expect(screen.getByText('test.txt')).toBeInTheDocument()
    })
    
    const removeButton = screen.getByLabelText(/remove test.txt/i)
    fireEvent.click(removeButton)
    
    await waitFor(() => {
      expect(screen.queryByText('test.txt')).not.toBeInTheDocument()
    })
  })

  it('toggles advanced options', async () => {
    render(<AIAuthoringDialog {...mockProps} />)
    
    const advancedToggle = await screen.findByText(/advanced options/i)
    fireEvent.click(advancedToggle)
    
    await waitFor(() => {
      expect(screen.getByLabelText(/constraints/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/additional requirements/i)).toBeInTheDocument()
    })
  })

  it('submits form with correct data', async () => {
    mockAIAuthoringService.generateKata.mockResolvedValue(mockGeneratedKata)
    
    render(<AIAuthoringDialog {...mockProps} />)
    
    // Fill required fields
    const descriptionField = await screen.findByLabelText(/kata description/i)
    fireEvent.change(descriptionField, { target: { value: 'Test kata description' } })
    
    const topicsField = await screen.findByLabelText(/topics/i)
    fireEvent.change(topicsField, { target: { value: 'algorithms, sorting' } })
    
    const submitButton = screen.getByText('Generate Kata')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockAIAuthoringService.generateKata).toHaveBeenCalledWith({
        description: 'Test kata description',
        language: 'py',
        difficulty: 'medium',
        type: 'code',
        topics: ['algorithms', 'sorting'],
        generateHiddenTests: true,
        additionalRequirements: undefined,
        constraints: undefined,
        tags: undefined
      })
    })
  })

  it('calls onKataGenerated when generation succeeds', async () => {
    mockAIAuthoringService.generateKata.mockResolvedValue(mockGeneratedKata)
    
    render(<AIAuthoringDialog {...mockProps} />)
    
    const descriptionField = await screen.findByLabelText(/kata description/i)
    fireEvent.change(descriptionField, { target: { value: 'Test description' } })
    
    const submitButton = screen.getByText('Generate Kata')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockProps.onKataGenerated).toHaveBeenCalledWith(mockGeneratedKata)
      expect(mockProps.onClose).toHaveBeenCalled()
    })
  })

  it('displays error when generation fails', async () => {
    const errorMessage = 'Generation failed'
    mockAIAuthoringService.generateKata.mockRejectedValue(new Error(errorMessage))
    
    render(<AIAuthoringDialog {...mockProps} />)
    
    const descriptionField = await screen.findByLabelText(/kata description/i)
    fireEvent.change(descriptionField, { target: { value: 'Test description' } })
    
    const submitButton = screen.getByText('Generate Kata')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(new RegExp(errorMessage, 'i'))).toBeInTheDocument()
    })
  })

  it('shows progress during generation', async () => {
    let progressCallback: ((progress: any) => void) | null = null
    
    mockAIAuthoringService.onProgress.mockImplementation((callback) => {
      progressCallback = callback
      return () => {} // unsubscribe function
    })
    
    mockAIAuthoringService.generateKata.mockImplementation(async () => {
      // Simulate progress updates after a short delay
      setTimeout(() => {
        if (progressCallback) {
          progressCallback({
            stage: 'generating',
            message: 'Generating kata content...',
            progress: 50
          })
        }
      }, 100)
      return mockGeneratedKata
    })
    
    render(<AIAuthoringDialog {...mockProps} />)
    
    const descriptionField = await screen.findByLabelText(/kata description/i)
    fireEvent.change(descriptionField, { target: { value: 'Test description' } })
    
    const submitButton = screen.getByText('Generate Kata')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Generating...')).toBeInTheDocument()
    })
    
    await waitFor(() => {
      expect(screen.getByText('Generating kata content...')).toBeInTheDocument()
      expect(screen.getByText('50%')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('handles close during generation', async () => {
    mockAIAuthoringService.generateKata.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(mockGeneratedKata), 1000))
    )
    
    render(<AIAuthoringDialog {...mockProps} />)
    
    const descriptionField = await screen.findByLabelText(/kata description/i)
    fireEvent.change(descriptionField, { target: { value: 'Test description' } })
    
    const submitButton = screen.getByText('Generate Kata')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Generating...')).toBeInTheDocument()
    })
    
    // The button text changes to "Cancel" during generation
    await waitFor(() => {
      const cancelButton = screen.getByText('Cancel')
      fireEvent.click(cancelButton)
    })
    
    expect(mockProps.onClose).toHaveBeenCalled()
  })

  it('resets form after successful generation', async () => {
    mockAIAuthoringService.generateKata.mockResolvedValue(mockGeneratedKata)
    
    render(<AIAuthoringDialog {...mockProps} />)
    
    const descriptionField = await screen.findByLabelText(/kata description/i)
    fireEvent.change(descriptionField, { target: { value: 'Test description' } })
    
    const submitButton = screen.getByText('Generate Kata')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockProps.onKataGenerated).toHaveBeenCalled()
    })
    
    // Re-render to check if form is reset
    render(<AIAuthoringDialog {...mockProps} />)
    
    await waitFor(() => {
      const newDescriptionField = screen.getByLabelText(/kata description/i) as HTMLTextAreaElement
      expect(newDescriptionField.value).toBe('')
    })
  })
})