# Multi-Question Kata Template

This is a template for creating multi-question katas that combine different types of questions in a single assessment.

## Instructions

Replace this content with your quiz introduction and instructions. Multi-question katas are perfect for:

- Comprehensive knowledge assessments
- Mixed-format quizzes
- Progressive difficulty questions
- Topic-based question sets

## Question Types

You can include any combination of:

- **Multiple Choice**: Single or multiple selection questions
- **Shortform**: Brief text answers (typically 1-3 words or short phrases)
- **One-Liner**: Single sentence or phrase answers

## Configuration

The multi-question configuration in `meta.yaml` includes:

### Quiz Settings
- `title`: Overall title for the question set
- `description`: Brief description shown to users
- `passingScore`: Percentage needed to pass (default: 70%)
- `showProgressBar`: Whether to show progress indicator
- `allowReview`: Allow reviewing answers before final submission

### Question Configuration
Each question in the `questions` array should have:

- `id`: Unique identifier for the question
- `type`: Question type (`multiple-choice`, `shortform`, or `one-liner`)
- `question`: The question text
- `points`: Optional scoring weight (default: 1)
- `explanation`: Optional explanation shown after submission

#### Type-Specific Fields

**Multiple Choice:**
- `options`: Array of answer choices with `id` and `text`
- `correctAnswers`: Array of correct option IDs
- `allowMultiple`: Whether multiple selections are allowed

**Shortform/One-Liner:**
- `expectedAnswer`: Primary correct answer
- `acceptableAnswers`: Array of acceptable answer variations
- `caseSensitive`: Whether matching should be case-sensitive
- `maxLength`: Maximum character limit (shortform only)

## Best Practices

1. **Logical Flow**: Order questions from simple to complex
2. **Balanced Scoring**: Use points to weight more difficult questions
3. **Clear Instructions**: Make question requirements obvious
4. **Good Explanations**: Provide learning value in explanations
5. **Reasonable Length**: Keep quizzes focused (5-10 questions typically)