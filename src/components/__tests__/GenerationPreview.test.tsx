import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GenerationPreview } from '../GenerationPreview'
import { GeneratedKataContent, Language, KataType, Difficulty } from '@/types'

// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange, language }: any) => (
    <textarea
      data-testid={`monaco-editor-${language}`}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={`Monaco Editor (${language})`}
    />
  )
}))

const mockGeneratedContent: GeneratedKataContent = {
  metadata: {
    slug: 'test-kata',
    title: 'Test Kata',
    language: 'py' as Language,
    type: 'code' as KataType,
    difficulty: 'easy' as Difficulty,
    tags: ['test', 'algorithms'],
    entry: 'entry.py',
    test: { kind: 'programmatic', file: 'tests.py' },
    timeout_ms: 5000
  },
  statement: '# Test Kata\n\nThis is a test kata for unit testing.',
  starterCode: 'def solution():\n    # TODO: implement\n    pass',
  testCode: 'def test_solution():\n    assert solution() is not None',
  solutionCode: 'def solution():\n    return "Hello, World!"',
  hiddenTestCode: 'def test_hidden():\n    assert solution() == "Hello, World!"'
}

const defaultProps = {
  generatedContent: mockGeneratedContent,
  onEdit: vi.fn(),
  onApprove: vi.fn(),
  onRegenerate: vi.fn(),
  onCancel: vi.fn()
}

describe('GenerationPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders the preview with all sections', () => {
      render(<GenerationPreview {...defaultProps} />)
      
      expect(screen.getByText('Generated Kata Preview')).toBeInTheDocument()
      expect(screen.getByText('Test Kata')).toBeInTheDocument()
      expect(screen.getByText('Metadata')).toBeInTheDocument()
      expect(screen.getByText('Statement')).toBeInTheDocument()
      expect(screen.getByText('Starter Code')).toBeInTheDocument()
      expect(screen.getByText('Test Code')).toBeInTheDocument()
      expect(screen.getByText('Solution Code')).toBeInTheDocument()
    })

    it('displays metadata correctly', () => {
      render(<GenerationPreview {...defaultProps} />)
      
      expect(screen.getByText('test-kata')).toBeInTheDocument()
      expect(screen.getByText('py')).toBeInTheDocument()
      expect(screen.getByText('code')).toBeInTheDocument()
      expect(screen.getByText('easy')).toBeInTheDocument()
      expect(screen.getByText('test')).toBeInTheDocument()
      expect(screen.getByText('algorithms')).toBeInTheDocument()
    })

    it('displays statement content', () => {
      render(<GenerationPreview {...defaultProps} />)
      
      expect(screen.getByText(/This is a test kata for unit testing/)).toBeInTheDocument()
    })

    it('displays code sections with Monaco editors', () => {
      render(<GenerationPreview {...defaultProps} />)
      
      expect(screen.getByTestId('monaco-editor-python')).toBeInTheDocument()
      expect(screen.getByDisplayValue(/def solution\(\):/)).toBeInTheDocument()
      expect(screen.getByDisplayValue(/def test_solution\(\):/)).toBeInTheDocument()
      expect(screen.getByDisplayValue(/return "Hello, World!"/)).toBeInTheDocument()
    })

    it('shows hidden tests section when available', () => {
      render(<GenerationPreview {...defaultProps} />)
      
      expect(screen.getByText('Hidden Tests')).toBeInTheDocument()
      expect(screen.getByDisplayValue(/def test_hidden\(\):/)).toBeInTheDocument()
    })

    it('hides sections that are not available', () => {
      const contentWithoutHiddenTests = {
        ...mockGeneratedContent,
        hiddenTestCode: undefined
      }
      
      render(<GenerationPreview {...defaultProps} generatedContent={contentWithoutHiddenTests} />)
      
      expect(screen.queryByText('Hidden Tests')).not.toBeInTheDocument()
    })

    it('displays action buttons', () => {
      render(<GenerationPreview {...defaultProps} />)
      
      expect(screen.getByRole('button', { name: /Approve & Save/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Regenerate/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Cancel/ })).toBeInTheDocument()
    })
  })

  describe('editing functionality', () => {
    it('allows editing statement', () => {
      render(<GenerationPreview {...defaultProps} />)
      
      const editButton = screen.getAllByRole('button', { name: /Edit/ })[0] // First edit button (statement)
      fireEvent.click(editButton)
      
      const editor = screen.getByTestId('monaco-editor-markdown')
      fireEvent.change(editor, { target: { value: '# Updated Statement\n\nThis is updated.' } })
      
      expect(defaultProps.onEdit).toHaveBeenCalledWith('statement', '# Updated Statement\n\nThis is updated.')
    })

    it('allows editing starter code', () => {
      render(<GenerationPreview {...defaultProps} />)
      
      const starterCodeSection = screen.getByText('Starter Code').closest('.preview-section')
      const editButton = starterCodeSection?.querySelector('button[aria-label*="Edit"]')
      
      if (editButton) {
        fireEvent.click(editButton)
      }
      
      const editor = screen.getByTestId('monaco-editor-python')
      fireEvent.change(editor, { target: { value: 'def solution():\n    return 42' } })
      
      expect(defaultProps.onEdit).toHaveBeenCalledWith('starterCode', 'def solution():\n    return 42')
    })

    it('allows editing test code', () => {
      render(<GenerationPreview {...defaultProps} />)
      
      const testCodeSection = screen.getByText('Test Code').closest('.preview-section')
      const editButton = testCodeSection?.querySelector('button[aria-label*="Edit"]')
      
      if (editButton) {
        fireEvent.click(editButton)
      }
      
      const editors = screen.getAllByTestId('monaco-editor-python')
      const testEditor = editors.find(editor => 
        editor.getAttribute('value')?.includes('test_solution')
      )
      
      if (testEditor) {
        fireEvent.change(testEditor, { target: { value: 'def test_solution():\n    assert solution() == 42' } })
      }
      
      expect(defaultProps.onEdit).toHaveBeenCalledWith('testCode', 'def test_solution():\n    assert solution() == 42')
    })

    it('allows editing solution code', () => {
      render(<GenerationPreview {...defaultProps} />)
      
      const solutionCodeSection = screen.getByText('Solution Code').closest('.preview-section')
      const editButton = solutionCodeSection?.querySelector('button[aria-label*="Edit"]')
      
      if (editButton) {
        fireEvent.click(editButton)
      }
      
      const editors = screen.getAllByTestId('monaco-editor-python')
      const solutionEditor = editors.find(editor => 
        editor.getAttribute('value')?.includes('Hello, World!')
      )
      
      if (solutionEditor) {
        fireEvent.change(solutionEditor, { target: { value: 'def solution():\n    return 42' } })
      }
      
      expect(defaultProps.onEdit).toHaveBeenCalledWith('solutionCode', 'def solution():\n    return 42')
    })

    it('allows editing hidden tests', () => {
      render(<GenerationPreview {...defaultProps} />)
      
      const hiddenTestsSection = screen.getByText('Hidden Tests').closest('.preview-section')
      const editButton = hiddenTestsSection?.querySelector('button[aria-label*="Edit"]')
      
      if (editButton) {
        fireEvent.click(editButton)
      }
      
      const editors = screen.getAllByTestId('monaco-editor-python')
      const hiddenTestEditor = editors.find(editor => 
        editor.getAttribute('value')?.includes('test_hidden')
      )
      
      if (hiddenTestEditor) {
        fireEvent.change(hiddenTestEditor, { target: { value: 'def test_hidden():\n    assert solution() == 42' } })
      }
      
      expect(defaultProps.onEdit).toHaveBeenCalledWith('hiddenTestCode', 'def test_hidden():\n    assert solution() == 42')
    })

    it('toggles edit mode for sections', () => {
      render(<GenerationPreview {...defaultProps} />)
      
      const editButton = screen.getAllByRole('button', { name: /Edit/ })[0]
      fireEvent.click(editButton)
      
      // Should show save/cancel buttons in edit mode
      expect(screen.getByRole('button', { name: /Save/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Cancel/ })).toBeInTheDocument()
      
      // Click cancel to exit edit mode
      fireEvent.click(screen.getByRole('button', { name: /Cancel/ }))
      
      // Should return to view mode
      expect(screen.queryByRole('button', { name: /Save/ })).not.toBeInTheDocument()
    })
  })

  describe('action buttons', () => {
    it('calls onApprove when approve button is clicked', () => {
      render(<GenerationPreview {...defaultProps} />)
      
      fireEvent.click(screen.getByRole('button', { name: /Approve & Save/ }))
      
      expect(defaultProps.onApprove).toHaveBeenCalled()
    })

    it('calls onRegenerate when regenerate button is clicked', () => {
      render(<GenerationPreview {...defaultProps} />)
      
      fireEvent.click(screen.getByRole('button', { name: /Regenerate/ }))
      
      expect(defaultProps.onRegenerate).toHaveBeenCalled()
    })

    it('calls onCancel when cancel button is clicked', () => {
      render(<GenerationPreview {...defaultProps} />)
      
      fireEvent.click(screen.getByRole('button', { name: /Cancel/ }))
      
      expect(defaultProps.onCancel).toHaveBeenCalled()
    })

    it('shows confirmation dialog for regenerate', async () => {
      render(<GenerationPreview {...defaultProps} />)
      
      fireEvent.click(screen.getByRole('button', { name: /Regenerate/ }))
      
      await waitFor(() => {
        expect(screen.getByText(/Are you sure you want to regenerate/)).toBeInTheDocument()
      })
      
      // Confirm regeneration
      fireEvent.click(screen.getByRole('button', { name: /Confirm/ }))
      
      expect(defaultProps.onRegenerate).toHaveBeenCalled()
    })

    it('shows confirmation dialog for cancel', async () => {
      render(<GenerationPreview {...defaultProps} />)
      
      fireEvent.click(screen.getByRole('button', { name: /Cancel/ }))
      
      await waitFor(() => {
        expect(screen.getByText(/Are you sure you want to cancel/)).toBeInTheDocument()
      })
      
      // Confirm cancellation
      fireEvent.click(screen.getByRole('button', { name: /Confirm/ }))
      
      expect(defaultProps.onCancel).toHaveBeenCalled()
    })
  })

  describe('different kata types', () => {
    it('renders explanation kata correctly', () => {
      const explanationContent: GeneratedKataContent = {
        metadata: {
          slug: 'explain-recursion',
          title: 'Explain Recursion',
          language: 'none' as Language,
          type: 'explain' as KataType,
          difficulty: 'medium' as Difficulty,
          tags: ['concepts'],
          entry: 'explanation.md',
          test: { kind: 'none' },
          timeout_ms: 0
        },
        statement: '# Explain Recursion\n\nExplain the concept of recursion in programming.',
        rubric: {
          keys: ['correctness', 'clarity', 'examples'],
          threshold: { min_total: 70, min_correctness: 50 }
        }
      }
      
      render(<GenerationPreview {...defaultProps} generatedContent={explanationContent} />)
      
      expect(screen.getByText('Explain Recursion')).toBeInTheDocument()
      expect(screen.getByText('Rubric')).toBeInTheDocument()
      expect(screen.getByText('correctness')).toBeInTheDocument()
      expect(screen.getByText('clarity')).toBeInTheDocument()
      expect(screen.getByText('examples')).toBeInTheDocument()
      
      // Should not show code sections
      expect(screen.queryByText('Starter Code')).not.toBeInTheDocument()
      expect(screen.queryByText('Test Code')).not.toBeInTheDocument()
    })

    it('renders template kata correctly', () => {
      const templateContent: GeneratedKataContent = {
        metadata: {
          slug: 'react-component',
          title: 'React Component Template',
          language: 'js' as Language,
          type: 'template' as KataType,
          difficulty: 'medium' as Difficulty,
          tags: ['react', 'components'],
          entry: 'src/Component.js',
          test: { kind: 'none' },
          timeout_ms: 0
        },
        statement: '# React Component Template\n\nCreate a reusable React component.',
        rubric: {
          keys: ['structure', 'best_practices', 'documentation'],
          threshold: { min_total: 75 }
        },
        solutionFiles: {
          'src/Component.js': 'export default function Component() { return <div>Hello</div>; }',
          'src/Component.test.js': 'import { render } from "@testing-library/react";',
          'package.json': '{ "name": "react-component" }'
        }
      }
      
      render(<GenerationPreview {...defaultProps} generatedContent={templateContent} />)
      
      expect(screen.getByText('React Component Template')).toBeInTheDocument()
      expect(screen.getByText('Solution Files')).toBeInTheDocument()
      expect(screen.getByText('src/Component.js')).toBeInTheDocument()
      expect(screen.getByText('src/Component.test.js')).toBeInTheDocument()
      expect(screen.getByText('package.json')).toBeInTheDocument()
    })

    it('renders multi-question kata correctly', () => {
      const multiQuestionContent: GeneratedKataContent = {
        metadata: {
          slug: 'js-fundamentals',
          title: 'JavaScript Fundamentals Quiz',
          language: 'none' as Language,
          type: 'multi-question' as KataType,
          difficulty: 'easy' as Difficulty,
          tags: ['javascript', 'quiz'],
          entry: 'answer.md',
          test: { kind: 'none' },
          timeout_ms: 0
        },
        statement: '# JavaScript Fundamentals Quiz\n\nTest your JavaScript knowledge.',
        multiQuestionConfig: {
          title: 'JavaScript Fundamentals Quiz',
          description: 'Test your knowledge of JavaScript basics',
          passingScore: 70,
          showProgressBar: true,
          allowReview: true,
          questions: [
            {
              id: 'q1',
              type: 'multiple-choice',
              question: 'What is a closure?',
              allowMultiple: false,
              options: [
                { id: 'a', text: 'A function with access to outer scope' },
                { id: 'b', text: 'A closed function' }
              ],
              correctAnswers: ['a'],
              points: 2,
              explanation: 'A closure gives access to outer scope'
            }
          ]
        }
      }
      
      render(<GenerationPreview {...defaultProps} generatedContent={multiQuestionContent} />)
      
      expect(screen.getByText('JavaScript Fundamentals Quiz')).toBeInTheDocument()
      expect(screen.getByText('Multi-Question Configuration')).toBeInTheDocument()
      expect(screen.getByText('What is a closure?')).toBeInTheDocument()
      expect(screen.getByText('A function with access to outer scope')).toBeInTheDocument()
    })
  })

  describe('validation and warnings', () => {
    it('shows validation warnings', () => {
      const contentWithIssues = {
        ...mockGeneratedContent,
        metadata: {
          ...mockGeneratedContent.metadata,
          title: 'A' // Very short title
        }
      }
      
      render(<GenerationPreview {...defaultProps} generatedContent={contentWithIssues} />)
      
      // Should show validation warnings
      expect(screen.getByText(/Validation Issues/)).toBeInTheDocument()
      expect(screen.getByText(/Title is very short/)).toBeInTheDocument()
    })

    it('shows missing required sections', () => {
      const incompleteContent = {
        ...mockGeneratedContent,
        starterCode: undefined,
        testCode: undefined
      }
      
      render(<GenerationPreview {...defaultProps} generatedContent={incompleteContent} />)
      
      expect(screen.getByText(/Missing Required Sections/)).toBeInTheDocument()
      expect(screen.getByText(/Starter Code is missing/)).toBeInTheDocument()
      expect(screen.getByText(/Test Code is missing/)).toBeInTheDocument()
    })

    it('disables approve button when validation fails', () => {
      const invalidContent = {
        ...mockGeneratedContent,
        metadata: {
          ...mockGeneratedContent.metadata,
          title: '' // Empty title
        }
      }
      
      render(<GenerationPreview {...defaultProps} generatedContent={invalidContent} />)
      
      const approveButton = screen.getByRole('button', { name: /Approve & Save/ })
      expect(approveButton).toBeDisabled()
    })
  })

  describe('keyboard navigation', () => {
    it('supports keyboard navigation between sections', () => {
      render(<GenerationPreview {...defaultProps} />)
      
      const firstEditButton = screen.getAllByRole('button', { name: /Edit/ })[0]
      firstEditButton.focus()
      
      expect(document.activeElement).toBe(firstEditButton)
      
      // Tab to next button
      fireEvent.keyDown(firstEditButton, { key: 'Tab' })
      
      // Should move focus
      expect(document.activeElement).not.toBe(firstEditButton)
    })

    it('handles escape key to exit edit mode', () => {
      render(<GenerationPreview {...defaultProps} />)
      
      const editButton = screen.getAllByRole('button', { name: /Edit/ })[0]
      fireEvent.click(editButton)
      
      // Should be in edit mode
      expect(screen.getByRole('button', { name: /Save/ })).toBeInTheDocument()
      
      // Press escape
      fireEvent.keyDown(document, { key: 'Escape' })
      
      // Should exit edit mode
      expect(screen.queryByRole('button', { name: /Save/ })).not.toBeInTheDocument()
    })
  })

  describe('responsive design', () => {
    it('adapts to different screen sizes', () => {
      // Mock window.innerWidth
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768, // Tablet size
      })
      
      render(<GenerationPreview {...defaultProps} />)
      
      // Should render without errors on smaller screens
      expect(screen.getByText('Generated Kata Preview')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<GenerationPreview {...defaultProps} />)
      
      expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Generated kata preview')
      
      const editButtons = screen.getAllByRole('button', { name: /Edit/ })
      editButtons.forEach(button => {
        expect(button).toHaveAttribute('aria-label')
      })
    })

    it('announces changes to screen readers', () => {
      render(<GenerationPreview {...defaultProps} />)
      
      const editButton = screen.getAllByRole('button', { name: /Edit/ })[0]
      fireEvent.click(editButton)
      
      // Should have live region for announcements
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('supports high contrast mode', () => {
      // Mock high contrast media query
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      })
      
      render(<GenerationPreview {...defaultProps} />)
      
      // Should render without errors in high contrast mode
      expect(screen.getByText('Generated Kata Preview')).toBeInTheDocument()
    })
  })
})