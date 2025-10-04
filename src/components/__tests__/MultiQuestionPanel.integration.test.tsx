import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MultiQuestionPanel } from '../MultiQuestionPanel'
import { Kata, MultiQuestionConfig } from '@/types'

// Mock the services
vi.mock('@/services/shortform-evaluator', () => ({
  ShortformEvaluatorService: {
    getInstance: () => ({
      evaluateAnswer: vi.fn().mockResolvedValue({
        isCorrect: true,
        score: 1,
        feedback: 'Correct answer!'
      }),
      evaluateMultipleChoice: vi.fn().mockResolvedValue({
        isCorrect: true,
        score: 2,
        feedback: 'All correct answers selected!'
      }),
      evaluateCode: vi.fn().mockResolvedValue({
        isCorrect: true,
        score: 5,
        feedback: 'Code solution is correct!'
      })
    })
  }
}))

vi.mock('@/services/code-execution', () => ({
  CodeExecutionService: {
    getInstance: () => ({
      executeCode: vi.fn().mockResolvedValue({
        success: true,
        output: 'All tests passed!',
        errors: '',
        testResults: [
          { name: 'test_solution', passed: true, message: 'Test passed' }
        ],
        duration: 100,
        score: 100
      })
    })
  }
}))

const mockMultiQuestionConfig: MultiQuestionConfig = {
  title: 'AI Generated JavaScript Quiz',
  description: 'Test your JavaScript knowledge with this AI-generated assessment',
  passingScore: 70,
  showProgressBar: true,
  allowReview: true,
  questions: [
    {
      id: 'q1',
      type: 'multiple-choice',
      question: 'Which of the following are JavaScript data types?',
      allowMultiple: true,
      options: [
        { id: 'a', text: 'string' },
        { id: 'b', text: 'number' },
        { id: 'c', text: 'integer' },
        { id: 'd', text: 'boolean' }
      ],
      correctAnswers: ['a', 'b', 'd'],
      points: 3,
      explanation: 'JavaScript has string, number, and boolean as primitive data types. There is no separate integer type.'
    },
    {
      id: 'q2',
      type: 'shortform',
      question: 'What does "DOM" stand for?',
      acceptableAnswers: ['Document Object Model', 'document object model'],
      caseSensitive: false,
      maxLength: 50,
      points: 2,
      explanation: 'DOM stands for Document Object Model, which represents the structure of HTML documents.'
    },
    {
      id: 'q3',
      type: 'code',
      question: 'Write a function that returns the sum of two numbers',
      language: 'js',
      starterCode: 'function sum(a, b) {\n  // TODO: implement\n}',
      testCode: 'console.assert(sum(2, 3) === 5);\nconsole.assert(sum(-1, 1) === 0);',
      points: 5,
      explanation: 'A simple addition function that takes two parameters and returns their sum.'
    }
  ]
}

const mockKata: Kata = {
  slug: 'js-quiz',
  title: 'JavaScript Quiz',
  language: 'none',
  type: 'multi-question',
  difficulty: 'medium',
  tags: ['javascript', 'quiz'],
  statement: 'Test your JavaScript knowledge',
  multiQuestionConfig: mockMultiQuestionConfig
}

describe('MultiQuestionPanel Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderMultiQuestionPanel = (config = mockMultiQuestionConfig, onSubmit = vi.fn()) => {
    return render(
      <MultiQuestionPanel 
        kataType="multi-question"
        multiQuestionConfig={config}
        onSubmit={onSubmit}
      />
    )
  }

  it('should render multi-question kata with all question types', () => {
    renderMultiQuestionPanel()
    
    // Check that all questions are rendered
    expect(screen.getByText('Which of the following are JavaScript data types?')).toBeInTheDocument()
    expect(screen.getByText('What does "DOM" stand for?')).toBeInTheDocument()
    expect(screen.getByText('Write a function that returns the sum of two numbers')).toBeInTheDocument()
    
    // Check question type indicators
    expect(screen.getByText('Multiple Choice')).toBeInTheDocument()
    expect(screen.getByText('Short Answer')).toBeInTheDocument()
    expect(screen.getByText('Code')).toBeInTheDocument()
  })

  it('should handle multiple choice question interactions', async () => {
    renderMultiQuestionPanel()
    
    // Find and click multiple choice options
    const stringOption = screen.getByLabelText('string')
    const numberOption = screen.getByLabelText('number')
    const integerOption = screen.getByLabelText('integer')
    
    fireEvent.click(stringOption)
    fireEvent.click(numberOption)
    fireEvent.click(integerOption)
    
    expect(stringOption).toBeChecked()
    expect(numberOption).toBeChecked()
    expect(integerOption).toBeChecked()
  })

  it('should handle shortform question input', async () => {
    renderMultiQuestionPanel()
    
    const shortformInput = screen.getByPlaceholderText(/enter your answer/i)
    
    fireEvent.change(shortformInput, { target: { value: 'Document Object Model' } })
    
    expect(shortformInput).toHaveValue('Document Object Model')
  })

  it('should handle code question editing', async () => {
    renderMultiQuestionPanel()
    
    // Monaco editor would be rendered here - we can test the container
    const codeEditor = screen.getByTestId('code-editor-q3')
    expect(codeEditor).toBeInTheDocument()
  })

  it('should calculate and display progress correctly', async () => {
    renderMultiQuestionPanel()
    
    // Initially no progress
    expect(screen.getByText('Progress: 0/3 questions answered')).toBeInTheDocument()
    
    // Answer first question
    const stringOption = screen.getByLabelText('string')
    fireEvent.click(stringOption)
    
    await waitFor(() => {
      expect(screen.getByText('Progress: 1/3 questions answered')).toBeInTheDocument()
    })
  })

  it('should submit and evaluate all answers', async () => {
    renderMultiQuestionPanel()
    
    // Answer all questions
    fireEvent.click(screen.getByLabelText('string'))
    fireEvent.click(screen.getByLabelText('number'))
    fireEvent.click(screen.getByLabelText('boolean'))
    
    fireEvent.change(screen.getByPlaceholderText(/enter your answer/i), {
      target: { value: 'Document Object Model' }
    })
    
    // Submit the quiz
    const submitButton = screen.getByText('Submit Quiz')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/quiz completed/i)).toBeInTheDocument()
    })
  })

  it('should show results and feedback after submission', async () => {
    renderMultiQuestionPanel()
    
    // Complete and submit quiz
    fireEvent.click(screen.getByLabelText('string'))
    fireEvent.click(screen.getByLabelText('number'))
    fireEvent.click(screen.getByLabelText('boolean'))
    
    fireEvent.change(screen.getByPlaceholderText(/enter your answer/i), {
      target: { value: 'Document Object Model' }
    })
    
    fireEvent.click(screen.getByText('Submit Quiz'))
    
    await waitFor(() => {
      // Check for results display
      expect(screen.getByText(/total score/i)).toBeInTheDocument()
      expect(screen.getByText(/passing score: 70%/i)).toBeInTheDocument()
    })
  })

  it('should handle review mode correctly', async () => {
    renderMultiQuestionPanel()
    
    // Complete quiz first
    fireEvent.click(screen.getByLabelText('string'))
    fireEvent.click(screen.getByText('Submit Quiz'))
    
    await waitFor(() => {
      const reviewButton = screen.getByText('Review Answers')
      fireEvent.click(reviewButton)
    })
    
    // Should show explanations
    await waitFor(() => {
      expect(screen.getByText(/JavaScript has string, number, and boolean/)).toBeInTheDocument()
    })
  })

  it('should enforce passing score requirements', async () => {
    renderMultiQuestionPanel()
    
    // Answer incorrectly to fail
    fireEvent.click(screen.getByLabelText('integer')) // Wrong answer
    fireEvent.click(screen.getByText('Submit Quiz'))
    
    await waitFor(() => {
      expect(screen.getByText(/below passing score/i)).toBeInTheDocument()
      expect(screen.getByText(/try again/i)).toBeInTheDocument()
    })
  })

  it('should handle mixed question types in single assessment', async () => {
    const mixedKata: Kata = {
      ...mockKata,
      multiQuestionConfig: {
        ...mockMultiQuestionConfig,
        questions: [
          ...mockMultiQuestionConfig.questions,
          {
            id: 'q4',
            type: 'explanation',
            question: 'Explain the difference between let and var',
            minLength: 50,
            maxLength: 200,
            points: 4,
            rubric: {
              criteria: [
                { name: 'accuracy', weight: 0.4, threshold: 0.7 },
                { name: 'clarity', weight: 0.3, threshold: 0.6 },
                { name: 'completeness', weight: 0.3, threshold: 0.6 }
              ]
            }
          }
        ]
      }
    }
    
    renderMultiQuestionPanel(mixedKata.multiQuestionConfig)
    
    // Should render all question types
    expect(screen.getByText('Multiple Choice')).toBeInTheDocument()
    expect(screen.getByText('Short Answer')).toBeInTheDocument()
    expect(screen.getByText('Code')).toBeInTheDocument()
    expect(screen.getByText('Explanation')).toBeInTheDocument()
  })

  it('should validate question constraints', async () => {
    renderMultiQuestionPanel()
    
    // Test shortform length constraint
    const shortformInput = screen.getByPlaceholderText(/enter your answer/i)
    const longAnswer = 'a'.repeat(100) // Exceeds maxLength of 50
    
    fireEvent.change(shortformInput, { target: { value: longAnswer } })
    
    await waitFor(() => {
      expect(screen.getByText(/answer too long/i)).toBeInTheDocument()
    })
  })

  it('should integrate with existing evaluation services', async () => {
    renderMultiQuestionPanel()
    
    // Answer questions and submit
    fireEvent.click(screen.getByLabelText('string'))
    fireEvent.change(screen.getByPlaceholderText(/enter your answer/i), {
      target: { value: 'Document Object Model' }
    })
    
    fireEvent.click(screen.getByText('Submit Quiz'))
    
    // Verify service calls
    await waitFor(() => {
      const evaluatorService = require('@/services/shortform-evaluator').ShortformEvaluatorService.getInstance()
      expect(evaluatorService.evaluateMultipleChoice).toHaveBeenCalled()
      expect(evaluatorService.evaluateAnswer).toHaveBeenCalled()
    })
  })
})