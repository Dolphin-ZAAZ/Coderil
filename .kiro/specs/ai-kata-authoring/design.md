# Design Document

## Overview

The AI Kata Authoring system is an integrated feature within the Code Kata Electron App that leverages OpenAI's API to automatically generate complete kata structures from natural language descriptions. The system provides a user-friendly interface for describing desired challenges and generates all necessary files including problem statements, starter code, test cases, solutions, and metadata.

## Architecture

### High-Level Architecture

```mermaid
graph TB
    UI[AI Authoring UI]
    AuthService[AI Authoring Service]
    OpenAI[OpenAI API]
    FileGen[File Generator]
    Preview[Preview System]
    
    UI --> AuthService
    AuthService --> OpenAI
    AuthService --> FileGen
    FileGen --> Preview
    Preview --> UI
    
    AuthService --> PromptEngine[Prompt Engineering]
    AuthService --> ResponseParser[Response Parser]
    AuthService --> ValidationEngine[Content Validator]
    
    FileGen --> KataFS[Kata File System]
    KataFS --> KataDir[/katas/ Directory]
```

### Component Integration

The AI Authoring system integrates with the existing Code Kata Electron App through:
- **Main Process**: AI API communication and file generation
- **Renderer Process**: Authoring UI and preview interface
- **IPC Communication**: Secure data transfer between processes
- **File System**: Integration with existing kata management
- **Settings System**: API key management and configuration through SettingsPanel
- **Error Handling**: Integration with ErrorBoundary and error notification system
- **Auto-Continue**: Generated katas work with AutoContinueService for seamless progression
- **Multi-Question System**: Support for existing MultiQuestionPanel and ShortformAnswerPanel components
- **Evaluation System**: Integration with ShortformEvaluatorService for assessment katas

## Components and Interfaces

### Frontend Components

#### 1. AI Authoring Dialog
```typescript
interface AIAuthoringDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onKataGenerated: (kata: GeneratedKata) => void;
}

interface AIAuthoringFormData {
  description: string;
  language: Language;
  difficulty: Difficulty;
  type: KataType;
  topics?: string[];
  constraints?: string;
  tags?: string[];
  generateHiddenTests: boolean;
}
```

#### 2. Generation Preview Panel
```typescript
interface GenerationPreviewProps {
  generatedContent: GeneratedKataContent;
  onEdit: (fileType: string, content: string) => void;
  onApprove: () => void;
  onRegenerate: () => void;
  onCancel: () => void;
}

interface GeneratedKataContent {
  metadata: KataMetadata;
  statement: string;
  starterCode?: string; // Optional for non-code katas
  testCode?: string; // Optional for non-code katas
  hiddenTestCode?: string;
  solutionCode?: string; // Optional for assessment katas
  rubric?: Rubric;
  solutionFiles?: Record<string, string>; // For template katas
  multiQuestionConfig?: MultiQuestionConfig; // For multi-question katas
  shortformConfig?: ShortformConfig; // For legacy shortform katas
  multipleChoiceConfig?: MultipleChoiceConfig; // For multiple choice katas
  oneLinerConfig?: OneLinerConfig; // For one-liner katas
}
```

#### 3. Variation Generator
```typescript
interface VariationGeneratorProps {
  sourceKata: Kata;
  onVariationGenerated: (variation: GeneratedKata) => void;
}

interface VariationOptions {
  difficultyAdjustment: 'easier' | 'harder' | 'same';
  focusArea?: string;
  parameterChanges?: string;
  seriesName?: string;
}
```

#### 4. Multi-Question Assessment Generator
```typescript
interface MultiQuestionGeneratorProps {
  onAssessmentGenerated: (assessment: GeneratedKata) => void;
  initialConfig?: Partial<MultiQuestionConfig>;
}

interface AssessmentGenerationOptions {
  topicArea: string;
  questionCount: number;
  questionTypes: ('multiple-choice' | 'shortform' | 'one-liner' | 'code' | 'explanation')[];
  difficulty: Difficulty;
  passingScore: number;
}
```

#### 5. Integration Components
```typescript
interface SettingsIntegrationProps {
  aiConfig: AIGenerationConfig;
  onConfigUpdate: (config: AIGenerationConfig) => void;
}

interface ErrorHandlingIntegrationProps {
  onError: (error: AIServiceError) => void;
  onRetry: () => void;
}
```

### Backend Services

#### 1. AI Authoring Service
```typescript
interface AIAuthoringService {
  generateKata(request: KataGenerationRequest): Promise<GeneratedKataContent>;
  generateVariation(sourceKata: Kata, options: VariationOptions): Promise<GeneratedKataContent>;
  validateGeneration(content: GeneratedKataContent): Promise<ValidationResult>;
  saveGeneratedKata(content: GeneratedKataContent, slug: string): Promise<void>;
}

interface KataGenerationRequest {
  description: string;
  language: Language;
  difficulty: Difficulty;
  type: KataType;
  topics?: string[];
  constraints?: string;
  tags?: string[];
  generateHiddenTests: boolean;
  additionalRequirements?: string;
}
```

#### 2. Prompt Engineering Service
```typescript
interface PromptEngineService {
  buildCodeKataPrompt(request: KataGenerationRequest): string;
  buildExplanationKataPrompt(request: KataGenerationRequest): string;
  buildTemplateKataPrompt(request: KataGenerationRequest): string;
  buildMultiQuestionKataPrompt(request: KataGenerationRequest): string;
  buildShortformKataPrompt(request: KataGenerationRequest): string;
  buildMultipleChoiceKataPrompt(request: KataGenerationRequest): string;
  buildVariationPrompt(sourceKata: Kata, options: VariationOptions): string;
  buildSolutionPrompt(statement: string, language: Language): string;
  buildKataPrompt(request: KataGenerationRequest): string; // Dynamic routing
}
```

#### 3. Response Parser Service
```typescript
interface ResponseParserService {
  parseKataResponse(response: string, type: KataType): GeneratedKataContent;
  extractCodeBlocks(response: string): Record<string, string>;
  parseMetadata(response: string): Partial<KataMetadata>;
  validateResponseStructure(response: string, type: KataType): boolean;
}
```

#### 4. Content Validator Service
```typescript
interface ContentValidatorService {
  validateGeneratedCode(code: string, language: Language): ValidationResult;
  validateTestCases(tests: string, solution: string, language: Language): Promise<ValidationResult>;
  validateMetadata(metadata: KataMetadata): ValidationResult;
  validateRubric(rubric: Rubric, type: KataType): ValidationResult;
}
```

## Data Models

### Generation Models

```typescript
interface GeneratedKata {
  slug: string;
  content: GeneratedKataContent;
  generationMetadata: GenerationMetadata;
}

interface GenerationMetadata {
  timestamp: Date;
  model: string;
  promptVersion: string;
  originalRequest: KataGenerationRequest;
  tokensUsed: number;
  generationTime: number;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
}

interface ValidationError {
  type: 'syntax' | 'logic' | 'structure' | 'metadata';
  message: string;
  file?: string;
  line?: number;
}

interface ValidationWarning {
  type: 'style' | 'performance' | 'clarity';
  message: string;
  file?: string;
  suggestion?: string;
}

interface AIGenerationConfig {
  openaiApiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  retryAttempts: number;
  timeoutMs: number;
}

interface MultiQuestionGenerationRequest extends KataGenerationRequest {
  questionCount: number;
  questionTypes: ('multiple-choice' | 'shortform' | 'one-liner' | 'code' | 'explanation')[];
  passingScore: number;
  allowReview: boolean;
  showProgressBar: boolean;
}

interface ShortformGenerationRequest extends KataGenerationRequest {
  questionType: 'shortform' | 'multiple-choice' | 'one-liner';
  maxLength?: number;
  caseSensitive?: boolean;
  allowMultiple?: boolean; // For multiple choice
  optionCount?: number; // For multiple choice
}
```

### Prompt Templates

```typescript
interface PromptTemplate {
  system: string;
  user: string;
  examples?: PromptExample[];
}

interface PromptExample {
  input: string;
  output: string;
}

interface PromptLibrary {
  codeKata: PromptTemplate;
  explanationKata: PromptTemplate;
  templateKata: PromptTemplate;
  multiQuestionKata: PromptTemplate;
  shortformKata: PromptTemplate;
  multipleChoiceKata: PromptTemplate;
  variation: PromptTemplate;
  solution: PromptTemplate;
}
```

## Error Handling

### Error Categories

1. **API Errors**
   - Network connectivity issues
   - Authentication failures
   - Rate limiting
   - Invalid responses

2. **Generation Errors**
   - Malformed AI responses
   - Code syntax errors
   - Test case failures
   - Metadata validation errors

3. **File System Errors**
   - Permission issues
   - Disk space problems
   - Existing kata conflicts

### Error Handling Strategy

```typescript
interface AIAuthoringErrorHandler {
  handleAPIError(error: OpenAIError): Promise<void>;
  handleGenerationError(error: GenerationError): Promise<void>;
  handleValidationError(error: ValidationError): Promise<void>;
  handleFileSystemError(error: FileSystemError): Promise<void>;
}

class RetryStrategy {
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number,
    backoffMs: number
  ): Promise<T>;
}
```

## Testing Strategy

### Unit Testing
- **Prompt Engineering**: Test prompt generation for different kata types
- **Response Parsing**: Test parsing of various AI response formats
- **Content Validation**: Test validation logic for generated content
- **File Generation**: Test file creation and structure

### Integration Testing
- **OpenAI API**: Test API communication with mock responses
- **End-to-End Generation**: Test complete kata generation workflow
- **Validation Pipeline**: Test generated content validation
- **File System Integration**: Test kata saving and loading

### AI Response Testing
- **Response Formats**: Test parsing of various AI response structures
- **Edge Cases**: Test handling of incomplete or malformed responses
- **Content Quality**: Test validation of generated code and tests
- **Language Support**: Test generation for all supported languages

## Implementation Notes

### OpenAI Integration
- **API Version**: Use OpenAI API v1 with GPT-4 or GPT-3.5-turbo
- **Token Management**: Implement token counting and cost tracking
- **Rate Limiting**: Respect API rate limits with exponential backoff
- **Streaming**: Consider streaming responses for better UX

### Prompt Engineering Best Practices
- **Clear Instructions**: Provide specific, unambiguous instructions
- **Examples**: Include few-shot examples for consistent output format
- **Constraints**: Specify technical constraints and requirements
- **Output Format**: Request structured output (JSON/YAML where appropriate)

### Content Validation
- **Syntax Checking**: Validate generated code syntax for each language
- **Test Execution**: Run generated tests against solutions to verify correctness
- **Metadata Validation**: Ensure generated metadata follows schema
- **Quality Metrics**: Implement quality scoring for generated content

### User Experience
- **Progress Indicators**: Show generation progress and estimated time
- **Preview System**: Allow editing before saving generated content
- **Batch Operations**: Support generating multiple related katas
- **Templates**: Provide common kata templates for quick generation

### Integration with Existing Systems

#### Multi-Question and Shortform Support
The AI authoring system must generate katas that work seamlessly with the existing multi-question infrastructure:

- **MultiQuestionPanel Component**: Generated multi-question katas must use the existing UI component
- **ShortformAnswerPanel Component**: Generated shortform katas must work with the existing answer panel
- **ShortformEvaluatorService**: Generated assessment katas must integrate with the existing evaluation system
- **MultiQuestion Configuration**: Generated katas must use the proper `multiQuestion` metadata structure

#### Settings and Configuration Integration
- **SettingsPanel Integration**: API key management through existing settings UI
- **AIGenerationConfig**: Integration with existing user settings and preferences
- **Model Selection**: Support for existing model configuration (gpt-4.1-mini default)

#### Error Handling Integration
- **ErrorBoundary**: Generated content must work within existing error boundary system
- **Error Notification**: API failures must use existing error notification infrastructure
- **Graceful Degradation**: Failures must not crash existing application components

#### Auto-Continue Integration
- **AutoContinueService**: Generated katas must work with existing auto-continue functionality
- **Progress Tracking**: Generated katas must integrate with existing progress tracking
- **Kata Selection**: Generated katas must be available for auto-continue selection

### Security Considerations
- **API Key Management**: Secure storage and handling of OpenAI API keys through existing settings system
- **Input Sanitization**: Validate and sanitize user inputs before API calls
- **Output Validation**: Validate AI-generated content before execution
- **Sandboxing**: Execute generated code in isolated environments
- **Integration Security**: Ensure generated content doesn't break existing security measures