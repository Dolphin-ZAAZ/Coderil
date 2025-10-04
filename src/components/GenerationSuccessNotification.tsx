import { useState, useEffect } from 'react'
import { GeneratedKata } from '@/types'
import './GenerationSuccessNotification.css'

export interface GenerationSummary {
  kata: GeneratedKata
  tokensUsed: number
  estimatedCost: number
  generationTime: number
  filesCreated: string[]
}

interface GenerationSuccessNotificationProps {
  summary: GenerationSummary | null
  onDismiss: () => void
  onViewKata?: (slug: string) => void
  onGenerateAnother?: () => void
  duration?: number // Auto-dismiss duration in milliseconds
}

export function GenerationSuccessNotification({ 
  summary, 
  onDismiss, 
  onViewKata,
  onGenerateAnother,
  duration = 8000 
}: GenerationSuccessNotificationProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(duration)

  useEffect(() => {
    if (summary) {
      setIsVisible(true)
      setIsAnimating(true)
      setTimeRemaining(duration)
      
      // Auto-dismiss timer
      const dismissTimer = setTimeout(() => {
        handleDismiss()
      }, duration)

      // Countdown timer
      const countdownInterval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 100) {
            clearInterval(countdownInterval)
            return 0
          }
          return prev - 100
        })
      }, 100)

      return () => {
        clearTimeout(dismissTimer)
        clearInterval(countdownInterval)
      }
    }
  }, [summary, duration])

  const handleDismiss = () => {
    setIsAnimating(false)
    setTimeout(() => {
      setIsVisible(false)
      onDismiss()
    }, 300) // Match CSS transition duration
  }

  const handleViewKata = () => {
    if (summary && onViewKata) {
      onViewKata(summary.kata.slug)
    }
    handleDismiss()
  }

  const handleGenerateAnother = () => {
    if (onGenerateAnother) {
      onGenerateAnother()
    }
    handleDismiss()
  }

  const formatCost = (cost: number): string => {
    if (cost < 0.001) {
      return '<$0.001'
    }
    return `$${cost.toFixed(4)}`
  }

  const formatTime = (ms: number): string => {
    if (ms < 1000) {
      return `${ms}ms`
    }
    const seconds = Math.round(ms / 1000)
    if (seconds < 60) {
      return `${seconds}s`
    }
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const getKataTypeIcon = (type: string): string => {
    switch (type) {
      case 'code': return '💻'
      case 'explain': return '📝'
      case 'template': return '🏗️'
      case 'codebase': return '📚'
      case 'multi-question': return '📋'
      case 'shortform': return '❓'
      case 'multiple-choice': return '☑️'
      case 'one-liner': return '✏️'
      default: return '📄'
    }
  }

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
      case 'easy': return 'var(--success-color, #89d185)'
      case 'medium': return 'var(--warning-color, #ffcc02)'
      case 'hard': return 'var(--error-color, #f48771)'
      default: return 'var(--text-secondary, #cccccc)'
    }
  }

  if (!summary || !isVisible) {
    return null
  }

  const progressPercentage = ((duration - timeRemaining) / duration) * 100

  return (
    <div className={`generation-success-notification ${isAnimating ? 'show' : 'hide'}`}>
      <div className="notification-content">
        <div className="notification-header">
          <div className="success-icon">🎉</div>
          <div className="header-text">
            <h3>Kata Generated Successfully!</h3>
            <p>Your new kata is ready to use</p>
          </div>
          <button 
            className="notification-close"
            onClick={handleDismiss}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>

        <div className="kata-summary">
          <div className="kata-info">
            <div className="kata-title">
              <span className="kata-icon">{getKataTypeIcon(summary.kata.content.metadata.type)}</span>
              <span className="title-text">{summary.kata.content.metadata.title}</span>
            </div>
            
            <div className="kata-details">
              <div className="detail-item">
                <span className="detail-label">Type:</span>
                <span className="detail-value">{summary.kata.content.metadata.type}</span>
              </div>
              
              <div className="detail-item">
                <span className="detail-label">Language:</span>
                <span className="detail-value">
                  {summary.kata.content.metadata.language === 'none' ? 'Text-based' : summary.kata.content.metadata.language.toUpperCase()}
                </span>
              </div>
              
              <div className="detail-item">
                <span className="detail-label">Difficulty:</span>
                <span 
                  className="detail-value difficulty-badge"
                  style={{ color: getDifficultyColor(summary.kata.content.metadata.difficulty) }}
                >
                  {summary.kata.content.metadata.difficulty}
                </span>
              </div>
            </div>

            {summary.kata.content.metadata.tags && summary.kata.content.metadata.tags.length > 0 && (
              <div className="kata-tags">
                {summary.kata.content.metadata.tags.map((tag, index) => (
                  <span key={index} className="tag">{tag}</span>
                ))}
              </div>
            )}
          </div>

          <div className="generation-stats">
            <div className="stat-item">
              <span className="stat-icon">⚡</span>
              <div className="stat-content">
                <span className="stat-label">Generation Time</span>
                <span className="stat-value">{formatTime(summary.generationTime)}</span>
              </div>
            </div>

            <div className="stat-item">
              <span className="stat-icon">🔤</span>
              <div className="stat-content">
                <span className="stat-label">Tokens Used</span>
                <span className="stat-value">{summary.tokensUsed.toLocaleString()}</span>
              </div>
            </div>

            <div className="stat-item">
              <span className="stat-icon">💰</span>
              <div className="stat-content">
                <span className="stat-label">Estimated Cost</span>
                <span className="stat-value">{formatCost(summary.estimatedCost)}</span>
              </div>
            </div>

            <div className="stat-item">
              <span className="stat-icon">📁</span>
              <div className="stat-content">
                <span className="stat-label">Files Created</span>
                <span className="stat-value">{summary.filesCreated.length}</span>
              </div>
            </div>
          </div>

          {summary.filesCreated.length > 0 && (
            <div className="files-created">
              <h4>Files Created:</h4>
              <ul className="file-list">
                {summary.filesCreated.map((file, index) => (
                  <li key={index} className="file-item">
                    <span className="file-icon">📄</span>
                    <span className="file-name">{file}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="notification-actions">
          <button 
            className="action-button primary"
            onClick={handleViewKata}
          >
            <span className="button-icon">👁️</span>
            View Kata
          </button>
          
          <button 
            className="action-button secondary"
            onClick={handleGenerateAnother}
          >
            <span className="button-icon">➕</span>
            Generate Another
          </button>
        </div>
      </div>

      <div className="notification-progress">
        <div 
          className="progress-bar" 
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </div>
  )
}