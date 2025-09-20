# Design Document

## Overview

The Code Kata Electron App is a desktop application built with Electron, Vite, React, TypeScript, and Monaco Editor. It provides a comprehensive environment for practicing coding challenges with support for multiple programming languages and AI-powered explanation judging. The application follows a three-panel layout with local execution capabilities and persistent progress tracking.

## Architecture

### High-Level Architecture

```mermaid
graph TB
    UI[React UI Layer]
    Main[Electron Main Process]
    Renderer[Electron Renderer Process]
    
    UI --> Renderer
    Renderer <--> Main
    
    Main --> FS[File System]
    Main --> DB[(SQLite Database)]
    Main --> Exec[Code Execution Engine]
    Main --> AI[AI Judge Service]
    
    FS --> Katas[/katas/ Directory]
    Exec --> Python[Python Runner]
    Exec --> JS[JS/TS Runner]
    Exec --> CPP[C++ Runner]
```

### Process Architecture

- **Main Process**: Handles file system operations, database management, code execution, and AI communication
- **Renderer Process**: Manages the React UI, Monaco Editor, and user interactions
- **IPC Communication**: Secure communication between main and renderer processes using Electron's IPC

## Components and Interfaces

### Frontend Components

#### 1. App Shell
```typescript
interface AppShellProps {
  katas: Kata[];
  selectedKata: Kata | null;
  onKataSelect: (kata: Kata) => void;
}
```

#### 2. Kata Selector
```typescript
interface KataSelectorProps {
  katas: Kata[];
  filters: KataFilters;
  onFilterChange: (filters: KataFilters) => void;
  onKataSelect: (kata: Kata) => void;
}

interface KataFilters {
  difficulty?: Difficulty[];
  language?: Language[];
  tags?: string[];
  type?: KataType[];
}
```

#### 3. Statement Panel
```typescript
interface StatementPanelProps {
  statement: string;
  metadata: KataMetadata;
}
```

#### 4. Code Editor Panel
```typescript
interface CodeEditorProps {
  language: Language;
  initialCode: string;
  onChange: (code: string) => void;
  onRun: () => void;
  onSubmit: () => void;
}
```

#### 5. Results Panel
```typescript
interface ResultsPanelProps {
  results: TestResults | null;
  aiJudgment: AIJudgment | null;
  isLoading: boolean;
}
```

### Backend Services

#### 1. Kata Manager Service
```typescript
interface KataManagerService {
  loadKatas(): Promise<Kata[]>;
  loadKata(slug: string): Promise<KataDetails>;
  importKata(zipPath: string): Promise<void>;
  exportKata(slug: string): Promise<string>;
  validateKataStructure(path: string): ValidationResult;
}
```

#### 2. Code Execution Service
```typescript
interface CodeExecutionService {
  executePython(code: string, testFile: string, hidden: boolean): Promise<ExecutionResult>;
  executeJavaScript(code: string, testFile: string, hidden: boolean): Promise<ExecutionResult>;
  executeTypeScript(code: string, testFile: string, hidden: boolean): Promise<ExecutionResult>;
  executeCpp(code: string, testFile: string, hidden: boolean): Promise<ExecutionResult>;
}
```

#### 3. AI Judge Service
```typescript
interface AIJudgeService {
  judgeExplanation(explanation: string, rubric: Rubric): Promise<AIJudgment>;
  judgeTemplate(templateContent: string, rubric: Rubric, expectedStructure: any): Promise<AIJudgment>;
  validateResponse(response: string): AIJudgment | null;
}
```

#### 4. Progress Service
```typescript
interface ProgressService {
  saveAttempt(attempt: Attempt): Promise<void>;
  getProgress(kataId: string): Promise<Progress>;
  updateProgress(kataId: string, progress: Partial<Progress>): Promise<void>;
  getAttemptHistory(kataId: string): Promise<Attempt[]>;
}
```

#### 5. Autosave Service
```typescript
interface AutosaveService {
  saveCode(kataId: string, code: string): void;
  loadCode(kataId: string): string | null;
  clearCode(kataId: string): void;
}
```

#### 6. Auto-Continue Service
```typescript
interface AutoContinueService {
  isEnabled(): boolean;
  setEnabled(enabled: boolean): void;
  getRandomKata(currentKata: Kata, availableKatas: Kata[], filters: KataFilters): Kata | null;
  shouldTrigger(executionResult: ExecutionResult | AIJudgment): boolean;
}
```

## Data Models

### Core Models

```typescript
interface Kata {
  slug: string;
  title: string;
  language: Language;
  type: KataType;
  difficulty: Difficulty;
  tags: string[];
  path: string;
}

interface KataDetails extends Kata {
  statement: string;
  metadata: KataMetadata;
  starterCode: string;
  testConfig: TestConfig;
  rubric?: Rubric;
}

interface KataMetadata {
  slug: string;
  title: string;
  language: Language;
  type: KataType;
  difficulty: Difficulty;
  tags: string[];
  entry: string;
  test: TestMetadata;
  timeout_ms: number;
}

interface TestMetadata {
  kind: 'programmatic' | 'io' | 'none';
  file: string;
}

interface TestConfig {
  kind: TestKind;
  publicTestFile: string;
  hiddenTestFile?: string;
  timeoutMs: number;
}

interface Rubric {
  keys: string[];
  threshold: {
    min_total: number;
    min_correctness: number;
  };
}

interface ExecutionResult {
  success: boolean;
  output: string;
  errors: string;
  testResults: TestResult[];
  score?: number;
  duration: number;
}

interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
  expected?: any;
  actual?: any;
}

interface AIJudgment {
  scores: Record<string, number>;
  feedback: string;
  pass: boolean;
  totalScore: number;
}

interface Attempt {
  id?: number;
  kataId: string;
  timestamp: Date;
  language: Language;
  status: 'passed' | 'failed' | 'timeout' | 'error';
  score: number;
  durationMs: number;
  code: string;
}

interface Progress {
  kataId: string;
  lastCode: string;
  bestScore: number;
  lastStatus: string;
  attemptsCount: number;
  lastAttempt: Date;
}

interface UserSettings {
  autoContinueEnabled: boolean;
  theme: 'light' | 'dark' | 'auto';
  editorFontSize: number;
  autoSaveInterval: number;
}

interface AutoContinueNotification {
  message: string;
  fromKata: string;
  toKata: string;
  timestamp: Date;
}

type Language = 'py' | 'js' | 'ts' | 'cpp';
type KataType = 'code' | 'explain' | 'template';
type Difficulty = 'easy' | 'medium' | 'hard';
```

### Database Schema

```sql
-- SQLite schema
CREATE TABLE attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kata_id TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  language TEXT NOT NULL,
  status TEXT NOT NULL,
  score REAL NOT NULL,
  duration_ms INTEGER NOT NULL,
  code TEXT NOT NULL
);

CREATE TABLE progress (
  kata_id TEXT PRIMARY KEY,
  last_code TEXT,
  best_score REAL DEFAULT 0,
  last_status TEXT,
  attempts_count INTEGER DEFAULT 0,
  last_attempt DATETIME
);

CREATE TABLE user_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT OR IGNORE INTO user_settings (key, value) VALUES 
  ('auto_continue_enabled', 'false'),
  ('theme', 'auto'),
  ('editor_font_size', '14'),
  ('auto_save_interval', '1000');

CREATE INDEX idx_attempts_kata_id ON attempts(kata_id);
CREATE INDEX idx_attempts_timestamp ON attempts(timestamp);
```

## Error Handling

### Error Categories

1. **File System Errors**
   - Missing kata directories
   - Invalid kata structure
   - Permission issues

2. **Execution Errors**
   - Runtime compilation failures
   - Timeout errors
   - Missing dependencies

3. **AI Service Errors**
   - Network connectivity issues
   - Invalid API responses
   - Rate limiting

4. **Database Errors**
   - SQLite connection failures
   - Schema migration issues
   - Disk space problems

### Error Handling Strategy

```typescript
interface ErrorHandler {
  handleFileSystemError(error: FileSystemError): void;
  handleExecutionError(error: ExecutionError): void;
  handleAIServiceError(error: AIServiceError): void;
  handleDatabaseError(error: DatabaseError): void;
}

class GlobalErrorHandler implements ErrorHandler {
  // Centralized error handling with user-friendly messages
  // Logging to file for debugging
  // Graceful degradation where possible
}
```

## Testing Strategy

### Unit Testing
- **Frontend Components**: React Testing Library + Jest
- **Backend Services**: Jest with mocked dependencies
- **Data Models**: Property-based testing for validation logic
- **Utilities**: Comprehensive unit tests for file operations and parsing

### Integration Testing
- **IPC Communication**: Test main-renderer process communication
- **Code Execution**: Test each language runner with sample katas
- **Database Operations**: Test SQLite operations with temporary databases
- **File System Operations**: Test kata loading and validation

### End-to-End Testing
- **Complete Kata Workflow**: Load kata → Edit code → Run tests → Submit → View results
- **AI Judge Integration**: Test explanation kata submission and scoring
- **Progress Persistence**: Test autosave and progress tracking across app restarts
- **Import/Export**: Test kata sharing functionality

### Performance Testing
- **Code Execution Timeouts**: Verify timeout enforcement across languages
- **Large Kata Collections**: Test performance with hundreds of katas
- **Memory Usage**: Monitor memory consumption during long editing sessions

### Security Testing
- **Code Execution Sandboxing**: Ensure user code cannot access system resources
- **File System Access**: Verify restricted access to kata directories only
- **AI API Security**: Test API key handling and request validation

## Implementation Notes

### Technology Stack
- **Electron**: v28+ for desktop app framework
- **Vite**: v5+ for fast development and building
- **React**: v18+ with TypeScript for UI
- **Monaco Editor**: v0.44+ for code editing
- **SQLite**: via better-sqlite3 for local persistence
- **Node.js**: Child process execution for code runners

### Development Considerations
- **Hot Reload**: Vite integration for fast development cycles
- **TypeScript**: Strict mode enabled for type safety
- **ESLint/Prettier**: Code quality and formatting
- **Electron Builder**: Cross-platform packaging and distribution

### Runtime Dependencies
- **Python**: 3.8+ required for Python kata execution
- **Node.js**: 18+ required for JS/TS kata execution  
- **C++ Compiler**: GCC/Clang with C++20 support for C++ katas
- **AI Model**: OpenAI API or compatible endpoint for explanation judging