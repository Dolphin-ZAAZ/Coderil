# End-to-End and Integration Tests

This directory contains comprehensive end-to-end and integration tests for the Code Kata Electron App, covering all major workflows and functionality as specified in task 21.

## Test Structure

### E2E Tests (`e2e/`)
- **complete-kata-workflow.test.ts**: Tests the complete kata workflow from loading to submission
  - Code kata workflow: load → edit → run → submit
  - Explanation kata workflow with AI judging
  - Auto-continue functionality
  - Error handling scenarios

### Integration Tests (`integration/`)
- **progress-persistence.test.ts**: Tests progress tracking and persistence across app restarts
  - Code autosave functionality
  - Attempt history recording
  - Progress display updates
  - Application restart simulation

- **import-export.test.ts**: Tests kata import/export functionality
  - Single kata export/import
  - Bulk operations
  - File validation
  - Error handling for corrupted files

- **auto-continue.test.ts**: Tests auto-continue functionality with various filter combinations
  - Settings persistence
  - Filter respect (difficulty, language, type)
  - Notification system
  - Manual random selection

- **ai-judge-mock.test.ts**: Tests AI judge functionality with comprehensive mock responses
  - Explanation kata judging scenarios
  - Template kata judging scenarios
  - Error handling and retry mechanisms
  - Rubric validation

## Running Tests

### Individual Test Suites
```bash
# Run all E2E tests
npm run test:e2e

# Run all integration tests
npm run test:integration

# Run specific test file
npm test -- src/__tests__/e2e/complete-kata-workflow.test.ts
```

### Comprehensive Test Run
```bash
# Run all E2E and integration tests with summary report
npm run test:all
```

### Watch Mode
```bash
# Run tests in watch mode for development
npm run test:watch
```

## Test Coverage

### Requirements Coverage
The tests cover all requirements specified in task 21:

- ✅ **Requirement 1.1**: Complete kata workflow (load → edit → run → submit)
- ✅ **Requirement 2.4, 2.5**: Code execution and test result processing
- ✅ **Requirement 4.1**: AI judge functionality with mock responses
- ✅ **Requirement 5.3**: Progress persistence across application restarts
- ✅ **Requirement 8.1, 8.2**: Import/export functionality with sample kata files
- ✅ **Requirement 10.1**: Auto-continue functionality with various filter combinations

### Kata Types Tested
- **Code Katas**: JavaScript, Python, C++, TypeScript
- **Explanation Katas**: AI-powered judging with rubrics
- **Template Katas**: Project structure validation
- **Codebase Katas**: Code analysis workflows

### Error Scenarios Covered
- Network connectivity issues
- File system errors (permissions, disk space)
- Corrupted data files
- AI service failures and timeouts
- Invalid kata structures
- Missing dependencies

## Mock Strategy

### Electron API Mocking
All tests use comprehensive mocks for the Electron API to ensure:
- Consistent test environment
- Fast test execution
- Reliable test results
- No dependency on external services

### AI Service Mocking
AI judge tests use realistic mock responses covering:
- Excellent submissions (high scores)
- Poor submissions (low scores, constructive feedback)
- Borderline submissions (threshold testing)
- Service failures and error handling

## Test Data

### Sample Katas Used
Tests use realistic kata structures based on existing katas in the `/katas` directory:
- `fibonacci-js`: JavaScript code kata
- `explain-recursion`: Explanation kata with rubric
- `react-template`: Template kata for React components
- Various difficulty levels and languages

### Mock Responses
Comprehensive mock responses simulate real-world scenarios:
- Successful code execution results
- Failed test cases with detailed error messages
- AI judgments with scores and feedback
- Progress data with attempt history

## Debugging Tests

### Verbose Output
```bash
# Run tests with verbose output
npm test -- --reporter=verbose src/__tests__/e2e/complete-kata-workflow.test.ts
```

### Debug Mode
```bash
# Run tests in debug mode
npm test -- --inspect-brk src/__tests__/integration/progress-persistence.test.ts
```

### Console Logs
Tests include strategic console.log statements for debugging:
- Mock function calls
- Test state transitions
- Error conditions

## Continuous Integration

### GitHub Actions
Tests are designed to run in CI environments:
- No external dependencies required
- Consistent mock data
- Proper timeout handling
- Clear failure reporting

### Performance Considerations
- Tests use appropriate timeouts for async operations
- Mock responses are immediate (no network delays)
- Database operations use in-memory storage
- File operations are mocked to avoid I/O

## Maintenance

### Adding New Tests
When adding new functionality:
1. Add corresponding test cases to relevant test files
2. Update mock responses as needed
3. Ensure error scenarios are covered
4. Update this README with new coverage

### Updating Mocks
When changing the Electron API:
1. Update mock implementations in test files
2. Ensure all test files use consistent mocks
3. Test both success and failure scenarios
4. Verify error handling remains robust

## Known Limitations

### Browser Mode Testing
- Tests focus on Electron mode functionality
- Browser mode fallbacks are tested but limited
- Some features unavailable in browser mode are mocked

### Real AI Integration
- AI judge tests use mocks for reliability
- Real AI integration tests are in separate files
- Require API keys and network connectivity

### File System Operations
- Most file operations are mocked for speed
- Real file system tests are limited to avoid side effects
- Cross-platform compatibility assumed based on mocks

## Troubleshooting

### Common Issues
1. **Test timeouts**: Increase timeout values for slow operations
2. **Mock inconsistencies**: Ensure all tests use the same mock structure
3. **Async race conditions**: Use proper `waitFor` patterns
4. **Memory leaks**: Clear mocks between tests

### Getting Help
- Check test output for specific error messages
- Use verbose mode for detailed execution logs
- Verify mock setup matches expected API calls
- Ensure test environment matches development setup