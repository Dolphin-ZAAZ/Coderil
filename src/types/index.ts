// Core data models for the Code Kata App

export type Language = 'py' | 'js' | 'ts' | 'cpp' | 'none'
export type KataType = 'code' | 'explain' | 'template' | 'codebase' | 'shortform' | 'one-liner' | 'multi-question'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type TestKind = 'programmatic' | 'io' | 'none'

export interface Kata {
  slug: string
  title: string
  language: Language
  type: KataType
  difficulty: Difficulty
  tags: string[]
  path: string
}

export interface KataMetadata {
  slug: string
  title: string
  language: Language
  type: KataType
  difficulty: Difficulty
  tags: string[]
  entry: string
  test: TestMetadata
  timeout_ms: number
  solution?: string // Optional solution file path
}

export interface TestMetadata {
  kind: TestKind
  file: string
}

export interface KataDetails extends Kata {
  statement: string
  metadata: KataMetadata
  starterCode: string
  testConfig: TestConfig
  rubric?: Rubric
  solutionCode?: string // Optional solution code
  // Multi-question shortform configuration
  multiQuestionConfig?: MultiQuestionConfig
  // Legacy single-question configurations (for backward compatibility)
  shortformConfig?: ShortformConfig
  oneLinerConfig?: OneLinerConfig
}

export interface TestConfig {
  kind: TestKind
  publicTestFile: string
  hiddenTestFile?: string
  timeoutMs: number
}

export interface Rubric {
  keys: string[]
  threshold: {
    min_total: number
    min_correctness: number
  }
}

// Shortform kata specific types


export interface ShortformQuestion {
  id: string
  type: 'shortform' | 'one-liner' | 'explanation' | 'code'
  question: string
  // For shortform and one-liner questions
  expectedAnswer?: string
  acceptableAnswers?: string[]
  caseSensitive?: boolean
  maxLength?: number
  // For multiple choice questions
  options?: MultipleChoiceOption[]
  correctAnswers?: string[]
  allowMultiple?: boolean
  // For explanation questions
  rubric?: Rubric
  minWords?: number
  // For code questions
  language?: Language
  starterCode?: string
  testCases?: string[]
  // Common
  explanation?: string
  points?: number // Optional scoring weight
}

export interface MultiQuestionConfig {
  title?: string
  description?: string
  questions: ShortformQuestion[]
  passingScore?: number // Percentage needed to pass (default: 70)
  showProgressBar?: boolean
  allowReview?: boolean // Allow reviewing answers before final submission
}

// Legacy single-question configs (for backward compatibility)

export interface ShortformConfig {
  question: string
  expectedAnswer?: string
  acceptableAnswers?: string[]
  caseSensitive?: boolean
  maxLength?: number
  explanation?: string
}

export interface OneLinerConfig {
  question: string
  expectedAnswer?: string
  acceptableAnswers?: string[]
  caseSensitive?: boolean
  explanation?: string
}

export interface ExecutionResult {
  success: boolean
  output: string
  errors: string
  testResults: TestResult[]
  score?: number
  duration: number
}

export interface TestResult {
  name: string
  passed: boolean
  message?: string
  expected?: any
  actual?: any
}

export interface AIJudgment {
  scores: Record<string, number>
  feedback: string
  pass: boolean
  totalScore: number
}

export interface Attempt {
  id?: number
  kataId: string
  timestamp: Date
  language: Language
  status: 'passed' | 'failed' | 'timeout' | 'error'
  score: number
  durationMs: number
  code: string
}

export interface Progress {
  kataId: string
  lastCode: string
  bestScore: number
  lastStatus: string
  attemptsCount: number
  lastAttempt: Date
}

export interface KataFilters {
  difficulty?: Difficulty[]
  language?: Language[]
  tags?: string[]
  type?: KataType[]
}

export interface UserSettings {
  autoContinueEnabled: boolean
  theme: 'light' | 'dark' | 'auto'
  editorFontSize: number
  autoSaveInterval: number
  openaiApiKey?: string
}

export interface AutoContinueNotification {
  message: string
  fromKata: string
  toKata: string
  timestamp: Date
}

export interface DependencyStatus {
  name: string
  available: boolean
  version?: string
  error?: string
  installationGuide?: string
}

export interface SystemDependencies {
  python: DependencyStatus
  nodejs: DependencyStatus
  cpp: DependencyStatus
  allAvailable: boolean
}

// Validation result types
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export interface FileSystemError extends Error {
  code: string
  path?: string
}

export interface ExecutionError extends Error {
  exitCode?: number
  stderr?: string
  timeout?: boolean
}

export interface AIServiceError extends Error {
  statusCode?: number
  retryable?: boolean
}

export interface DatabaseError extends Error {
  code?: string
  constraint?: string
}

// Validation functions
export const validateLanguage = (language: string): language is Language => {
  return ['py', 'js', 'ts', 'cpp', 'none'].includes(language)
}

export const validateKataType = (type: string): type is KataType => {
  return ['code', 'explain', 'template', 'codebase', 'shortform', 'multiple-choice', 'one-liner', 'multi-question', 'comprehensive-exam'].includes(type)
}

export const validateDifficulty = (difficulty: string): difficulty is Difficulty => {
  return ['easy', 'medium', 'hard'].includes(difficulty)
}

export const validateTestKind = (kind: string): kind is TestKind => {
  return ['programmatic', 'io', 'none'].includes(kind)
}

export const validateKataMetadata = (metadata: any): ValidationResult => {
  const errors: string[] = []
  const warnings: string[] = []

  // Required fields validation
  if (!metadata.slug || typeof metadata.slug !== 'string') {
    errors.push('slug is required and must be a string')
  }

  if (!metadata.title || typeof metadata.title !== 'string') {
    errors.push('title is required and must be a string')
  }

  if (!metadata.language || !validateLanguage(metadata.language)) {
    errors.push('language is required and must be one of: py, js, ts, cpp, none')
  }

  if (!metadata.type || !validateKataType(metadata.type)) {
    errors.push('type is required and must be one of: code, explain, template, codebase, shortform, multiple-choice, one-liner, multi-question, comprehensive-exam')
  }

  if (!metadata.difficulty || !validateDifficulty(metadata.difficulty)) {
    errors.push('difficulty is required and must be one of: easy, medium, hard')
  }

  if (!metadata.entry || typeof metadata.entry !== 'string') {
    errors.push('entry is required and must be a string')
  }

  if (!metadata.test || typeof metadata.test !== 'object') {
    errors.push('test configuration is required')
  } else {
    if (!metadata.test.kind || !validateTestKind(metadata.test.kind)) {
      errors.push('test.kind is required and must be one of: programmatic, io, none')
    }
    if (typeof metadata.test.file !== 'string') {
      errors.push('test.file is required and must be a string')
    }
    // For 'none' test kind, file can be empty or 'none'
    if (metadata.test.kind !== 'none' && (!metadata.test.file || metadata.test.file.trim() === '')) {
      errors.push('test.file cannot be empty for programmatic and io test kinds')
    }
  }

  if (typeof metadata.timeout_ms !== 'number' || metadata.timeout_ms < 0) {
    errors.push('timeout_ms is required and must be a non-negative number')
  }

  // For explanation, codebase, and shortform katas, timeout_ms can be 0 since no code execution is needed
  if (!['explain', 'codebase', 'shortform', 'one-liner', 'multi-question'].includes(metadata.type) && metadata.timeout_ms === 0) {
    errors.push('timeout_ms must be greater than 0 for code and template katas')
  }

  // Optional fields validation
  if (metadata.tags && !Array.isArray(metadata.tags)) {
    errors.push('tags must be an array if provided')
  } else if (metadata.tags) {
    const invalidTags = metadata.tags.filter((tag: any) => typeof tag !== 'string')
    if (invalidTags.length > 0) {
      errors.push('all tags must be strings')
    }
  }

  // Warnings for missing optional fields
  if (!metadata.tags || metadata.tags.length === 0) {
    warnings.push('no tags specified - consider adding tags for better discoverability')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

export const validateKataStructure = (_kataPath: string, files: string[]): ValidationResult => {
  const errors: string[] = []
  const warnings: string[] = []

  // Required files
  const requiredFiles = ['meta.yaml', 'statement.md']

  for (const file of requiredFiles) {
    if (!files.includes(file)) {
      errors.push(`Missing required file: ${file}`)
    }
  }

  // Check for starter code files
  const codeExtensions = ['.py', '.js', '.ts', '.cpp', '.c', '.h']
  const hasCodeFiles = files.some(file =>
    codeExtensions.some(ext => file.endsWith(ext))
  )

  if (!hasCodeFiles) {
    warnings.push('No code files found - consider adding starter code files')
  }

  // Check for test files
  const testFiles = files.filter(file =>
    file.includes('test') || file.includes('spec')
  )

  if (testFiles.length === 0) {
    warnings.push('No test files found - consider adding test files')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

export const validateExecutionResult = (result: any): result is ExecutionResult => {
  return (
    typeof result === 'object' &&
    typeof result.success === 'boolean' &&
    typeof result.output === 'string' &&
    typeof result.errors === 'string' &&
    Array.isArray(result.testResults) &&
    typeof result.duration === 'number' &&
    (result.score === undefined || typeof result.score === 'number')
  )
}

export const validateTestResult = (result: any): result is TestResult => {
  return (
    typeof result === 'object' &&
    typeof result.name === 'string' &&
    typeof result.passed === 'boolean' &&
    (result.message === undefined || typeof result.message === 'string') &&
    (result.expected === undefined || result.expected !== null) &&
    (result.actual === undefined || result.actual !== null)
  )
}

export const validateRubric = (rubric: any): ValidationResult => {
  const errors: string[] = []

  if (!rubric || typeof rubric !== 'object') {
    errors.push('rubric must be an object')
    return { isValid: false, errors, warnings: [] }
  }

  if (!Array.isArray(rubric.keys)) {
    errors.push('rubric.keys must be an array')
  } else if (rubric.keys.length === 0) {
    errors.push('rubric.keys cannot be empty')
  } else if (!rubric.keys.every((key: any) => typeof key === 'string')) {
    errors.push('all rubric keys must be strings')
  }

  if (!rubric.threshold || typeof rubric.threshold !== 'object') {
    errors.push('rubric.threshold must be an object')
  } else {
    if (typeof rubric.threshold.min_total !== 'number' || rubric.threshold.min_total < 0) {
      errors.push('rubric.threshold.min_total must be a non-negative number')
    }
    if (typeof rubric.threshold.min_correctness !== 'number' || rubric.threshold.min_correctness < 0) {
      errors.push('rubric.threshold.min_correctness must be a non-negative number')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: []
  }
}



export const validateShortformConfig = (config: any): ValidationResult => {
  const errors: string[] = []
  const warnings: string[] = []

  if (!config || typeof config !== 'object') {
    errors.push('shortform config must be an object')
    return { isValid: false, errors, warnings }
  }

  if (!config.question || typeof config.question !== 'string') {
    errors.push('question is required and must be a string')
  }

  if (config.maxLength && (typeof config.maxLength !== 'number' || config.maxLength < 1)) {
    errors.push('maxLength must be a positive number if specified')
  }

  if (!config.expectedAnswer && !config.acceptableAnswers) {
    warnings.push('no expected answer or acceptable answers specified - consider adding for validation')
  }

  return { isValid: errors.length === 0, errors, warnings }
}

export const validateOneLinerConfig = (config: any): ValidationResult => {
  const errors: string[] = []
  const warnings: string[] = []

  if (!config || typeof config !== 'object') {
    errors.push('one-liner config must be an object')
    return { isValid: false, errors, warnings }
  }

  if (!config.question || typeof config.question !== 'string') {
    errors.push('question is required and must be a string')
  }

  if (!config.expectedAnswer && !config.acceptableAnswers) {
    warnings.push('no expected answer or acceptable answers specified - consider adding for validation')
  }

  return { isValid: errors.length === 0, errors, warnings }
}

export const validateMultiQuestionConfig = (config: any): ValidationResult => {
  const errors: string[] = []
  const warnings: string[] = []

  if (!config || typeof config !== 'object') {
    errors.push('multi-question config must be an object')
    return { isValid: false, errors, warnings }
  }

  if (!Array.isArray(config.questions) || config.questions.length === 0) {
    errors.push('questions must be a non-empty array')
    return { isValid: false, errors, warnings }
  }

  config.questions.forEach((question: any, index: number) => {
    if (!question.id || typeof question.id !== 'string') {
      errors.push(`question ${index} must have a string id`)
    }

    if (!question.type || !['shortform', 'multiple-choice', 'one-liner', 'explanation', 'code'].includes(question.type)) {
      errors.push(`question ${index} must have a valid type (shortform, multiple-choice, one-liner, explanation, code)`)
    }

    if (!question.question || typeof question.question !== 'string') {
      errors.push(`question ${index} must have a string question`)
    }

    if (question.type === 'multiple-choice') {
      if (!Array.isArray(question.options) || question.options.length < 2) {
        errors.push(`question ${index} (multiple-choice) must have at least 2 options`)
      }
      if (!Array.isArray(question.correctAnswers) || question.correctAnswers.length === 0) {
        errors.push(`question ${index} (multiple-choice) must have correctAnswers`)
      }
    } else if (question.type === 'explanation') {
      if (question.minWords && (typeof question.minWords !== 'number' || question.minWords < 1)) {
        errors.push(`question ${index} (explanation) minWords must be a positive number if specified`)
      }
    } else if (question.type === 'code') {
      if (!question.language || !validateLanguage(question.language)) {
        errors.push(`question ${index} (code) must have a valid language`)
      }
    } else if (['shortform', 'one-liner'].includes(question.type)) {
      if (!question.expectedAnswer && !question.acceptableAnswers) {
        warnings.push(`question ${index} has no expected answer or acceptable answers`)
      }
    }

    if (question.points && (typeof question.points !== 'number' || question.points <= 0)) {
      errors.push(`question ${index} points must be a positive number if specified`)
    }
  })

  if (config.passingScore && (typeof config.passingScore !== 'number' || config.passingScore < 0 || config.passingScore > 100)) {
    errors.push('passingScore must be a number between 0 and 100')
  }

  return { isValid: errors.length === 0, errors, warnings }
}

// Component prop interfaces
export interface AppShellProps {
  katas: Kata[]
  selectedKata: Kata | null
  onKataSelect: (kata: Kata) => void
}

export interface KataSelectorProps {
  katas: Kata[]
  filters: KataFilters
  onFilterChange: (filters: KataFilters) => void
  onKataSelect: (kata: Kata) => void
}

export interface StatementPanelProps {
  statement: string
  metadata: KataMetadata
  solutionCode?: string
  onShowSolution?: () => void
}

export interface CodeEditorProps {
  language: Language
  initialCode: string
  onChange: (code: string) => void
  onRun: () => void
  onSubmit: () => void
  kataId?: string
}

export interface ResultsPanelProps {
  results: ExecutionResult | null
  aiJudgment: AIJudgment | null
  isLoading: boolean
  onReset?: () => void
}

export interface ScoringConfig {
  publicWeight: number
  hiddenWeight: number
  passingThreshold: number
}

export interface CombinedExecutionResult extends ExecutionResult {
  publicResults?: ExecutionResult
  hiddenResults?: ExecutionResult
  finalScore: number
  passed: boolean
}

// Enhanced error handling types
export interface AppError {
  type: ErrorType
  message: string
  details?: string
  timestamp: Date
  recoverable: boolean
  context?: Record<string, any>
  stack?: string
}

export type ErrorType =
  | 'FILE_SYSTEM_ERROR'
  | 'EXECUTION_ERROR'
  | 'AI_SERVICE_ERROR'
  | 'DATABASE_ERROR'
  | 'NETWORK_ERROR'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN_ERROR'

export interface ErrorNotification {
  id: string
  error: AppError
  dismissed: boolean
  actions?: ErrorAction[]
}

export interface ErrorAction {
  label: string
  action: () => void
  primary?: boolean
}

export interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: any
}

export interface ErrorRecoveryOptions {
  retry?: () => Promise<void>
  fallback?: () => void
  ignore?: () => void
}