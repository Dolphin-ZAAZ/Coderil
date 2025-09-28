import { useEffect, useState } from 'react'
import type { AutoContinueNotification } from '@/types'
import './AutoContinueNotification.css'

interface AutoContinueNotificationProps {
  notification: AutoContinueNotification | null
  onDismiss: () => void
  duration?: number // Duration in milliseconds
}

export function AutoContinueNotification({ 
  notification, 
  onDismiss, 
  duration = 4000 
}: AutoContinueNotificationProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (notification) {
      setIsVisible(true)
      setIsAnimating(true)
      
      // Auto-dismiss after duration
      const timer = setTimeout(() => {
        handleDismiss()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [notification, duration])

  const handleDismiss = () => {
    setIsAnimating(false)
    setTimeout(() => {
      setIsVisible(false)
      onDismiss()
    }, 300) // Match CSS transition duration
  }

  if (!notification || !isVisible) {
    return null
  }

  return (
    <div className={`auto-continue-notification ${isAnimating ? 'show' : 'hide'}`}>
      <div className="notification-content">
        <div className="notification-icon">🔄</div>
        <div className="notification-text">
          <div className="notification-message">{notification.message}</div>
          <div className="notification-details">
            Continuing to new kata...
          </div>
        </div>
        <button 
          className="notification-dismiss"
          onClick={handleDismiss}
          aria-label="Dismiss notification"
        >
          ×
        </button>
      </div>
      <div className="notification-progress">
        <div 
          className="progress-bar" 
          style={{ animationDuration: `${duration}ms` }}
        />
      </div>
    </div>
  )
}