# Comprehensive Exam Kata Template

This is a template for creating comprehensive examination katas that combine multiple question types for thorough assessment.

## Instructions

Replace this content with your exam introduction and instructions. Comprehensive exam katas are perfect for:

- Final assessments and evaluations
- Certification examinations
- Skills validation tests
- Mixed-format comprehensive reviews
- Academic examinations

## Question Types Available

You can include any combination of:

- **Multiple Choice**: Single or multiple selection questions with detailed explanations
- **Shortform**: Brief text answers for quick knowledge checks
- **One-Liner**: Fill-in-the-blank and completion questions
- **Explanation**: Detailed written explanations requiring deeper understanding
- **Code**: Practical programming challenges with language-specific requirements

## Configuration

The comprehensive exam configuration in `meta.yaml` includes:

### Exam Settings
- `title`: Overall title for the examination
- `description`: Brief description shown to examinees
- `passingScore`: Percentage needed to pass (typically 70-80%)
- `showProgressBar`: Whether to show progress indicator
- `allowReview`: Allow reviewing answers before final submission

### Question Configuration
Each question in the `questions` array should have:

- `id`: Unique identifier for the question
- `type`: Question type (`multiple-choice`, `shortform`, `one-liner`, `explanation`, `code`)
- `question`: The question text
- `points`: Scoring weight (higher for complex questions)
- `explanation`: Detailed explanation shown after submission

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

**Explanation:**
- `minWords`: Minimum word count required
- `rubric`: Optional detailed rubric for AI evaluation

**Code:**
- `language`: Programming language (`py`, `js`, `ts`, `cpp`)
- `starterCode`: Optional starter code template
- `testCases`: Optional test cases for validation

## Best Practices for Comprehensive Exams

### Question Design
1. **Progressive Difficulty**: Start with easier questions, build to complex ones
2. **Balanced Coverage**: Include both theoretical and practical questions
3. **Clear Instructions**: Make requirements obvious for each question type
4. **Appropriate Weighting**: Use points to reflect question difficulty and importance

### Exam Structure
1. **Logical Flow**: Group related questions together
2. **Time Consideration**: Balance question complexity with available time
3. **Review Capability**: Always enable answer review for comprehensive exams
4. **Clear Scoring**: Make point values and passing criteria transparent

### Content Guidelines
1. **Comprehensive Coverage**: Test breadth and depth of knowledge
2. **Practical Application**: Include real-world scenarios and problems
3. **Multiple Formats**: Use variety to assess different types of understanding
4. **Fair Assessment**: Ensure questions are clear and unambiguous

## Example Exam Structure

A typical comprehensive exam might include:

1. **Warm-up Questions** (10-15 points)
   - Multiple choice for basic concepts
   - Short answers for definitions

2. **Knowledge Application** (20-25 points)
   - Explanation questions for deeper understanding
   - One-liner questions for specific knowledge

3. **Practical Skills** (15-20 points)
   - Code questions for hands-on abilities
   - Problem-solving scenarios

4. **Integration** (5-10 points)
   - Questions that combine multiple concepts
   - Real-world application scenarios

## Scoring Recommendations

- **Passing Score**: 70-80% for most comprehensive exams
- **Question Weighting**: 
  - Multiple Choice: 1-3 points each
  - Short Answer: 1-2 points each
  - Explanations: 3-8 points each
  - Code Questions: 3-6 points each
  - One-Liners: 1 point each

This template provides a foundation for creating thorough, fair, and comprehensive examinations that effectively assess both theoretical knowledge and practical skills.