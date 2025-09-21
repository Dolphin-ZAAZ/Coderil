#!/usr/bin/env node

/**
 * Build script for Code Kata Electron App
 * Handles cross-platform building with proper environment setup
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const platform = process.argv[2] || os.platform();
const isDev = process.env.NODE_ENV !== 'production';

console.log(`🚀 Building Code Kata App for ${platform}...`);
console.log(`📦 Environment: ${isDev ? 'development' : 'production'}`);

// Ensure build directory exists
if (!fs.existsSync('build')) {
  fs.mkdirSync('build', { recursive: true });
}

// Ensure release directory exists
if (!fs.existsSync('release')) {
  fs.mkdirSync('release', { recursive: true });
}

try {
  // Step 1: Type check
  console.log('🔍 Running TypeScript type check...');
  execSync('npm run type-check', { stdio: 'inherit' });
  
  // Step 2: Build renderer process
  console.log('⚛️  Building React renderer...');
  execSync('npm run build:dev', { stdio: 'inherit' });
  
  // Step 3: Platform-specific build
  let buildCommand;
  switch (platform) {
    case 'win32':
    case 'windows':
      buildCommand = 'npm run dist:win';
      break;
    case 'darwin':
    case 'mac':
    case 'macos':
      buildCommand = 'npm run dist:mac';
      break;
    case 'linux':
      buildCommand = 'npm run dist:linux';
      break;
    case 'all':
      buildCommand = 'npm run dist:all';
      break;
    default:
      buildCommand = 'npm run dist';
  }
  
  console.log(`📦 Building for ${platform}...`);
  execSync(buildCommand, { stdio: 'inherit' });
  
  console.log('✅ Build completed successfully!');
  console.log('📁 Output directory: ./release/');
  
  // List built files
  const releaseDir = './release';
  if (fs.existsSync(releaseDir)) {
    const files = fs.readdirSync(releaseDir);
    console.log('\n📋 Built files:');
    files.forEach(file => {
      const filePath = path.join(releaseDir, file);
      const stats = fs.statSync(filePath);
      const size = (stats.size / 1024 / 1024).toFixed(2);
      console.log(`  • ${file} (${size} MB)`);
    });
  }
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}