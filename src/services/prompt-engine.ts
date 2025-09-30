import { Kata, KataType } from '@/types';
import { KataGenerationRequest } from '@/types/ai-authoring';
import { VariationOptions } from '@/components/VariationGeneratorDialog';

// This is a much more detailed and robust implementation of the PromptEngineService.
// It includes specific templates and few-shot examples to guide the AI, as per the design docs.

export class PromptEngineService {
  private static instance: PromptEngineService;

  public static getInstance(): PromptEngineService {
    if (!PromptEngineService.instance) {
      PromptEngineService.instance = new PromptEngineService();
    }
    return PromptEngineService.instance;
  }

  public buildKataPrompt(request: KataGenerationRequest): string {
    switch (request.type) {
      case 'code':
        return this.buildCodeKataPrompt(request);
      case 'explain':
        return this.buildExplanationKataPrompt(request);
      // Add other cases for 'template', 'codebase', 'multi-question' here
      default:
        // Default to a code kata prompt as it's the most common.
        return this.buildCodeKataPrompt(request);
    }
  }

  private getFileStructureExample(lang: 'py' | 'js' | 'ts' | 'cpp' = 'py') {
      const ext = { py: 'py', js: 'js', ts: 'ts', cpp: 'cpp' }[lang];
      return `
      \`\`\`yaml meta.yaml
      slug: "your-kata-slug"
      title: "Your Kata Title"
      language: "${lang}"
      type: "code"
      difficulty: "easy"
      tags: ["arrays", "algorithms"]
      entry: "entry.${ext}"
      test:
        kind: "programmatic"
        file: "tests.${ext}"
      timeout_ms: 5000
      solution: "solution.${ext}"
      \`\`\`

      \`\`\`markdown statement.md
      # Your Kata Title
      A clear problem description goes here.
      ## Examples
      \`\`\`
      Input: ...
      Output: ...
      \`\`\`
      ## Constraints
      - ...
      \`\`\`

      \`\`\`${lang} entry.${ext}
      // Starter code for the user
      \`\`\`

      \`\`\`${lang} tests.${ext}
      // Public test cases
      \`\`\`
      
      \`\`\`${lang} solution.${ext}
      // A correct and optimal solution
      \`\`\`
      
      \`\`\`${lang} hidden_tests.${ext}
      // Hidden test cases for final validation
      \`\`\`
      `;
  }

  public buildCodeKataPrompt(request: KataGenerationRequest): string {
    const { description, language, difficulty, generateHiddenTests } = request;
    const hiddenTestsInstruction = generateHiddenTests
      ? `6.  Create a \`hidden_tests.{ext}\` file with more complex edge cases.`
      : '6.  Do not generate a hidden tests file.';

    return `
      SYSTEM: You are an expert developer tasked with creating high-quality programming challenges (katas). Your goal is to generate a complete, self-contained kata from a user's description.

      USER: Generate a complete code kata based on the following requirements. The output must be a single markdown response where each file's content is enclosed in a separate, language-tagged code block that includes the filename.

      **Requirements:**
      - **Description:** ${description}
      - **Language:** ${language}
      - **Difficulty:** ${difficulty}

      **Instructions:**
      1.  Create a \`meta.yaml\` file. The slug must be a URL-friendly version of the title. Include relevant tags.
      2.  Create a \`statement.md\` file with a clear problem description, at least two examples with explanations, and any relevant constraints.
      3.  Create an entry file (e.g., \`entry.py\`) with the function signature(s) and a placeholder comment for the user's solution.
      4.  Create a tests file (e.g., \`tests.py\`) with at least 3-5 public test cases that verify the solution's correctness for common scenarios.
      5.  Create a solution file (e.g., \`solution.py\`) with a correct and well-documented solution, including time/space complexity.
      ${hiddenTestsInstruction}

      **CRITICAL: Your entire response must be a single markdown block. Each file must be in its own named and language-tagged code block.**

      **Example Output Format:**
      ${this.getFileStructureExample(language)}
    `;
  }

  public buildExplanationKataPrompt(request: KataGenerationRequest): string {
    const { description, difficulty } = request;
    return `
      SYSTEM: You are an expert in technical writing and curriculum design. Your task is to create a kata where a user must write a technical explanation about a specific topic.

      USER: Generate an "explanation" kata based on the following requirements.

      **Requirements:**
      - **Topic:** ${description}
      - **Difficulty:** ${difficulty}

      **Instructions:**
      1.  Create a \`meta.yaml\` file for an explanation kata (type: "explain").
      2.  Create a \`statement.md\` file that clearly prompts the user for the explanation. It should specify what key points to cover.
      3.  Create a \`rubric.yaml\` file with clear, weighted scoring criteria. Common criteria are 'correctness', 'clarity', 'completeness', 'depth', and 'examples'.
      4.  Create a \`solution.md\` file containing a high-quality, well-structured example explanation that would receive a high score based on the rubric. This serves as the gold-standard answer.

      **CRITICAL: Your entire response must be a single markdown block. Each file must be in its own named and language-tagged code block.**
    `;
  }

  public buildVariationPrompt(sourceKata: Kata, options: VariationOptions): string {
      return `
      SYSTEM: You are an expert developer skilled at creating variations of programming challenges to test slightly different skills or edge cases.

      USER: Generate a new variation of an existing code kata.

      **Source Kata Title:** ${sourceKata.title}
      **Source Kata Language:** ${sourceKata.language}
      **Source Kata Difficulty:** ${sourceKata.difficulty}

      **Variation Requirements:**
      - **Difficulty Adjustment:** ${options.difficultyAdjustment}
      - **Specific Changes Requested by User:** ${options.parameterChanges || 'No specific changes requested. Use your creativity to make a meaningful variation based on the difficulty adjustment.'}

      **Instructions:**
      1.  Create a new set of files for a kata that is a logical variation of the source kata.
      2.  The new kata MUST have a new, unique slug and title. For example, add "-variation", "-advanced", or "-simplified" to the slug and title.
      3.  Adjust the problem statement, examples, constraints, starter code, tests, and solution to reflect the requested changes.
      4.  If making it harder, introduce a new constraint, an edge case (like negative numbers, empty inputs), or a performance requirement (e.g., must be O(n log n)).
      5.  If making it easier, simplify the problem, remove a complex requirement, or provide more helper code.
      6.  Ensure the new solution correctly solves the new problem and passes all new tests.

      **CRITICAL: Your entire response must be a single markdown block. Each file must be in its own named and language-tagged code block, following the format of the original kata.**
      `;
  }
}