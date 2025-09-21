import { render, screen } from '@testing-library/react'
import { StatementPanel } from '../StatementPanel'
import { KataMetadata, TestKind } from '@/types'
import { describe, it, expect } from 'vitest'

describe('StatementPanel', () => {
  const mockMetadata: KataMetadata = {
    slug: 'test-kata',
    title: 'Test Kata',
    difficulty: 'easy',
    language: 'js',
    type: 'code',
    tags: ['test', 'example'],
    entry: 'entry.js',
    test: { kind: 'programmatic' as TestKind, file: 'tests.js' },
    timeout_ms: 5000
  }

  it('renders markdown content correctly', () => {
    const markdownStatement = `# Test Header

This is a **bold** text and *italic* text.

## Code Example

\`\`\`javascript
function test() {
  return 'hello world'
}
\`\`\`

- List item 1
- List item 2

> This is a blockquote`

    render(<StatementPanel statement={markdownStatement} metadata={mockMetadata} />)
    
    // Check that markdown is parsed to HTML
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Test Header')
    expect(screen.getByText('Code Example')).toBeInTheDocument()
    
    // Check that bold and italic text are rendered
    expect(screen.getByText('bold')).toBeInTheDocument()
    expect(screen.getByText('italic')).toBeInTheDocument()
    
    // Check that code block is rendered
    expect(screen.getByText((content, element) => {
      return element?.tagName === 'CODE' && content.includes('function test()')
    })).toBeInTheDocument()
    
    // Check that list items are rendered
    expect(screen.getByText('List item 1')).toBeInTheDocument()
    expect(screen.getByText('List item 2')).toBeInTheDocument()
  })

  it('renders metadata correctly', () => {
    render(<StatementPanel statement="# Simple test" metadata={mockMetadata} />)
    
    expect(screen.getByText('Test Kata')).toBeInTheDocument()
    expect(screen.getByText('easy')).toBeInTheDocument()
    expect(screen.getByText('js')).toBeInTheDocument()
    expect(screen.getByText('code')).toBeInTheDocument()
    expect(screen.getByText('test')).toBeInTheDocument()
    expect(screen.getByText('example')).toBeInTheDocument()
  })

  it('handles empty markdown gracefully', () => {
    render(<StatementPanel statement="" metadata={mockMetadata} />)
    
    expect(screen.getByText('Test Kata')).toBeInTheDocument()
  })

  it('handles plain text without markdown', () => {
    const plainText = 'This is just plain text without any markdown formatting.'
    
    render(<StatementPanel statement={plainText} metadata={mockMetadata} />)
    
    expect(screen.getByText(plainText)).toBeInTheDocument()
  })
})