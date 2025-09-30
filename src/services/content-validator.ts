import { Language, KataMetadata, KataType } from '@/types';
import { ValidationResult } from '@/types/ai-authoring';
import { CodeExecutionService } from './code-execution';

export class ContentValidatorService {
  private static instance: ContentValidatorService;

  public static getInstance(): ContentValidatorService {
    if (!ContentValidatorService.instance) {
      ContentValidatorService.instance = new ContentValidatorService();
    }
    return ContentValidatorService.instance;
  }

  public validateGeneratedCode(code: string, language: Language): ValidationResult {
    console.log(`Validating generated code for language: ${language}`);

    if (code.trim().length === 0) {
      return { isValid: false, errors: [{ type: 'syntax', message: 'Generated code is empty.' }] };
    }

    const stack: string[] = [];
    const map: { [key: string]: string } = {
      '(': ')',
      '[': ']',
      '{': '}',
    };

    for (let i = 0; i < code.length; i++) {
      const char = code[i];

      // Ignore characters inside strings or comments for simplicity
      if (char === '"' || char === "'") {
        const quote = char;
        i++;
        while (i < code.length && code[i] !== quote) {
          if (code[i] === '\\') i++; // Skip escaped characters
          i++;
        }
        continue;
      }

      if (map[char]) {
        stack.push(map[char]);
      } else if (Object.values(map).includes(char)) {
        if (stack.pop() !== char) {
          return {
            isValid: false,
            errors: [{ type: 'syntax', message: `Mismatched bracket: expected ${stack[stack.length-1]} but found ${char}` }],
          };
        }
      }
    }

    if (stack.length > 0) {
      return { isValid: false, errors: [{ type: 'syntax', message: 'Unclosed brackets in generated code.' }] };
    }

    return { isValid: true, errors: [] };
  }

  public async validateTestCases(
    tests: string,
    solution: string,
    language: Language
  ): Promise<ValidationResult> {
    console.log(`Validating test cases for language: ${language}`);
    // Placeholder for running tests against the solution.
    // This would use the CodeExecutionService.
    if (!tests || !solution) {
        return { isValid: false, errors: [{type: 'logic', message: 'Missing tests or solution for validation'}]};
    }

    const executionService = CodeExecutionService.getInstance();
    // This is a simplified placeholder. The actual implementation would need to
    // create temporary files and handle different language runners.
    try {
        const result = await executionService.runTestsWithSolution(tests, solution, language);
        if (result.status === 'passed') {
            return { isValid: true, errors: [] };
        } else {
            return { isValid: false, errors: [{ type: 'logic', message: `Tests failed to pass against solution: ${result.error || ''}` }] };
        }
    } catch (e: any) {
        return { isValid: false, errors: [{ type: 'logic', message: `Error executing tests: ${e.message}` }] };
    }
  }

  public validateMetadata(metadata: Partial<KataMetadata>): ValidationResult {
    const errors = [];
    if (!metadata.slug) errors.push({ type: 'metadata', message: 'Missing slug' });
    if (!metadata.title) errors.push({ type: 'metadata', message: 'Missing title' });
    if (!metadata.language) errors.push({ type: 'metadata', message: 'Missing language' });
    if (!metadata.type) errors.push({ type: 'metadata', message: 'Missing type' });
    if (!metadata.difficulty) errors.push({ type: 'metadata', message: 'Missing difficulty' });

    if (errors.length > 0) {
      return { isValid: false, errors };
    }
    return { isValid: true, errors: [] };
  }

  public validateRubric(rubric: any, type: KataType): ValidationResult {
    console.log(`Validating rubric for kata type: ${type}`);
    // Placeholder for rubric validation
    if (!rubric || !rubric.keys || !rubric.scoring) {
      return { isValid: false, errors: [{ type: 'structure', message: 'Rubric is missing keys or scoring sections' }] };
    }
    return { isValid: true, errors: [] };
  }
}