import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ShortformAnswerPanel } from '../ShortformAnswerPanel'
import type { MultipleChoiceConfig, ShortformConfig, OneLinerConfig } from '@/types'

describe('ShortformAnswerPanel', () => {
  const mockOnSubmit = vi.fn()

  beforeEach(() => {
    mockOnSubmit.mockClear()
  })

  describe('Multiple Choice', () => {
    const multipleChoiceConfig: MultipleChoiceConfig = {
      question: 'Which are programming languages?',
      allowMultiple: true,
      options: [
        { id: 'a', text: 'JavaScript' },
        { id: 'b', text: 'HTML' },
        { id: 'c', text: 'Python' }
      ],
      correctAnswers: ['a', 'c']
    }

    it('should render multiple choice question and options', () => {
      render(
        <ShortformAnswerPanel
          kataType="multiple-choice"
          multipleChoiceConfig={multipleChoiceConfig}
          onSubmit={mockOnSubmit}
        />
      )

      expect(screen.getByText('Which are programming languages?')).toBeInTheDocument()
      expect(screen.getByText('JavaScript')).toBeInTheDocument()
      expect(screen.getByText('HTML')).toBeInTheDocument()
      expect(screen.getByText('Python')).toBeInTheDocument()
      expect(screen.getByText('Select all that apply:')).toBeInTheDocument()
    })

    it('should handle multiple selections when allowMultiple is true', async () => {
      render(
        <ShortformAnswerPanel
          kataType="multiple-choice"
          multipleChoiceConfig={multipleChoiceConfig}
          onSubmit={mockOnSubmit}
        />
      )

      const jsCheckbox = screen.getByRole('checkbox', { name: /javascript/i })
      const pythonCheckbox = screen.getByRole('checkbox', { name: /python/i })
      const submitButton = screen.getByRole('button', { name: /submit answer/i })

      fireEvent.click(jsCheckbox)
      fireEvent.click(pythonCheckbox)
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(['a', 'c'])
      })
    })

    it('should handle single selection when allowMultiple is false', async () => {
      const singleChoiceConfig: MultipleChoiceConfig = {
        ...multipleChoiceConfig,
        allowMultiple: false
      }

      render(
        <ShortformAnswerPanel
          kataType="multiple-choice"
          multipleChoiceConfig={singleChoiceConfig}
          onSubmit={mockOnSubmit}
        />
      )

      expect(screen.getByText('Select one:')).toBeInTheDocument()

      const jsRadio = screen.getByRole('radio', { name: /javascript/i })
      const submitButton = screen.getByRole('button', { name: /submit answer/i })

      fireEvent.click(jsRadio)
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(['a'])
      })
    })

    it('should disable submit button when no options selected', () => {
      render(
        <ShortformAnswerPanel
          kataType="multiple-choice"
          multipleChoiceConfig={multipleChoiceConfig}
          onSubmit={mockOnSubmit}
        />
      )

      const submitButton = screen.getByRole('button', { name: /submit answer/i })
      expect(submitButton).toBeDisabled()
    })

    it('should show loading state', () => {
      render(
        <ShortformAnswerPanel
          kataType="multiple-choice"
          multipleChoiceConfig={multipleChoiceConfig}
          onSubmit={mockOnSubmit}
          isLoading={true}
        />
      )

      expect(screen.getByText('Submitting...')).toBeInTheDocument()
      
      const checkboxes = screen.getAllByRole('checkbox')
      checkboxes.forEach(checkbox => {
        expect(checkbox).toBeDisabled()
      })
    })
  })

  describe('Shortform', () => {
    const shortformConfig: ShortformConfig = {
      question: 'What is the time complexity of binary search?',
      expectedAnswer: 'O(log n)',
      maxLength: 50
    }

    it('should render shortform question and textarea', () => {
      render(
        <ShortformAnswerPanel
          kataType="shortform"
          shortformConfig={shortformConfig}
          onSubmit={mockOnSubmit}
        />
      )

      expect(screen.getByText('What is the time complexity of binary search?')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter your brief answer...')).toBeInTheDocument()
      expect(screen.getByText('0 / 50')).toBeInTheDocument()
    })

    it('should handle text input and submission', async () => {
      render(
        <ShortformAnswerPanel
          kataType="shortform"
          shortformConfig={shortformConfig}
          onSubmit={mockOnSubmit}
        />
      )

      const textarea = screen.getByRole('textbox')
      const submitButton = screen.getByRole('button', { name: /submit answer/i })

      fireEvent.change(textarea, { target: { value: 'O(log n)' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('O(log n)')
      })
    })

    it('should update character count', () => {
      render(
        <ShortformAnswerPanel
          kataType="shortform"
          shortformConfig={shortformConfig}
          onSubmit={mockOnSubmit}
        />
      )

      const textarea = screen.getByRole('textbox')
      fireEvent.change(textarea, { target: { value: 'O(log n)' } })

      expect(screen.getByText('8 / 50')).toBeInTheDocument()
    })

    it('should disable submit button when input is empty', () => {
      render(
        <ShortformAnswerPanel
          kataType="shortform"
          shortformConfig={shortformConfig}
          onSubmit={mockOnSubmit}
        />
      )

      const submitButton = screen.getByRole('button', { name: /submit answer/i })
      expect(submitButton).toBeDisabled()
    })

    it('should enforce max length', () => {
      render(
        <ShortformAnswerPanel
          kataType="shortform"
          shortformConfig={shortformConfig}
          onSubmit={mockOnSubmit}
        />
      )

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
      expect(textarea.maxLength).toBe(50)
    })
  })

  describe('One-Liner', () => {
    const oneLinerConfig: OneLinerConfig = {
      question: 'What does DRY stand for?',
      expectedAnswer: "Don't Repeat Yourself"
    }

    it('should render one-liner question and input', () => {
      render(
        <ShortformAnswerPanel
          kataType="one-liner"
          oneLinerConfig={oneLinerConfig}
          onSubmit={mockOnSubmit}
        />
      )

      expect(screen.getByText('What does DRY stand for?')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter your one-line answer...')).toBeInTheDocument()
    })

    it('should handle text input and submission', async () => {
      render(
        <ShortformAnswerPanel
          kataType="one-liner"
          oneLinerConfig={oneLinerConfig}
          onSubmit={mockOnSubmit}
        />
      )

      const input = screen.getByRole('textbox')
      const submitButton = screen.getByRole('button', { name: /submit answer/i })

      fireEvent.change(input, { target: { value: "Don't Repeat Yourself" } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith("Don't Repeat Yourself")
      })
    })

    it('should submit on Enter key press', async () => {
      render(
        <ShortformAnswerPanel
          kataType="one-liner"
          oneLinerConfig={oneLinerConfig}
          onSubmit={mockOnSubmit}
        />
      )

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: "Don't Repeat Yourself" } })
      
      // Simulate Enter key press
      fireEvent.keyPress(input, { 
        key: 'Enter', 
        code: 'Enter', 
        charCode: 13,
        keyCode: 13,
        which: 13
      })

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith("Don't Repeat Yourself")
      })
    })

    it('should not submit on Shift+Enter', () => {
      render(
        <ShortformAnswerPanel
          kataType="one-liner"
          oneLinerConfig={oneLinerConfig}
          onSubmit={mockOnSubmit}
        />
      )

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: "Don't Repeat Yourself" } })
      fireEvent.keyPress(input, { 
        key: 'Enter', 
        code: 'Enter', 
        shiftKey: true,
        charCode: 13,
        keyCode: 13,
        which: 13
      })

      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('should show character count with default limit', () => {
      render(
        <ShortformAnswerPanel
          kataType="one-liner"
          oneLinerConfig={oneLinerConfig}
          onSubmit={mockOnSubmit}
        />
      )

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'Test' } })

      expect(screen.getByText('4 / 200')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should show error when no configuration is provided', () => {
      render(
        <ShortformAnswerPanel
          kataType="shortform"
          onSubmit={mockOnSubmit}
        />
      )

      expect(screen.getByText('No configuration found for shortform kata')).toBeInTheDocument()
    })

    it('should handle loading state properly', () => {
      const shortformConfig: ShortformConfig = {
        question: 'Test question?',
        expectedAnswer: 'test'
      }

      render(
        <ShortformAnswerPanel
          kataType="shortform"
          shortformConfig={shortformConfig}
          onSubmit={mockOnSubmit}
          isLoading={true}
        />
      )

      const textarea = screen.getByRole('textbox')
      const submitButton = screen.getByRole('button', { name: /submitting/i })

      expect(textarea).toBeDisabled()
      expect(submitButton).toBeDisabled()
      expect(submitButton).toHaveTextContent('Submitting...')
    })
  })
})