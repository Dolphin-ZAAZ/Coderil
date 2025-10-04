import type { AIJudgment, Rubric, AIServiceError } from '@/types'
import { errorHandler } from './error-handler'

export interface AIJudgeConfig {
    apiKey: string
    baseUrl?: string
    model?: string
    maxRetries?: number
    timeout?: number
}

export interface ExplanationJudgeRequest {
    explanation: string
    rubric: Rubric
    topic?: string
    context?: string
}

export interface TemplateJudgeRequest {
    templateContent: string
    rubric: Rubric
    expectedStructure?: any
    templateType?: string
    context?: string
}

export interface CodebaseJudgeRequest {
    analysis: string
    rubric: Rubric
    codebaseDescription?: string
    context?: string
}

export interface AIResponse {
    scores: Record<string, number>
    feedback: string
    reasoning?: string
}

export class AIJudgeService {
    private config: AIJudgeConfig
    private defaultModel = 'gpt-4o-mini'
    private defaultBaseUrl = 'https://api.openai.com/v1'
    private defaultTimeout = 60000
    private defaultMaxRetries = 3

    constructor(config: AIJudgeConfig) {
        this.config = {
            baseUrl: this.defaultBaseUrl,
            model: this.defaultModel,
            maxRetries: this.defaultMaxRetries,
            timeout: this.defaultTimeout,
            ...config
        }
    }

    /**
     * Judge an explanation kata submission
     */
    async judgeExplanation(request: ExplanationJudgeRequest): Promise<AIJudgment> {
        const prompt = this.generateExplanationPrompt(request)

        for (let attempt = 1; attempt <= this.config.maxRetries!; attempt++) {
            try {
                const response = await this.callAI(prompt)
                const aiResponse = this.parseAIResponse(response)
                return this.processJudgment(aiResponse, request.rubric)
            } catch (error) {
                const aiError = error as AIServiceError;
                
                // Handle specific error types
                if (aiError.statusCode === 401) {
                    const authError = this.createAIServiceError('AI service authentication failed - check API key', false);
                    authError.statusCode = 401;
                    errorHandler.handleAIServiceError(authError, {
                        operation: 'judge_explanation',
                        attempt,
                        maxRetries: this.config.maxRetries
                    });
                    throw authError;
                }
                
                if (aiError.statusCode === 429) {
                    const rateLimitError = this.createAIServiceError('AI service rate limit exceeded', true);
                    rateLimitError.statusCode = 429;
                    rateLimitError.retryable = true;
                    errorHandler.handleAIServiceError(rateLimitError, {
                        operation: 'judge_explanation',
                        attempt,
                        maxRetries: this.config.maxRetries
                    });
                }
                
                if (attempt === this.config.maxRetries) {
                    const finalError = this.createAIServiceError(
                        `Failed to get valid AI response after ${this.config.maxRetries} attempts: ${error}`,
                        true
                    );
                    errorHandler.handleAIServiceError(finalError, {
                        operation: 'judge_explanation',
                        totalAttempts: this.config.maxRetries,
                        lastError: error
                    });
                    throw finalError;
                }
                
                // Wait before retry (exponential backoff)
                await this.delay(Math.pow(2, attempt - 1) * 1000)
            }
        }

        const unexpectedError = this.createAIServiceError('Unexpected error in judgeExplanation', false);
        errorHandler.handleAIServiceError(unexpectedError, {
            operation: 'judge_explanation',
            context: 'unexpected_error'
        });
        throw unexpectedError;
    }

    /**
     * Judge a template kata submission
     */
    async judgeTemplate(request: TemplateJudgeRequest): Promise<AIJudgment> {
        const prompt = this.generateTemplatePrompt(request)

        for (let attempt = 1; attempt <= this.config.maxRetries!; attempt++) {
            try {
                const response = await this.callAI(prompt)
                const aiResponse = this.parseAIResponse(response)
                return this.processJudgment(aiResponse, request.rubric)
            } catch (error) {
                if (attempt === this.config.maxRetries) {
                    throw this.createAIServiceError(
                        `Failed to get valid AI response after ${this.config.maxRetries} attempts: ${error}`,
                        true
                    )
                }
                // Wait before retry (exponential backoff)
                await this.delay(Math.pow(2, attempt - 1) * 1000)
            }
        }

        throw this.createAIServiceError('Unexpected error in judgeTemplate', false)
    }

    /**
     * Judge a codebase analysis kata submission
     */
    async judgeCodebase(request: CodebaseJudgeRequest): Promise<AIJudgment> {
        const prompt = this.generateCodebasePrompt(request)

        for (let attempt = 1; attempt <= this.config.maxRetries!; attempt++) {
            try {
                const response = await this.callAI(prompt)
                const aiResponse = this.parseAIResponse(response)
                return this.processJudgment(aiResponse, request.rubric)
            } catch (error) {
                const aiError = error as AIServiceError;
                
                // Handle specific error types
                if (aiError.statusCode === 401) {
                    const authError = this.createAIServiceError('AI service authentication failed - check API key', false);
                    authError.statusCode = 401;
                    errorHandler.handleAIServiceError(authError, {
                        operation: 'judge_codebase',
                        attempt,
                        maxRetries: this.config.maxRetries
                    });
                    throw authError;
                }
                
                if (aiError.statusCode === 429) {
                    const rateLimitError = this.createAIServiceError('AI service rate limit exceeded', true);
                    rateLimitError.statusCode = 429;
                    rateLimitError.retryable = true;
                    errorHandler.handleAIServiceError(rateLimitError, {
                        operation: 'judge_codebase',
                        attempt,
                        maxRetries: this.config.maxRetries
                    });
                }
                
                if (attempt === this.config.maxRetries) {
                    const finalError = this.createAIServiceError(
                        `Failed to get valid AI response after ${this.config.maxRetries} attempts: ${error}`,
                        true
                    );
                    errorHandler.handleAIServiceError(finalError, {
                        operation: 'judge_codebase',
                        totalAttempts: this.config.maxRetries,
                        lastError: error
                    });
                    throw finalError;
                }
                
                // Wait before retry (exponential backoff)
                await this.delay(Math.pow(2, attempt - 1) * 1000)
            }
        }

        const unexpectedError = this.createAIServiceError('Unexpected error in judgeCodebase', false);
        errorHandler.handleAIServiceError(unexpectedError, {
            operation: 'judge_codebase',
            context: 'unexpected_error'
        });
        throw unexpectedError;
    }

    /**
     * Generate prompt for explanation judging
     */
    private generateExplanationPrompt(request: ExplanationJudgeRequest): string {
        const { explanation, rubric, topic, context } = request

        const rubricKeys = rubric.keys.join(', ')
        const topicContext = topic ? `The topic being explained is: ${topic}\n\n` : ''
        const additionalContext = context ? `Additional context: ${context}\n\n` : ''

        return `You are an expert technical reviewer evaluating a student's explanation. Please provide a detailed assessment.

${topicContext}${additionalContext}EXPLANATION TO EVALUATE:
${explanation}

EVALUATION CRITERIA:
Please score the explanation on each of these criteria (0-100 scale):
${rubric.keys.map(key => `- ${key}: Evaluate the ${key} of the explanation`).join('\n')}

REQUIREMENTS:
- Provide scores for each criterion: ${rubricKeys}
- Give constructive feedback explaining your assessment
- Be fair but thorough in your evaluation
- Consider technical accuracy, clarity, and completeness

RESPONSE FORMAT:
You must respond with valid JSON in exactly this format:
{
  "scores": {
    ${rubric.keys.map(key => `"${key}": <score_0_to_100>`).join(',\n    ')}
  },
  "feedback": "<detailed constructive feedback explaining the scores and areas for improvement>",
  "reasoning": "<brief explanation of your overall assessment>"
}

Important: Respond ONLY with the JSON object, no additional text.`
    }

    /**
     * Generate prompt for template judging
     */
    private generateTemplatePrompt(request: TemplateJudgeRequest): string {
        const { templateContent, rubric, expectedStructure, templateType, context } = request

        const typeContext = templateType ? `Template type: ${templateType}\n\n` : ''
        const structureContext = expectedStructure ?
            `Expected structure elements: ${JSON.stringify(expectedStructure, null, 2)}\n\n` : ''
        const additionalContext = context ? `Additional context: ${context}\n\n` : ''

        return `You are an expert software architect evaluating a project template. Please provide a detailed assessment of whether this template would serve as a good starting point for developers.

${typeContext}${structureContext}${additionalContext}TEMPLATE TO EVALUATE:
${templateContent}

EVALUATION CRITERIA:
Please score the template on each of these criteria (0-100 scale):
${rubric.keys.map(key => `- ${key}: Evaluate the ${key} of the template`).join('\n')}

ASSESSMENT GUIDELINES:
- Structure: Is the project well-organized with logical file/folder hierarchy?
- Completeness: Are all essential components present for a working template?
- Best Practices: Does it follow framework/language conventions and best practices?
- Documentation: Are setup instructions and usage clear?
- Functionality: Would this template actually work as a starting point?

Use "close enough" evaluation - templates don't need to be perfect, but should be functional and well-structured starting points.

RESPONSE FORMAT:
You must respond with valid JSON in exactly this format:
{
  "scores": {
    ${rubric.keys.map(key => `"${key}": <score_0_to_100>`).join(',\n    ')}
  },
  "feedback": "<detailed constructive feedback explaining the scores and areas for improvement>",
  "reasoning": "<brief explanation of your overall assessment and whether this is 'close enough' to be useful>"
}

Important: Respond ONLY with the JSON object, no additional text.`
    }

    /**
     * Generate prompt for codebase analysis judging
     */
    private generateCodebasePrompt(request: CodebaseJudgeRequest): string {
        const { analysis, rubric, codebaseDescription, context } = request

        const codebaseContext = codebaseDescription ? `Codebase being analyzed: ${codebaseDescription}\n\n` : ''
        const additionalContext = context ? `Additional context: ${context}\n\n` : ''

        return `You are an expert software engineer evaluating a student's codebase analysis. Please provide a detailed assessment of their understanding and explanation of the code.

${codebaseContext}${additionalContext}CODEBASE ANALYSIS TO EVALUATE:
${analysis}

EVALUATION CRITERIA:
Please score the analysis on each of these criteria (0-100 scale):
${rubric.keys.map(key => `- ${key}: Evaluate the ${key} of the codebase analysis`).join('\n')}

ASSESSMENT GUIDELINES:
- Comprehension: Does the student demonstrate clear understanding of what the code does?
- Structure: Is the analysis well-organized and easy to follow?
- Detail: Does the analysis provide appropriate technical depth without being overwhelming?
- Accuracy: Are the technical explanations correct and precise?
- Insights: Does the student provide thoughtful observations and improvement suggestions?

Look for evidence that the student has carefully read and understood the codebase, can explain how components interact, and demonstrates good software engineering judgment.

RESPONSE FORMAT:
You must respond with valid JSON in exactly this format:
{
  "scores": {
    ${rubric.keys.map(key => `"${key}": <score_0_to_100>`).join(',\n    ')}
  },
  "feedback": "<detailed constructive feedback explaining the scores and areas for improvement>",
  "reasoning": "<brief explanation of your overall assessment of the student's codebase analysis>"
}

Important: Respond ONLY with the JSON object, no additional text.`
    }

    /**
     * Call the AI API
     */
    private async callAI(prompt: string): Promise<string> {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout!)

        try {
            const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`
                },
                body: JSON.stringify({
                    model: this.config.model,
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.3,
                    max_tokens: 2000
                }),
                signal: controller.signal
            })

            clearTimeout(timeoutId)

            if (!response.ok) {
                const errorText = await response.text()
                throw this.createAIServiceError(
                    `AI API request failed: ${response.status} ${response.statusText} - ${errorText}`,
                    response.status >= 500 || response.status === 429
                )
            }

            const data = await response.json()

            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error('Invalid response format from AI API')
            }

            return data.choices[0].message.content
        } catch (error) {
            clearTimeout(timeoutId)

            if (error instanceof Error && error.name === 'AbortError') {
                throw this.createAIServiceError('AI request timed out', true)
            }

            throw error
        }
    }

    /**
     * Parse and validate AI response
     */
    private parseAIResponse(response: string): AIResponse {
        try {
            // Clean up the response - remove any markdown formatting or extra text
            let cleanResponse = response.trim()

            // Extract JSON if it's wrapped in markdown code blocks
            const jsonMatch = cleanResponse.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/)
            if (jsonMatch) {
                cleanResponse = jsonMatch[1]
            }

            // Try to find JSON object if there's extra text
            const jsonStart = cleanResponse.indexOf('{')
            const jsonEnd = cleanResponse.lastIndexOf('}')
            if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
                cleanResponse = cleanResponse.substring(jsonStart, jsonEnd + 1)
            }

            const parsed = JSON.parse(cleanResponse)

            // Validate the response structure
            if (!parsed.scores || typeof parsed.scores !== 'object') {
                throw new Error('Response missing scores object')
            }

            if (!parsed.feedback || typeof parsed.feedback !== 'string') {
                throw new Error('Response missing feedback string')
            }

            // Validate that all scores are numbers between 0 and 100
            for (const [key, score] of Object.entries(parsed.scores)) {
                if (typeof score !== 'number' || score < 0 || score > 100) {
                    throw new Error(`Invalid score for ${key}: ${score}`)
                }
            }

            return {
                scores: parsed.scores,
                feedback: parsed.feedback,
                reasoning: parsed.reasoning || ''
            }
        } catch (error) {
            throw new Error(`Failed to parse AI response: ${error}. Response was: ${response}`)
        }
    }

    /**
     * Process AI judgment and apply rubric thresholds
     */
    private processJudgment(aiResponse: AIResponse, rubric: Rubric): AIJudgment {
        const { scores, feedback } = aiResponse

        // Calculate total score (average of all criteria)
        const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0) / Object.keys(scores).length

        // Check if passes minimum thresholds
        let pass = totalScore >= rubric.threshold.min_total

        // Check minimum correctness if specified
        if (rubric.threshold.min_correctness && scores.correctness) {
            pass = pass && scores.correctness >= rubric.threshold.min_correctness
        }

        // Check minimum comprehension if specified (for codebase katas)
        if (rubric.threshold.min_comprehension && scores.comprehension) {
            pass = pass && scores.comprehension >= rubric.threshold.min_comprehension
        }

        // Check any other specific minimums in threshold
        for (const [key, minValue] of Object.entries(rubric.threshold)) {
            if (key.startsWith('min_') && key !== 'min_total' && key !== 'min_correctness') {
                const criteriaKey = key.replace('min_', '')
                if (scores[criteriaKey] && scores[criteriaKey] < minValue) {
                    pass = false
                    break
                }
            }
        }

        return {
            scores,
            feedback,
            pass,
            totalScore: Math.round(totalScore * 100) / 100
        }
    }

    /**
     * Create a standardized AI service error
     */
    private createAIServiceError(message: string, retryable: boolean): AIServiceError {
        const error = new Error(message) as AIServiceError
        error.name = 'AIServiceError'
        error.retryable = retryable
        return error
    }

    /**
     * Delay utility for retries
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    /**
     * Validate AI response format
     */
    validateResponse(response: string): AIJudgment | null {
        try {
            const aiResponse = this.parseAIResponse(response)
            // Create a dummy rubric for validation
            const dummyRubric: Rubric = {
                keys: Object.keys(aiResponse.scores),
                threshold: { min_total: 0, min_correctness: 0 }
            }
            return this.processJudgment(aiResponse, dummyRubric)
        } catch {
            return null
        }
    }
}