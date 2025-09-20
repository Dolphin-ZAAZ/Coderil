# Project Structure

## Directory Organization

```
├── electron/           # Electron main process files
│   ├── main.ts        # Main process entry point with IPC handlers
│   └── preload.ts     # Preload script for secure IPC communication
├── src/               # React renderer process files
│   ├── components/    # Reusable React components (to be added)
│   ├── services/      # Service layer for business logic (to be added)
│   ├── types/         # TypeScript type definitions and validation
│   ├── App.tsx        # Main App component with kata selection
│   ├── App.css        # App-specific styles
│   ├── main.tsx       # React entry point
│   └── index.css      # Global styles
├── public/            # Static assets (favicon, etc.)
├── katas/             # Kata files directory
├── dist/              # Built renderer files (generated)
├── dist-electron/     # Built Electron files (generated)
└── release/           # Packaged applications (generated)
```

## Code Organization Patterns

### Type Definitions
- All types centralized in `src/types/index.ts`
- Comprehensive validation functions for runtime type checking
- Clear separation of core models, API interfaces, and component props

### IPC Communication
- Main process handlers in `electron/main.ts` with placeholder implementations
- Preload script provides secure API bridge to renderer
- All IPC calls use `handle/invoke` pattern for async operations

### React Architecture
- Functional components with hooks
- State management at component level (no global state library yet)
- Props interfaces defined in types for all components

### File Naming Conventions
- React components: PascalCase (e.g., `App.tsx`, `KataSelector.tsx`)
- TypeScript files: camelCase (e.g., `main.ts`, `preload.ts`)
- CSS files: match component names (e.g., `App.css`)
- Configuration files: lowercase with extensions (e.g., `vite.config.ts`)

## Kata Directory Structure

Expected structure for individual katas:
```
katas/kata-name/
├── meta.yaml          # Kata metadata (required)
├── statement.md       # Problem description (required)
├── entry.py           # Starter code file
├── tests.py           # Public test cases
└── hidden_tests.py    # Hidden test cases (optional)
```

## Import Patterns

- Use `@/` alias for src imports: `import { Kata } from '@/types'`
- Relative imports for same-directory files
- External dependencies imported before internal modules
- Type-only imports use `import type` syntax when possible

## Component Structure

Components should follow this pattern:
1. Imports (external, then internal)
2. Interface definitions (if not in types file)
3. Component function with proper TypeScript typing
4. Export statement

## Error Handling

- Custom error types defined in types file
- Validation functions return structured results with errors/warnings
- IPC handlers include try/catch with proper error logging