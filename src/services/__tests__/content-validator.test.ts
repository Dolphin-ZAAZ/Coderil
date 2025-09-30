import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContentValidatorService } from '../content-validator';
import { CodeExecutionService } from '../code-execution';
import { KataMetadata } from '@/types';

// Mock the CodeExecutionService
vi.mock('../code-execution', () => {
  const CodeExecutionService = vi.fn();
  CodeExecutionService.prototype.runTestsWithSolution = vi.fn();
  CodeExecutionService.getInstance = vi.fn(() => new CodeExecutionService());
  return { CodeExecutionService };
});

describe('ContentValidatorService', () => {
  let validator: ContentValidatorService;
  let mockExecutionService: CodeExecutionService;

  beforeEach(() => {
    validator = ContentValidatorService.getInstance();
    mockExecutionService = CodeExecutionService.getInstance();
    vi.clearAllMocks();
  });

  describe('validateMetadata', () => {
    it('should return valid for a complete metadata object', () => {
      const metadata: Partial<KataMetadata> = {
        slug: 'test-kata',
        title: 'Test Kata',
        language: 'py',
        type: 'code',
        difficulty: 'easy',
      };
      const result = validator.validateMetadata(metadata);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid if required fields are missing', () => {
      const metadata: Partial<KataMetadata> = {
        slug: 'test-kata',
        title: 'Test Kata',
      };
      const result = validator.validateMetadata(metadata);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.message.includes('language'))).toBe(true);
    });
  });

  describe('validateTestCases', () => {
    it('should return valid if tests pass against the solution', async () => {
      (mockExecutionService.runTestsWithSolution as vi.Mock).mockResolvedValue({ status: 'passed' });

      const result = await validator.validateTestCases('tests', 'solution', 'py');
      expect(result.isValid).toBe(true);
      expect(mockExecutionService.runTestsWithSolution).toHaveBeenCalledWith('tests', 'solution', 'py');
    });

    it('should return invalid if tests fail against the solution', async () => {
      (mockExecutionService.runTestsWithSolution as vi.Mock).mockResolvedValue({ status: 'failed', error: 'Assertion failed' });

      const result = await validator.validateTestCases('tests', 'solution', 'py');
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('Tests failed');
    });

    it('should return invalid if test execution throws an error', async () => {
        (mockExecutionService.runTestsWithSolution as vi.Mock).mockRejectedValue(new Error('Execution timed out'));

        const result = await validator.validateTestCases('tests', 'solution', 'py');
        expect(result.isValid).toBe(false);
        expect(result.errors[0].message).toContain('Error executing tests: Execution timed out');
    });
  });
});