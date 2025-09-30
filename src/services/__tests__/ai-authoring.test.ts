import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIAuthoringService } from '../ai-authoring';
import { AIConfigService } from '../ai-config';
import { PromptEngineService } from '../prompt-engine';
import { ResponseParserService } from '../response-parser';
import { OpenAI } from 'openai';

// Mock dependencies
vi.mock('openai', () => {
  const mOpenAI = {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  };
  return { OpenAI: vi.fn(() => mOpenAI) };
});

vi.mock('../ai-config', () => ({
  AIConfigService: {
    getInstance: vi.fn(() => ({
      getConfig: vi.fn(() => ({
        openaiApiKey: 'test-key',
        model: 'gpt-4.1-mini',
        temperature: 0.5,
        maxTokens: 4000,
      })),
    })),
  },
}));

vi.mock('../prompt-engine', () => ({
  PromptEngineService: {
    getInstance: vi.fn(() => ({
      buildKataPrompt: vi.fn((req) => `Prompt for: ${req.description}`),
    })),
  },
}));

vi.mock('../response-parser', () => ({
  ResponseParserService: {
    getInstance: vi.fn(() => ({
      parseKataResponse: vi.fn(() => ({
        metadata: { slug: 'parsed-slug' },
        statement: 'Parsed statement',
      })),
    })),
  },
}));

describe('AIAuthoringService', () => {
  let authoringService: AIAuthoringService;
  let mockOpenAI: OpenAI;

  beforeEach(() => {
    authoringService = AIAuthoringService.getInstance();
    mockOpenAI = new OpenAI(); // Gets the mocked instance
    vi.clearAllMocks();
  });

  describe('generateKata', () => {
    it('should call the OpenAI API and parse the response successfully', async () => {
      const mockApiResponse = {
        choices: [{ message: { content: 'Mock AI response' } }],
      };
      (mockOpenAI.chat.completions.create as vi.Mock).mockResolvedValue(mockApiResponse);

      const request = {
        description: 'a test kata',
        language: 'py',
        difficulty: 'easy',
        type: 'code',
        generateHiddenTests: true,
      };

      const result = await authoringService.generateKata(request as any);

      // Verify prompt engine was called
      const promptEngine = PromptEngineService.getInstance();
      expect(promptEngine.buildKataPrompt).toHaveBeenCalledWith(request);

      // Verify OpenAI API was called
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'user', content: 'Prompt for: a test kata' }),
          ]),
        })
      );

      // Verify response parser was called
      const responseParser = ResponseParserService.getInstance();
      expect(responseParser.parseKataResponse).toHaveBeenCalledWith('Mock AI response', 'code');

      // Verify the final result
      expect(result.metadata.slug).toBe('parsed-slug');
      expect(result.statement).toBe('Parsed statement');
    });

    it('should throw an error if the API response is empty', async () => {
        const mockApiResponse = {
            choices: [{ message: { content: '' } }],
        };
        (mockOpenAI.chat.completions.create as vi.Mock).mockResolvedValue(mockApiResponse);

        const request = { description: 'a test kata' } as any;

        await expect(authoringService.generateKata(request)).rejects.toThrow('Empty response from OpenAI API');
    });
  });
});