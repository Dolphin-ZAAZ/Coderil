/**
 * Build configuration for Code Kata Electron App
 * This file contains platform-specific build settings and utilities
 */

import os from 'os';
import path from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read package.json
const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));

const buildConfig = {
  // Platform detection
  platform: os.platform(),
  arch: os.arch(),
  
  // Build directories
  directories: {
    output: 'release',
    buildResources: 'build',
    app: '.',
  },
  
  // Platform-specific configurations
  platforms: {
    win32: {
      targets: ['nsis', 'portable'],
      architectures: ['x64', 'ia32'],
      icon: 'build/icon.ico',
      certificateFile: process.env.WIN_CSC_LINK,
      certificatePassword: process.env.WIN_CSC_KEY_PASSWORD,
    },
    darwin: {
      targets: ['dmg', 'zip'],
      architectures: ['x64', 'arm64'],
      icon: 'build/icon.icns',
      certificateFile: process.env.MAC_CSC_LINK,
      certificatePassword: process.env.MAC_CSC_KEY_PASSWORD,
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_ID_PASSWORD,
    },
    linux: {
      targets: ['AppImage', 'deb', 'rpm'],
      architectures: ['x64'],
      icon: 'build/icon.png',
    },
  },
  
  // Build optimization settings
  optimization: {
    // Exclude unnecessary files from the build
    excludePatterns: [
      '**/node_modules/*/{test,__tests__,tests,powered-test,example,examples}/**/*',
      '**/node_modules/*.d.ts',
      '**/node_modules/.bin',
      '**/*.{iml,o,hprof,orig,pyc,pyo,rbc,swp,csproj,sln,xproj}',
      '**/{.DS_Store,.git,.hg,.svn,CVS,RCS,SCCS,.gitignore,.gitattributes}',
      '**/{__pycache__,thumbs.db,.flowconfig,.idea,.vs,.nyc_output}',
      '**/{appveyor.yml,.travis.yml,circle.yml}',
      '**/{npm-debug.log,yarn.lock,.yarn-integrity,.yarn-metadata.json}',
    ],
    
    // Compression settings
    compression: 'maximum',
    
    // Code signing (requires certificates)
    codeSign: process.env.NODE_ENV === 'production',
  },
  
  // Metadata
  metadata: {
    name: 'Code Kata App',
    description: 'Desktop application for code katas with local execution and AI-powered judging',
    author: 'Code Kata App',
    version: packageJson.version,
    homepage: 'https://github.com/code-kata-app/code-kata-electron-app',
    repository: 'https://github.com/code-kata-app/code-kata-electron-app',
  },
};

export default buildConfig;