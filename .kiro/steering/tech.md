---
inclusion: always
---

# Technology Stack & Development Guidelines

## Core Technologies

- **Electron** - Desktop app framework for cross-platform compatibility
- **Vite** - Build tool and development server with fast HMR
- **React 18** - UI framework with hooks and modern patterns
- **TypeScript** - Type-safe JavaScript with strict configuration
- **Monaco Editor** - VS Code editor component for code editing
- **SQLite3** - Local database for progress tracking and settings

## Development Commands

NOTE: when running `npm run dev` the output will look like that app closes immediately, but this is the user closing the window. due to the limitations of the kiro IDE.

```bash
npm run dev              # Start Vite dev server AND Electron (via vite-plugin-electron)
npm run build:dev        # Build for development (no packaging)
npm run build            # Build and package for production
npm run lint             # Run ESLint
npm run lint:fix         # Run ESLint with auto-fix
npm run type-check       # TypeScript type checking
```

## Code Style & Architecture

### Import Conventions
- Use `@/` alias for src imports: `import { Kata } from '@/types'`
- External dependencies before internal modules
- Type-only imports use `import type` syntax

### TypeScript Guidelines
- Strict mode enabled with ES2020 target
- All types centralized in `src/types/index.ts`
- Runtime type validation functions required
- Unused variables prefixed with `_`

### React Patterns
- Functional components with hooks only
- Props interfaces defined in types file
- Component-level state management (no global state)
- CSS modules or component-specific stylesheets

### IPC Communication
- Use `handle/invoke` pattern for async operations
- Main process handlers in `electron/main.ts`
- Secure API bridge through preload script
- Proper error handling with try/catch

## Configuration Details

- **Vite**: React plugin, Electron plugins, path aliases (`@/` for `src/`)
- **ESLint**: TypeScript + React rules, allows `any` type
- **Electron Builder**: Windows (NSIS), macOS, Linux (AppImage)
- **Dev Server**: Port 5173, hot reload for both processes

## Runtime Requirements

- Node.js v18+ for development
- Python 3.8+ for Python kata execution
- C++ compiler (GCC/Clang with C++20) for C++ kata execution
- `sqlite3` with external rollup configuration