import { Language, Difficulty, KataType, KataMetadata, Rubric, MultiQuestionConfig } from './index';

export interface KataGenerationRequest {
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

export interface GeneratedKataContent {
  metadata: Partial<KataMetadata>;
  statement: string;
  starterCode?: string;
  testCode?: string;
  hiddenTestCode?: string;
  solutionCode?: string;
  rubric?: Rubric;
  solutionFiles?: Record<string, string>;
  multiQuestionConfig?: MultiQuestionConfig;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings?: ValidationWarning[];
  suggestions?: string[];
}

export interface ValidationError {
  type: 'syntax' | 'logic' | 'structure' | 'metadata';
  message: string;
  file?: string;
  line?: number;
}

export interface ValidationWarning {
  type: 'style' | 'performance' | 'clarity';
  message: string;
  file?: string;
  suggestion?: string;
}

export interface AIAuthoringService {
    generateKata(request: KataGenerationRequest): Promise<GeneratedKataContent>;
    generateVariation(sourceKata: any, options: any): Promise<GeneratedKataContent>;
    validateGeneration(content: GeneratedKataContent): Promise<ValidationResult>;
}