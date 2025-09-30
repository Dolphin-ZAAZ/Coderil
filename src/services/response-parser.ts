import { KataType, KataMetadata } from '@/types';
import { GeneratedKataContent } from '@/types/ai-authoring';
import jsyaml from 'js-yaml';

export class ResponseParserService {
  private static instance: ResponseParserService;

  public static getInstance(): ResponseParserService {
    if (!ResponseParserService.instance) {
      ResponseParserService.instance = new ResponseParserService();
    }
    return ResponseParserService.instance;
  }

  public parseKataResponse(response: string, type: KataType): Partial<GeneratedKataContent> {
    console.log(`Parsing response for kata type: ${type}`);
    const codeBlocks = this.extractCodeBlocks(response);

    const content: Partial<GeneratedKataContent> = {};

    if (codeBlocks['meta.yaml']) {
      try {
        content.metadata = jsyaml.load(codeBlocks['meta.yaml']) as KataMetadata;
      } catch (e) {
        console.error("Failed to parse meta.yaml", e);
      }
    }
    if (codeBlocks['statement.md']) {
      content.statement = codeBlocks['statement.md'];
    }
    if (codeBlocks['entry']) {
        content.starterCode = codeBlocks['entry'];
    }
    if (codeBlocks['tests']) {
        content.testCode = codeBlocks['tests'];
    }
    if (codeBlocks['solution']) {
        content.solutionCode = codeBlocks['solution'];
    }
    if (codeBlocks['hidden_tests']) {
        content.hiddenTestCode = codeBlocks['hidden_tests'];
    }
    if (codeBlocks['rubric.yaml']) {
        try {
            content.rubric = jsyaml.load(codeBlocks['rubric.yaml']) as any;
        } catch (e) {
            console.error("Failed to parse rubric.yaml", e);
        }
    }

    return content;
  }

  public extractCodeBlocks(response: string): Record<string, string> {
    const codeBlocks: Record<string, string> = {};
    const regex = /```(yaml|typescript|javascript|python|cpp|markdown|md|sh|bash|text)(?: ([a-zA-Z0-9_.-]+))?\n([\s\S]*?)```/g;
    let match;

    while ((match = regex.exec(response)) !== null) {
      const language = match[1];
      let filename = match[2];
      const content = match[3].trim();

      if (!filename) {
        if (language === 'yaml') filename = 'meta.yaml';
        else if (language === 'markdown' || language === 'md') filename = 'statement.md';
        else if (language.match(/typescript|javascript|python|cpp/)) filename = 'entry';
      }

      if(filename) {
        // Handle common variations like entry.py, tests.ts, etc.
        const baseFilename = filename.split('.')[0];
        if (['entry', 'tests', 'solution', 'hidden_tests'].includes(baseFilename)) {
            codeBlocks[baseFilename] = content;
        } else {
            codeBlocks[filename] = content;
        }
      }
    }
    return codeBlocks;
  }

  public validateResponseStructure(response: string, type: KataType): boolean {
    // Basic validation: check for expected blocks
    const blocks = this.extractCodeBlocks(response);
    if (!blocks['meta.yaml'] || !blocks['statement.md']) {
        return false;
    }
    if (type === 'code' && (!blocks['entry'] || !blocks['tests'])) {
        return false;
    }
    return true;
  }
}