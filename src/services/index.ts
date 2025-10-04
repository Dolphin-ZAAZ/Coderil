// Services that can be used in renderer process (no Node.js modules)
export { ShortformEvaluatorService } from './shortform-evaluator';
export { PromptEngineService } from './prompt-engine';
export { ResponseParserService } from './response-parser';
export { ScoringService } from './scoring';
export { AutoContinueService } from './auto-continue';
export { SeriesManagerService } from './series-manager';
export { GenerationHistoryService } from './generation-history';

// Services that use Node.js modules are only available in main process via IPC
// These are commented out to prevent bundling in renderer process:
// export { DatabaseService } from './database';
// export { ProgressService } from './progress';
// export { KataManagerService } from './kata-manager';
// export { AIJudgeService } from './ai-judge';
// export { AIConfigService } from './ai-config';           // Uses DatabaseService
// export { ContentValidatorService } from './content-validator'; // Uses fs, child_process
// export { AIAuthoringService } from './ai-authoring';    // Uses AIConfigService and ContentValidatorService
// export { FileGeneratorService } from './file-generator'; // Uses fs, path, yaml
// export { errorHandler } from './error-handler';         // Can be used but imported directly