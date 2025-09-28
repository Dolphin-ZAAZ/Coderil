// Core data models for the Code Kata App

export type Language = 'py' | 'js' | 'ts' | 'cpp' | 'none'
export type KataType = 'code' | 'explain' | 'template' | 'codebase' | 'shortform' | 'multiple-choice' | 'one-liner'
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
  // Shortform kata configurations
  multipleChoiceConfig?: MultipleChoiceConfig
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
export interface MultipleChoiceOption {
  id: string
  text: string
  correct?: boolean
}

export interface MultipleChoiceConfig {
  question: string
  options: MultipleChoiceOption[]
  correctAnswers: string[] // IDs of correct options
  allowMultiple?: boolean
  explanation?: string
}

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
  return ['code', 'explain', 'template', 'codebase', 'shortform', 'multiple-choice', 'one-liner'].includes(type)
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
    errors.push('type is required and must be one of: code, explain, template, codebase, shortform, multiple-choice, one-liner')
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
  if (!['explain', 'codebase', 'shortform', 'multiple-choice', 'one-liner'].includes(metadata.type) && metadata.timeout_ms === 0) {
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

export const validateMultipleChoiceConfig = (config: any): ValidationResult => {
  const errors: string[] = []
  const warnings: string[] = []

  if (!config || typeof config !== 'object') {
    errors.push('multiple choice config must be an object')
    return { isValid: false, errors, warnings }
  }

  if (!config.question || typeof config.question !== 'string') {
    errors.push('question is required and must be a string')
  }

  if (!Array.isArray(config.options) || config.options.length < 2) {
    errors.push('options must be an array with at least 2 items')
  } else {
    config.options.forEach((option: any, index: number) => {
      if (!option.id || typeof option.id !== 'string') {
        errors.push(`option ${index} must have a string id`)
      }
      if (!option.text || typeof option.text !== 'string') {
        errors.push(`option ${index} must have a string text`)
      }
    })
  }

  if (!Array.isArray(config.correctAnswers) || config.correctAnswers.length === 0) {
    errors.push('correctAnswers must be a non-empty array')
  }

  return { isValid: errors.length === 0, errors, warnings }
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