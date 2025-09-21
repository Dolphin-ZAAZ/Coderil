import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CodeEditorPanel, AutosaveService } from '../CodeEditorPanel'
import { Language } from '@/types'

// Mock Monaco Editor with more detailed simulation
vi.mock('@monaco-editor/react', () => ({
  default: ({ onChange, onMount, value, language, options, theme }: any) => {
    // Use React.useEffect to simulate editor mount properly
    const { useEffect } = require('react')
    
    useEffect(() => {
      const timer = setTimeout(() => onMount?.(), 10)
      return () => clearTimeout(timer)
    }, [onMount])
    
    return (
      <div data-testid="monaco-editor" data-language={language} data-theme={theme}>
        <div data-testid="monaco-options">{JSON.stringify(options)}</div>
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

describe('Monaco Editor Integration', () => {
  const createProps = (language: Language, initialCode: string = '') => ({
    language,
    initialCode,
    onChange: vi.fn(),
    onRun: vi.fn(),
    onSubmit: vi.fn(),
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Language Configuration', () => {
    it('configures Python editor correctly', async () => {
      const props = createProps('py', 'def hello():\n    pass')
      render(<CodeEditorPanel {...props} />)
      
      await waitFor(() => {
        const editor = screen.getByTestId('monaco-editor')
        expect(editor).toHaveAttribute('data-language', 'python')
        expect(editor).toHaveAttribute('data-theme', 'vs-dark')
      })
      
      const options = JSON.parse(screen.getByTestId('monaco-options').textContent || '{}')
      expect(options.tabSize).toBe(4)
      expect(options.rulers).toEqual([79])
    })

    it('configures JavaScript editor correctly', async () => {
      const props = createProps('js', 'function hello() {}')
      render(<CodeEditorPanel {...props} />)
      
      await waitFor(() => {
        const editor = screen.getByTestId('monaco-editor')
        expect(editor).toHaveAttribute('data-language', 'javascript')
      })
      
      const options = JSON.parse(screen.getByTestId('monaco-options').textContent || '{}')
      expect(options.tabSize).toBe(2)
    })

    it('configures TypeScript editor correctly', async () => {
      const props = createProps('ts', 'function hello(): void {}')
      render(<CodeEditorPanel {...props} />)
      
      await waitFor(() => {
        const editor = screen.getByTestId('monaco-editor')
        expect(editor).toHaveAttribute('data-language', 'typescript')
      })
      
      const options = JSON.parse(screen.getByTestId('monaco-options').textContent || '{}')
      expect(options.tabSize).toBe(2)
    })

    it('configures C++ editor correctly', async () => {
      const props = createProps('cpp', '#include <iostream>')
      render(<CodeEditorPanel {...props} />)
      
      await waitFor(() => {
        const editor = screen.getByTestId('monaco-editor')
        expect(editor).toHaveAttribute('data-language', 'cpp')
      })
      
      const options = JSON.parse(screen.getByTestId('monaco-options').textContent || '{}')
      expect(options.tabSize).toBe(2)
      expect(options.rulers).toEqual([100])
    })
  })

  describe('Editor Options', () => {
    it('applies common editor options', async () => {
      const props = createProps('py')
      render(<CodeEditorPanel {...props} />)
      
      await waitFor(() => {
        const options = JSON.parse(screen.getByTestId('monaco-options').textContent || '{}')
        expect(options.minimap.enabled).toBe(false)
        expect(options.scrollBeyondLastLine).toBe(false)
        expect(options.fontSize).toBe(14)
        expect(options.lineNumbers).toBe('on')
        expect(options.wordWrap).toBe('on')
        expect(options.automaticLayout).toBe(true)
        expect(options.insertSpaces).toBe(true)
      })
    })
  })

  describe('Autosave Functionality', () => {
    it('saves code changes to localStorage with debouncing', async () => {
      vi.useFakeTimers()
      
      const props = createProps('py', 'initial code')
      render(<CodeEditorPanel {...props} />)
      
      const textarea = screen.getByTestId('monaco-textarea')
      
      // Make multiple rapid changes
      fireEvent.change(textarea, { target: { value: 'change 1' } })
      fireEvent.change(textarea, { target: { value: 'change 2' } })
      fireEvent.change(textarea, { target: { value: 'final change' } })
      
      // Should not save immediately
      expect(localStorageMock.setItem).not.toHaveBeenCalled()
      
      // Fast-forward past debounce timeout
      vi.advanceTimersByTime(1000)
      
      // Should save the final change
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        expect.stringContaining('kata-code-'),
        'final change'
      )
      
      vi.useRealTimers()
    })

    it('loads saved code on mount when available', () => {
      const savedCode = 'saved code from localStorage'
      localStorageMock.getItem.mockReturnValue(savedCode)
      
      const props = createProps('py', 'initial code')
      render(<CodeEditorPanel {...props} />)
      
      expect(localStorageMock.getItem).toHaveBeenCalled()
      expect(props.onChange).toHaveBeenCalledWith(savedCode)
    })

    it('uses initial code when no saved code exists', () => {
      localStorageMock.getItem.mockReturnValue(null)
      
      const initialCode = 'initial code'
      const props = createProps('py', initialCode)
      render(<CodeEditorPanel {...props} />)
      
      expect(localStorageMock.getItem).toHaveBeenCalled()
      // Should not call onChange when using initial code
      expect(props.onChange).not.toHaveBeenCalled()
    })
  })

  describe('AutosaveService', () => {
    it('generates correct localStorage keys', () => {
      AutosaveService.saveCode('test-kata', 'test code')
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'kata-code-test-kata',
        'test code'
      )
    })

    it('handles localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })
      
      // Should not throw
      expect(() => {
        AutosaveService.saveCode('test-kata', 'test code')
      }).not.toThrow()
    })

    it('clears code correctly', () => {
      AutosaveService.clearCode('test-kata')
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('kata-code-test-kata')
    })
  })

  describe('Editor State Management', () => {
    it('shows loading state initially and ready state after mount', async () => {
      const props = createProps('py')
      render(<CodeEditorPanel {...props} />)
      
      // Initially loading
      expect(screen.getByText('Loading...')).toBeInTheDocument()
      
      // After mount
      await waitFor(() => {
        expect(screen.getByText('Ready')).toBeInTheDocument()
      })
    })

    it('disables buttons during loading and enables after ready', async () => {
      const props = createProps('py')
      render(<CodeEditorPanel {...props} />)
      
      const runButton = screen.getByText('Run')
      const submitButton = screen.getByText('Submit')
      
      // Initially disabled
      expect(runButton).toBeDisabled()
      expect(submitButton).toBeDisabled()
      
      // After mount
      await waitFor(() => {
        expect(runButton).not.toBeDisabled()
        expect(submitButton).not.toBeDisabled()
      })
    })
  })

  describe('User Interactions', () => {
    it('calls onRun when Run button is clicked', async () => {
      const props = createProps('py')
      render(<CodeEditorPanel {...props} />)
      
      await waitFor(() => {
        expect(screen.getByText('Ready')).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByText('Run'))
      expect(props.onRun).toHaveBeenCalled()
    })

    it('calls onSubmit when Submit button is clicked', async () => {
      const props = createProps('py')
      render(<CodeEditorPanel {...props} />)
      
      await waitFor(() => {
        expect(screen.getByText('Ready')).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByText('Submit'))
      expect(props.onSubmit).toHaveBeenCalled()
    })

    it('calls onChange when code is modified', async () => {
      const props = createProps('py')
      render(<CodeEditorPanel {...props} />)
      
      const textarea = screen.getByTestId('monaco-textarea')
      fireEvent.change(textarea, { target: { value: 'new code' } })
      
      expect(props.onChange).toHaveBeenCalledWith('new code')
    })
  })
})