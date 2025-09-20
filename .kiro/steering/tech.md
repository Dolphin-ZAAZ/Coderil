# Technology Stack

## Core Technologies

- **Electron** - Desktop app framework for cross-platform compatibility
- **Vite** - Build tool and development server with fast HMR
- **React 18** - UI framework with hooks and modern patterns
- **TypeScript** - Type-safe JavaScript with strict configuration
- **Monaco Editor** - VS Code editor component for code editing
- **SQLite3** - Local database for progress tracking and settings

## Build System

### Development Commands
```bash
npm run dev              # Start Vite dev server only
npm run electron:dev     # Start both Vite and Electron in development
npm run build:dev        # Build for development (no packaging)
npm run build            # Build and package for production
```

### Code Quality
```bash
npm run lint             # Run ESLint
npm run lint:fix         # Run ESLint with auto-fix
npm run type-check       # TypeScript type checking
```

## Configuration

- **Vite config**: Uses React plugin, Electron plugins, and path aliases (`@/` for `src/`)
- **TypeScript**: Strict mode enabled with ES2020 target
- **ESLint**: TypeScript + React rules, allows `any` type, unused vars prefixed with `_`
- **Electron Builder**: Configured for Windows (NSIS), macOS, and Linux (AppImage)

## Development Server

- Vite dev server runs on port 5173
- Electron loads from dev server in development, built files in production
- Hot reload enabled for both renderer and main process

## External Dependencies

### Runtime Requirements
- Node.js v18+ for development
- Python 3.8+ for Python kata execution
- C++ compiler (GCC/Clang with C++20) for C++ kata execution

### Key Libraries
- `concurrently` + `wait-on` for coordinated dev server startup
- `sqlite3` with external rollup configuration for database operations