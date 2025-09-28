import React, { useState, useCallback } from 'react'
import type { 
  MultipleChoiceConfig, 
  ShortformConfig, 
  OneLinerConfig,
  KataType 
} from '@/types'
import './ShortformAnswerPanel.css'

interface ShortformAnswerPanelProps {
  kataType: KataType
  multipleChoiceConfig?: MultipleChoiceConfig
  shortformConfig?: ShortformConfig
  oneLinerConfig?: OneLinerConfig
  onSubmit: (answer: string | string[]) => void
  isLoading?: boolean
}

export function ShortformAnswerPanel({
  kataType,
  multipleChoiceConfig,
  shortformConfig,
  oneLinerConfig,
  onSubmit,
  isLoading = false
}: ShortformAnswerPanelProps) {
  const [textAnswer, setTextAnswer] = useState('')
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])

  const handleTextSubmit = useCallback(() => {
    if (textAnswer.trim()) {
      onSubmit(textAnswer.trim())
    }
  }, [textAnswer, onSubmit])

  const handleMultipleChoiceSubmit = useCallback(() => {
    if (selectedOptions.length > 0) {
      onSubmit(selectedOptions)
    }
  }, [selectedOptions, onSubmit])

  const handleOptionChange = useCallback((optionId: string, checked: boolean) => {
    if (!multipleChoiceConfig) return

    if (multipleChoiceConfig.allowMultiple) {
      setSelectedOptions(prev => 
        checked 
          ? [...prev, optionId]
          : prev.filter(id => id !== optionId)
      )
    } else {
      setSelectedOptions(checked ? [optionId] : [])
    }
  }, [multipleChoiceConfig])

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleTextSubmit()
    }
  }, [handleTextSubmit])

  const getMaxLength = () => {
    if (kataType === 'shortform' && shortformConfig?.maxLength) {
      return shortformConfig.maxLength
    }
    return kataType === 'one-liner' ? 200 : 500
  }

  const getPlaceholder = () => {
    switch (kataType) {
      case 'shortform':
        return 'Enter your brief answer...'
      case 'one-liner':
        return 'Enter your one-line answer...'
      default:
        return 'Enter your answer...'
    }
  }

  if (kataType === 'multiple-choice' && multipleChoiceConfig) {
    return (
      <div className="shortform-answer-panel">
        <div className="question-section">
          <h3>Question</h3>
          <p className="question-text">{multipleChoiceConfig.question}</p>
        </div>

        <div className="options-section">
          <h4>
            {multipleChoiceConfig.allowMultiple 
              ? 'Select all that apply:' 
              : 'Select one:'
            }
          </h4>
          <div className="options-list">
            {multipleChoiceConfig.options.map(option => (
              <label key={option.id} className="option-item">
                <input
                  type={multipleChoiceConfig.allowMultiple ? 'checkbox' : 'radio'}
                  name="multiple-choice-answer"
                  value={option.id}
                  checked={selectedOptions.includes(option.id)}
                  onChange={(e) => handleOptionChange(option.id, e.target.checked)}
                  disabled={isLoading}
                />
                <span className="option-text">{option.text}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="submit-section">
          <button
            onClick={handleMultipleChoiceSubmit}
            disabled={selectedOptions.length === 0 || isLoading}
            className="submit-button"
          >
            {isLoading ? 'Submitting...' : 'Submit Answer'}
          </button>
        </div>
      </div>
    )
  }

  const config = shortformConfig || oneLinerConfig
  if (!config) {
    return (
      <div className="shortform-answer-panel">
        <div className="error-message">
          No configuration found for {kataType} kata
        </div>
      </div>
    )
  }

  return (
    <div className="shortform-answer-panel">
      <div className="question-section">
        <h3>Question</h3>
        <p className="question-text">{config.question}</p>
      </div>

      <div className="answer-section">
        <h4>Your Answer</h4>
        <div className="input-container">
          {kataType === 'one-liner' ? (
            <input
              type="text"
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={getPlaceholder()}
              maxLength={getMaxLength()}
              disabled={isLoading}
              className="answer-input"
            />
          ) : (
            <textarea
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              placeholder={getPlaceholder()}
              maxLength={getMaxLength()}
              disabled={isLoading}
              className="answer-textarea"
              rows={3}
            />
          )}
          <div className="character-count">
            {textAnswer.length} / {getMaxLength()}
          </div>
        </div>
      </div>

      <div className="submit-section">
        <button
          onClick={handleTextSubmit}
          disabled={!textAnswer.trim() || isLoading}
          className="submit-button"
        >
          {isLoading ? 'Submitting...' : 'Submit Answer'}
        </button>
      </div>
    </div>
  )
}