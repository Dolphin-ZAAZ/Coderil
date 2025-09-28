#!/usr/bin/env node

/**
 * Simple test script to verify codebase kata functionality
 */

import path from 'path';
import fs from 'fs';

async function testCodebaseKata() {
  console.log('Testing codebase kata functionality...\n');

  try {
    // Import the kata manager
    const { KataManagerService } = await import('./dist-electron/kata-manager-6i0mskdk.js');
    
    // Create kata manager instance
    const kataManager = KataManagerService.getInstance();
    
    // Load all katas
    console.log('Loading katas...');
    const katas = await kataManager.loadKatas();
    
    // Find the codebase kata
    const codebaseKata = katas.find(kata => kata.type === 'codebase');
    
    if (!codebaseKata) {
      console.error('❌ No codebase kata found!');
      return false;
    }
    
    console.log(`✅ Found codebase kata: ${codebaseKata.title} (${codebaseKata.slug})`);
    
    // Load full kata details
    console.log('Loading kata details...');
    const kataDetails = await kataManager.loadKata(codebaseKata.slug);
    
    // Verify kata structure
    console.log('\n📋 Kata Details:');
    console.log(`- Title: ${kataDetails.title}`);
    console.log(`- Type: ${kataDetails.type}`);
    console.log(`- Language: ${kataDetails.language}`);
    console.log(`- Difficulty: ${kataDetails.difficulty}`);
    console.log(`- Has rubric: ${kataDetails.rubric ? '✅' : '❌'}`);
    console.log(`- Has statement: ${kataDetails.statement ? '✅' : '❌'}`);
    console.log(`- Has starter code: ${kataDetails.starterCode ? '✅' : '❌'}`);
    
    if (kataDetails.rubric) {
      console.log(`- Rubric keys: ${kataDetails.rubric.keys.join(', ')}`);
      console.log(`- Min total score: ${kataDetails.rubric.threshold.min_total}`);
    }
    
    console.log('\n✅ Codebase kata structure is valid!');
    return true;
    
  } catch (error) {
    console.error('❌ Error testing codebase kata:', error.message);
    return false;
  }
}

// Run the test
testCodebaseKata().then(success => {
  process.exit(success ? 0 : 1);
});