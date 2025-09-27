import { useState, useEffect, useCallback } from 'react'
import { Progress } from '@/types'
import './ProgressDisplay.css'

export interface ProgressDisplayProps {
  kataId: string
  onReset?: () => void
  showResetButton?: boolean
}

export function ProgressDisplay({ kataId, onReset, showResetButton = false }: ProgressDisplayProps) {
  const [progress, setProgress] = useState<Progress | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadProgress = useCallback(async () => {
    if (!window.electronAPI || !kataId) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      
      const [progressData, statsData] = await Promise.all([
        window.electronAPI.getProgress(kataId),
        window.electronAPI.getKataStats(kataId)
      ])
      
      setProgress(progressData)
      setStats(statsData)
    } catch (err) {
      console.error('Failed to load progress:', err)
      setError('Failed to load progress data')
    } finally {
      setIsLoading(false)
    }
  }, [kataId])

  useEffect(() => {
    loadProgress()
  }, [loadProgress])

  const handleReset = async () => {
    if (!window.electronAPI || !kataId) return

    try {
      // Refresh progress display
      await loadProgress()
      
      // Call parent reset handler (which will handle resetting to starter code)
      if (onReset) {
        onReset()
      }
    } catch (err) {
      console.error('Failed to reset kata:', err)
      setError('Failed to reset kata')
    }
  }

  if (isLoading) {
    return (
      <div className="progress-display loading">
        <div className="progress-spinner"></div>
        <span>Loading progress...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="progress-display error">
        <span className="error-message">{error}</span>
        <button onClick={loadProgress} className="retry-button">
          Retry
        </button>
      </div>
    )
  }

  if (!progress && !stats) {
    return (
      <div className="progress-display empty">
        <span className="empty-message">No progress data yet</span>
      </div>
    )
  }

  const hasAttempts = stats && stats.totalAttempts > 0
  const hasPassed = stats && stats.passedAttempts > 0

  return (
    <div className="progress-display">
      <div className="progress-header">
        <h4>Progress</h4>
        {showResetButton && (
          <button 
            onClick={handleReset}
            className="reset-button"
            title="Reset saved code and start fresh"
          >
            Reset
          </button>
        )}
      </div>
      
      <div className="progress-content">
        {hasAttempts ? (
          <div className="progress-stats">
            <div className="stat-item">
              <span className="stat-label">Best Score</span>
              <span className="stat-value">{Math.round(stats.bestScore)}%</span>
            </div>
            
            <div className="stat-item">
              <span className="stat-label">Attempts</span>
              <span className="stat-value">{stats.totalAttempts}</span>
            </div>
            
            <div className="stat-item">
              <span className="stat-label">Passed</span>
              <span className="stat-value">{stats.passedAttempts}</span>
            </div>
            
            <div className="stat-item">
              <span className="stat-label">Average Score</span>
              <span className="stat-value">{Math.round(stats.averageScore)}%</span>
            </div>
            
            <div className="stat-item">
              <span className="stat-label">Last Status</span>
              <span className={`stat-value status-${stats.lastStatus}`}>
                {stats.lastStatus.charAt(0).toUpperCase() + stats.lastStatus.slice(1)}
              </span>
            </div>
            
            {progress?.lastAttempt && (
              <div className="stat-item">
                <span className="stat-label">Last Attempt</span>
                <span className="stat-value">
                  {new Date(progress.lastAttempt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="no-attempts">
            <p>No attempts yet. Run or submit your code to start tracking progress!</p>
          </div>
        )}
        
        {hasPassed && (
          <div className="success-indicator">
            <span className="success-icon">🎉</span>
            <span className="success-text">Kata completed!</span>
          </div>
        )}
      </div>
    </div>
  )
}