import { describe, it, expect } from 'vitest'
import { ContentValidatorService } from '../content-validator'
import { KataMetadata, Rubric } from '@/types'

describe('ContentValidatorService Integration', () => {
  const service = ContentValidatorService.getInstance()

  it('should validate metadata correctly', () => {
    const validMetadata: KataMetadata = {
      slug: 'test-kata',
      title: 'Test Kata for Content Validation',
      language: 'py',
      type: 'code',
      difficulty: 'easy',
      tags: ['algorithms', 'beginner'],
      entry: 'entry.py',
      test: {
        kind: 'programmatic',
        file: 'tests.py'
      },
      timeout_ms: 5000
    }

    const result = service.validateMetadata(validMetadata)
    
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should validate rubric correctly', () => {
    const validRubric: Rubric = {
      keys: ['correctness', 'clarity', 'completeness'],
      threshold: {
        min_total: 70,
        min_correctness: 50
      }
    }

    const result = service.validateRubric(validRubric, 'explain')
    
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should handle none language gracefully', async () => {
    const result = await service.validateGeneratedCode('any content', 'none')
    
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should provide helpful suggestions for metadata', () => {
    const metadataWithoutTags: KataMetadata = {
      slug: 'test',
      title: 'Test',
      language: 'py',
      type: 'code',
      difficulty: 'easy',
      tags: [],
      entry: 'entry.py',
      test: {
        kind: 'programmatic',
        file: 'tests.py'
      },
      timeout_ms: 5000
    }

    const result = service.validateMetadata(metadataWithoutTags)
    
    expect(result.isValid).toBe(true)
    expect(result.suggestions.length).toBeGreaterThan(0)
  })
})