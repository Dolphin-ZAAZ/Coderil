---
inclusion: always
---

# Project Structure & Architecture Guidelines

## Directory Organization

```
├── electron/           # Electron main process files
│   ├── main.ts        # Main process with IPC handlers
│   └── preload.ts     # Secure IPC bridge
├── src/               # React renderer process
│   ├── components/    # UI components with co-located CSS/tests
│   ├── services/      # Business logic (database, kata-manager, ai-judge, etc.)
│   ├── hooks/         # Custom React hooks (useElectronAPI, useDependencyChecker)
│   ├── types/         # Centralized TypeScript definitions
│   ├── App.tsx        # Main application component
│   └── main.tsx       # React entry point
├── katas/             # Individual kata challenges
├── kata-templates/    # Templates for new kata creation
├── scripts/           # Build and utility scripts
└── .kiro/             # Kiro IDE configuration
```

## Established Patterns

### Type System
- **Centralized in `src/types/index.ts`**: Core types like `Kata`, `KataMetadata`, `Language`, `KataType`
- **Language support**: `'py' | 'js' | 'ts' | 'cpp'`
- **Kata types**: `'code' | 'explain' | 'template' | 'codebase'`
- **Test kinds**: `'programmatic' | 'io' | 'none'`

### Component Architecture
- **Barrel exports**: Components exported through `src/components/index.ts`
- **Co-located CSS**: Each component has matching `.css` file
- **Test structure**: `__tests__/` subdirectories with `.test.tsx` files
- **Existing components**: StatementPanel, CodeEditorPanel, ResultsPanel, KataSelector, ProgressDisplay, ResizablePanel, ImportExportPanel, DependencyWarning, AutoContinueNotification

### Service Layer
- **Core services**: DatabaseService, ProgressService, KataManagerService, AIJudgeService
- **Specialized services**: code-execution, dependency-checker, auto-continue, error-handler, scoring
- **Barrel exports**: Services exported through `src/services/index.ts`

### Hook Patterns
- **Custom hooks**: useMediaQuery, useElectronAPI, useDependencyChecker, useErrorHandler
- **Barrel exports**: Hooks exported through `src/hooks/index.ts`

## File Naming Conventions

- **Components**: `ComponentName.tsx` + `ComponentName.css`
- **Services**: `kebab-case.ts` (e.g., `kata-manager.ts`, `code-execution.ts`)
- **Hooks**: `useHookName.ts`
- **Tests**: `ComponentName.test.tsx` or `service-name.test.ts` in `__tests__/`

## Kata Structure Patterns

### Code Katas (JavaScript/TypeScript/Python/C++)
```
katas/kata-name/
├── meta.yaml          # Required: slug, title, language, type, difficulty
├── statement.md       # Problem description
├── entry.{ext}        # Starter code
├── tests.{ext}        # Public test cases
├── hidden_tests.{ext} # Additional validation (optional)
├── solution.{ext}     # Reference solution (optional)
└── package.json       # For JS/TS katas with dependencies
```

### Explanation Katas
```
katas/kata-name/
├── meta.yaml          # type: "explain"
├── statement.md       # Explanation prompt
├── explanation.md     # Template file
├── solution.md        # Reference explanation
└── rubric.yaml        # AI judging criteria (optional)
```

### Template Katas
```
katas/kata-name/
├── meta.yaml          # type: "template"
├── statement.md       # Template requirements
├── rubric.yaml        # Validation criteria
├── solution.{ext}     # Reference implementation
└── template/          # Directory structure template
```

### Codebase Katas
```
katas/kata-name/
├── meta.yaml          # type: "codebase"
├── statement.md       # Analysis prompt
├── entry.py           # Codebase to analyze
├── rubric.yaml        # Analysis criteria
└── solution_analysis.md # Reference analysis
```

## Import Organization

```typescript
// 1. External dependencies
import React from 'react'
import { Monaco } from '@monaco-editor/react'

// 2. Internal with @/ alias
import { Kata, KataType } from '@/types'
import { KataManagerService } from '@/services'

// 3. Relative imports
import './Component.css'
```

## Error Handling Standards

- **ErrorBoundary component**: Wraps components that might fail
- **ErrorNotification component**: User-facing error display
- **useErrorHandler hook**: Centralized error management
- **error-handler service**: Structured error processing
- **Structured errors**: Custom error types in types file

## Testing Architecture

- **Co-located tests**: `__tests__/` directories next to implementation
- **Service testing**: Mock external dependencies and IPC calls
- **Component testing**: Test user interactions and state changes
- **Integration testing**: Test service interactions with real data
- **Test setup**: Centralized in `src/test-setup.ts`