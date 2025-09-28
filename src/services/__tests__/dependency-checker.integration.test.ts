import { describe, it, expect } from 'vitest'
import { DependencyChecker } from '../dependency-checker'

describe('DependencyChecker Integration', () => {
  it('should check real system dependencies', async () => {
    const checker = DependencyChecker.getInstance()
    const result = await checker.checkAllDependencies()

    // Basic structure validation
    expect(result).toHaveProperty('python')
    expect(result).toHaveProperty('nodejs')
    expect(result).toHaveProperty('cpp')
    expect(result).toHaveProperty('allAvailable')

    // Each dependency should have required properties
    expect(result.python).toHaveProperty('name')
    expect(result.python).toHaveProperty('available')
    expect(result.nodejs).toHaveProperty('name')
    expect(result.nodejs).toHaveProperty('available')
    expect(result.cpp).toHaveProperty('name')
    expect(result.cpp).toHaveProperty('available')

    // Log results for manual verification
    console.log('Real system dependency check results:')
    console.log('Python:', result.python)
    console.log('Node.js:', result.nodejs)
    console.log('C++:', result.cpp)
    console.log('All available:', result.allAvailable)

    // If dependencies are available, they should have versions
    if (result.python.available) {
      expect(result.python.version).toBeDefined()
      expect(typeof result.python.version).toBe('string')
    } else {
      expect(result.python.error).toBeDefined()
      expect(result.python.installationGuide).toBeDefined()
    }

    if (result.nodejs.available) {
      expect(result.nodejs.version).toBeDefined()
      expect(typeof result.nodejs.version).toBe('string')
    } else {
      expect(result.nodejs.error).toBeDefined()
      expect(result.nodejs.installationGuide).toBeDefined()
    }

    if (result.cpp.available) {
      expect(result.cpp.version).toBeDefined()
      expect(typeof result.cpp.version).toBe('string')
    } else {
      expect(result.cpp.error).toBeDefined()
      expect(result.cpp.installationGuide).toBeDefined()
    }

    // allAvailable should be true only if all dependencies are available
    expect(result.allAvailable).toBe(
      result.python.available && result.nodejs.available && result.cpp.available
    )
  }, 10000) // 10 second timeout for real system checks
})