#!/usr/bin/env node

/**
 * AI Judge Test Runner
 * 
 * Comprehensive test runner for AI judging functionality.
 * Runs all test suites and provides detailed reporting.
 */

import { execSync } from 'child_process'
import { writeFileSync } from 'fs'
import { join } from 'path'

interface TestResult {
  suite: string
  passed: number
  failed: number
  skipped: number
  duration: number
  errors: string[]
}

interface TestReport {
  timestamp: string
  totalTests: number
  totalPassed: number
  totalFailed: number
  totalSkipped: number
  totalDuration: number
  suites: TestResult[]
  coverage?: {
    statements: number
    branches: number
    functions: number
    lines: number
  }
}

class AIJudgeTestRunner {
  private results: TestResult[] = []

  async runAllTests(): Promise<TestReport> {
    console.log('🚀 Starting AI Judge Comprehensive Test Suite')
    console.log('=' .repeat(60))

    const startTime = Date.now()

    // Test suites to run
    const testSuites = [
      {
        name: 'Unit Tests',
        pattern: 'src/services/__tests__/ai-judge.test.ts',
        description: 'Core AI judging functionality'
      },
      {
        name: 'Comprehensive Tests',
        pattern: 'src/services/__tests__/ai-judge.comprehensive.test.ts',
        description: 'Realistic scenarios and edge cases'
      },
      {
        name: 'E2E Tests',
        pattern: 'src/services/__tests__/ai-judge.e2e.test.ts',
        description: 'End-to-end workflow simulation'
      },
      {
        name: 'Integration Tests',
        pattern: 'src/services/__tests__/ai-judge.integration.test.ts',
        description: 'Real API integration (requires OPENAI_API_KEY)'
      }
    ]

    // Run each test suite
    for (const suite of testSuites) {
      await this.runTestSuite(suite.name, suite.pattern, suite.description)
    }

    const endTime = Date.now()
    const totalDuration = endTime - startTime

    // Generate report
    const report = this.generateReport(totalDuration)
    
    // Save report to file
    this.saveReport(report)
    
    // Print summary
    this.printSummary(report)

    return report
  }

  private async runTestSuite(name: string, pattern: string, description: string): Promise<void> {
    console.log(`\n📋 Running ${name}`)
    console.log(`   ${description}`)
    console.log(`   Pattern: ${pattern}`)

    const startTime = Date.now()
    let passed = 0
    let failed = 0
    let skipped = 0
    const errors: string[] = []

    try {
      // Skip integration tests if no API key is available
      if (name === 'Integration Tests' && !process.env.OPENAI_API_KEY) {
        console.log('   ⚠️  Skipping integration tests (no OPENAI_API_KEY)')
        skipped = 1
        this.results.push({
          suite: name,
          passed: 0,
          failed: 0,
          skipped: 1,
          duration: 0,
          errors: ['Skipped: No OPENAI_API_KEY environment variable']
        })
        return
      }

      // Run the test suite
      const command = `npx vitest run ${pattern} --reporter=json`
      const output = execSync(command, { 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      })

      // Parse vitest JSON output
      const lines = output.split('\n').filter(line => line.trim())
      const jsonLine = lines.find(line => {
        try {
          const parsed = JSON.parse(line)
          return parsed.testResults || parsed.numTotalTests !== undefined
        } catch {
          return false
        }
      })

      if (jsonLine) {
        const result = JSON.parse(jsonLine)
        passed = result.numPassedTests || 0
        failed = result.numFailedTests || 0
        skipped = result.numPendingTests || 0

        if (result.testResults) {
          result.testResults.forEach((test: any) => {
            if (test.status === 'failed') {
              errors.push(`${test.title}: ${test.failureMessage || 'Unknown error'}`)
            }
          })
        }
      } else {
        // Fallback parsing if JSON format is different
        passed = (output.match(/✓/g) || []).length
        failed = (output.match(/✗/g) || []).length
      }

      console.log(`   ✅ Passed: ${passed}`)
      if (failed > 0) {
        console.log(`   ❌ Failed: ${failed}`)
      }
      if (skipped > 0) {
        console.log(`   ⏭️  Skipped: ${skipped}`)
      }

    } catch (error) {
      console.log(`   ❌ Suite failed to run: ${error}`)
      failed = 1
      errors.push(`Suite execution failed: ${error}`)
    }

    const endTime = Date.now()
    const duration = endTime - startTime

    this.results.push({
      suite: name,
      passed,
      failed,
      skipped,
      duration,
      errors
    })
  }

  private generateReport(totalDuration: number): TestReport {
    const totalPassed = this.results.reduce((sum, r) => sum + r.passed, 0)
    const totalFailed = this.results.reduce((sum, r) => sum + r.failed, 0)
    const totalSkipped = this.results.reduce((sum, r) => sum + r.skipped, 0)
    const totalTests = totalPassed + totalFailed + totalSkipped

    return {
      timestamp: new Date().toISOString(),
      totalTests,
      totalPassed,
      totalFailed,
      totalSkipped,
      totalDuration,
      suites: this.results
    }
  }

  private saveReport(report: TestReport): void {
    const reportPath = join(process.cwd(), 'ai-judge-test-report.json')
    writeFileSync(reportPath, JSON.stringify(report, null, 2))
    console.log(`\n📄 Test report saved to: ${reportPath}`)
  }

  private printSummary(report: TestReport): void {
    console.log('\n' + '=' .repeat(60))
    console.log('📊 AI JUDGE TEST SUMMARY')
    console.log('=' .repeat(60))
    
    console.log(`Total Tests: ${report.totalTests}`)
    console.log(`✅ Passed: ${report.totalPassed}`)
    console.log(`❌ Failed: ${report.totalFailed}`)
    console.log(`⏭️  Skipped: ${report.totalSkipped}`)
    console.log(`⏱️  Duration: ${(report.totalDuration / 1000).toFixed(2)}s`)
    
    const successRate = report.totalTests > 0 
      ? ((report.totalPassed / (report.totalTests - report.totalSkipped)) * 100).toFixed(1)
      : '0'
    console.log(`📈 Success Rate: ${successRate}%`)

    // Suite breakdown
    console.log('\n📋 Suite Breakdown:')
    report.suites.forEach(suite => {
      const status = suite.failed > 0 ? '❌' : suite.skipped > 0 ? '⏭️' : '✅'
      console.log(`  ${status} ${suite.suite}: ${suite.passed}/${suite.passed + suite.failed} passed (${(suite.duration / 1000).toFixed(1)}s)`)
    })

    // Errors
    const allErrors = report.suites.flatMap(s => s.errors)
    if (allErrors.length > 0) {
      console.log('\n🚨 Errors:')
      allErrors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`)
      })
    }

    // Overall status
    console.log('\n' + '=' .repeat(60))
    if (report.totalFailed === 0) {
      console.log('🎉 ALL TESTS PASSED! AI judging system is working correctly.')
    } else {
      console.log('⚠️  SOME TESTS FAILED. Please review the errors above.')
    }
    console.log('=' .repeat(60))
  }
}

// Test scenarios for manual verification
export const testScenarios = {
  explanationKata: {
    passing: {
      title: 'Excellent Recursion Explanation',
      content: `
# Understanding Recursion

Recursion is a programming technique where a function calls itself to solve a problem by breaking it down into smaller, similar subproblems.

## Key Components

### Base Case
The base case is the condition that stops the recursion. Without it, the function would call itself infinitely.

### Recursive Case  
The recursive case is where the function calls itself with modified parameters.

## Example: Factorial
\`\`\`python
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)
\`\`\`

## Applications
- Tree traversal
- Mathematical calculations
- Divide and conquer algorithms
      `,
      expectedPass: true,
      expectedScore: '>= 80'
    },
    failing: {
      title: 'Poor Recursion Explanation',
      content: 'Recursion is when function calls itself. Sometimes used.',
      expectedPass: false,
      expectedScore: '< 60'
    }
  },

  templateKata: {
    passing: {
      title: 'Complete React Component Template',
      content: `
# React Button Component

## Structure
\`\`\`
src/
  components/
    Button/
      Button.jsx
      Button.css
      Button.test.js
package.json
\`\`\`

## Implementation
\`\`\`jsx
import React from 'react'
import './Button.css'

const Button = ({ children, variant = 'primary', onClick }) => (
  <button className={\`btn btn-\${variant}\`} onClick={onClick}>
    {children}
  </button>
)

export default Button
\`\`\`

## Setup
1. npm install
2. npm start
      `,
      expectedPass: true,
      expectedScore: '>= 75'
    },
    failing: {
      title: 'Incomplete Template',
      content: `
# Basic Template

Just a file:
\`\`\`js
console.log('hello')
\`\`\`
      `,
      expectedPass: false,
      expectedScore: '< 60'
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const runner = new AIJudgeTestRunner()
  runner.runAllTests().catch(error => {
    console.error('Test runner failed:', error)
    process.exit(1)
  })
}

export { AIJudgeTestRunner }