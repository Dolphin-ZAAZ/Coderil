import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DependencyWarning } from '../DependencyWarning'
import { SystemDependencies } from '@/types'

describe('DependencyWarning', () => {
  const mockOnRefresh = vi.fn()
  const mockOnDismiss = vi.fn()

  const mockDependenciesWithMissing: SystemDependencies = {
    python: {
      name: 'Python',
      available: false,
      error: 'Python not found in PATH',
      installationGuide: 'Install Python from https://python.org'
    },
    nodejs: {
      name: 'Node.js',
      available: true,
      version: 'v18.0.0'
    },
    cpp: {
      name: 'C++ Compiler',
      available: false,
      error: 'No C++ compiler found',
      installationGuide: 'Install build-essential'
    },
    allAvailable: false
  }

  const mockDependenciesAllAvailable: SystemDependencies = {
    python: {
      name: 'Python',
      available: true,
      version: 'Python 3.9.0'
    },
    nodejs: {
      name: 'Node.js',
      available: true,
      version: 'v18.0.0'
    },
    cpp: {
      name: 'C++ Compiler (GCC)',
      available: true,
      version: 'gcc 9.4.0'
    },
    allAvailable: true
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should not render when dependencies is null', () => {
    const { container } = render(
      <DependencyWarning
        dependencies={null}
        onRefresh={mockOnRefresh}
        onDismiss={mockOnDismiss}
      />
    )

    expect(container.firstChild).toBeNull()
  })

  it('should not render when all dependencies are available', () => {
    const { container } = render(
      <DependencyWarning
        dependencies={mockDependenciesAllAvailable}
        onRefresh={mockOnRefresh}
        onDismiss={mockOnDismiss}
      />
    )

    expect(container.firstChild).toBeNull()
  })

  it('should render warning when dependencies are missing', () => {
    render(
      <DependencyWarning
        dependencies={mockDependenciesWithMissing}
        onRefresh={mockOnRefresh}
        onDismiss={mockOnDismiss}
      />
    )

    expect(screen.getByText('Missing Runtime Dependencies')).toBeInTheDocument()
    expect(screen.getByText(/2 of 3 required runtime dependencies are missing/)).toBeInTheDocument()
  })

  it('should show correct number of missing dependencies', () => {
    render(
      <DependencyWarning
        dependencies={mockDependenciesWithMissing}
        onRefresh={mockOnRefresh}
        onDismiss={mockOnDismiss}
      />
    )

    // Should show 2 missing (Python and C++)
    expect(screen.getByText(/2 of 3 required runtime dependencies are missing/)).toBeInTheDocument()
  })

  it('should have refresh and dismiss buttons', () => {
    render(
      <DependencyWarning
        dependencies={mockDependenciesWithMissing}
        onRefresh={mockOnRefresh}
        onDismiss={mockOnDismiss}
      />
    )

    expect(screen.getByText('Refresh')).toBeInTheDocument()
    expect(screen.getByText('✕')).toBeInTheDocument()
  })

  it('should call onRefresh when refresh button is clicked', () => {
    render(
      <DependencyWarning
        dependencies={mockDependenciesWithMissing}
        onRefresh={mockOnRefresh}
        onDismiss={mockOnDismiss}
      />
    )

    fireEvent.click(screen.getByText('Refresh'))
    expect(mockOnRefresh).toHaveBeenCalledTimes(1)
  })

  it('should call onDismiss when dismiss button is clicked', () => {
    render(
      <DependencyWarning
        dependencies={mockDependenciesWithMissing}
        onRefresh={mockOnRefresh}
        onDismiss={mockOnDismiss}
      />
    )

    fireEvent.click(screen.getByText('✕'))
    expect(mockOnDismiss).toHaveBeenCalledTimes(1)
  })

  it('should toggle details when show/hide details button is clicked', () => {
    render(
      <DependencyWarning
        dependencies={mockDependenciesWithMissing}
        onRefresh={mockOnRefresh}
        onDismiss={mockOnDismiss}
      />
    )

    const toggleButton = screen.getByText('Show Details')
    
    // Details should not be visible initially
    expect(screen.queryByText('Python not found in PATH')).not.toBeInTheDocument()

    // Click to show details
    fireEvent.click(toggleButton)
    
    expect(screen.getByText('Hide Details')).toBeInTheDocument()
    expect(screen.getByText('Python not found in PATH')).toBeInTheDocument()

    // Click to hide details
    fireEvent.click(screen.getByText('Hide Details'))
    
    expect(screen.getByText('Show Details')).toBeInTheDocument()
    expect(screen.queryByText('Python not found in PATH')).not.toBeInTheDocument()
  })

  it('should show dependency details when expanded', () => {
    render(
      <DependencyWarning
        dependencies={mockDependenciesWithMissing}
        onRefresh={mockOnRefresh}
        onDismiss={mockOnDismiss}
      />
    )

    // Expand details
    fireEvent.click(screen.getByText('Show Details'))

    // Should show all dependencies with their status
    expect(screen.getByText('Python')).toBeInTheDocument()
    expect(screen.getByText('Node.js')).toBeInTheDocument()
    expect(screen.getByText('C++ Compiler')).toBeInTheDocument()

    // Should show version for available dependency
    expect(screen.getByText('v18.0.0')).toBeInTheDocument()

    // Should show errors for missing dependencies
    expect(screen.getByText('Python not found in PATH')).toBeInTheDocument()
    expect(screen.getByText('No C++ compiler found')).toBeInTheDocument()

    // Should show installation guides
    expect(screen.getByText('Install Python from https://python.org')).toBeInTheDocument()
    expect(screen.getByText('Install build-essential')).toBeInTheDocument()
  })

  it('should show correct status icons', () => {
    render(
      <DependencyWarning
        dependencies={mockDependenciesWithMissing}
        onRefresh={mockOnRefresh}
        onDismiss={mockOnDismiss}
      />
    )

    // Expand details to see status icons
    fireEvent.click(screen.getByText('Show Details'))

    // Should have checkmarks and X marks
    const statusElements = screen.container.querySelectorAll('.dependency-status')
    expect(statusElements).toHaveLength(3)

    // Check for available and missing status classes
    expect(screen.container.querySelector('.dependency-status.available')).toBeInTheDocument()
    expect(screen.container.querySelectorAll('.dependency-status.missing')).toHaveLength(2)
  })

  it('should show footer note when expanded', () => {
    render(
      <DependencyWarning
        dependencies={mockDependenciesWithMissing}
        onRefresh={mockOnRefresh}
        onDismiss={mockOnDismiss}
      />
    )

    // Expand details
    fireEvent.click(screen.getByText('Show Details'))

    expect(screen.getByText(/You can still use the application/)).toBeInTheDocument()
    expect(screen.getByText(/Install the missing dependencies and click "Refresh"/)).toBeInTheDocument()
  })

  it('should handle dependencies with only errors (no installation guide)', () => {
    const depsWithoutGuide: SystemDependencies = {
      python: {
        name: 'Python',
        available: false,
        error: 'Check failed'
      },
      nodejs: {
        name: 'Node.js',
        available: true,
        version: 'v18.0.0'
      },
      cpp: {
        name: 'C++ Compiler',
        available: true,
        version: 'gcc 9.4.0'
      },
      allAvailable: false
    }

    render(
      <DependencyWarning
        dependencies={depsWithoutGuide}
        onRefresh={mockOnRefresh}
        onDismiss={mockOnDismiss}
      />
    )

    // Expand details
    fireEvent.click(screen.getByText('Show Details'))

    expect(screen.getByText('Check failed')).toBeInTheDocument()
    // Should not crash when installationGuide is undefined
  })
})