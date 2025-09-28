---
inclusion: always
---

# Product Overview

Code Kata Electron App is a comprehensive desktop application for practicing coding challenges with local execution, AI-powered judging, and progress tracking.

## Core Features & Implementation Guidelines

### Multi-Language Code Execution
- **Supported Languages**: Python, JavaScript, TypeScript, and C++
- **Execution Model**: Isolated child processes with timeout controls
- **Test Framework**: Public and hidden test suites with weighted scoring
- **Dependency Detection**: Real-time system dependency checking with user guidance
- **Compilation Support**: TypeScript compilation with fallback error handling
- **Cross-Platform**: Windows, macOS, Linux execution environments

### AI-Powered Assessment System
- **OpenAI Integration**: GPT-4 based judging for non-code submissions
- **Explanation Katas**: Natural language explanations evaluated against rubrics
- **Template Katas**: Project structure and boilerplate code assessment
- **Scoring System**: Multi-criteria evaluation with threshold-based pass/fail
- **Feedback Generation**: Detailed constructive feedback with improvement suggestions
- **Error Recovery**: Graceful fallback when AI services are unavailable

### Progress Tracking & Analytics
- **SQLite Database**: Local storage using sql.js for cross-platform compatibility
- **Attempt History**: Complete submission tracking with timestamps and scores
- **Performance Metrics**: Best scores, attempt counts, success rates
- **Code Persistence**: Auto-save functionality with kata-specific code storage
- **Export/Import**: Bulk kata management with zip-based transfer
- **User Settings**: Customizable preferences with persistent storage

### Auto-Continue System
- **Smart Shuffling**: Intelligent kata selection avoiding recent completions
- **Filter Respect**: Auto-continue honors user-defined difficulty/language filters
- **Configurable Delays**: User-controlled timing for automatic transitions
- **Graceful Cancellation**: Easy opt-out with clear notifications
- **Progress Preservation**: Seamless transition without losing work

### User Experience Features
- **Responsive Design**: Adaptive layout for desktop, tablet, and mobile screens
- **Resizable Panels**: Customizable workspace with drag-to-resize functionality
- **Monaco Editor**: VS Code-quality editing experience with syntax highlighting
- **Real-time Feedback**: Immediate test results and execution status
- **Dependency Warnings**: Proactive system requirement notifications
- **Error Boundaries**: Robust error handling with recovery options

## Kata Types & Architecture

### 1. Code Katas (Traditional Programming Challenges)
- **Structure**: `meta.yaml`, `statement.md`, `entry.*`, `tests.*`, optional `hidden_tests.*`
- **Execution**: Language-specific runners with public/hidden test separation
- **Scoring**: Weighted combination of public (30%) and hidden (70%) test results
- **Languages**: Full support for Python, JavaScript, TypeScript, C++
- **Validation**: Comprehensive metadata validation with helpful error messages

### 2. Explanation Katas (Technical Writing)
- **Structure**: `meta.yaml`, `statement.md`, optional `rubric.yaml`
- **Assessment**: AI-powered evaluation against customizable rubrics
- **Criteria**: Correctness, clarity, completeness with configurable thresholds
- **Format**: Markdown-based explanations with rich text support
- **Feedback**: Detailed AI-generated feedback with specific improvement areas

### 3. Template Katas (Project Scaffolding)
- **Structure**: `meta.yaml`, `statement.md`, `rubric.yaml`, template directory
- **Validation**: Project structure compliance checking
- **Assessment**: AI evaluation of code organization and best practices
- **Criteria**: Structure, completeness, best practices adherence
- **Use Cases**: Framework setup, boilerplate creation, architecture patterns

### 4. Codebase Katas (Code Analysis)
- **Structure**: `meta.yaml`, `statement.md`, existing codebase files
- **Focus**: Understanding and documenting existing code architecture
- **Skills**: Code reading, documentation, architectural analysis
- **Output**: Analysis documents and architectural explanations

## Technical Architecture Principles

### Offline-First Design
- **Core Functionality**: Complete kata practice without internet connectivity
- **Local Execution**: All code running happens on user's machine
- **Data Storage**: Local SQLite database for all user data
- **AI Optional**: Graceful degradation when AI services unavailable

### Cross-Platform Compatibility
- **Electron Framework**: Native desktop app for Windows, macOS, Linux
- **Process Isolation**: Safe code execution in separate processes
- **Path Handling**: Cross-platform file system operations
- **Native Dependencies**: Careful handling of platform-specific modules

### Performance & Reliability
- **Fast Startup**: Efficient kata loading and caching
- **Responsive UI**: Non-blocking operations with loading states
- **Error Recovery**: Comprehensive error handling with user-friendly messages
- **Memory Management**: Proper cleanup of child processes and resources

### Security & Safety
- **Process Sandboxing**: User code execution in isolated environments
- **Timeout Controls**: Prevents infinite loops and resource exhaustion
- **Input Validation**: Comprehensive validation of kata metadata and user input
- **Safe File Operations**: Careful handling of file system operations

## Development & Extensibility

### Adding New Languages
1. Extend `Language` type in `src/types/index.ts`
2. Add execution handler in `CodeExecutionService`
3. Update dependency checker for language requirements
4. Add file extension mapping and starter code templates

### Creating New Kata Types
1. Extend `KataType` type definition
2. Add validation logic in kata manager
3. Implement assessment logic (AI or programmatic)
4. Update UI components for new type display

### Error Handling Standards
- **Structured Errors**: Typed error interfaces with context
- **User-Friendly Messages**: Clear, actionable error descriptions
- **Recovery Options**: Retry mechanisms and fallback strategies
- **Logging**: Comprehensive error tracking for debugging