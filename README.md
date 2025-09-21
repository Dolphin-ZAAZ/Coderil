# Code Kata Electron App

A desktop application for code katas with local execution and AI-powered judging.

## Features

- **Multi-language support**: Python, JavaScript, TypeScript, and C++
- **Local execution**: Run code challenges without internet connectivity
- **AI-powered judging**: Automated feedback for explanation and template tasks
- **Template katas**: Practice creating project structures, boilerplate code, and configuration files
- **Auto-continue shuffle**: Automatically move to random new katas after completing one
- **Progress tracking**: Save attempts and track improvement over time
- **Kata management**: Import/export and organize coding challenges

## Kata Types

The application supports three types of coding challenges:

1. **Code katas**: Traditional coding challenges with test cases that validate your implementation
2. **Explanation katas**: Write technical explanations that are evaluated by AI for clarity and correctness
3. **Template katas**: Create project structures, boilerplate code, and configuration files

## Prerequisites

Before running the application, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **Python** (v3.8 or higher) - for Python kata execution
- **C++ Compiler** (GCC/Clang with C++20 support) - for C++ kata execution

## Development Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run electron:dev
   ```
   This will start both the Vite dev server and Electron in development mode.

3. **Build for production**:
   ```bash
   npm run build
   ```

## Available Scripts

### Development Commands
- `npm run dev` - Start Vite development server only
- `npm run electron:dev` - Start both Vite and Electron in development mode
- `npm run build:dev` - Build for development (no packaging)
- `npm run build` - Build and package for production

### Distribution Commands
- `npm run dist` - Package for current platform
- `npm run dist:win` - Package for Windows (NSIS installer + portable)
- `npm run dist:mac` - Package for macOS (DMG + ZIP)
- `npm run dist:linux` - Package for Linux (AppImage + DEB + RPM)
- `npm run dist:all` - Package for all platforms
- `npm run pack` - Create unpacked directory (for testing)

### Build Testing
- `npm run build:test-config` - Test build configuration without packaging
- `npm run build:test` - Full build test including packaging (requires build tools)
- `npm run build:platform <platform>` - Build for specific platform using custom script

### Code Quality
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run type-check` - Run TypeScript type checking

### Testing
- `npm run test` - Run unit tests once
- `npm run test:watch` - Run tests in watch mode for development
- `npm run test src/services/__tests__/code-execution.test.ts` - Run Python execution engine tests specifically

## Development Notes

- **Development Server**: Vite runs on port 5173 with hot reload enabled
- **Path Aliases**: Use `@/` for src imports (e.g., `import { Kata } from '@/types'`)
- **TypeScript**: Strict mode enabled with ES2020 target
- **Code Style**: ESLint configured for TypeScript + React, unused variables should be prefixed with `_`
- **Database**: SQLite database stored in user data directory, with singleton pattern for connection management
- **Build Configuration**: Vite externalizes `better-sqlite3` and `sqlite3` in Electron builds to prevent bundling issues
- **Testing**: Comprehensive unit tests for database operations using Vitest with isolated test databases

## Auto-Continue Feature

The auto-continue feature automatically selects a new random kata after you successfully complete one, helping maintain flow state during practice sessions.

### How it works:
- **Toggle**: Use the checkbox in the header to enable/disable auto-continue
- **Smart selection**: Respects your current filter settings (difficulty, language, tags, type)
- **Notification**: Shows a brief message when transitioning to a new kata
- **Persistent**: Your preference is saved and restored when you restart the app

### When it triggers:
- **Code katas**: After passing all tests with a successful submission
- **Explanation katas**: After receiving a passing score from AI judging
- **Template katas**: After AI evaluation marks the template as "close enough"

This feature is perfect for focused practice sessions where you want to tackle multiple challenges without interruption.

## Database and Progress Tracking

The application uses SQLite for local data persistence, providing comprehensive progress tracking without requiring internet connectivity.

### Database Features
- **Attempt History**: Every code submission is recorded with timestamp, score, duration, and code
- **Progress Tracking**: Best scores, attempt counts, and last status for each kata
- **Auto-save**: Code is automatically saved as you type and restored when you return
- **User Settings**: Preferences like auto-continue mode are persisted across sessions

### Database Schema
The SQLite database includes three main tables:
- `attempts`: Individual submission records with full execution details
- `progress`: Aggregated progress data for each kata
- `user_settings`: Application preferences and configuration

### Progress Statistics
For each kata, the system tracks:
- Total number of attempts
- Best score achieved
- Last submission status
- Average score across all attempts
- Number of successful completions

### IPC Integration
All database operations are accessible from the renderer process through secure IPC handlers:
- `save-attempt`: Record new kata attempts with full execution details
- `get-progress`: Retrieve progress data for a specific kata
- `save-code`/`load-code`: Auto-save and restore code as you type
- `get-attempt-history`: View complete submission history for any kata
- `get-all-progress`: Retrieve progress summary for all attempted katas
- `get-kata-stats`: Get detailed statistics including averages and success rates
- `get-settings`/`update-setting`: Manage user preferences and configuration

All database operations are fully tested with comprehensive unit tests covering normal operations, edge cases, and error conditions.

## Code Execution System

The application features a robust code execution system that runs user code locally with comprehensive test validation and error handling.

### Python Execution Engine

The Python execution engine is fully implemented and provides:

#### **Core Features**
- **Local Execution**: Runs Python code using the system's Python interpreter via `child_process.spawn()`
- **Test Integration**: Automatically imports user code and executes test files (`tests.py` for public, `hidden_tests.py` for private)
- **Timeout Protection**: Configurable execution timeouts with process termination (default: 5 seconds)
- **Error Capture**: Comprehensive error handling for syntax errors, runtime exceptions, and assertion failures
- **Score Calculation**: Automatic scoring based on test pass/fail ratios

#### **Test Execution Workflow**
1. **Code Preparation**: User code is temporarily written to `entry.py` in the kata directory
2. **Test Execution**: Python process spawns to run the appropriate test file
3. **Result Parsing**: Stdout/stderr are parsed to extract individual test results and error messages
4. **Cleanup**: Original kata files are restored after execution
5. **Scoring**: Pass/fail ratios are calculated and returned with detailed feedback

#### **Public vs Hidden Tests**
- **Run (Public Tests)**: Executes `tests.py` to provide immediate feedback during development
- **Submit (All Tests)**: Runs both `tests.py` and `hidden_tests.py` for final evaluation
- **Weighted Scoring**: Final scores combine public tests (30%) and hidden tests (70%)

#### **Error Handling**
The execution engine handles various error scenarios:
- **Syntax Errors**: Python parsing errors with line numbers and descriptions
- **Runtime Exceptions**: TypeError, ValueError, AttributeError, etc. with full tracebacks
- **Assertion Failures**: Test failures with expected vs actual value comparisons
- **Timeouts**: Infinite loops or long-running code with graceful process termination
- **Missing Files**: Proper error messages when test files don't exist

#### **Test Result Parsing**
The system intelligently parses Python test output to provide detailed feedback:
- **Success Detection**: Recognizes "All tests passed!" messages
- **Failure Analysis**: Extracts specific test names and error messages from tracebacks
- **Test Counting**: Automatically determines the number of tests from file content
- **Progress Tracking**: Reports which tests passed/failed for granular feedback

#### **Example Usage**
```python
# User writes code in the editor
def two_sum(nums, target):
    num_map = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in num_map:
            return [num_map[complement], i]
        num_map[num] = i
    return []

# System executes tests and returns:
# {
#   success: true,
#   score: 100,
#   testResults: [
#     { name: "test_example_1", passed: true, message: "Test passed" },
#     { name: "test_example_2", passed: true, message: "Test passed" },
#     { name: "test_example_3", passed: true, message: "Test passed" }
#   ],
#   output: "All public tests passed!",
#   errors: "",
#   duration: 245
# }
```

#### **Security & Isolation**
- **Process Isolation**: Each execution runs in a separate Python process
- **Timeout Protection**: Prevents infinite loops from hanging the application
- **File System Safety**: Temporary file operations with proper cleanup
- **Error Containment**: Python exceptions are captured and don't crash the main application

#### **Testing & Reliability**
The Python execution engine includes comprehensive unit tests covering:
- ✅ Successful code execution with passing tests
- ✅ Failed code execution with detailed error reporting
- ✅ Syntax error handling and reporting
- ✅ Timeout handling for infinite loops
- ✅ Missing test file scenarios
- ✅ Hidden test execution
- ✅ Integration with the main execution service

### Future Execution Engines

**JavaScript/TypeScript Engine** (Planned):
- Node.js execution with Jest or similar test framework
- TypeScript compilation support
- NPM package management for dependencies

**C++ Engine** (Planned):
- GCC/Clang compilation with C++20 support
- Automated build and test execution
- Memory safety and compilation error reporting

## Current Implementation Status

This project is currently in active development. The following features are implemented:

✅ **Completed**:
- Project structure and development environment setup
- Core data models and TypeScript type definitions
- SQLite database service with comprehensive schema
- Progress tracking and persistence system with full IPC integration
- Auto-continue toggle functionality (UI only)
- Basic React UI shell with kata selector
- Electron + Vite + React integration
- Complete IPC communication layer for database operations

✅ **Recently Completed**:
- Python code execution engine with full test support
- File system kata management and loading
- Monaco Editor integration for code editing
- Complete kata workflow (load → edit → run → submit)

🚧 **In Progress**:
- JavaScript/TypeScript code execution engine
- C++ code execution engine  
- AI judge service for explanation and template katas

See the [implementation plan](.kiro/specs/code-kata-electron-app/tasks.md) for detailed progress tracking.

## Project Structure

```
├── electron/           # Electron main process files
│   ├── main.ts        # Main process entry point with IPC handlers
│   └── preload.ts     # Preload script for secure IPC communication
├── src/               # React renderer process files
│   ├── components/    # React UI components
│   │   ├── CodeEditorPanel.tsx    # Monaco editor integration
│   │   ├── StatementPanel.tsx     # Kata problem statement display
│   │   ├── ResultsPanel.tsx       # Test results and feedback display
│   │   ├── KataSelector.tsx       # Kata selection and filtering
│   │   └── __tests__/             # Component unit tests
│   ├── services/      # Service layer for business logic
│   │   ├── database.ts        # SQLite database service with schema management
│   │   ├── progress.ts        # Progress tracking and attempt management
│   │   ├── code-execution.ts  # Code execution engine (Python implemented)
│   │   ├── kata-manager.ts    # File system kata management
│   │   └── __tests__/         # Comprehensive unit tests for services
│   ├── types/         # TypeScript type definitions and validation
│   ├── App.tsx        # Main App component with kata selection
│   ├── App.css        # App-specific styles
│   ├── main.tsx       # React entry point
│   └── index.css      # Global styles
├── public/            # Static assets (favicon, etc.)
├── katas/             # Kata files directory
├── test-data/         # Test database files (generated during testing)
├── dist/              # Built renderer files (generated)
├── dist-electron/     # Built Electron files (generated)
└── release/           # Packaged applications (generated)
```

## Kata Directory Structure

Katas should be organized in the `/katas/` directory with the following structure:

```
katas/
├── kata-name/
│   ├── meta.yaml      # Kata metadata
│   ├── statement.md   # Problem description
│   ├── entry.py       # Starter code
│   ├── tests.py       # Test cases
│   └── hidden_tests.py # Hidden test cases (optional)
```

For detailed instructions on creating new katas, see the [Kata Authoring Guide](KATA_AUTHORING.md).

### Quick Start for Kata Authors

1. **Use Template**: Copy from `kata-templates/` directory for your kata type
2. **Create Directory**: `cp -r kata-templates/code-kata-python katas/your-kata-name`
3. **Update Metadata**: Edit `meta.yaml` with your kata details
4. **Write Statement**: Update `statement.md` with problem description
5. **Add Code**: Update starter code and test files
6. **Test Locally**: Run the app and verify your kata works correctly

**Available Templates**:
- `kata-templates/code-kata-python/` - Python programming challenges
- `kata-templates/explanation-kata/` - Technical explanation challenges
- `kata-templates/template-kata/` - Project template creation challenges

See the `two-sum-example` kata for a complete reference implementation.

## Technology Stack

- **Electron** v28+ - Desktop app framework for cross-platform compatibility
- **Vite** v5+ - Build tool and development server with fast HMR
- **React** v18+ - UI framework with hooks and modern patterns
- **TypeScript** - Type-safe JavaScript with strict configuration
- **Monaco Editor** v0.44+ - VS Code editor component for code editing (to be integrated)
- **SQLite** - Local database for progress tracking via better-sqlite3
- **Node.js** v18+ - Required for development and JS/TS kata execution

## Building and Distribution

The application is configured for cross-platform distribution with electron-builder. See [BUILD.md](BUILD.md) for comprehensive build instructions.

### Quick Build Guide

1. **Install dependencies**: `npm install`
2. **Test configuration**: `npm run build:test-config`
3. **Build for development**: `npm run build:dev`
4. **Package for distribution**: `npm run dist`

### Platform Requirements

- **Windows**: Visual Studio Build Tools with C++ workload (for native dependencies)
- **macOS**: Xcode Command Line Tools
- **Linux**: Standard build tools (`build-essential` on Ubuntu)

For detailed troubleshooting and alternative approaches, see [NATIVE_DEPENDENCIES.md](NATIVE_DEPENDENCIES.md).

### Distribution Formats

- **Windows**: NSIS installer (.exe) and portable executable
- **macOS**: DMG disk image and ZIP archive (universal binaries for Intel/Apple Silicon)
- **Linux**: AppImage, DEB package, and RPM package

Built applications are output to the `release/` directory and include all necessary runtime dependencies.

## License

MIT