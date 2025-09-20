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

### Code Quality
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run type-check` - Run TypeScript type checking

### Testing
- `npm run test` - Run unit tests once
- `npm run test:watch` - Run tests in watch mode for development

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

🚧 **In Progress**:
- File system kata management
- Monaco Editor integration
- Code execution engines (Python, JS/TS, C++)
- AI judge service for explanation and template katas

See the [implementation plan](.kiro/specs/code-kata-electron-app/tasks.md) for detailed progress tracking.

## Project Structure

```
├── electron/           # Electron main process files
│   ├── main.ts        # Main process entry point with IPC handlers
│   └── preload.ts     # Preload script for secure IPC communication
├── src/               # React renderer process files
│   ├── components/    # Reusable React components (to be added)
│   ├── services/      # Service layer for business logic
│   │   ├── database.ts    # SQLite database service with schema management
│   │   ├── progress.ts    # Progress tracking and attempt management
│   │   ├── index.ts       # Service exports
│   │   └── __tests__/     # Comprehensive unit tests for services
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

## Technology Stack

- **Electron** v28+ - Desktop app framework for cross-platform compatibility
- **Vite** v5+ - Build tool and development server with fast HMR
- **React** v18+ - UI framework with hooks and modern patterns
- **TypeScript** - Type-safe JavaScript with strict configuration
- **Monaco Editor** v0.44+ - VS Code editor component for code editing (to be integrated)
- **SQLite** - Local database for progress tracking via better-sqlite3
- **Node.js** v18+ - Required for development and JS/TS kata execution

## License

MIT