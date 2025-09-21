#!/usr/bin/env node

/**
 * Test build script for Code Kata Electron App
 * Tests packaging without full distribution to verify configuration
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Testing build configuration...');

try {
  // Step 1: Clean previous builds
  console.log('🧹 Cleaning previous builds...');
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  if (fs.existsSync('dist-electron')) {
    fs.rmSync('dist-electron', { recursive: true, force: true });
  }
  
  // Step 2: Build without packaging
  console.log('🔨 Building without packaging...');
  execSync('npm run build:dev', { stdio: 'inherit' });
  
  // Step 3: Test packaging (directory only, no installer)
  console.log('📦 Testing packaging configuration...');
  execSync('npm run pack', { stdio: 'inherit' });
  
  // Step 4: Verify build outputs
  console.log('✅ Verifying build outputs...');
  
  const requiredFiles = [
    'dist/index.html',
    'dist-electron/main.js',
    'dist-electron/preload.js'
  ];
  
  const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));
  
  if (missingFiles.length > 0) {
    console.error('❌ Missing required files:', missingFiles);
    process.exit(1);
  }
  
  // Check if release directory was created
  if (!fs.existsSync('release')) {
    console.error('❌ Release directory not created');
    process.exit(1);
  }
  
  // List contents of release directory
  const releaseContents = fs.readdirSync('release');
  console.log('\n📁 Release directory contents:');
  releaseContents.forEach(item => {
    const itemPath = path.join('release', item);
    const stats = fs.statSync(itemPath);
    const type = stats.isDirectory() ? 'DIR' : 'FILE';
    const size = stats.isFile() ? ` (${(stats.size / 1024 / 1024).toFixed(2)} MB)` : '';
    console.log(`  • ${item} [${type}]${size}`);
  });
  
  console.log('\n✅ Build test completed successfully!');
  console.log('🎉 Configuration is valid and ready for distribution builds.');
  
} catch (error) {
  console.error('❌ Build test failed:', error.message);
  process.exit(1);
}