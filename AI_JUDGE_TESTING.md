# AI Judge Comprehensive Testing

This document describes the comprehensive test suite created for the AI judging system to ensure it correctly handles both passing and failing scenarios.

## Overview

The AI judging system is critical for evaluating explanation, template, and codebase katas. These tests ensure the system:

- ✅ **Correctly identifies passing submissions** that meet rubric requirements
- ❌ **Properly fails inadequate submissions** below thresholds  
- 🔄 **Handles edge cases and error conditions** gracefully
- 📊 **Applies rubric thresholds consistently** across all kata types

## Test Structure

### 1. Unit Tests (`ai-judge.test.ts`)
- Core functionality testing with mocked API responses
- Validates response parsing and rubric threshold application
- Tests error handling and retry logic
- Covers all three kata types: explanation, template, codebase

### 2. Comprehensive Tests (`ai-judge.comprehensive.test.ts`)
- Realistic scenarios with detailed submissions
- Tests both excellent and poor quality submissions
- Validates complex rubric configurations
- Covers edge cases like borderline scores and malformed responses

### 3. End-to-End Tests (`ai-judge.e2e.test.ts`)
- Simulates complete frontend workflow
- Tests integration with kata loading and progress tracking
- Validates real-world usage patterns
- Includes error recovery scenarios

### 4. Integration Tests (`ai-judge.integration.test.ts`)
- **Optional**: Requires `OPENAI_API_KEY` environment variable
- Tests against real OpenAI API
- Validates actual AI responses and scoring
- Useful for verifying prompt effectiveness

## Key Test Scenarios

### Explanation Katas

#### ✅ Passing Scenarios
- **Excellent explanations** with comprehensive coverage, clear examples, and accurate technical details
- **Good explanations** that meet minimum thresholds for clarity and correctness
- **Borderline explanations** that exactly meet rubric requirements

#### ❌ Failing Scenarios  
- **Low total scores** below the minimum threshold despite some good aspects
- **Technical inaccuracies** that fail the minimum correctness requirement
- **Completely inadequate** explanations showing no understanding

### Template Katas

#### ✅ Passing Scenarios
- **Professional templates** with proper structure, complete configuration, and best practices
- **Adequate templates** meeting basic requirements for functionality and organization
- **Well-documented templates** with clear setup instructions

#### ❌ Failing Scenarios
- **Poor structure** that doesn't follow conventions or best practices
- **Incomplete templates** missing essential files or configuration
- **Non-functional templates** that wouldn't work as starting points

### Codebase Analysis Katas

#### ✅ Passing Scenarios
- **Excellent analyses** demonstrating deep understanding with valuable insights
- **Good analyses** showing solid comprehension and adequate technical detail
- **Accurate analyses** with correct technical explanations

#### ❌ Failing Scenarios
- **Poor comprehension** showing limited understanding of the codebase
- **Technical inaccuracies** with incorrect explanations despite good structure
- **Superficial analyses** lacking depth or meaningful insights

## Running the Tests

### Quick Test Run
```bash
node scripts/test-ai-judge.js
```

### Individual Test Suites
```bash
# Unit tests
npx vitest run src/services/__tests__/ai-judge.test.ts

# Comprehensive scenarios
npx vitest run src/services/__tests__/ai-judge.comprehensive.test.ts

# End-to-end workflow
npx vitest run src/services/__tests__/ai-judge.e2e.test.ts

# Integration tests (requires OPENAI_API_KEY)
npx vitest run src/services/__tests__/ai-judge.integration.test.ts
```

### Watch Mode for Development
```bash
npx vitest watch src/services/__tests__/ai-judge.*.test.ts
```

## Test Coverage Areas

### ✅ Correctness Validation
- Rubric threshold enforcement
- Score calculation accuracy
- Pass/fail determination logic
- Edge case handling (exact thresholds, borderline scores)

### 🔄 Error Handling
- Network failures and timeouts
- Malformed API responses
- Authentication errors (401)
- Rate limiting (429)
- Retry logic with exponential backoff

### 📝 Response Parsing
- Clean JSON responses
- JSON wrapped in markdown code blocks
- Mixed content with extra text
- Invalid JSON handling
- Missing required fields validation

### 🎯 Prompt Generation
- All rubric keys included in prompts
- Context and topic information preserved
- Template-specific guidance included
- Codebase analysis instructions proper

## Expected Outcomes

When all tests pass, you can be confident that:

1. **Passing submissions are correctly identified** when they meet rubric requirements
2. **Failing submissions are properly rejected** when below thresholds
3. **Edge cases are handled gracefully** without system crashes
4. **Error conditions are managed** with appropriate user feedback
5. **The system is resilient** to network issues and API problems

## Troubleshooting

### Common Issues

**Tests failing due to type errors:**
- Ensure `@/types` import path is configured correctly in `tsconfig.json`
- Check that all required types are exported from `src/types/index.ts`

**Integration tests skipped:**
- Set `OPENAI_API_KEY` environment variable to run real API tests
- Integration tests are optional but useful for validating prompt effectiveness

**Mock fetch not working:**
- Ensure `vi.clearAllMocks()` is called in `beforeEach`
- Check that fetch mocks are properly configured before test execution

### Debugging Tips

1. **Use `console.log`** in tests to inspect AI responses and scoring logic
2. **Check mock call arguments** to verify prompts are generated correctly
3. **Test individual scenarios** by running specific test cases
4. **Validate rubric configurations** match expected threshold behavior

## Maintenance

### Adding New Test Scenarios
1. Add test cases to the appropriate test file
2. Include both passing and failing examples
3. Test edge cases and boundary conditions
4. Verify error handling paths

### Updating for New Kata Types
1. Extend test coverage to new kata types
2. Add specific rubric configurations for new types
3. Include prompt generation tests for new formats
4. Test integration with frontend workflow

This comprehensive test suite ensures the AI judging system works reliably and correctly identifies both passing and failing submissions across all supported kata types.