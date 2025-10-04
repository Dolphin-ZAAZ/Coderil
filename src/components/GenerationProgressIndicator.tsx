import { useState, useEffect } from 'react'
import { GenerationProgress } from '@/types'
import './GenerationProgressIndicator.css'

interface GenerationProgressIndicatorProps {
  progress: GenerationProgress | null
  onCancel?: () => void
  showEstimatedTime?: boolean
  showTokenUsage?: boolean
  showCostEstimate?: boolean
}

export function GenerationProgressIndicator({ 
  progress, 
  onCancel,
  showEstimatedTime = true,
  showTokenUsage = true,
  showCostEstimate = true
}: GenerationProgressIndicatorProps) {
  const [elapsedTime, setElapsedTime] = useState(0)
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null)
  const [startTime] = useState(Date.now())

  useEffect(() => {
    if (!progress || progress.stage === 'complete' || progress.stage === 'error') {
      return
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      setElapsedTime(elapsed)

      // Estimate time remaining based on progress
      if (progress.progress > 0 && progress.progress < 100) {
        const totalEstimated = (elapsed / progress.progress) * 100
        const remaining = totalEstimated - elapsed
        setEstimatedTimeRemaining(Math.max(0, remaining))
      }
    }, 100)

    return () => clearInterval(interval)
  }, [progress, startTime])

  const formatTime = (ms: number): string => {
    if (ms < 1000) {
      return `${Math.round(ms / 100) / 10}s`
    }
    const seconds = Math.round(ms / 1000)
    if (seconds < 60) {
      return `${seconds}s`
    }
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const formatCost = (cost: number): string => {
    if (cost < 0.001) {
      return '<$0.001'
    }
    return `$${cost.toFixed(4)}`
  }

  const getStageIcon = (stage: string): string => {
    switch (stage) {
      case 'initializing': return '🔄'
      case 'generating': return '🤖'
      case 'parsing': return '📝'
      case 'validating': return '✅'
      case 'complete': return '🎉'
      case 'error': return '❌'
      default: return '⏳'
    }
  }

  const getStageDescription = (stage: string): string => {
    switch (stage) {
      case 'initializing': return 'Setting up generation parameters...'
      case 'generating': return 'AI is creating your kata content...'
      case 'parsing': return 'Processing and structuring the response...'
      case 'validating': return 'Validating generated content...'
      case 'complete': return 'Generation completed successfully!'
      case 'error': return 'An error occurred during generation'
      default: return 'Processing...'
    }
  }

  if (!progress) {
    return null
  }

  const isComplete = progress.stage === 'complete'
  const isError = progress.stage === 'error'
  const isActive = !isComplete && !isError

  return (
    <div className={`generation-progress-indicator ${progress.stage}`}>
      <div className="progress-header">
        <div className="stage-info">
          <span className="stage-icon">{getStageIcon(progress.stage)}</span>
          <div className="stage-text">
            <div className="stage-name">
              {progress.stage.charAt(0).toUpperCase() + progress.stage.slice(1)}
            </div>
            <div className="stage-description">
              {getStageDescription(progress.stage)}
            </div>
          </div>
        </div>
        
        {onCancel && isActive && (
          <button 
            className="cancel-button"
            onClick={onCancel}
            title="Cancel generation"
          >
            ✕
          </button>
        )}
      </div>

      <div className="progress-content">
        <div className="progress-message">
          {progress.message}
        </div>

        <div className="progress-bar-container">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress.progress}%` }}
            />
          </div>
          <div className="progress-percentage">
            {Math.round(progress.progress)}%
          </div>
        </div>

        {isActive && (
          <div className="progress-stats">
            {showEstimatedTime && (
              <div className="stat-group">
                <div className="stat-item">
                  <span className="stat-icon">⏱️</span>
                  <div className="stat-content">
                    <span className="stat-label">Elapsed</span>
                    <span className="stat-value">{formatTime(elapsedTime)}</span>
                  </div>
                </div>
                
                {estimatedTimeRemaining !== null && estimatedTimeRemaining > 1000 && (
                  <div className="stat-item">
                    <span className="stat-icon">⏳</span>
                    <div className="stat-content">
                      <span className="stat-label">Remaining</span>
                      <span className="stat-value">{formatTime(estimatedTimeRemaining)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {(showTokenUsage || showCostEstimate) && (progress.tokensUsed || progress.estimatedCost) && (
              <div className="stat-group">
                {showTokenUsage && progress.tokensUsed && (
                  <div className="stat-item">
                    <span className="stat-icon">🔤</span>
                    <div className="stat-content">
                      <span className="stat-label">Tokens</span>
                      <span className="stat-value">{progress.tokensUsed.toLocaleString()}</span>
                    </div>
                  </div>
                )}
                
                {showCostEstimate && progress.estimatedCost && (
                  <div className="stat-item">
                    <span className="stat-icon">💰</span>
                    <div className="stat-content">
                      <span className="stat-label">Cost</span>
                      <span className="stat-value">{formatCost(progress.estimatedCost)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {isComplete && (progress.tokensUsed || progress.estimatedCost) && (
          <div className="completion-stats">
            <div className="completion-summary">
              <span className="summary-text">Generation completed in {formatTime(elapsedTime)}</span>
              {progress.tokensUsed && (
                <span className="summary-detail">
                  • {progress.tokensUsed.toLocaleString()} tokens
                </span>
              )}
              {progress.estimatedCost && (
                <span className="summary-detail">
                  • {formatCost(progress.estimatedCost)} cost
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {isActive && (
        <div className="progress-animation">
          <div className="pulse-dot"></div>
          <div className="pulse-dot"></div>
          <div className="pulse-dot"></div>
        </div>
      )}
    </div>
  )
}