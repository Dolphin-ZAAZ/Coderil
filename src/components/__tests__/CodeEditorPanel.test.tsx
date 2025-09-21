import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CodeEditorPanel } from '../CodeEditorPanel'
import { Language } from '@/types'

// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => ({
  default: ({ onChange, onMount, value, language }: any) => {
    // Simulate editor mount
    setTimeout(() => onMount?.(), 0)
    
    return (
      <div data-testid="monaco-editor">
        <div data-testid="monaco-language">{language}</div>
        <textarea
          data-testid="monaco-textarea"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
        />
      </div>
    )
  }
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('CodeEditorPanel', () => {
  const mockProps = {
    language: 'py' as Language,
    initialCode: 'def hello():\n    pass',
    onChange: vi.fn(),
    onRun: vi.fn(),
    onSubmit: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  it('renders Monaco Editor with correct language', async () => {
    render(<CodeEditorPanel {...mockProps} />)
    
    expect(screen.getByTestId('monaco-editor')).toBeInTheDocument()
    expect(screen.getByTestId('monaco-language')).toHaveTextContent('python')
  })

  it('displays correct language in header', () => {
    render(<CodeEditorPanel {...mockProps} />)
    
    expect(screen.getByText('PY')).toBeInTheDocument()
  })

  it('shows loading state initially', () => {
    render(<CodeEditorPanel {...mockProps} />)
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('shows ready state after editor mounts', async () => {
    render(<CodeEditorPanel {...mockProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Ready')).toBeInTheDocument()
    })
  })

  it('disables buttons while loading', () => {
    render(<CodeEditorPanel {...mockProps} />)
    
    const runButton = screen.getByText('Run')
    const submitButton = screen.getByText('Submit')
    
    expect(runButton).toBeDisabled()
    expect(submitButton).toBeDisabled()
  })

  it('enables buttons after editor is ready', async () => {
    render(<CodeEditorPanel {...mockProps} />)
    
    await waitFor(() => {
      const runButton = screen.getByText('Run')
      const submitButton = screen.getByText('Submit')
      
      expect(runButton).not.toBeDisabled()
      expect(submitButton).not.toBeDisabled()
    })
  })

  it('calls onChange when code changes', async () => {
    render(<CodeEditorPanel {...mockProps} />)
    
    const textarea = screen.getByTestId('monaco-textarea')
    fireEvent.change(textarea, { target: { value: 'new code' } })
    
    expect(mockProps.onChange).toHaveBeenCalledWith('new code')
  })

  it('calls onRun when Run button is clicked', async () => {
    render(<CodeEditorPanel {...mockProps} />)
    
    await waitFor(() => {
      const runButton = screen.getByText('Run')
      expect(runButton).not.toBeDisabled()
    })
    
    fireEvent.click(screen.getByText('Run'))
    expect(mockProps.onRun).toHaveBeenCalled()
  })

  it('calls onSubmit when Submit button is clicked', async () => {
    render(<CodeEditorPanel {...mockProps} />)
    
    await waitFor(() => {
      const submitButton = screen.getByText('Submit')
      expect(submitButton).not.toBeDisabled()
    })
    
    fireEvent.click(screen.getByText('Submit'))
    expect(mockProps.onSubmit).toHaveBeenCalled()
  })

  it('loads saved code from localStorage on mount', () => {
    const savedCode = 'saved code from localStorage'
    localStorageMock.getItem.mockReturnValue(savedCode)
    
    render(<CodeEditorPanel {...mockProps} />)
    
    expect(localStorageMock.getItem).toHaveBeenCalled()
    expect(mockProps.onChange).toHaveBeenCalledWith(savedCode)
  })

  it('saves code to localStorage after changes', async () => {
    vi.useFakeTimers()
    
    render(<CodeEditorPanel {...mockProps} />)
    
    const textarea = screen.getByTestId('monaco-textarea')
    fireEvent.change(textarea, { target: { value: 'new code to save' } })
    
    // Fast-forward past the debounce timeout
    vi.advanceTimersByTime(1000)
    
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      expect.stringContaining('kata-code-'),
      'new code to save'
    )
    
    vi.useRealTimers()
  })

  describe('language-specific configurations', () => {
    it('maps Python language correctly', async () => {
      render(<CodeEditorPanel {...mockProps} language="py" />)
      
      expect(screen.getByTestId('monaco-language')).toHaveTextContent('python')
    })

    it('maps JavaScript language correctly', async () => {
      render(<CodeEditorPanel {...mockProps} language="js" />)
      
      expect(screen.getByTestId('monaco-language')).toHaveTextContent('javascript')
    })

    it('maps TypeScript language correctly', async () => {
      render(<CodeEditorPanel {...mockProps} language="ts" />)
      
      expect(screen.getByTestId('monaco-language')).toHaveTextContent('typescript')
    })

    it('maps C++ language correctly', async () => {
      render(<CodeEditorPanel {...mockProps} language="cpp" />)
      
      expect(screen.getByTestId('monaco-language')).toHaveTextContent('cpp')
    })
  })
})