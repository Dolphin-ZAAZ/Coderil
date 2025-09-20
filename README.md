# Code Kata Electron App

A desktop application for code katas with local execution and AI-powered judging.

## Features

- **Multi-language support**: Python, JavaScript, TypeScript, and C++
- **Local execution**: Run code challenges without internet connectivity
- **AI-powered judging**: Automated feedback for explanation and template tasks
- **Template katas**: Practice creating project structures, boilerplate code, and configuration files
- **Progress tracking**: Save attempts and track improvement over time
- **Kata management**: Import/export and organize coding challenges

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

- `npm run dev` - Start Vite development server only
- `npm run electron:dev` - Start both Vite and Electron in development mode
- `npm run build:dev` - Build the application for development
- `npm run build` - Build and package the application for production
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run type-check` - Run TypeScript type checking

## Project Structure

```
├── electron/           # Electron main process files
│   ├── main.ts        # Main process entry point
│   └── preload.ts     # Preload script for IPC
├── src/               # React renderer process files
│   ├── components/    # React components (to be added)
│   ├── services/      # Service layer (to be added)
│   ├── types/         # TypeScript type definitions
│   ├── App.tsx        # Main App component
│   └── main.tsx       # React entry point
├── public/            # Static assets
├── katas/             # Kata files directory (to be created)
└── dist/              # Built files (generated)
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

- **Electron** - Desktop app framework
- **Vite** - Build tool and development server
- **React** - UI framework
- **TypeScript** - Type-safe JavaScript
- **Monaco Editor** - Code editor (to be integrated)
- **SQLite** - Local database for progress tracking
- **sqlite3** - SQLite driver for Node.js

## License

MIT