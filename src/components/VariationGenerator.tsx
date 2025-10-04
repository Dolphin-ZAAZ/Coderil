import { useState, useCallback } from 'react'
import { 
  Kata, 
  GeneratedKata, 
  Difficulty,
  GenerationProgress
} from '@/types'
import { VariationOptions } from '@/services/ai-authoring'
import { SeriesManagerService } from '@/services/series-manager'
import './VariationGenerator.css'

interface VariationGeneratorProps {
  sourceKata: Kata
  isOpen: boolean
  onClose: () => void
  onVariationGenerated: (variation: GeneratedKata) => void
}

interface VariationFormData {
  difficultyAdjustment: 'easier' | 'harder' | 'same'
  focusArea: string
  parameterChanges: string
  seriesName: string
  additionalRequirements: string
}

const DIFFICULTY_ADJUSTMENTS = [
  { value: 'easier' as const, label: 'Easier', description: 'Simplify constraints and reduce complexity' },
  { value: 'same' as const, label: 'Same Difficulty', description: 'Maintain similar complexity level' },
  { value: 'harder' as const, label: 'Harder', description: 'Add complexity and additional requirements' }
]

export function VariationGenerator({ 
  sourceKata, 
  isOpen, 
  onClose, 
  onVariationGenerated 
}: VariationGeneratorProps) {
  const seriesManager = SeriesManagerService.getInstance()
  
  const [formData, setFormData] = useState<VariationFormData>({
    difficultyAdjustment: 'same',
    focusArea: '',
    parameterChanges: '',
    seriesName: '',
    additionalRequirements: ''
  })

  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState<GenerationProgress | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleInputChange = useCallback((field: keyof VariationFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }, [])

  const validateForm = (): string | null => {
    // Basic validation - all fields are optional for variation generation
    return null
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsGenerating(true)
    setError(null)
    setProgress(null)

    try {
      // Build variation options
      const options: VariationOptions = {
        difficultyAdjustment: formData.difficultyAdjustment,
        focusArea: formData.focusArea || undefined,
        parameterChanges: formData.parameterChanges || undefined,
        seriesName: formData.seriesName || undefined
      }

      // Add additional requirements if provided
      if (formData.additionalRequirements) {
        // In a full implementation, this would be passed to the AI service
        console.log('Additional requirements:', formData.additionalRequirements)
      }

      // Simulate progress updates
      setProgress({
        stage: 'generating',
        message: 'Generating kata variation...',
        progress: 20
      })

      // TODO: Implement IPC call for variation generation
      // const variation = await window.electronAPI.generateVariation(sourceKata, options)
      // onVariationGenerated(variation)
      // onClose()
      
      // For now, show that the form validation and UI works
      setTimeout(() => {
        setProgress({
          stage: 'complete',
          message: 'Variation generation would be implemented via IPC in the full Electron app',
          progress: 100
        })
      }, 1500)
      
      setTimeout(() => {
        setError('Variation generation IPC handler not yet implemented. This UI component is ready for integration.')
      }, 3000)

    } catch (error) {
      console.error('Variation generation failed:', error)
      setError(error instanceof Error ? error.message : 'Variation generation failed')
    } finally {
      setIsGenerating(false)
      setProgress(null)
    }
  }

  const handleCancel = () => {
    if (isGenerating) {
      // In a real implementation, we'd cancel the generation
      setIsGenerating(false)
      setProgress(null)
    }
    onClose()
  }

  const getTargetDifficulty = (): Difficulty => {
    if (formData.difficultyAdjustment === 'same') {
      return sourceKata.difficulty
    }
    
    const difficultyOrder: Difficulty[] = ['easy', 'medium', 'hard']
    const currentIndex = difficultyOrder.indexOf(sourceKata.difficulty)
    
    if (formData.difficultyAdjustment === 'easier') {
      return difficultyOrder[Math.max(0, currentIndex - 1)]
    } else { // harder
      return difficultyOrder[Math.min(difficultyOrder.length - 1, currentIndex + 1)]
    }
  }

  const generateSeriesName = (): string => {
    if (formData.seriesName) {
      return formData.seriesName
    }
    
    // Use series manager for intelligent series name generation
    return seriesManager.generateSeriesName(sourceKata, formData.focusArea || undefined)
  }

  if (!isOpen) return null

  const targetDifficulty = getTargetDifficulty()
  const suggestedSeriesName = generateSeriesName()

  return (
    <div className="variation-generator-overlay">
      <div className="variation-generator-dialog">
        <div className="dialog-header">
          <h2>Generate Variation</h2>
          <button 
            className="close-button" 
            onClick={handleCancel}
            disabled={isGenerating}
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>

        <div className="source-kata-info">
          <h3>Source Kata</h3>
          <div className="kata-details">
            <div className="kata-title">{sourceKata.title}</div>
            <div className="kata-meta">
              <span className="difficulty">{sourceKata.difficulty}</span>
              <span className="language">{sourceKata.language}</span>
              <span className="type">{sourceKata.type}</span>
            </div>
            {sourceKata.tags.length > 0 && (
              <div className="kata-tags">
                {sourceKata.tags.map(tag => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="dialog-content">
          {/* Difficulty Adjustment */}
          <div className="form-section">
            <h3>Difficulty Adjustment</h3>
            
            <div className="difficulty-options">
              {DIFFICULTY_ADJUSTMENTS.map(option => (
                <label key={option.value} className="difficulty-option">
                  <input
                    type="radio"
                    name="difficultyAdjustment"
                    value={option.value}
                    checked={formData.difficultyAdjustment === option.value}
                    onChange={(e) => handleInputChange('difficultyAdjustment', e.target.value)}
                    disabled={isGenerating}
                  />
                  <div className="option-content">
                    <div className="option-label">{option.label}</div>
                    <div className="option-description">{option.description}</div>
                    {option.value !== 'same' && (
                      <div className="target-difficulty">
                        Target: <span className="difficulty-badge">{targetDifficulty}</span>
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Focus Area */}
          <div className="form-section">
            <h3>Variation Focus</h3>
            
            <div className="form-group">
              <label htmlFor="focusArea">
                Focus Area
                <span className="field-hint">Specific aspect or concept to emphasize in the variation</span>
              </label>
              <input
                id="focusArea"
                type="text"
                value={formData.focusArea}
                onChange={(e) => handleInputChange('focusArea', e.target.value)}
                placeholder="e.g., error handling, edge cases, performance optimization"
                disabled={isGenerating}
              />
            </div>

            <div className="form-group">
              <label htmlFor="parameterChanges">
                Parameter Changes
                <span className="field-hint">Specific modifications to make to the problem parameters</span>
              </label>
              <textarea
                id="parameterChanges"
                value={formData.parameterChanges}
                onChange={(e) => handleInputChange('parameterChanges', e.target.value)}
                placeholder="e.g., change input range from 1-100 to 1-1000, add string validation, require O(log n) complexity"
                rows={3}
                disabled={isGenerating}
              />
            </div>
          </div>

          {/* Series Configuration */}
          <div className="form-section">
            <h3>Series Configuration</h3>
            
            <div className="form-group">
              <label htmlFor="seriesName">
                Series Name
                <span className="field-hint">Name for the kata series (leave empty for auto-generation)</span>
              </label>
              <input
                id="seriesName"
                type="text"
                value={formData.seriesName}
                onChange={(e) => handleInputChange('seriesName', e.target.value)}
                placeholder={`Suggested: ${suggestedSeriesName}`}
                disabled={isGenerating}
              />
              <div className="series-preview">
                <strong>Series name will be:</strong> {formData.seriesName || suggestedSeriesName}
              </div>
            </div>
          </div>

          {/* Additional Requirements */}
          <div className="form-section">
            <h3>Additional Requirements</h3>
            
            <div className="form-group">
              <label htmlFor="additionalRequirements">
                Additional Instructions
                <span className="field-hint">Any other specific requirements or modifications for the variation</span>
              </label>
              <textarea
                id="additionalRequirements"
                value={formData.additionalRequirements}
                onChange={(e) => handleInputChange('additionalRequirements', e.target.value)}
                placeholder="e.g., add input validation, include more test cases, change the context/theme"
                rows={3}
                disabled={isGenerating}
              />
            </div>
          </div>

          {/* Progress Display */}
          {(isGenerating || progress) && (
            <div className="progress-section">
              {progress && (
                <>
                  <div className="progress-header">
                    <span className="progress-stage">{progress.stage}</span>
                    <span className="progress-percentage">{progress.progress}%</span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${progress.progress}%` }}
                    />
                  </div>
                  <div className="progress-message">{progress.message}</div>
                  {progress.tokensUsed && (
                    <div className="progress-stats">
                      Tokens used: {progress.tokensUsed}
                      {progress.estimatedCost && (
                        <span> • Estimated cost: ${progress.estimatedCost.toFixed(4)}</span>
                      )}
                    </div>
                  )}
                </>
              )}
              {isGenerating && !progress && (
                <div className="progress-message">Initializing variation generation...</div>
              )}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="error-message">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Form Actions */}
          <div className="dialog-actions">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isGenerating}
              className="secondary"
            >
              {isGenerating ? 'Cancel' : 'Close'}
            </button>
            <button
              type="submit"
              disabled={isGenerating}
              className="primary"
            >
              {isGenerating ? 'Generating Variation...' : 'Generate Variation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}