import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { VariationGenerator } from '../VariationGenerator'
import { Kata } from '@/types'
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
import { it } from 'node:test'
import { beforeEach } from 'node:test'
import { describe } from 'node:test'

// Mock the services
vi.mock('@/services/series-manager', () => ({
  SeriesManagerService: {
    getInstance: () => ({
      generateSeriesName: vi.fn((kata, focusArea) => 
        focusArea ? `${kata.slug}-${focusArea}-series` : `${kata.slug}-variations`
      )
    })
  }
}))

const mockSourceKata: Kata = {
  slug: 'fibonacci-sequence',
  title: 'Fibonacci Sequence',
  language: 'py',
  type: 'code',
  difficulty: 'medium',
  tags: ['algorithms', 'recursion'],
  path: '/katas/fibonacci-sequence'
}

const defaultProps = {
  sourceKata: mockSourceKata,
  isOpen: true,
  onClose: vi.fn(),
  onVariationGenerated: vi.fn()
}

describe('VariationGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders when open', () => {
    render(<VariationGenerator {...defaultProps} />)
    
    expect(screen.getByText('Generate Variation')).toBeInTheDocument()
    expect(screen.getByText('Fibonacci Sequence')).toBeInTheDocument()
    expect(screen.getByText('medium')).toBeInTheDocument()
    expect(screen.getByText('py')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<VariationGenerator {...defaultProps} isOpen={false} />)
    
    expect(screen.queryByText('Generate Variation')).not.toBeInTheDocument()
  })

  it('displays source kata information correctly', () => {
    render(<VariationGenerator {...defaultProps} />)
    
    expect(screen.getByText('Fibonacci Sequence')).toBeInTheDocument()
    expect(screen.getByText('medium')).toBeInTheDocument()
    expect(screen.getByText('py')).toBeInTheDocument()
    expect(screen.getByText('code')).toBeInTheDocument()
    expect(screen.getByText('algorithms')).toBeInTheDocument()
    expect(screen.getByText('recursion')).toBeInTheDocument()
  })

  it('shows difficulty adjustment options', () => {
    render(<VariationGenerator {...defaultProps} />)
    
    expect(screen.getByLabelText(/Easier/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Same Difficulty/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Harder/)).toBeInTheDocument()
  })

  it('updates target difficulty when adjustment changes', () => {
    render(<VariationGenerator {...defaultProps} />)
    
    // Select "Harder" option
    fireEvent.click(screen.getByLabelText(/Harder/))
    
    // Should show target difficulty as "hard"
    expect(screen.getByText('hard')).toBeInTheDocument()
  })

  it('generates series name automatically', () => {
    render(<VariationGenerator {...defaultProps} />)
    
    // Should show auto-generated series name
    expect(screen.getByText(/fibonacci-sequence-variations/)).toBeInTheDocument()
  })

  it('updates series name when focus area changes', async () => {
    render(<VariationGenerator {...defaultProps} />)
    
    const focusAreaInput = screen.getByLabelText(/Focus Area/)
    fireEvent.change(focusAreaInput, { target: { value: 'optimization' } })
    
    await waitFor(() => {
      expect(screen.getByText(/fibonacci-sequence-optimization-series/)).toBeInTheDocument()
    })
  })

  it('allows custom series name input', () => {
    render(<VariationGenerator {...defaultProps} />)
    
    const seriesNameInput = screen.getByLabelText(/Series Name/)
    fireEvent.change(seriesNameInput, { target: { value: 'custom-series-name' } })
    
    expect(screen.getByText(/custom-series-name/)).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(<VariationGenerator {...defaultProps} onClose={onClose} />)
    
    fireEvent.click(screen.getByLabelText('Close dialog'))
    
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when cancel button is clicked', () => {
    const onClose = vi.fn()
    render(<VariationGenerator {...defaultProps} onClose={onClose} />)
    
    fireEvent.click(screen.getByText('Close'))
    
    expect(onClose).toHaveBeenCalled()
  })

  it('shows form validation', async () => {
    render(<VariationGenerator {...defaultProps} />)
    
    // Submit form without any changes (should work as all fields are optional)
    fireEvent.click(screen.getByText('Generate Variation'))
    
    // Should show progress or success message
    await waitFor(() => {
      expect(screen.getByText(/Generating kata variation/)).toBeInTheDocument()
    })
  })

  it('handles form submission with all fields filled', async () => {
    render(<VariationGenerator {...defaultProps} />)
    
    // Fill out all form fields
    fireEvent.click(screen.getByLabelText(/Harder/))
    fireEvent.change(screen.getByLabelText(/Focus Area/), { 
      target: { value: 'performance optimization' } 
    })
    fireEvent.change(screen.getByLabelText(/Parameter Changes/), { 
      target: { value: 'Add time complexity requirements' } 
    })
    fireEvent.change(screen.getByLabelText(/Series Name/), { 
      target: { value: 'fibonacci-advanced-series' } 
    })
    fireEvent.change(screen.getByLabelText(/Additional Instructions/), { 
      target: { value: 'Focus on memoization techniques' } 
    })
    
    // Submit form
    fireEvent.click(screen.getByRole('button', { name: 'Generate Variation' }))
    
    await waitFor(() => {
      expect(screen.getByText(/Generating kata variation/)).toBeInTheDocument()
    })
  })

  it('shows error message for IPC not implemented', async () => {
    render(<VariationGenerator {...defaultProps} />)
    
    fireEvent.click(screen.getByRole('button', { name: 'Generate Variation' }))
    
    await waitFor(() => {
      expect(screen.getByText(/IPC handler not yet implemented/)).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('disables form during generation', async () => {
    render(<VariationGenerator {...defaultProps} />)
    
    fireEvent.click(screen.getByRole('button', { name: 'Generate Variation' }))
    
    // Form elements should be disabled during generation
    await waitFor(() => {
      expect(screen.getByLabelText(/Focus Area/)).toBeDisabled()
      expect(screen.getByText('Generating Variation...')).toBeInTheDocument()
    })
  })
})