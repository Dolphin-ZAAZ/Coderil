import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { ErrorBoundary, withErrorBoundary } from '../ErrorBoundary'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { describe } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { beforeEach } from 'node:test'
import { describe } from 'node:test'

// Mock console.error to avoid noise in tests
const originalError = console.error
beforeAll(() => {
  console.error = vi.fn()
})

afterAll(() => {
  console.error = originalError
})

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No error</div>
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('renders error UI when child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText(/An unexpected error occurred/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Refresh Page' })).toBeInTheDocument()
  })

  it('allows retry after error', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()

    // Click try again
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }))

    // Re-render with no error
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )

    expect(screen.getByText('No error')).toBeInTheDocument()
  })

  it('uses custom fallback when provided', () => {
    const customFallback = (error: Error, errorInfo: any, retry: () => void) => (
      <div>
        <p>Custom error: {error.message}</p>
        <button onClick={retry}>Custom Retry</button>
      </div>
    )

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Custom error: Test error')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Custom Retry' })).toBeInTheDocument()
  })

  it('shows error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Error Details (Development)')).toBeInTheDocument()

    process.env.NODE_ENV = originalEnv
  })

  it('hides error details in production mode', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.queryByText('Error Details (Development)')).not.toBeInTheDocument()

    process.env.NODE_ENV = originalEnv
  })
})

describe('withErrorBoundary', () => {
  it('wraps component with error boundary', () => {
    const TestComponent = () => <div>Test component</div>
    const WrappedComponent = withErrorBoundary(TestComponent)

    render(<WrappedComponent />)

    expect(screen.getByText('Test component')).toBeInTheDocument()
  })

  it('catches errors in wrapped component', () => {
    const WrappedComponent = withErrorBoundary(ThrowError)

    render(<WrappedComponent shouldThrow={true} />)

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('uses custom fallback with HOC', () => {
    const customFallback = () => <div>HOC Custom Error</div>
    const WrappedComponent = withErrorBoundary(ThrowError, customFallback)

    render(<WrappedComponent shouldThrow={true} />)

    expect(screen.getByText('HOC Custom Error')).toBeInTheDocument()
  })
})