import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { spawn } from 'child_process'
import { DependencyChecker } from '../dependency-checker'

// Mock child_process
vi.mock('child_process')

const mockSpawn = vi.mocked(spawn)

describe('DependencyChecker', () => {
  let dependencyChecker: DependencyChecker
  
  beforeEach(() => {
    dependencyChecker = DependencyChecker.getInstance()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('checkAllDependencies', () => {
    it('should check all dependencies and return status', async () => {
      // Mock successful responses for all dependencies
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn()
      }

      mockSpawn.mockReturnValue(mockProcess as any)

      // Simulate successful Python check
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 0) // Success exit code
        }
      })

      mockProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => callback('Python 3.9.0'), 0)
        }
      })

      const result = await dependencyChecker.checkAllDependencies()

      expect(result).toHaveProperty('python')
      expect(result).toHaveProperty('nodejs')
      expect(result).toHaveProperty('cpp')
      expect(result).toHaveProperty('allAvailable')
      expect(typeof result.allAvailable).toBe('boolean')
    })

    it('should handle dependency check failures gracefully', async () => {
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn()
      }

      mockSpawn.mockReturnValue(mockProcess as any)

      // Simulate failed dependency checks
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(1), 0) // Error exit code
        } else if (event === 'error') {
          // Don't trigger error for this test
        }
      })

      const result = await dependencyChecker.checkAllDependencies()

      expect(result.allAvailable).toBe(false)
      expect(result.python.available).toBe(false)
      expect(result.nodejs.available).toBe(false)
      expect(result.cpp.available).toBe(false)
    })
  })

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = DependencyChecker.getInstance()
      const instance2 = DependencyChecker.getInstance()
      
      expect(instance1).toBe(instance2)
    })
  })

  describe('dependency status structure', () => {
    it('should return proper dependency status structure', async () => {
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn()
      }

      mockSpawn.mockReturnValue(mockProcess as any)

      // Mock Python success
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 0)
        }
      })

      mockProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => callback('Python 3.9.0'), 0)
        }
      })

      const result = await dependencyChecker.checkAllDependencies()

      // Check structure of dependency status
      expect(result.python).toHaveProperty('name')
      expect(result.python).toHaveProperty('available')
      expect(typeof result.python.name).toBe('string')
      expect(typeof result.python.available).toBe('boolean')

      if (result.python.version) {
        expect(typeof result.python.version).toBe('string')
      }

      if (result.python.error) {
        expect(typeof result.python.error).toBe('string')
      }

      if (result.python.installationGuide) {
        expect(typeof result.python.installationGuide).toBe('string')
      }
    })
  })

  describe('installation guides', () => {
    it('should provide installation guides for missing dependencies', async () => {
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn()
      }

      mockSpawn.mockReturnValue(mockProcess as any)

      // Mock failed dependency check
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(1), 0) // Error exit code
        }
      })

      const result = await dependencyChecker.checkAllDependencies()

      // All dependencies should be unavailable and have installation guides
      expect(result.python.available).toBe(false)
      expect(result.python.installationGuide).toBeDefined()
      expect(typeof result.python.installationGuide).toBe('string')
      expect(result.python.installationGuide!.length).toBeGreaterThan(0)

      expect(result.nodejs.available).toBe(false)
      expect(result.nodejs.installationGuide).toBeDefined()
      expect(typeof result.nodejs.installationGuide).toBe('string')
      expect(result.nodejs.installationGuide!.length).toBeGreaterThan(0)

      expect(result.cpp.available).toBe(false)
      expect(result.cpp.installationGuide).toBeDefined()
      expect(typeof result.cpp.installationGuide).toBe('string')
      expect(result.cpp.installationGuide!.length).toBeGreaterThan(0)
    })
  })

  describe('timeout handling', () => {
    it('should handle command timeouts', async () => {
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn()
      }

      mockSpawn.mockReturnValue(mockProcess as any)

      // Don't call the close callback to simulate timeout
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('Command timeout')), 0)
        }
      })

      const result = await dependencyChecker.checkAllDependencies()

      // Should handle timeout gracefully
      expect(result).toBeDefined()
      expect(result.allAvailable).toBe(false)
    })
  })
})