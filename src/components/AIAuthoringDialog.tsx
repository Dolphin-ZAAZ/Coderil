import { useState, useEffect, useCallback } from 'react'
import { 
  KataGenerationRequest, 
  Language, 
  Difficulty, 
  KataType, 
  AIGenerationConfig,
  GeneratedKata,
  GenerationProgress
} from '@/types'
// AI services are accessed via IPC in Electron renderer process
import './AIAuthoringDialog.css'

interface AIAuthoringDialogProps {
  isOpen: boolean
  onClose: () => void
  onKataGenerated: (kata: GeneratedKata) => void
}

interface FormData {
  description: string
  language: Language
  difficulty: Difficulty
  type: KataType
  topics: string
  constraints: string
  tags: string
  additionalRequirements: string
  generateHiddenTests: boolean
  // Multi-question specific
  questionCount: number
  questionTypes: string[]
  passingScore: number
  allowReview: boolean
  showProgressBar: boolean
  // Shortform specific
  questionType: 'shortform' | 'multiple-choice' | 'one-liner'
  optionCount: number
  caseSensitive: boolean
  maxLength: number
  // Context and files
  contextFiles: File[]
  contextText: string
}

const KATA_TYPES: { value: KataType; label: string; description: string }[] = [
  { value: 'code', label: 'Code Kata', description: 'Traditional programming challenge with starter code and tests' },
  { value: 'explain', label: 'Explanation Kata', description: 'Technical writing and explanation challenge' },
  { value: 'template', label: 'Template Kata', description: 'Project scaffolding and boilerplate creation' },
  { value: 'codebase', label: 'Codebase Kata', description: 'Code analysis and documentation challenge' },
  { value: 'multi-question', label: 'Multi-Question Assessment', description: 'Comprehensive assessment with mixed question types' },
  { value: 'shortform', label: 'Shortform Question', description: 'Quick knowledge check with short answers' },
  { value: 'multiple-choice', label: 'Multiple Choice', description: 'Multiple choice questions with distractors' },
  { value: 'one-liner', label: 'One-Liner', description: 'Fill-in-the-blank or completion questions' }
]

const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'py', label: 'Python' },
  { value: 'js', label: 'JavaScript' },
  { value: 'ts', label: 'TypeScript' },
  { value: 'cpp', label: 'C++' },
  { value: 'none', label: 'No Code (Text-based)' }
]

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' }
]

const QUESTION_TYPES = [
  { value: 'multiple-choice', label: 'Multiple Choice' },
  { value: 'shortform', label: 'Short Answer' },
  { value: 'one-liner', label: 'One-Liner' },
  { value: 'code', label: 'Code Challenge' },
  { value: 'explanation', label: 'Explanation' }
]

export function AIAuthoringDialog({ isOpen, onClose, onKataGenerated }: AIAuthoringDialogProps) {
  const [formData, setFormData] = useState<FormData>({
    description: '',
    language: 'py',
    difficulty: 'medium',
    type: 'code',
    topics: '',
    constraints: '',
    tags: '',
    additionalRequirements: '',
    generateHiddenTests: true,
    // Multi-question defaults
    questionCount: 5,
    questionTypes: ['multiple-choice', 'shortform'],
    passingScore: 70,
    allowReview: true,
    showProgressBar: true,
    // Shortform defaults
    questionType: 'shortform',
    optionCount: 4,
    caseSensitive: false,
    maxLength: 100,
    // Context defaults
    contextFiles: [],
    contextText: ''
  })

  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState<GenerationProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aiConfig, setAiConfig] = useState<AIGenerationConfig | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // AI services are accessed via IPC calls

  // Load AI configuration on mount
  useEffect(() => {
    if (isOpen) {
      loadAiConfig()
    }
  }, [isOpen])

  // Subscribe to generation progress
  useEffect(() => {
    if (isGenerating) {
      // Progress updates would be handled via IPC events in a full implementation
      // For now, we'll simulate progress
      const interval = setInterval(() => {
        setProgress(prev => {
          if (!prev) {
            return {
              stage: 'generating',
              message: 'Generating kata content...',
              progress: 10
            }
          }
          if (prev.progress < 90) {
            return {
              ...prev,
              progress: prev.progress + 10
            }
          }
          return prev
        })
      }, 500)
      
      return () => clearInterval(interval)
    }
  }, [isGenerating])

  const loadAiConfig = async () => {
    try {
      if (window.electronAPI) {
        const config = await window.electronAPI.getAiConfig()
        setAiConfig(config)
      }
    } catch (error) {
      console.error('Failed to load AI config:', error)
      setError('Failed to load AI configuration')
    }
  }

  const handleInputChange = useCallback((field: keyof FormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }, [])

  const handleQuestionTypesChange = useCallback((type: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      questionTypes: checked 
        ? [...prev.questionTypes, type]
        : prev.questionTypes.filter(t => t !== type)
    }))
  }, [])

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setFormData(prev => ({
      ...prev,
      contextFiles: [...prev.contextFiles, ...files]
    }))
  }, [])

  const removeFile = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      contextFiles: prev.contextFiles.filter((_, i) => i !== index)
    }))
  }, [])

  const validateForm = (): string | null => {
    if (!formData.description.trim()) {
      return 'Please provide a description for the kata'
    }

    if (!aiConfig?.openaiApiKey) {
      return 'OpenAI API key is not configured. Please configure it in Settings.'
    }

    if (formData.type === 'multi-question') {
      if (formData.questionCount < 1 || formData.questionCount > 20) {
        return 'Question count must be between 1 and 20'
      }
      if (formData.questionTypes.length === 0) {
        return 'Please select at least one question type for multi-question assessment'
      }
      if (formData.passingScore < 0 || formData.passingScore > 100) {
        return 'Passing score must be between 0 and 100'
      }
    }

    if (['shortform', 'multiple-choice', 'one-liner'].includes(formData.type)) {
      if (formData.type === 'multiple-choice' && (formData.optionCount < 2 || formData.optionCount > 8)) {
        return 'Option count must be between 2 and 8 for multiple choice questions'
      }
      if (formData.maxLength < 1 || formData.maxLength > 1000) {
        return 'Max length must be between 1 and 1000 characters'
      }
    }

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
      // Build generation request
      const request: KataGenerationRequest = {
        description: formData.description,
        language: formData.language,
        difficulty: formData.difficulty,
        type: formData.type,
        topics: formData.topics ? formData.topics.split(',').map(t => t.trim()).filter(Boolean) : undefined,
        constraints: formData.constraints || undefined,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
        generateHiddenTests: formData.generateHiddenTests,
        additionalRequirements: [
          formData.additionalRequirements,
          formData.contextText,
          // Add file context (simplified - in real implementation would read file contents)
          formData.contextFiles.length > 0 ? `Context files provided: ${formData.contextFiles.map(f => f.name).join(', ')}` : ''
        ].filter(Boolean).join('\n\n') || undefined
      }

      // Add type-specific requirements
      if (formData.type === 'multi-question') {
        request.additionalRequirements = [
          request.additionalRequirements || '',
          `Generate ${formData.questionCount} questions`,
          `Question types: ${formData.questionTypes.join(', ')}`,
          `Passing score: ${formData.passingScore}%`,
          `Allow review: ${formData.allowReview}`,
          `Show progress bar: ${formData.showProgressBar}`
        ].filter(Boolean).join('\n')
      } else if (['shortform', 'multiple-choice', 'one-liner'].includes(formData.type)) {
        request.additionalRequirements = [
          request.additionalRequirements || '',
          formData.type === 'multiple-choice' ? `Generate ${formData.optionCount} options` : '',
          `Case sensitive: ${formData.caseSensitive}`,
          `Max length: ${formData.maxLength} characters`
        ].filter(Boolean).join('\n')
      }

      // TODO: Implement IPC call for kata generation
      // const generatedKata = await window.electronAPI.generateKata(request)
      // onKataGenerated(generatedKata)
      // onClose()
      
      // For now, show that the form validation and UI works
      setProgress({
        stage: 'complete',
        message: 'Kata generation would be implemented via IPC in the full Electron app',
        progress: 100
      })
      
      setTimeout(() => {
        setError('AI kata generation IPC handler not yet implemented. This UI component is ready for integration.')
      }, 2000)
      
      // Reset form
      setFormData({
        description: '',
        language: 'py',
        difficulty: 'medium',
        type: 'code',
        topics: '',
        constraints: '',
        tags: '',
        additionalRequirements: '',
        generateHiddenTests: true,
        questionCount: 5,
        questionTypes: ['multiple-choice', 'shortform'],
        passingScore: 70,
        allowReview: true,
        showProgressBar: true,
        questionType: 'shortform',
        optionCount: 4,
        caseSensitive: false,
        maxLength: 100,
        contextFiles: [],
        contextText: ''
      })

    } catch (error) {
      console.error('Generation failed:', error)
      setError(error instanceof Error ? error.message : 'Generation failed')
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

  if (!isOpen) return null

  const selectedKataType = KATA_TYPES.find(t => t.value === formData.type)
  const isCodeKata = ['code', 'template', 'codebase'].includes(formData.type)
  const isMultiQuestion = formData.type === 'multi-question'
  const isShortform = ['shortform', 'multiple-choice', 'one-liner'].includes(formData.type)

  return (
    <div className="ai-authoring-overlay">
      <div className="ai-authoring-dialog">
        <div className="dialog-header">
          <h2>Generate Kata with AI</h2>
          <button 
            className="close-button" 
            onClick={handleCancel}
            disabled={isGenerating}
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="dialog-content">
          {/* Basic Information */}
          <div className="form-section">
            <h3>Basic Information</h3>
            
            <div className="form-group">
              <label htmlFor="description">
                Kata Description *
                <span className="field-hint">Describe what you want the kata to teach or test</span>
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="e.g., Create a function that calculates the factorial of a number using recursion..."
                rows={3}
                required
                disabled={isGenerating}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="type">Kata Type *</label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value as KataType)}
                  disabled={isGenerating}
                  required
                >
                  {KATA_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {selectedKataType && (
                  <span className="field-hint">{selectedKataType.description}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="difficulty">Difficulty *</label>
                <select
                  id="difficulty"
                  value={formData.difficulty}
                  onChange={(e) => handleInputChange('difficulty', e.target.value as Difficulty)}
                  disabled={isGenerating}
                  required
                >
                  {DIFFICULTIES.map(diff => (
                    <option key={diff.value} value={diff.value}>
                      {diff.label}
                    </option>
                  ))}
                </select>
              </div>

              {isCodeKata && (
                <div className="form-group">
                  <label htmlFor="language">Programming Language *</label>
                  <select
                    id="language"
                    value={formData.language}
                    onChange={(e) => handleInputChange('language', e.target.value as Language)}
                    disabled={isGenerating}
                    required
                  >
                    {LANGUAGES.filter(lang => lang.value !== 'none').map(lang => (
                      <option key={lang.value} value={lang.value}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Multi-Question Specific Controls */}
          {isMultiQuestion && (
            <div className="form-section">
              <h3>Multi-Question Assessment Settings</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="questionCount">Number of Questions</label>
                  <input
                    id="questionCount"
                    type="number"
                    min="1"
                    max="20"
                    value={formData.questionCount}
                    onChange={(e) => handleInputChange('questionCount', parseInt(e.target.value))}
                    disabled={isGenerating}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="passingScore">Passing Score (%)</label>
                  <input
                    id="passingScore"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.passingScore}
                    onChange={(e) => handleInputChange('passingScore', parseInt(e.target.value))}
                    disabled={isGenerating}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Question Types</label>
                <div className="checkbox-group">
                  {QUESTION_TYPES.map(type => (
                    <label key={type.value} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.questionTypes.includes(type.value)}
                        onChange={(e) => handleQuestionTypesChange(type.value, e.target.checked)}
                        disabled={isGenerating}
                      />
                      {type.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.allowReview}
                      onChange={(e) => handleInputChange('allowReview', e.target.checked)}
                      disabled={isGenerating}
                    />
                    Allow reviewing answers before submission
                  </label>
                </div>

                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.showProgressBar}
                      onChange={(e) => handleInputChange('showProgressBar', e.target.checked)}
                      disabled={isGenerating}
                    />
                    Show progress bar
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Shortform Specific Controls */}
          {isShortform && (
            <div className="form-section">
              <h3>Question Settings</h3>
              
              <div className="form-row">
                {formData.type === 'multiple-choice' && (
                  <div className="form-group">
                    <label htmlFor="optionCount">Number of Options</label>
                    <input
                      id="optionCount"
                      type="number"
                      min="2"
                      max="8"
                      value={formData.optionCount}
                      onChange={(e) => handleInputChange('optionCount', parseInt(e.target.value))}
                      disabled={isGenerating}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="maxLength">Max Answer Length</label>
                  <input
                    id="maxLength"
                    type="number"
                    min="1"
                    max="1000"
                    value={formData.maxLength}
                    onChange={(e) => handleInputChange('maxLength', parseInt(e.target.value))}
                    disabled={isGenerating}
                  />
                  <span className="unit">characters</span>
                </div>

                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.caseSensitive}
                      onChange={(e) => handleInputChange('caseSensitive', e.target.checked)}
                      disabled={isGenerating}
                    />
                    Case sensitive answers
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Context and Additional Information */}
          <div className="form-section">
            <h3>Additional Context</h3>
            
            <div className="form-group">
              <label htmlFor="topics">Topics/Concepts</label>
              <input
                id="topics"
                type="text"
                value={formData.topics}
                onChange={(e) => handleInputChange('topics', e.target.value)}
                placeholder="e.g., recursion, algorithms, data structures (comma-separated)"
                disabled={isGenerating}
              />
              <span className="field-hint">Comma-separated list of topics to focus on</span>
            </div>

            <div className="form-group">
              <label htmlFor="tags">Tags</label>
              <input
                id="tags"
                type="text"
                value={formData.tags}
                onChange={(e) => handleInputChange('tags', e.target.value)}
                placeholder="e.g., beginner, math, sorting (comma-separated)"
                disabled={isGenerating}
              />
              <span className="field-hint">Tags for organizing and filtering katas</span>
            </div>

            <div className="form-group">
              <label htmlFor="contextText">Additional Context</label>
              <textarea
                id="contextText"
                value={formData.contextText}
                onChange={(e) => handleInputChange('contextText', e.target.value)}
                placeholder="Provide any additional context, examples, or specific requirements..."
                rows={3}
                disabled={isGenerating}
              />
            </div>

            <div className="form-group">
              <label htmlFor="contextFiles">Context Files</label>
              <input
                id="contextFiles"
                type="file"
                multiple
                accept=".txt,.md,.pdf,.png,.jpg,.jpeg"
                onChange={handleFileUpload}
                disabled={isGenerating}
              />
              <span className="field-hint">Upload textbook snippets, images, or reference materials</span>
              
              {formData.contextFiles.length > 0 && (
                <div className="uploaded-files">
                  {formData.contextFiles.map((file, index) => (
                    <div key={index} className="uploaded-file">
                      <span>{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        disabled={isGenerating}
                        aria-label={`Remove ${file.name}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Advanced Options */}
          <div className="form-section">
            <button
              type="button"
              className="toggle-advanced"
              onClick={() => setShowAdvanced(!showAdvanced)}
              disabled={isGenerating}
            >
              {showAdvanced ? '▼' : '▶'} Advanced Options
            </button>

            {showAdvanced && (
              <>
                <div className="form-group">
                  <label htmlFor="constraints">Constraints</label>
                  <textarea
                    id="constraints"
                    value={formData.constraints}
                    onChange={(e) => handleInputChange('constraints', e.target.value)}
                    placeholder="e.g., Time complexity: O(n log n), Space complexity: O(1), No built-in sort functions"
                    rows={2}
                    disabled={isGenerating}
                  />
                  <span className="field-hint">Technical constraints or requirements</span>
                </div>

                <div className="form-group">
                  <label htmlFor="additionalRequirements">Additional Requirements</label>
                  <textarea
                    id="additionalRequirements"
                    value={formData.additionalRequirements}
                    onChange={(e) => handleInputChange('additionalRequirements', e.target.value)}
                    placeholder="Any other specific requirements or instructions for the AI..."
                    rows={2}
                    disabled={isGenerating}
                  />
                </div>

                {isCodeKata && (
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.generateHiddenTests}
                        onChange={(e) => handleInputChange('generateHiddenTests', e.target.checked)}
                        disabled={isGenerating}
                      />
                      Generate hidden test cases
                    </label>
                    <span className="field-hint">Create additional test cases not visible to users</span>
                  </div>
                )}
              </>
            )}
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
                <div className="progress-message">Initializing generation...</div>
              )}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="error-message">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* API Key Warning */}
          {!aiConfig?.openaiApiKey && (
            <div className="warning-message">
              <strong>⚠️ API Key Required:</strong> Please configure your OpenAI API key in Settings to use AI generation.
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
              disabled={isGenerating || !aiConfig?.openaiApiKey}
              className="primary"
            >
              {isGenerating ? 'Generating...' : 'Generate Kata'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}