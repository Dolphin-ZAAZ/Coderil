// Core data models for the Code Kata App

export type Language = 'py' | 'js' | 'ts' | 'cpp'
export type KataType = 'code' | 'explain' | 'template'
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