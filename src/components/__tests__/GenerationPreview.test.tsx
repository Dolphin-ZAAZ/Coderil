import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { GenerationPreview } from '../GenerationPreview'
import { GeneratedKataContent, KataMetadata } from '@/types'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { beforeEach } from 'node:test'
import { describe } from 'node:test'

// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => ({
  __esModule: true,
  default: ({ value, onChange, language }: any) => (
    <textarea
      data-testid="monaco-editor"
      data-language={language}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}))

const mockMetadata: KataMetadata = {
  slug: 'test-kata',
  title: 'Test Kata',
  language: 'py',
  type: 'code',
  difficulty: 'medium',
  tags: ['test', 'example'],
  entry: 'entry.py',
  test: {
    kind: 'programmatic',
    file: 'tests.py'
  },
  timeout_ms: 5000
}

const mockGeneratedContent: GeneratedKataContent = {
  metadata: mockMetadata,
  statement: '# Test Kata\n\nThis is a test kata statement.',
  starterCode: 'def solution():\n    pass',
  testCode: 'def test_solution():\n    assert solution() is not None',
  hiddenTestCode: 'def test_hidden():\n    assert solution() == "expected"',
  solutionCode: 'def solution():\n    return "expected"'
}

const mockProps = {
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

  it('renders the preview with generated content', () => {
    render(<GenerationPreview {...mockProps} />)
    
    expect(screen.getByText('Generated Kata Preview')).toBeInTheDocument()
    expect(screen.getByText('Generated: Test Kata')).toBeInTheDocument()
    expect(screen.getByText('code')).toBeInTheDocument()
    expect(screen.getByText('py')).toBeInTheDocument()
    expect(screen.getByText('medium')).toBeInTheDocument()
  })

  it('displays all generated files in the file list', () => {
    render(<GenerationPreview {...mockProps} />)
    
    expect(screen.getByTitle('Problem statement and instructions')).toBeInTheDocument()
    expect(screen.getByTitle('Kata metadata and configuration')).toBeInTheDocument()
    expect(screen.getByTitle('Starter code for participants')).toBeInTheDocument()
    expect(screen.getByTitle('Public test cases')).toBeInTheDocument()
    expect(screen.getByTitle('Hidden test cases for validation')).toBeInTheDocument()
    expect(screen.getByTitle('Reference solution')).toBeInTheDocument()
  })

  it('shows the statement file by default', () => {
    render(<GenerationPreview {...mockProps} />)
    
    const editor = screen.getByTestId('monaco-editor')
    expect(editor).toHaveValue('# Test Kata\n\nThis is a test kata statement.')
    expect(editor).toHaveAttribute('data-language', 'markdown')
  })

  it('switches files when clicking on file list items', async () => {
    render(<GenerationPreview {...mockProps} />)
    
    // Click on entry.py file
    fireEvent.click(screen.getByTitle('Starter code for participants'))
    
    await waitFor(() => {
      const editor = screen.getByTestId('monaco-editor')
      expect(editor).toHaveValue('def solution():\n    pass')
      expect(editor).toHaveAttribute('data-language', 'python')
    })
  })

  it('tracks content changes and calls onEdit', async () => {
    render(<GenerationPreview {...mockProps} />)
    
    const editor = screen.getByTestId('monaco-editor')
    fireEvent.change(editor, { target: { value: '# Modified Statement' } })
    
    expect(mockProps.onEdit).toHaveBeenCalledWith('statement', '# Modified Statement')
  })

  it('shows change indicators when content is modified', async () => {
    render(<GenerationPreview {...mockProps} />)
    
    // Modify the statement
    const editor = screen.getByTestId('monaco-editor')
    fireEvent.change(editor, { target: { value: '# Modified Statement' } })
    
    // Show changes
    fireEvent.click(screen.getByText('Show Changes'))
    
    await waitFor(() => {
      expect(screen.getByText('1 file modified')).toBeInTheDocument()
    })
  })

  it('reverts changes when revert button is clicked', async () => {
    render(<GenerationPreview {...mockProps} />)
    
    // Modify content
    const editor = screen.getByTestId('monaco-editor')
    fireEvent.change(editor, { target: { value: '# Modified Statement' } })
    
    // Show changes to reveal revert button
    fireEvent.click(screen.getByText('Show Changes'))
    
    // Click revert all
    fireEvent.click(screen.getByText('Revert All'))
    
    await waitFor(() => {
      expect(editor).toHaveValue('# Test Kata\n\nThis is a test kata statement.')
      expect(mockProps.onEdit).toHaveBeenCalledWith('statement', '# Test Kata\n\nThis is a test kata statement.')
    })
  })

  it('calls onApprove when approve button is clicked', () => {
    render(<GenerationPreview {...mockProps} />)
    
    fireEvent.click(screen.getByText('Approve & Save'))
    
    expect(mockProps.onApprove).toHaveBeenCalled()
  })

  it('calls onRegenerate when regenerate button is clicked', () => {
    render(<GenerationPreview {...mockProps} />)
    
    fireEvent.click(screen.getByText('Regenerate'))
    
    expect(mockProps.onRegenerate).toHaveBeenCalled()
  })

  it('calls onCancel when cancel button is clicked', () => {
    render(<GenerationPreview {...mockProps} />)
    
    fireEvent.click(screen.getByText('Cancel'))
    
    expect(mockProps.onCancel).toHaveBeenCalled()
  })

  it('handles multi-question kata configuration', () => {
    const multiQuestionContent: GeneratedKataContent = {
      ...mockGeneratedContent,
      metadata: { ...mockMetadata, type: 'multi-question' },
      multiQuestionConfig: {
        title: 'Test Assessment',
        description: 'A test multi-question assessment',
        questions: [
          {
            id: 'q1',
            type: 'multiple-choice',
            question: 'What is 2+2?',
            options: [
              { id: 'a', text: '3' },
              { id: 'b', text: '4' },
              { id: 'c', text: '5' }
            ],
            correctAnswers: ['b']
          }
        ],
        passingScore: 70
      }
    }

    render(<GenerationPreview {...mockProps} generatedContent={multiQuestionContent} />)
    
    expect(screen.getByText('multiQuestion.json')).toBeInTheDocument()
    expect(screen.getByText('Multi-question assessment configuration')).toBeInTheDocument()
  })

  it('handles explanation kata with rubric', () => {
    const explanationContent: GeneratedKataContent = {
      ...mockGeneratedContent,
      metadata: { ...mockMetadata, type: 'explain', language: 'none' },
      rubric: {
        keys: ['correctness', 'clarity', 'completeness'],
        threshold: {
          min_total: 7,
          min_correctness: 3
        }
      }
    }

    render(<GenerationPreview {...mockProps} generatedContent={explanationContent} />)
    
    expect(screen.getByText('rubric.yaml')).toBeInTheDocument()
    expect(screen.getByText('AI judging criteria and thresholds')).toBeInTheDocument()
  })

  it('handles template kata with solution files', () => {
    const templateContent: GeneratedKataContent = {
      ...mockGeneratedContent,
      metadata: { ...mockMetadata, type: 'template' },
      solutionFiles: {
        'package.json': '{"name": "test-project"}',
        'src/index.js': 'console.log("Hello World");'
      }
    }

    render(<GenerationPreview {...mockProps} generatedContent={templateContent} />)
    
    expect(screen.getByText('package.json')).toBeInTheDocument()
    expect(screen.getByText('src/index.js')).toBeInTheDocument()
  })
})