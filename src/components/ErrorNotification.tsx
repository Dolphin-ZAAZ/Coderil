import { useState, useEffect } from 'react'
import { ErrorNotification as ErrorNotificationType } from '@/types'
import { errorHandler } from '@/services/error-handler'
import './ErrorNotification.css'

interface ErrorNotificationProps {
  notification: ErrorNotificationType
  onDismiss: (id: string) => void
}

function ErrorNotificationItem({ notification, onDismiss }: ErrorNotificationProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [showDetails, setShowDetails] = useState(false)

  const handleDismiss = () => {
    setIsVisible(false)
    setTimeout(() => onDismiss(notification.id), 300) // Wait for animation
  }

  const getErrorIcon = () => {
    switch (notification.error.type) {
      case 'FILE_SYSTEM_ERROR':
        return '📁'
      case 'EXECUTION_ERROR':
        return '⚡'
      case 'AI_SERVICE_ERROR':
        return '🤖'
      case 'DATABASE_ERROR':
        return '💾'
      case 'NETWORK_ERROR':
        return '🌐'
      case 'VALIDATION_ERROR':
        return '⚠️'
      default:
        return '❌'
    }
  }

  const getSeverityClass = () => {
    if (!notification.error.recoverable) return 'error'
    return notification.error.type === 'VALIDATION_ERROR' ? 'warning' : 'error'
  }

  return (
    <div className={`error-notification ${getSeverityClass()} ${isVisible ? 'visible' : 'hidden'}`}>
      <div className="error-notification-header">
        <div className="error-notification-icon">
          {getErrorIcon()}
        </div>
        <div className="error-notification-content">
          <div className="error-notification-title">
            {notification.error.message}
          </div>
          {notification.error.details && (
            <div className="error-notification-details">
              {notification.error.details}
            </div>
          )}
        </div>
        <div className="error-notification-actions">
          {notification.error.details && (
            <button
              className="error-notification-toggle"
              onClick={() => setShowDetails(!showDetails)}
              title={showDetails ? 'Hide details' : 'Show details'}
            >
              {showDetails ? '▼' : '▶'}
            </button>
          )}
          <button
            className="error-notification-close"
            onClick={handleDismiss}
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>

      {showDetails && notification.error.details && (
        <div className="error-notification-expanded">
          <div className="error-notification-expanded-content">
            <strong>Details:</strong>
            <pre>{notification.error.details}</pre>
            
            {notification.error.context && (
              <>
                <strong>Context:</strong>
                <pre>{JSON.stringify(notification.error.context, null, 2)}</pre>
              </>
            )}
            
            <div className="error-notification-timestamp">
              Occurred at: {notification.error.timestamp.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {notification.actions && notification.actions.length > 0 && (
        <div className="error-notification-recovery">
          {notification.actions.map((action, index) => (
            <button
              key={index}
              className={`error-notification-action ${action.primary ? 'primary' : ''}`}
              onClick={() => {
                action.action()
                if (!action.primary) {
                  handleDismiss()
                }
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function ErrorNotificationContainer() {
  const [notifications, setNotifications] = useState<ErrorNotificationType[]>([])

  useEffect(() => {
    const unsubscribe = errorHandler.onNotification((notification) => {
      setNotifications(prev => [...prev, notification])
      
      // Auto-dismiss after 10 seconds for recoverable errors
      if (notification.error.recoverable) {
        setTimeout(() => {
          handleDismiss(notification.id)
        }, 10000)
      }
    })

    return unsubscribe
  }, [])

  const handleDismiss = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const handleDismissAll = () => {
    setNotifications([])
  }

  if (notifications.length === 0) {
    return null
  }

  return (
    <div className="error-notification-container">
      <div className="error-notification-header-bar">
        <span className="error-notification-count">
          {notifications.length} error{notifications.length !== 1 ? 's' : ''}
        </span>
        <button
          className="error-notification-dismiss-all"
          onClick={handleDismissAll}
        >
          Dismiss All
        </button>
      </div>
      
      <div className="error-notification-list">
        {notifications.map(notification => (
          <ErrorNotificationItem
            key={notification.id}
            notification={notification}
            onDismiss={handleDismiss}
          />
        ))}
      </div>
    </div>
  )
}

export default ErrorNotificationContainer