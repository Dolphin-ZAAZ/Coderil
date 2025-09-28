import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { AutoContinueNotification } from '../AutoContinueNotification'
import { AutoContinueNotification as AutoContinueNotificationType } from '@/types'

describe('AutoContinueNotification', () => {
  const mockNotification: AutoContinueNotificationType = {
    message: 'Auto-continuing from "First Kata" to "Second Kata"',
    fromKata: 'first-kata',
    toKata: 'second-kata',
    timestamp: new Date('2023-01-01T12:00:00Z')
  }

  const mockOnDismiss = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('should not render when notification is null', () => {
    render(
      <AutoContinueNotification
        notification={null}
        onDismiss={mockOnDismiss}
      />
    )

    expect(screen.queryByText(/Auto-continuing/)).not.toBeInTheDocument()
  })

  it('should render notification with correct message', () => {
    render(
      <AutoContinueNotification
        notification={mockNotification}
        onDismiss={mockOnDismiss}
      />
    )

    expect(screen.getByText('Auto-continuing from "First Kata" to "Second Kata"')).toBeInTheDocument()
    expect(screen.getByText('Continuing to new kata...')).toBeInTheDocument()
  })

  it('should show notification with animation class', () => {
    render(
      <AutoContinueNotification
        notification={mockNotification}
        onDismiss={mockOnDismiss}
      />
    )

    const notification = screen.getByText('Auto-continuing from "First Kata" to "Second Kata"').closest('.auto-continue-notification')
    expect(notification).toHaveClass('show')
  })

  it('should auto-dismiss after default duration', async () => {
    render(
      <AutoContinueNotification
        notification={mockNotification}
        onDismiss={mockOnDismiss}
      />
    )

    // Fast-forward time by default duration (4000ms)
    act(() => {
      vi.advanceTimersByTime(4000)
    })

    // Wait for the animation to complete (300ms)
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(mockOnDismiss).toHaveBeenCalledTimes(1)
  })

  it('should auto-dismiss after custom duration', async () => {
    render(
      <AutoContinueNotification
        notification={mockNotification}
        onDismiss={mockOnDismiss}
        duration={2000}
      />
    )

    // Fast-forward time by custom duration (2000ms)
    act(() => {
      vi.advanceTimersByTime(2000)
    })

    // Wait for the animation to complete (300ms)
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(mockOnDismiss).toHaveBeenCalledTimes(1)
  })

  it('should dismiss when close button is clicked', async () => {
    render(
      <AutoContinueNotification
        notification={mockNotification}
        onDismiss={mockOnDismiss}
      />
    )

    const dismissButton = screen.getByRole('button', { name: 'Dismiss notification' })
    
    act(() => {
      fireEvent.click(dismissButton)
    })

    // Fast-forward the animation duration
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(mockOnDismiss).toHaveBeenCalledTimes(1)
  })

  it('should have correct accessibility attributes', () => {
    render(
      <AutoContinueNotification
        notification={mockNotification}
        onDismiss={mockOnDismiss}
      />
    )

    const dismissButton = screen.getByRole('button', { name: 'Dismiss notification' })
    expect(dismissButton).toHaveAttribute('aria-label', 'Dismiss notification')
  })

  it('should display notification icon', () => {
    render(
      <AutoContinueNotification
        notification={mockNotification}
        onDismiss={mockOnDismiss}
      />
    )

    expect(screen.getByText('🔄')).toBeInTheDocument()
  })

  it('should have progress bar with correct animation duration', () => {
    const customDuration = 3000
    render(
      <AutoContinueNotification
        notification={mockNotification}
        onDismiss={mockOnDismiss}
        duration={customDuration}
      />
    )

    const progressBar = document.querySelector('.progress-bar')
    expect(progressBar).toHaveStyle(`animation-duration: ${customDuration}ms`)
  })

  it('should clean up timer when component unmounts', () => {
    const { unmount } = render(
      <AutoContinueNotification
        notification={mockNotification}
        onDismiss={mockOnDismiss}
      />
    )

    act(() => {
      unmount()
    })

    // Fast-forward time to ensure timer doesn't fire after unmount
    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(mockOnDismiss).not.toHaveBeenCalled()
  })

  it('should handle notification change correctly', async () => {
    const { rerender } = render(
      <AutoContinueNotification
        notification={mockNotification}
        onDismiss={mockOnDismiss}
      />
    )

    // Change to a new notification
    const newNotification: AutoContinueNotificationType = {
      message: 'Auto-continuing from "Second Kata" to "Third Kata"',
      fromKata: 'second-kata',
      toKata: 'third-kata',
      timestamp: new Date('2023-01-01T12:05:00Z')
    }

    rerender(
      <AutoContinueNotification
        notification={newNotification}
        onDismiss={mockOnDismiss}
      />
    )

    expect(screen.getByText('Auto-continuing from "Second Kata" to "Third Kata"')).toBeInTheDocument()
  })

  it('should handle null notification after showing notification', () => {
    const { rerender } = render(
      <AutoContinueNotification
        notification={mockNotification}
        onDismiss={mockOnDismiss}
      />
    )

    expect(screen.getByText('Auto-continuing from "First Kata" to "Second Kata"')).toBeInTheDocument()

    rerender(
      <AutoContinueNotification
        notification={null}
        onDismiss={mockOnDismiss}
      />
    )

    expect(screen.queryByText(/Auto-continuing/)).not.toBeInTheDocument()
  })
})