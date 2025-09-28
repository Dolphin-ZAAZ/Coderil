/**
 * Comprehensive test runner for end-to-end and integration tests
 * This script runs all tests and provides a summary report
 */

import { execSync } from 'child_process'
import { existsSync } from 'fs'

interface TestResult {
  name: string
  passed: boolean
  duration: number
  error?: string
}

interface TestSuite {
  name: string
  results: TestResult[]
  totalTests: number
  passedTests: number
  failedTests: number
  duration: number
}

class TestRunner {
  private testSuites: TestSuite[] = []

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting comprehensive test suite...\n')

    // Define test suites to run
    const suites = [
      {
        name: 'E2E - Complete Kata Workflow',
        pattern: 'src/__tests__/e2e/complete-kata-workflow.test.ts'
      },
      {
        name: 'Integration - Progress Persistence',
        pattern: 'src/__tests__/integration/progress-persistence.test.ts'
      },
      {
        name: 'Integration - Import/Export',
        pattern: 'src/__tests__/integration/import-export.test.ts'
      },
      {
        name: 'Integration - Auto-Continue',
        pattern: 'src/__tests__/integration/auto-continue.test.ts'
      },
      {
        name: 'Integration - AI Judge Mock',
        pattern: 'src/__tests__/integration/ai-judge-mock.test.ts'
      },
      {
        name: 'Existing Integration - AI Judge',
        pattern: 'src/services/__tests__/ai-judge.integration.test.ts'
      },
      {
        name: 'Existing Integration - Dependency Checker',
        pattern: 'src/services/__tests__/dependency-checker.integration.test.ts'
      }
    ]

    for (const suite of suites) {
      await this.runTestSuite(suite.name, suite.pattern)
    }

    this.printSummary()
  }

  private async runTestSuite(name: string, pattern: string): Promise<void> {
    console.log(`📋 Running ${name}...`)
    
    if (!existsSync(pattern)) {
      console.log(`⚠️  Test file not found: ${pattern}`)
      return
    }

    const startTime = Date.now()
    
    try {
      const output = execSync(`npm run test -- --run "${pattern}"`, {
        encoding: 'utf8',
        stdio: 'pipe'
      })
      
      const duration = Date.now() - startTime
      const suite = this.parseTestOutput(name, output, duration)
      this.testSuites.push(suite)
      
      console.log(`✅ ${name}: ${suite.passedTests}/${suite.totalTests} passed (${duration}ms)`)
      
    } catch (error: any) {
      const duration = Date.now() - startTime
      const suite: TestSuite = {
        name,
        results: [{
          name: 'Suite execution',
          passed: false,
          duration,
          error: error.message
        }],
        totalTests: 1,
        passedTests: 0,
        failedTests: 1,
        duration
      }
      
      this.testSuites.push(suite)
      console.log(`❌ ${name}: Failed to execute (${duration}ms)`)
      console.log(`   Error: ${error.message.split('\n')[0]}`)
    }
    
    console.log('')
  }

  private parseTestOutput(suiteName: string, output: string, duration: number): TestSuite {
    // Parse vitest output to extract test results
    const lines = output.split('\n')
    const results: TestResult[] = []
    let totalTests = 0
    let passedTests = 0
    let failedTests = 0

    // Look for test result patterns in vitest output
    for (const line of lines) {
      if (line.includes('✓') || line.includes('✗')) {
        const testName = line.replace(/^\s*[✓✗]\s*/, '').trim()
        const passed = line.includes('✓')
        
        results.push({
          name: testName,
          passed,
          duration: 0 // Individual test duration not easily extractable from vitest output
        })
        
        totalTests++
        if (passed) {
          passedTests++
        } else {
          failedTests++
        }
      }
    }

    // If no individual tests found, look for summary
    const summaryMatch = output.match(/(\d+) passed.*?(\d+) failed/i)
    if (summaryMatch && totalTests === 0) {
      passedTests = parseInt(summaryMatch[1])
      failedTests = parseInt(summaryMatch[2])
      totalTests = passedTests + failedTests
    }

    return {
      name: suiteName,
      results,
      totalTests,
      passedTests,
      failedTests,
      duration
    }
  }

  private printSummary(): void {
    console.log('📊 Test Summary')
    console.log('================')
    
    let totalTests = 0
    let totalPassed = 0
    let totalFailed = 0
    let totalDuration = 0

    for (const suite of this.testSuites) {
      const status = suite.failedTests === 0 ? '✅' : '❌'
      console.log(`${status} ${suite.name}: ${suite.passedTests}/${suite.totalTests} (${suite.duration}ms)`)
      
      totalTests += suite.totalTests
      totalPassed += suite.passedTests
      totalFailed += suite.failedTests
      totalDuration += suite.duration
    }

    console.log('')
    console.log(`Total: ${totalPassed}/${totalTests} tests passed`)
    console.log(`Duration: ${totalDuration}ms`)
    console.log(`Success Rate: ${totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0}%`)

    if (totalFailed > 0) {
      console.log('')
      console.log('❌ Failed Test Suites:')
      for (const suite of this.testSuites) {
        if (suite.failedTests > 0) {
          console.log(`   - ${suite.name}: ${suite.failedTests} failed`)
          for (const result of suite.results) {
            if (!result.passed && result.error) {
              console.log(`     • ${result.name}: ${result.error}`)
            }
          }
        }
      }
    }

    console.log('')
    console.log(totalFailed === 0 ? '🎉 All tests passed!' : '⚠️  Some tests failed. Check the output above for details.')
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const runner = new TestRunner()
  runner.runAllTests().catch(error => {
    console.error('Test runner failed:', error)
    process.exit(1)
  })
}

export { TestRunner }