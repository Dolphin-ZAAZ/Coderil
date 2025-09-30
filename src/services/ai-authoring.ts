import { AIAuthoringService as IAIAuthoringService, KataGenerationRequest, GeneratedKataContent, ValidationResult } from '@/types/ai-authoring';
import { Kata } from '@/types';
import { OpenAI } from 'openai';
import { AIConfigService } from './ai-config';
import { PromptEngineService } from './prompt-engine';
import { ResponseParserService } from './response-parser';
import { ContentValidatorService } from './content-validator';

export class AIAuthoringService implements IAIAuthoringService {
  private static instance: AIAuthoringService;
  private openai: OpenAI;
  private promptEngine: PromptEngineService;
  private responseParser: ResponseParserService;
  private contentValidator: ContentValidatorService;

  private constructor() {
    const config = AIConfigService.getInstance().getConfig();
    this.openai = new OpenAI({
      apiKey: config.openaiApiKey,
      dangerouslyAllowBrowser: true, // This is okay in Electron main process
    });
    this.promptEngine = PromptEngineService.getInstance();
    this.responseParser = ResponseParserService.getInstance();
    this.contentValidator = ContentValidatorService.getInstance();
  }

  public static getInstance(): AIAuthoringService {
    if (!AIAuthoringService.instance) {
      AIAuthoringService.instance = new AIAuthoringService();
    }
    return AIAuthoringService.instance;
  }

  async generateKata(request: KataGenerationRequest): Promise<GeneratedKataContent> {
    const config = AIConfigService.getInstance().getConfig();
    const prompt = this.promptEngine.buildKataPrompt(request);

    try {
      const response = await this.openai.chat.completions.create({
        model: config.model,
        messages: [
          { role: 'system', content: 'You are an expert in creating high-quality coding challenges (katas).' },
          { role: 'user', content: prompt }
        ],
        temperature: config.temperature,
        max_tokens: config.maxTokens,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('Empty response from OpenAI API');
      }

      const parsedContent = this.responseParser.parseKataResponse(content, request.type);
      return parsedContent as GeneratedKataContent;

    } catch (error) {
      console.error("Error generating kata:", error);
      // In a real app, use the centralized error handler
      throw error;
    }
  }

  async generateVariation(sourceKata: Kata, options: any): Promise<GeneratedKataContent> {
    const config = AIConfigService.getInstance().getConfig();
    const prompt = this.promptEngine.buildVariationPrompt(sourceKata, options);

    try {
      const response = await this.openai.chat.completions.create({
        model: config.model,
        messages: [
          { role: 'system', content: 'You are an expert in creating variations of existing coding challenges (katas).' },
          { role: 'user', content: prompt }
        ],
        temperature: config.temperature,
        max_tokens: config.maxTokens,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('Empty response from OpenAI API for variation generation');
      }

      const parsedContent = this.responseParser.parseKataResponse(content, sourceKata.type as KataType);
      // Ensure the new slug is different to avoid conflicts
      if (parsedContent.metadata && parsedContent.metadata.slug === sourceKata.meta.slug) {
          parsedContent.metadata.slug = `${sourceKata.meta.slug}-variation`;
      }
      return parsedContent as GeneratedKataContent;

    } catch (error) {
      console.error("Error generating kata variation:", error);
      throw error;
    }
  }

  async validateGeneration(content: GeneratedKataContent): Promise<ValidationResult> {
    console.log('Validating generated content...');
    const metadataValidation = this.contentValidator.validateMetadata(content.metadata);
    if (!metadataValidation.isValid) {
        return metadataValidation;
    }

    if (content.metadata.type === 'code' && content.starterCode && content.testCode && content.solutionCode) {
        const codeValidation = this.contentValidator.validateGeneratedCode(content.starterCode, content.metadata.language);
        if (!codeValidation.isValid) return codeValidation;

        const testValidation = await this.contentValidator.validateTestCases(content.testCode, content.solutionCode, content.metadata.language);
        if (!testValidation.isValid) return testValidation;
    }

    // Add other validations for rubric, etc.

    return { isValid: true, errors: [] };
  }
}