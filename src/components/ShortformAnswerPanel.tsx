import React, { useState, useCallback } from 'react'
import type { 
  ShortformConfig, 
  OneLinerConfig,
  KataType 
} from '@/types'
import './ShortformAnswerPanel.css'

interface ShortformAnswerPanelProps {
  kataType: KataType
  shortformConfig?: ShortformConfig
  oneLinerConfig?: OneLinerConfig
  onSubmit: (answer: string | string[]) => void
  isLoading?: boolean
}

export function ShortformAnswerPanel({
  kataType,
  shortformConfig,
  oneLinerConfig,
  onSubmit,
  isLoading = false
}: ShortformAnswerPanelProps) {
  const [textAnswer, setTextAnswer] = useState('')

  const handleTextSubmit = useCallback(() => {
    if (textAnswer.trim()) {
      onSubmit(textAnswer.trim())
    }
  }, [textAnswer, onSubmit])

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