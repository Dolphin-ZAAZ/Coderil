---
inclusion: always
---

# Technology Stack & Development Guidelines

## Core Technologies

### Application Framework
- **Electron 28+** - Cross-platform desktop app framework with native OS integration
- **Vite 5+** - Modern build tool with fast HMR and optimized production builds
- **React 18** - UI framework with concurrent features, hooks, and modern patterns
- **TypeScript 5.2+** - Type-safe JavaScript with strict configuration and ES2020 target

### Code Editing & Execution
- **Monaco Editor 0.53+** - VS Code editor component with full language support
- **Node.js Child Processes** - Isolated code execution with timeout controls
- **Language Runtimes** - Python 3.8+, Node.js 18+, TypeScript compiler, C++ (GCC/Clang)

### Data & AI Services
- **sql.js 1.13+** - WebAssembly SQLite for cross-platform local database
- **OpenAI API** - GPT-4 integration for explanation and template judging
- **js-yaml** - YAML parsing for kata metadata
- **marked** - Markdown rendering for statements and documentation

### UI & Styling
- **CSS Modules** - Component-scoped styling with build-time optimization
- **Highlight.js** - Syntax highlighting for code blocks in markdown
- **Responsive Design** - Adaptive layouts for desktop, tablet, and mobile

## Development Commands

### Primary Development Workflow
```bash
npm run dev              # Start Vite dev server + Electron with hot reload
npm run build:dev        # Build for development (no packaging)
npm run build            # Full production build and packaging
npm run build:platform   # Platform-specific build (Windows/macOS/Linux)
```

### Code Quality & Testing
```bash
npm run lint             # ESLint with TypeScript and React rules
npm run lint:fix         # Auto-fix ESLint issues
npm run type-check       # TypeScript compilation check without emit
npm test                 # Run Vitest test suite
npm run test:watch       # Watch mode for continuous testing
```

### Kata Management
```bash
npm run new-kata         # Interactive kata creation script
```

### Build Variants
```bash
npm run dist:win         # Windows installer (NSIS + portable)
npm run dist:mac         # macOS DMG + ZIP (x64 + ARM64)
npm run dist:linux       # Linux AppImage + DEB + RPM
npm run dist:all         # All platforms (requires appropriate build environment)
```

## Architecture Patterns

### Import Conventions
```typescript
// 1. External dependencies
import React from 'react'
import { Monaco } from '@monaco-editor/react'

// 2. Internal with @/ alias (configured in Vite + TypeScript)
import { Kata, KataType } from '@/types'
import { KataManagerService } from '@/services'
import { useElectronAPI } from '@/hooks'

// 3. Relative imports for co-located files
import './Component.css'
```

### TypeScript Configuration
- **Strict Mode**: Full type checking with `noImplicitAny`, `strictNullChecks`
- **ES2020 Target**: Modern JavaScript features with broad compatibility
- **Path Mapping**: `@/*` resolves to `src/*` for clean imports
- **Type Validation**: Runtime validation functions for external data
- **Error Handling**: Typed error interfaces with context information

### React Component Patterns
```typescript
// Functional components with TypeScript interfaces
interface ComponentProps {
  kata: Kata
  onSelect: (kata: Kata) => void
}

export function KataComponent({ kata, onSelect }: ComponentProps) {
  // Hooks-based state management
  const [isLoading, setIsLoading] = useState(false)
  
  // Custom hooks for cross-cutting concerns
  const { executeCode } = useElectronAPI()
  const { dependencies } = useDependencyChecker()
  
  // Event handlers with proper typing
  const handleSubmit = useCallback(async () => {
    // Implementation
  }, [kata])
  
  return (
    <div className="kata-component">
      {/* JSX with proper event handling */}
    </div>
  )
}
```

### Service Layer Architecture
```typescript
// Singleton pattern for stateful services
export class ServiceName {
  private static instance: ServiceName
  
  static getInstance(): ServiceName {
    if (!ServiceName.instance) {
      ServiceName.instance = new ServiceName()
    }
    return ServiceName.instance
  }
  
  // Async methods with proper error handling
  async performOperation(): Promise<Result> {
    try {
      // Implementation with error context
    } catch (error) {
      errorHandler.handleServiceError(error, { context })
      throw error
    }
  }
}
```

### IPC Communication Patterns
```typescript
// Main process handlers (electron/main.ts)
ipcMain.handle('operation-name', async (_event, param: Type) => {
  try {
    const result = await service.performOperation(param)
    return result
  } catch (error) {
    console.error('Operation failed:', error)
    throw error
  }
})

// Renderer process usage (via preload bridge)
const result = await window.electronAPI.operationName(param)
```

## Database Architecture

### SQLite with sql.js
- **Cross-Platform**: WebAssembly SQLite works on all platforms without native compilation
- **Local Storage**: Database file in user data directory (`~/.config/Code Kata App/`)
- **Schema Management**: Automatic migrations and initialization
- **Performance**: Optimized queries with proper indexing

### Database Schema
```sql
-- Attempt tracking with full history
CREATE TABLE attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kata_id TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  language TEXT NOT NULL,
  status TEXT CHECK (status IN ('passed', 'failed', 'timeout', 'error')),
  score REAL DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  code TEXT NOT NULL
);

-- Progress summary per kata
CREATE TABLE progress (
  kata_id TEXT PRIMARY KEY,
  last_code TEXT,
  best_score REAL DEFAULT 0,
  last_status TEXT,
  attempts_count INTEGER DEFAULT 0,
  last_attempt DATETIME
);

-- User preferences and settings
CREATE TABLE user_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Build Configuration

### Vite Configuration
```typescript
// vite.config.ts highlights
export default defineConfig({
  plugins: [
    react(),
    electron([/* main + preload processes */])
  ],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') }
  },
  build: {
    rollupOptions: {
      external: ['sqlite3', 'better-sqlite3', 'sql.js'] // Prevent bundling
    }
  }
})
```

### Electron Builder
- **Windows**: NSIS installer + portable executable
- **macOS**: DMG + ZIP with universal binaries (x64 + ARM64)
- **Linux**: AppImage + DEB + RPM packages
- **Code Signing**: Configured for macOS (requires certificates)
- **Auto-updater**: Ready for implementation with electron-updater

### External Dependencies
```json
// Externalized in build to prevent bundling issues
"rollupOptions": {
  "external": ["sqlite3", "better-sqlite3", "sql.js"]
}
```

## Runtime Requirements

### Development Environment
- **Node.js 18+** - Required for development and JavaScript/TypeScript execution
- **Python 3.8+** - For Python kata execution and testing
- **C++ Compiler** - GCC/Clang with C++20 support for C++ katas
- **TypeScript** - Global installation recommended: `npm install -g typescript`

### Production Dependencies
- **Electron Runtime** - Bundled with application
- **Language Runtimes** - User must install Python, Node.js, C++ compiler
- **System Libraries** - Platform-specific requirements handled by Electron

### Optional Dependencies
- **OpenAI API Key** - Required for AI judging features (explanation/template katas)
- **Internet Connection** - Only needed for AI judging, all other features work offline

## Performance Considerations

### Code Execution
- **Process Isolation** - Each execution in separate child process
- **Timeout Controls** - Configurable timeouts prevent hanging
- **Memory Management** - Proper cleanup of processes and file handles
- **Caching** - Kata metadata and code cached for fast switching

### UI Responsiveness
- **Async Operations** - All heavy operations use async/await patterns
- **Loading States** - Clear feedback during long operations
- **Error Boundaries** - Prevent crashes from propagating
- **Lazy Loading** - Components and services loaded on demand

### Database Performance
- **Indexing** - Proper indexes on frequently queried columns
- **Batch Operations** - Efficient bulk inserts and updates
- **Connection Management** - Singleton pattern with proper cleanup
- **Query Optimization** - Prepared statements and efficient queries

## Security & Safety

### Code Execution Safety
- **Process Sandboxing** - User code runs in isolated child processes
- **Timeout Protection** - Prevents infinite loops and resource exhaustion
- **File System Isolation** - Code execution limited to kata directories
- **Input Sanitization** - All user input validated before execution

### Data Security
- **Local Storage** - All data stored locally, no cloud dependencies
- **API Key Management** - OpenAI keys stored securely in environment variables
- **Input Validation** - Comprehensive validation of all external data
- **Error Handling** - No sensitive information leaked in error messages