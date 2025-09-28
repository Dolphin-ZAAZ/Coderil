import React, { useState, useEffect } from 'react'
import { SystemDependencies, DependencyStatus } from '@/types'
import './DependencyWarning.css'

interface DependencyWarningProps {
  dependencies: SystemDependencies | null
  onRefresh: () => void
  onDismiss: () => void
}

export const DependencyWarning: React.FC<DependencyWarningProps> = ({
  dependencies,
  onRefresh,
  onDismiss
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!dependencies || dependencies.allAvailable) {
    return null
  }

  const missingDependencies = [
    dependencies.python,
    dependencies.nodejs,
    dependencies.cpp
  ].filter(dep => !dep.available)

  const renderDependencyStatus = (dep: DependencyStatus) => (
    <div key={dep.name} className="dependency-item">
      <div className="dependency-header">
        <span className={`dependency-status ${dep.available ? 'available' : 'missing'}`}>
          {dep.available ? '✓' : '✗'}
        </span>
        <span className="dependency-name">{dep.name}</span>
        {dep.version && <span className="dependency-version">{dep.version}</span>}
      </div>
      
      {!dep.available && (
        <div className="dependency-details">
          {dep.error && (
            <div className="dependency-error">
              <strong>Issue:</strong> {dep.error}
            </div>
          )}
          {dep.installationGuide && (
            <div className="dependency-guide">
              <strong>Installation:</strong> {dep.installationGuide}
            </div>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div className="dependency-warning">
      <div className="warning-header">
        <div className="warning-icon">⚠️</div>
        <div className="warning-content">
          <h3>Missing Runtime Dependencies</h3>
          <p>
            {missingDependencies.length} of 3 required runtime dependencies are missing. 
            Some kata types may not work properly.
          </p>
        </div>
        <div className="warning-actions">
          <button 
            className="btn-secondary"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Hide Details' : 'Show Details'}
          </button>
          <button 
            className="btn-primary"
            onClick={onRefresh}
          >
            Refresh
          </button>
          <button 
            className="btn-text"
            onClick={onDismiss}
            title="Dismiss warning (will show again on restart)"
          >
            ✕
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="warning-details">
          <div className="dependencies-list">
            {[dependencies.python, dependencies.nodejs, dependencies.cpp].map(renderDependencyStatus)}
          </div>
          
          <div className="warning-footer">
            <p>
              <strong>Note:</strong> You can still use the application, but katas requiring missing 
              dependencies will show execution errors. Install the missing dependencies and click 
              "Refresh" to update the status.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}