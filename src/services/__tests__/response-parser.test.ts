import { describe, it, expect, beforeEach } from 'vitest';
import { ResponseParserService } from '../response-parser';

describe('ResponseParserService', () => {
  let parser: ResponseParserService;

  beforeEach(() => {
    parser = ResponseParserService.getInstance();
  });

  describe('extractCodeBlocks', () => {
    it('should extract a single code block with a filename', () => {
      const response = "Here is the file:\n```python entry.py\nprint('hello')\n```";
      const blocks = parser.extractCodeBlocks(response);
      expect(blocks).toEqual({
        'entry': "print('hello')",
      });
    });

    it('should extract multiple code blocks with different languages and filenames', () => {
      const response = `
        Here is the metadata:
        \`\`\`yaml meta.yaml
        slug: test-kata
        title: Test Kata
        \`\`\`

        And the statement:
        \`\`\`markdown statement.md
        # Test Kata
        This is a test.
        \`\`\`

        Finally, the entry file:
        \`\`\`python entry.py
        def main():
            pass
        \`\`\`
      `;
      const blocks = parser.extractCodeBlocks(response);
      expect(blocks).toEqual({
        'meta.yaml': 'slug: test-kata\ntitle: Test Kata',
        'statement.md': '# Test Kata\nThis is a test.',
        'entry': 'def main():\n    pass',
      });
    });

    it('should handle code blocks without filenames by inferring from language', () => {
        const response = "```yaml\nkey: value\n```\n```python\nimport os\n```";
        const blocks = parser.extractCodeBlocks(response);
        expect(blocks).toEqual({
            'meta.yaml': 'key: value',
            'entry': 'import os'
        });
    });
  });

  describe('parseKataResponse', () => {
    it('should correctly parse a full response for a code kata', () => {
      const fullResponse = `
        \`\`\`yaml meta.yaml
        slug: "two-sum-variant"
        title: "Two Sum Variant"
        language: "py"
        type: "code"
        difficulty: "easy"
        tags: ["arrays", "hash-map"]
        entry: "entry.py"
        test:
          kind: "programmatic"
          file: "tests.py"
        timeout_ms: 5000
        \`\`\`

        \`\`\`markdown statement.md
        # Two Sum Variant
        Find two numbers that sum to a target.
        \`\`\`

        \`\`\`python entry.py
        def two_sum(nums, target):
            pass
        \`\`\`

        \`\`\`python tests.py
        from entry import two_sum
        assert two_sum([2, 7], 9) == [0, 1]
        \`\`\`

        \`\`\`python solution.py
        def two_sum(nums, target):
            num_map = {}
            for i, num in enumerate(nums):
                complement = target - num
                if complement in num_map:
                    return [num_map[complement], i]
                num_map[num] = i
        \`\`\`
      `;

      const parsed = parser.parseKataResponse(fullResponse, 'code');

      expect(parsed.metadata?.slug).toBe('two-sum-variant');
      expect(parsed.statement).toContain('# Two Sum Variant');
      expect(parsed.starterCode).toContain('def two_sum(nums, target):');
      expect(parsed.testCode).toContain('from entry import two_sum');
      expect(parsed.solutionCode).toContain('num_map = {}');
    });
  });
});