#!/usr/bin/env node

/**
 * AI Judge Test Script
 * 
 * Runs comprehensive tests for the AI judging system to ensure
 * it correctly handles both passing and failing scenarios.
 */

import { execSync } from 'child_process'
import path from 'path'

console.log('🧪 Testing AI Judge Implementation')
console.log('=' .repeat(50))

// Test files to run
const testFiles = [
  'src/services/__tests__/ai-judge.test.ts',
  'src/services/__tests__/ai-judge.comprehensive.test.ts',
  'src/services/__tests__/ai-judge.e2e.test.ts'
]

let totalPassed = 0
let totalFailed = 0

for (const testFile of testFiles) {
  console.log(`\n📋 Running ${path.basename(testFile)}`)
  
  try {
    const output = execSync(`npx vitest run ${testFile}`, { 
      encoding: 'utf8',
      stdio: 'inherit'
    })
    
    console.log(`✅ ${path.basename(testFile)} completed`)
    totalPassed++
    
  } catch (error) {
    console.log(`❌ ${path.basename(testFile)} failed`)
    totalFailed++
  }
}

// Integration tests (optional - requires API key)
console.log(`\n📋 Running integration tests (requires OPENAI_API_KEY)`)
if (process.env.OPENAI_API_KEY) {
  try {
    execSync('npx vitest run src/services/__tests__/ai-judge.integration.test.ts', {
      encoding: 'utf8',
      stdio: 'inherit'
    })
    console.log(`✅ Integration tests completed`)
    totalPassed++
  } catch (error) {
    console.log(`❌ Integration tests failed`)
    totalFailed++
  }
} else {
  console.log(`⚠️  Skipping integration tests (no OPENAI_API_KEY)`)
}

// Summary
console.log('\n' + '=' .repeat(50))
console.log('📊 TEST SUMMARY')
console.log('=' .repeat(50))
console.log(`✅ Passed: ${totalPassed}`)
console.log(`❌ Failed: ${totalFailed}`)

if (totalFailed === 0) {
  console.log('🎉 All AI judging tests passed!')
  console.log('The system correctly handles both passing and failing scenarios.')
} else {
  console.log('⚠️  Some tests failed. Please review the output above.')
  process.exit(1)
}