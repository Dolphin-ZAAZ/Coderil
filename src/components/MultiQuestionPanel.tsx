import { useState, useCallback, useMemo } from 'react'
import type { 
  MultiQuestionConfig, 
  ShortformQuestion,
  KataType 
} from '@/types'
import './MultiQuestionPanel.css'

interface MultiQuestionPanelProps {
  kataType: KataType
  multiQuestionConfig: MultiQuestionConfig
  onSubmit: (answers: Record<string, string | string[]>) => void
  isLoading?: boolean
}

export function MultiQuestionPanel({
  multiQuestionConfig,
  onSubmit,
  isLoading = false
}: MultiQuestionPanelProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [showReview, setShowReview] = useState(false)

  const questions = multiQuestionConfig.questions
  const currentQuestion = questions[currentQuestionIndex]
  const totalQuestions = questions.length

  const progress = useMemo(() => {
    const answeredCount = Object.keys(answers).length
    return (answeredCount / totalQuestions) * 100
  }, [answers, totalQuestions])

  const isCurrentQuestionAnswered = useMemo(() => {
    const answer = answers[currentQuestion.id]
    if (!answer) return false
    
    if (Array.isArray(answer)) {
      return answer.length > 0
    }
    return answer.trim().length > 0
  }, [answers, currentQuestion.id])

  const allQuestionsAnswered = useMemo(() => {
    return questions.every(q => {
      const answer = answers[q.id]
      if (!answer) return false
      if (Array.isArray(answer)) return answer.length > 0
      return answer.trim().length > 0
    })
  }, [answers, questions])

  const handleAnswerChange = useCallback((questionId: string, answer: string | string[]) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }))
  }, [])

  const handleNext = useCallback(() => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    } else if (multiQuestionConfig.allowReview) {
      setShowReview(true)
    } else {
      onSubmit(answers)
    }
  }, [currentQuestionIndex, totalQuestions, multiQuestionConfig.allowReview, answers, onSubmit])

  const handlePrevious = useCallback(() => {
    if (showReview) {
      setShowReview(false)
      setCurrentQuestionIndex(totalQuestions - 1)
    } else if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }, [currentQuestionIndex, showReview, totalQuestions])

  const handleGoToQuestion = useCallback((index: number) => {
    setCurrentQuestionIndex(index)
    setShowReview(false)
  }, [])

  const handleFinalSubmit = useCallback(() => {
    onSubmit(answers)
  }, [answers, onSubmit])

  const renderQuestion = (question: ShortformQuestion) => {
    const answer = answers[question.id] || (question.type === 'multiple-choice' ? [] : '')

    return (
      <div key={question.id} className="question-container">
        <div className="question-header">
          <h3 className="question-title">{question.question}</h3>
          {question.points && (
            <span className="question-points">{question.points} points</span>
          )}
        </div>

        <div className="answer-section">
          {question.type === 'multiple-choice' ? (
            <div className="multiple-choice-options">
              <p className="instruction">
                {question.allowMultiple ? 'Select all that apply:' : 'Select one:'}
              </p>
              <div className="options-list">
                {question.options?.map(option => (
                  <label key={option.id} className="option-item">
                    <input
                      type={question.allowMultiple ? 'checkbox' : 'radio'}
                      name={`question-${question.id}`}
                      value={option.id}
                      checked={Array.isArray(answer) ? answer.includes(option.id) : answer === option.id}
                      onChange={(e) => {
                        if (question.allowMultiple) {
                          const currentAnswers = Array.isArray(answer) ? answer : []
                          const newAnswers = e.target.checked
                            ? [...currentAnswers, option.id]
                            : currentAnswers.filter(id => id !== option.id)
                          handleAnswerChange(question.id, newAnswers)
                        } else {
                          handleAnswerChange(question.id, [option.id])
                        }
                      }}
                      disabled={isLoading}
                    />
                    <span className="option-text">{option.text}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-answer-section">
              {question.type === 'one-liner' ? (
                <input
                  type="text"
                  value={typeof answer === 'string' ? answer : ''}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  placeholder="Enter your one-line answer..."
                  maxLength={200}
                  disabled={isLoading}
                  className="answer-input"
                />
              ) : (
                <textarea
                  value={typeof answer === 'string' ? answer : ''}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  placeholder="Enter your brief answer..."
                  maxLength={question.maxLength || 500}
                  disabled={isLoading}
                  className="answer-textarea"
                  rows={3}
                />
              )}
              <div className="character-count">
                {typeof answer === 'string' ? answer.length : 0} / {question.maxLength || (question.type === 'one-liner' ? 200 : 500)}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderReviewScreen = () => (
    <div className="review-screen">
      <div className="review-header">
        <h2>Review Your Answers</h2>
        <p>Please review your answers before final submission.</p>
      </div>

      <div className="review-questions">
        {questions.map((question, index) => {
          const answer = answers[question.id]
          const isAnswered = answer && (Array.isArray(answer) ? answer.length > 0 : answer.trim().length > 0)

          return (
            <div key={question.id} className={`review-question ${!isAnswered ? 'unanswered' : ''}`}>
              <div className="review-question-header">
                <span className="question-number">Q{index + 1}</span>
                <button 
                  className="edit-button"
                  onClick={() => handleGoToQuestion(index)}
                  disabled={isLoading}
                >
                  Edit
                </button>
              </div>
              <div className="review-question-text">{question.question}</div>
              <div className="review-answer">
                {isAnswered ? (
                  Array.isArray(answer) ? (
                    <span className="answer-value">
                      {question.options?.filter(opt => answer.includes(opt.id)).map(opt => opt.text).join(', ') || answer.join(', ')}
                    </span>
                  ) : (
                    <span className="answer-value">{answer}</span>
                  )
                ) : (
                  <span className="no-answer">Not answered</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="review-actions">
        <button 
          className="back-button"
          onClick={handlePrevious}
          disabled={isLoading}
        >
          Back to Questions
        </button>
        <button 
          className="submit-button"
          onClick={handleFinalSubmit}
          disabled={!allQuestionsAnswered || isLoading}
        >
          {isLoading ? 'Submitting...' : 'Submit All Answers'}
        </button>
      </div>
    </div>
  )

  if (showReview) {
    return (
      <div className="multi-question-panel">
        {renderReviewScreen()}
      </div>
    )
  }

  return (
    <div className="multi-question-panel">
      <div className="panel-header">
        {multiQuestionConfig.title && (
          <h2 className="panel-title">{multiQuestionConfig.title}</h2>
        )}
        {multiQuestionConfig.description && (
          <p className="panel-description">{multiQuestionConfig.description}</p>
        )}
        
        <div className="progress-section">
          <div className="question-counter">
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </div>
          {multiQuestionConfig.showProgressBar !== false && (
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="question-content">
        {renderQuestion(currentQuestion)}
      </div>

      <div className="navigation-section">
        <button 
          className="nav-button prev-button"
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0 || isLoading}
        >
          Previous
        </button>

        <div className="question-indicators">
          {questions.map((_, index) => (
            <button
              key={index}
              className={`question-indicator ${index === currentQuestionIndex ? 'current' : ''} ${answers[questions[index].id] ? 'answered' : ''}`}
              onClick={() => setCurrentQuestionIndex(index)}
              disabled={isLoading}
            >
              {index + 1}
            </button>
          ))}
        </div>

        <button 
          className="nav-button next-button"
          onClick={handleNext}
          disabled={!isCurrentQuestionAnswered || isLoading}
        >
          {currentQuestionIndex === totalQuestions - 1 
            ? (multiQuestionConfig.allowReview ? 'Review' : 'Submit')
            : 'Next'
          }
        </button>
      </div>
    </div>
  )
}