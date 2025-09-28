import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../App'
import type { Kata, KataDetails, AIJudgment } from '../../types'

// Mock electron API
const mockElectronAPI = {
  getKatas: vi.fn(),
  loadKata: vi.fn(),
  loadCode: vi.fn(),
  saveCode: vi.fn(),
  executeCode: vi.fn(),
  saveAttempt: vi.fn(),
  getProgress: vi.fn(),
  getSettings: vi.fn(),
  setAutoContinueEnabled: vi.fn(),
  getRandomKata: vi.fn(),
  judgeExplanation: vi.fn(),
  judgeTemplate: vi.fn(),
  importKata: vi.fn(),
  exportKata: vi.fn()
}

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true
})

describe('AI Judge Integration Tests with Mock Responses', () => {
  const user = userEvent.setup()

  const mockExplanationKata: Kata = {
    slug: 'explain-recursion',
    title: 'Explain Recursion',
    language: 'md',
    type: 'explain',
    difficulty: 'medium',
    tags: ['concepts', 'recursion'],
    path: '/katas/explain-recursion'
  }

  const mockTemplateKata: Kata = {
    slug: 'react-template',
    title: 'React Component Template',
    language: 'tsx',
    type: 'template',
    difficulty: 'medium',
    tags: ['react', 'template'],
    path: '/katas/react-template'
  }

  const mockExplanationDetails: KataDetails = {
    ...mockExplanationKata,
    statement: '# Explain Recursion\n\nExplain what recursion is, how it works, and provide examples.',
    metadata: {
      slug: 'explain-recursion',
      title: 'Explain Recursion',
      language: 'md',
      type: 'explain',
      difficulty: 'medium',
      tags: ['concepts', 'recursion'],
      entry: 'explanation.md',
      test: { kind: 'none', file: '' },
      timeout_ms: 0
    },
    starterCode: '# Your explanation here\n\n',
    testConfig: {
      kind: 'none',
      publicTestFile: '',
      timeoutMs: 0
    },
    rubric: {
      keys: ['clarity', 'correctness', 'completeness', 'examples'],
      threshold: {
        min_total: 75,
        min_correctness: 70
      }
    }
  }

  const mockTemplateDetails: KataDetails = {
    ...mockTemplateKata,
    statement: '# React Component Template\n\nCreate a complete React component template with TypeScript.',
    metadata: {
      slug: 'react-template',
      title: 'React Component Template',
      language: 'tsx',
      type: 'template',
      difficulty: 'medium',
      tags: ['react', 'template'],
      entry: 'template.md',
      test: { kind: 'none', file: '' },
      timeout_ms: 0
    },
    starterCode: '# Your template here\n\n',
    testConfig: {
      kind: 'none',
      publicTestFile: '',
      timeoutMs: 0
    },
    rubric: {
      keys: ['structure', 'completeness', 'best_practices', 'functionality'],
      threshold: {
        min_total: 80,
        min_structure: 75
      }
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockElectronAPI.getKatas.mockResolvedValue([mockExplanationKata, mockTemplateKata])
    mockElectronAPI.getSettings.mockResolvedValue({ autoContinueEnabled: false })
    mockElectronAPI.loadCode.mockResolvedValue(null)
    mockElectronAPI.saveCode.mockResolvedValue(undefined)
    mockElectronAPI.saveAttempt.mockResolvedValue(undefined)
    mockElectronAPI.getProgress.mockResolvedValue({
      kataId: 'test',
      lastCode: '',
      bestScore: 0,
      lastStatus: 'not_attempted',
      attemptsCount: 0,
      lastAttempt: new Date()
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Explanation Kata AI Judging', () => {
    it('should handle excellent explanation with high scores', async () => {
      mockElectronAPI.loadKata.mockResolvedValue(mockExplanationDetails)
      
      const excellentJudgment: AIJudgment = {
        scores: {
          clarity: 95,
          correctness: 92,
          completeness: 88,
          examples: 90
        },
        feedback: 'Excellent explanation! Your description of recursion is clear and accurate. The examples provided are well-chosen and help illustrate the concept effectively. The explanation covers all key aspects including base cases, recursive cases, and common pitfalls.',
        pass: true,
        totalScore: 91.25
      }

      mockElectronAPI.judgeExplanation.mockResolvedValue(excellentJudgment)

      render(<App />)

      await user.click(screen.getByText('Explain Recursion'))

      const editor = screen.getByRole('textbox', { name: /code editor/i })
      const excellentExplanation = `# Recursion

Recursion is a programming technique where a function calls itself to solve a problem by breaking it down into smaller, similar subproblems.

## Key Components

1. **Base Case**: A condition that stops the recursion
2. **Recursive Case**: The function calls itself with modified parameters

## Example

\`\`\`python
def factorial(n):
    # Base case
    if n <= 1:
        return 1
    # Recursive case
    return n * factorial(n - 1)
\`\`\`

## Common Use Cases

- Tree traversal
- Mathematical calculations
- Divide and conquer algorithms

## Pitfalls to Avoid

- Missing base case leads to infinite recursion
- Stack overflow with deep recursion
- Performance issues with overlapping subproblems`

      await user.clear(editor)
      await user.type(editor, excellentExplanation)

      await user.click(screen.getByRole('button', { name: /submit/i }))

      await waitFor(() => {
        expect(mockElectronAPI.judgeExplanation).toHaveBeenCalledWith(
          expect.stringContaining('Recursion is a programming technique'),
          mockExplanationDetails.rubric,
          'Explain Recursion',
          expect.stringContaining('Explain what recursion is')
        )
      })

      // Verify excellent results are displayed
      await waitFor(() => {
        expect(screen.getByText(/Excellent explanation!/)).toBeInTheDocument()
        expect(screen.getByText(/91/)).toBeInTheDocument() // Total score
        expect(screen.getByText(/passed/i)).toBeInTheDocument()
      })

      // Verify individual scores are shown
      expect(screen.getByText(/95/)).toBeInTheDocument() // Clarity
      expect(screen.getByText(/92/)).toBeInTheDocument() // Correctness
    })

    it('should handle poor explanation with constructive feedback', async () => {
      mockElectronAPI.loadKata.mockResolvedValue(mockExplanationDetails)
      
      const poorJudgment: AIJudgment = {
        scores: {
          clarity: 45,
          correctness: 60,
          completeness: 30,
          examples: 25
        },
        feedback: 'Your explanation needs significant improvement. While you have the basic idea of recursion, the explanation lacks clarity and depth. Consider adding: 1) A clearer definition, 2) Better examples with step-by-step execution, 3) Discussion of base cases and recursive cases, 4) Common pitfalls and how to avoid them.',
        pass: false,
        totalScore: 40
      }

      mockElectronAPI.judgeExplanation.mockResolvedValue(poorJudgment)

      render(<App />)

      await user.click(screen.getByText('Explain Recursion'))

      const editor = screen.getByRole('textbox', { name: /code editor/i })
      const poorExplanation = `Recursion is when function calls itself. It's used sometimes.

Example:
def func(x):
    return func(x)`

      await user.clear(editor)
      await user.type(editor, poorExplanation)

      await user.click(screen.getByRole('button', { name: /submit/i }))

      await waitFor(() => {
        expect(screen.getByText(/needs significant improvement/)).toBeInTheDocument()
        expect(screen.getByText(/40/)).toBeInTheDocument() // Total score
        expect(screen.getByText(/failed/i)).toBeInTheDocument()
      })

      // Verify constructive feedback is provided
      expect(screen.getByText(/clearer definition/)).toBeInTheDocument()
      expect(screen.getByText(/Better examples/)).toBeInTheDocument()
    })

    it('should handle borderline explanation near threshold', async () => {
      mockElectronAPI.loadKata.mockResolvedValue(mockExplanationDetails)
      
      const borderlineJudgment: AIJudgment = {
        scores: {
          clarity: 75,
          correctness: 70, // Exactly at min_correctness threshold
          completeness: 72,
          examples: 68
        },
        feedback: 'Your explanation is on the right track but could use some improvements. The basic concept is correct, but adding more detailed examples and discussing edge cases would strengthen your explanation.',
        pass: true, // Just passes the threshold
        totalScore: 71.25
      }

      mockElectronAPI.judgeExplanation.mockResolvedValue(borderlineJudgment)

      render(<App />)

      await user.click(screen.getByText('Explain Recursion'))

      const editor = screen.getByRole('textbox', { name: /code editor/i })
      const borderlineExplanation = `# Recursion

Recursion is when a function calls itself. It needs a base case to stop.

Example:
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

This works by breaking down the problem into smaller pieces.`

      await user.clear(editor)
      await user.type(editor, borderlineExplanation)

      await user.click(screen.getByRole('button', { name: /submit/i }))

      await waitFor(() => {
        expect(screen.getByText(/on the right track/)).toBeInTheDocument()
        expect(screen.getByText(/71/)).toBeInTheDocument() // Total score
        expect(screen.getByText(/passed/i)).toBeInTheDocument()
      })
    })
  })

  describe('Template Kata AI Judging', () => {
    it('should handle complete template with excellent structure', async () => {
      mockElectronAPI.loadKata.mockResolvedValue(mockTemplateDetails)
      
      const excellentTemplateJudgment: AIJudgment = {
        scores: {
          structure: 92,
          completeness: 88,
          best_practices: 90,
          functionality: 85
        },
        feedback: 'Excellent React component template! The structure is well-organized with proper separation of concerns. TypeScript interfaces are well-defined, component props are properly typed, and the template includes all necessary files including tests and styling.',
        pass: true,
        totalScore: 88.75
      }

      mockElectronAPI.judgeTemplate.mockResolvedValue(excellentTemplateJudgment)

      render(<App />)

      await user.click(screen.getByText('React Component Template'))

      const editor = screen.getByRole('textbox', { name: /code editor/i })
      const excellentTemplate = `# React Component Template

## Project Structure
\`\`\`
src/
  components/
    Button/
      Button.tsx
      Button.module.css
      Button.test.tsx
      index.ts
  types/
    index.ts
  utils/
    helpers.ts
package.json
tsconfig.json
\`\`\`

## Button Component
\`\`\`tsx
import React from 'react';
import styles from './Button.module.css';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  size = 'medium'
}) => {
  return (
    <button
      className={\`\${styles.button} \${styles[variant]} \${styles[size]}\`}
      onClick={onClick}
      disabled={disabled}
      type="button"
    >
      {children}
    </button>
  );
};
\`\`\`

## Package.json
\`\`\`json
{
  "name": "react-component-template",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "typescript": "^4.9.0",
    "vite": "^4.0.0",
    "@testing-library/react": "^13.0.0"
  }
}
\`\`\``

      await user.clear(editor)
      await user.type(editor, excellentTemplate)

      await user.click(screen.getByRole('button', { name: /submit/i }))

      await waitFor(() => {
        expect(mockElectronAPI.judgeTemplate).toHaveBeenCalledWith(
          expect.stringContaining('React Component Template'),
          mockTemplateDetails.rubric,
          undefined, // expectedStructure
          'React Component Template',
          expect.stringContaining('Create a complete React component')
        )
      })

      await waitFor(() => {
        expect(screen.getByText(/Excellent React component template!/)).toBeInTheDocument()
        expect(screen.getByText(/88/)).toBeInTheDocument() // Total score
        expect(screen.getByText(/passed/i)).toBeInTheDocument()
      })
    })

    it('should handle incomplete template with missing components', async () => {
      mockElectronAPI.loadKata.mockResolvedValue(mockTemplateDetails)
      
      const incompleteTemplateJudgment: AIJudgment = {
        scores: {
          structure: 60,
          completeness: 40,
          best_practices: 55,
          functionality: 45
        },
        feedback: 'Your template is incomplete and missing several important components. Consider adding: 1) Proper TypeScript interfaces, 2) Component tests, 3) CSS modules or styled components, 4) Package.json with proper dependencies, 5) Better project structure with organized folders.',
        pass: false,
        totalScore: 50
      }

      mockElectronAPI.judgeTemplate.mockResolvedValue(incompleteTemplateJudgment)

      render(<App />)

      await user.click(screen.getByText('React Component Template'))

      const editor = screen.getByRole('textbox', { name: /code editor/i })
      const incompleteTemplate = `# Basic Template

Just a simple component:

\`\`\`jsx
function Button() {
  return <button>Click me</button>;
}
\`\`\`

That's it.`

      await user.clear(editor)
      await user.type(editor, incompleteTemplate)

      await user.click(screen.getByRole('button', { name: /submit/i }))

      await waitFor(() => {
        expect(screen.getByText(/incomplete and missing/)).toBeInTheDocument()
        expect(screen.getByText(/50/)).toBeInTheDocument() // Total score
        expect(screen.getByText(/failed/i)).toBeInTheDocument()
      })

      // Verify specific improvement suggestions
      expect(screen.getByText(/TypeScript interfaces/)).toBeInTheDocument()
      expect(screen.getByText(/Component tests/)).toBeInTheDocument()
    })

    it('should handle template with good structure but poor practices', async () => {
      mockElectronAPI.loadKata.mockResolvedValue(mockTemplateDetails)
      
      const poorPracticesJudgment: AIJudgment = {
        scores: {
          structure: 80, // Good structure
          completeness: 75, // Mostly complete
          best_practices: 45, // Poor practices
          functionality: 70
        },
        feedback: 'Your template has good structure and is fairly complete, but there are several best practice issues: 1) Missing TypeScript types, 2) Inline styles instead of CSS modules, 3) No error boundaries, 4) Missing accessibility attributes, 5) No prop validation.',
        pass: false, // Fails due to poor best practices
        totalScore: 67.5
      }

      mockElectronAPI.judgeTemplate.mockResolvedValue(poorPracticesJudgment)

      render(<App />)

      await user.click(screen.getByText('React Component Template'))

      const editor = screen.getByRole('textbox', { name: /code editor/i })
      const poorPracticesTemplate = `# React Template

\`\`\`jsx
function Button(props) {
  return (
    <button 
      style={{backgroundColor: 'blue', color: 'white'}}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}

function App() {
  return (
    <div>
      <Button onClick={() => alert('clicked')}>
        Click me
      </Button>
    </div>
  );
}
\`\`\``

      await user.clear(editor)
      await user.type(editor, poorPracticesTemplate)

      await user.click(screen.getByRole('button', { name: /submit/i }))

      await waitFor(() => {
        expect(screen.getByText(/best practice issues/)).toBeInTheDocument()
        expect(screen.getByText(/67/)).toBeInTheDocument() // Total score
        expect(screen.getByText(/failed/i)).toBeInTheDocument()
      })

      // Verify specific practice improvements mentioned
      expect(screen.getByText(/TypeScript types/)).toBeInTheDocument()
      expect(screen.getByText(/CSS modules/)).toBeInTheDocument()
    })
  })

  describe('AI Service Error Handling', () => {
    it('should handle AI service timeout gracefully', async () => {
      mockElectronAPI.loadKata.mockResolvedValue(mockExplanationDetails)
      mockElectronAPI.judgeExplanation.mockRejectedValue(new Error('AI API request timeout'))

      render(<App />)

      await user.click(screen.getByText('Explain Recursion'))

      const editor = screen.getByRole('textbox', { name: /code editor/i })
      await user.type(editor, 'Some explanation')

      await user.click(screen.getByRole('button', { name: /submit/i }))

      await waitFor(() => {
        expect(screen.getByText(/AI API request timeout/)).toBeInTheDocument()
      })

      // App should remain functional
      expect(screen.getByText('Explain Recursion')).toBeInTheDocument()
    })

    it('should handle malformed AI response gracefully', async () => {
      mockElectronAPI.loadKata.mockResolvedValue(mockExplanationDetails)
      mockElectronAPI.judgeExplanation.mockRejectedValue(new Error('Invalid AI response format'))

      render(<App />)

      await user.click(screen.getByText('Explain Recursion'))

      const editor = screen.getByRole('textbox', { name: /code editor/i })
      await user.type(editor, 'Some explanation')

      await user.click(screen.getByRole('button', { name: /submit/i }))

      await waitFor(() => {
        expect(screen.getByText(/Invalid AI response format/)).toBeInTheDocument()
      })
    })

    it('should handle network connectivity issues', async () => {
      mockElectronAPI.loadKata.mockResolvedValue(mockExplanationDetails)
      mockElectronAPI.judgeExplanation.mockRejectedValue(new Error('Network error: Unable to connect to AI service'))

      render(<App />)

      await user.click(screen.getByText('Explain Recursion'))

      const editor = screen.getByRole('textbox', { name: /code editor/i })
      await user.type(editor, 'Some explanation')

      await user.click(screen.getByRole('button', { name: /submit/i }))

      await waitFor(() => {
        expect(screen.getByText(/Network error/)).toBeInTheDocument()
      })
    })

    it('should provide retry option after AI service failure', async () => {
      mockElectronAPI.loadKata.mockResolvedValue(mockExplanationDetails)
      mockElectronAPI.judgeExplanation
        .mockRejectedValueOnce(new Error('Temporary AI service error'))
        .mockResolvedValueOnce({
          scores: { clarity: 80, correctness: 75, completeness: 70, examples: 65 },
          feedback: 'Good explanation after retry',
          pass: true,
          totalScore: 72.5
        })

      render(<App />)

      await user.click(screen.getByText('Explain Recursion'))

      const editor = screen.getByRole('textbox', { name: /code editor/i })
      await user.type(editor, 'Some explanation')

      // First attempt fails
      await user.click(screen.getByRole('button', { name: /submit/i }))

      await waitFor(() => {
        expect(screen.getByText(/Temporary AI service error/)).toBeInTheDocument()
      })

      // Retry should work
      await user.click(screen.getByRole('button', { name: /submit/i }))

      await waitFor(() => {
        expect(screen.getByText(/Good explanation after retry/)).toBeInTheDocument()
        expect(screen.getByText(/72/)).toBeInTheDocument()
      })
    })
  })

  describe('Rubric Validation', () => {
    it('should handle kata without rubric gracefully', async () => {
      const kataWithoutRubric = {
        ...mockExplanationDetails,
        rubric: undefined
      }

      mockElectronAPI.loadKata.mockResolvedValue(kataWithoutRubric)

      render(<App />)

      await user.click(screen.getByText('Explain Recursion'))

      const editor = screen.getByRole('textbox', { name: /code editor/i })
      await user.type(editor, 'Some explanation')

      await user.click(screen.getByRole('button', { name: /submit/i }))

      // Should show fallback message for missing rubric
      await waitFor(() => {
        expect(screen.getByText(/No rubric found/)).toBeInTheDocument()
      })
    })

    it('should validate rubric thresholds correctly', async () => {
      mockElectronAPI.loadKata.mockResolvedValue(mockExplanationDetails)
      
      // Scores that meet total threshold but fail correctness threshold
      const thresholdFailJudgment: AIJudgment = {
        scores: {
          clarity: 90,
          correctness: 50, // Below min_correctness (70)
          completeness: 85,
          examples: 80
        },
        feedback: 'Good overall explanation but correctness needs improvement',
        pass: false, // Should fail due to correctness threshold
        totalScore: 76.25 // Above min_total (75) but fails correctness
      }

      mockElectronAPI.judgeExplanation.mockResolvedValue(thresholdFailJudgment)

      render(<App />)

      await user.click(screen.getByText('Explain Recursion'))

      const editor = screen.getByRole('textbox', { name: /code editor/i })
      await user.type(editor, 'Explanation with good style but incorrect facts')

      await user.click(screen.getByRole('button', { name: /submit/i }))

      await waitFor(() => {
        expect(screen.getByText(/correctness needs improvement/)).toBeInTheDocument()
        expect(screen.getByText(/failed/i)).toBeInTheDocument() // Should fail despite high total
      })
    })
  })
})