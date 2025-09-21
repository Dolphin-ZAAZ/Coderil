import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AIJudgeService } from '../ai-judge'
import type { Rubric, AIJudgment } from '@/types'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('AIJudgeService', () => {
  let service: AIJudgeService
  let mockRubric: Rubric

  beforeEach(() => {
    service = new AIJudgeService({
      apiKey: 'test-api-key',
      baseUrl: 'https://api.test.com/v1',
      model: 'gpt-4',
      maxRetries: 2,
      timeout: 5000
    })

    mockRubric = {
      keys: ['clarity', 'correctness', 'completeness'],
      threshold: {
        min_total: 70,
        min_correctness: 60
      }
    }

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('judgeExplanation', () => {
    it('should successfully judge an explanation', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              scores: {
                clarity: 85,
                correctness: 90,
                completeness: 80
              },
              feedback: 'Good explanation with clear examples',
              reasoning: 'Well structured and accurate'
            })
          }
        }]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await service.judgeExplanation({
        explanation: 'Test explanation about recursion',
        rubric: mockRubric,
        topic: 'recursion'
      })

      expect(result).toEqual({
        scores: {
          clarity: 85,
          correctness: 90,
          completeness: 80
        },
        feedback: 'Good explanation with clear examples',
        pass: true,
        totalScore: 85
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key'
          }
        })
      )
    })

    it('should fail when scores are below threshold', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              scores: {
                clarity: 60,
                correctness: 50, // Below min_correctness threshold
                completeness: 65
              },
              feedback: 'Needs improvement in correctness',
              reasoning: 'Some technical inaccuracies'
            })
          }
        }]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await service.judgeExplanation({
        explanation: 'Incomplete explanation',
        rubric: mockRubric
      })

      expect(result.pass).toBe(false)
      expect(result.totalScore).toBe(58.33)
    })

    it('should retry on malformed response', async () => {
      // First call returns malformed JSON
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{
            message: {
              content: 'Invalid JSON response'
            }
          }]
        })
      })

      // Second call returns valid response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{
            message: {
              content: JSON.stringify({
                scores: {
                  clarity: 75,
                  correctness: 80,
                  completeness: 70
                },
                feedback: 'Decent explanation',
                reasoning: 'Meets basic requirements'
              })
            }
          }]
        })
      })

      const result = await service.judgeExplanation({
        explanation: 'Test explanation',
        rubric: mockRubric
      })

      expect(result.pass).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should throw error after max retries', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{
            message: {
              content: 'Invalid response'
            }
          }]
        })
      })

      await expect(service.judgeExplanation({
        explanation: 'Test explanation',
        rubric: mockRubric
      })).rejects.toThrow('Failed to get valid AI response after 2 attempts')

      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Server error')
      })

      await expect(service.judgeExplanation({
        explanation: 'Test explanation',
        rubric: mockRubric
      })).rejects.toThrow('AI API request failed: 500 Internal Server Error')
    })

    it('should handle network timeout', async () => {
      const abortError = new Error('Request timeout')
      abortError.name = 'AbortError'
      
      mockFetch.mockRejectedValue(abortError)

      await expect(service.judgeExplanation({
        explanation: 'Test explanation',
        rubric: mockRubric
      })).rejects.toThrow('AI request timed out')
    })
  })

  describe('judgeTemplate', () => {
    const templateRubric: Rubric = {
      keys: ['structure', 'completeness', 'best_practices'],
      threshold: {
        min_total: 75,
        min_structure: 70
      }
    }

    it('should successfully judge a template', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              scores: {
                structure: 85,
                completeness: 80,
                best_practices: 90
              },
              feedback: 'Well-structured template with good practices',
              reasoning: 'Template follows conventions and is complete'
            })
          }
        }]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await service.judgeTemplate({
        templateContent: 'Mock template content with files and structure',
        rubric: templateRubric,
        templateType: 'React App',
        expectedStructure: { folders: ['src', 'public'], files: ['package.json'] }
      })

      expect(result).toEqual({
        scores: {
          structure: 85,
          completeness: 80,
          best_practices: 90
        },
        feedback: 'Well-structured template with good practices',
        pass: true,
        totalScore: 85
      })
    })

    it('should fail when structure score is below minimum', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              scores: {
                structure: 65, // Below min_structure threshold
                completeness: 85,
                best_practices: 80
              },
              feedback: 'Poor project structure',
              reasoning: 'Structure needs improvement'
            })
          }
        }]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await service.judgeTemplate({
        templateContent: 'Poorly structured template',
        rubric: templateRubric
      })

      expect(result.pass).toBe(false)
      expect(result.totalScore).toBe(76.67)
    })

    it('should generate appropriate template prompt', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{
            message: {
              content: JSON.stringify({
                scores: { structure: 80, completeness: 75, best_practices: 85 },
                feedback: 'Good template',
                reasoning: 'Meets requirements'
              })
            }
          }]
        })
      })

      await service.judgeTemplate({
        templateContent: 'Template content',
        rubric: templateRubric,
        templateType: 'Express API',
        context: 'Node.js backend template'
      })

      const callArgs = mockFetch.mock.calls[0][1]
      const requestBody = JSON.parse(callArgs.body)
      const prompt = requestBody.messages[0].content

      expect(prompt).toContain('Template type: Express API')
      expect(prompt).toContain('Additional context: Node.js backend template')
      expect(prompt).toContain('close enough')
      expect(prompt).toContain('structure')
      expect(prompt).toContain('completeness')
      expect(prompt).toContain('best_practices')
    })
  })

  describe('parseAIResponse', () => {
    it('should parse clean JSON response', () => {
      const response = JSON.stringify({
        scores: { clarity: 85, correctness: 90 },
        feedback: 'Good work',
        reasoning: 'Well done'
      })

      const result = service.validateResponse(response)
      expect(result).toBeTruthy()
      expect(result!.scores).toEqual({ clarity: 85, correctness: 90 })
    })

    it('should parse JSON wrapped in markdown', () => {
      const response = '```json\n' + JSON.stringify({
        scores: { clarity: 75 },
        feedback: 'Okay work'
      }) + '\n```'

      const result = service.validateResponse(response)
      expect(result).toBeTruthy()
      expect(result!.scores).toEqual({ clarity: 75 })
    })

    it('should extract JSON from mixed content', () => {
      const jsonContent = {
        scores: { clarity: 80 },
        feedback: 'Mixed content test'
      }
      const response = `Here is my assessment: ${JSON.stringify(jsonContent)} Hope this helps!`

      const result = service.validateResponse(response)
      expect(result).toBeTruthy()
      expect(result!.scores).toEqual({ clarity: 80 })
    })

    it('should return null for invalid JSON', () => {
      const response = 'This is not JSON at all'
      const result = service.validateResponse(response)
      expect(result).toBeNull()
    })

    it('should return null for missing required fields', () => {
      const response = JSON.stringify({
        scores: { clarity: 85 }
        // Missing feedback
      })

      const result = service.validateResponse(response)
      expect(result).toBeNull()
    })

    it('should return null for invalid score values', () => {
      const response = JSON.stringify({
        scores: { clarity: 150 }, // Invalid score > 100
        feedback: 'Test feedback'
      })

      const result = service.validateResponse(response)
      expect(result).toBeNull()
    })
  })

  describe('rubric threshold checking', () => {
    it('should pass when all thresholds are met', () => {
      const rubric: Rubric = {
        keys: ['clarity', 'correctness', 'completeness'],
        threshold: {
          min_total: 70,
          min_correctness: 60,
          min_clarity: 65
        }
      }

      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              scores: {
                clarity: 70,
                correctness: 80,
                completeness: 75
              },
              feedback: 'Meets all thresholds'
            })
          }
        }]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      return service.judgeExplanation({
        explanation: 'Test explanation',
        rubric
      }).then(result => {
        expect(result.pass).toBe(true)
        expect(result.totalScore).toBe(75)
      })
    })

    it('should fail when specific threshold is not met', () => {
      const rubric: Rubric = {
        keys: ['clarity', 'correctness'],
        threshold: {
          min_total: 60,
          min_clarity: 80 // This will fail
        }
      }

      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              scores: {
                clarity: 70, // Below min_clarity
                correctness: 85
              },
              feedback: 'Clarity needs improvement'
            })
          }
        }]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      return service.judgeExplanation({
        explanation: 'Test explanation',
        rubric
      }).then(result => {
        expect(result.pass).toBe(false)
        expect(result.totalScore).toBe(77.5)
      })
    })
  })

  describe('configuration', () => {
    it('should use default configuration values', () => {
      const defaultService = new AIJudgeService({
        apiKey: 'test-key'
      })

      expect(defaultService).toBeDefined()
      // Configuration is private, but we can test that it doesn't throw
    })

    it('should use custom configuration values', () => {
      const customService = new AIJudgeService({
        apiKey: 'custom-key',
        baseUrl: 'https://custom.api.com/v1',
        model: 'gpt-3.5-turbo',
        maxRetries: 5,
        timeout: 10000
      })

      expect(customService).toBeDefined()
    })
  })
})