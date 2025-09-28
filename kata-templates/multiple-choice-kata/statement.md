# Multiple Choice Question Template

This is a template for creating multiple choice questions with single or multiple correct answers.

## Instructions

Replace this content with your question setup and context. Multiple choice questions are great for:

- Testing conceptual understanding
- Quick knowledge checks
- Comparing similar concepts
- Identifying correct/incorrect statements

## Question Format

Your question should be clear and unambiguous. Consider whether to allow:

- Single answer (radio buttons)
- Multiple answers (checkboxes)

## Configuration

The multiple choice configuration in `meta.yaml` includes:

- `question`: The main question text
- `allowMultiple`: Whether multiple selections are allowed
- `options`: Array of answer choices with IDs and text
- `correctAnswers`: Array of correct option IDs
- `explanation`: Optional explanation shown after submission

Each option should have:
- `id`: Unique identifier (e.g., "a", "b", "c")
- `text`: The answer choice text
- `correct`: Optional boolean (for reference)