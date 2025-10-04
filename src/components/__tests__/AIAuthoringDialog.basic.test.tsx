import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AIAuthoringDialog } from '../AIAuthoringDialog'
import type { AIGenerationConfig } from '@/types'
import { beforeEach } from 'node:test'

// Mock the Electron API
const mockElectronAPI = {
  getAiConfig: vi.fn(),
  generateKata: vi.fn()
}

// Mock window.electronAPI
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true
})

const mockAIConfig: AIGenerationConfig = {
  openaiApiKey: 'sk-test-key',
  model: 'gpt-4.1-mini',
  maxTokens: 4000,
  temperature: 0.7,
  retryAttempts: 3,
  timeoutMs: 30000
}

describe('AIAuthoringDialog - Basic Tests', () => {
  const mockProps = {
    isOpen: true,
    onClose: vi.fn(),
    onKataGenerated: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockElectronAPI.getAiConfig.mockResolvedValue(mockAIConfig)
  })

  it('renders when open', () => {
    render(<AIAuthoringDialog {...mockProps} />)
    
    expect(screen.getByText('Generate Kata with AI')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<AIAuthoringDialog {...mockProps} isOpen={false} />)
    
    expect(screen.queryByText('Generate Kata with AI')).not.toBeInTheDocument()
  })

  it('displays form fields correctly', () => {
    render(<AIAuthoringDialog {...mockProps} />)
    
    expect(screen.getByLabelText(/kata description/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/kata type/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/difficulty/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/programming language/i)).toBeInTheDocument()
  })

  it('has all required form sections', () => {
    render(<AIAuthoringDialog {...mockProps} />)
    
    expect(screen.getByText('Basic Information')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Additional Context' })).toBeInTheDocument()
    expect(screen.getByText(/advanced options/i)).toBeInTheDocument()
  })

  it('has submit and cancel buttons', () => {
    render(<AIAuthoringDialog {...mockProps} />)
    
    expect(screen.getByText('Generate Kata')).toBeInTheDocument()
    expect(screen.getByText('Close')).toBeInTheDocument()
  })
})