#!/usr/bin/env node

/**
 * Test configuration script for Code Kata Electron App
 * Tests build configuration without native module compilation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Testing build configuration...');

try {
  // Step 1: Verify package.json build configuration
  console.log('📋 Verifying package.json configuration...');
  
  const packagePath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packagePath)) {
    throw new Error('package.json not found');
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  // Check required build configuration
  const requiredBuildFields = ['appId', 'productName', 'directories', 'files'];
  const missingFields = requiredBuildFields.filter(field => !packageJson.build?.[field]);
  
  if (missingFields.length > 0) {
    throw new Error(`Missing build configuration fields: ${missingFields.join(', ')}`);
  }
  
  console.log('✅ Package.json build configuration is valid');
  
  // Step 2: Verify build assets exist
  console.log('🎨 Verifying build assets...');
  
  const buildDir = path.join(process.cwd(), 'build');
  if (!fs.existsSync(buildDir)) {
    throw new Error('Build directory not found');
  }
  
  const requiredAssets = [
    'icon.png',
    'icon.ico', 
    'icon.icns',
    'entitlements.mac.plist',
    'installer.nsh'
  ];
  
  const missingAssets = requiredAssets.filter(asset => 
    !fs.existsSync(path.join(buildDir, asset))
  );
  
  if (missingAssets.length > 0) {
    console.warn(`⚠️  Missing build assets: ${missingAssets.join(', ')}`);
    console.warn('   These should be replaced with actual assets for production builds');
  } else {
    console.log('✅ All build assets are present');
  }
  
  // Step 3: Verify build scripts
  console.log('📜 Verifying build scripts...');
  
  const requiredScripts = [
    'build', 'build:dev', 'dist', 'dist:win', 'dist:mac', 'dist:linux', 'pack'
  ];
  
  const missingScripts = requiredScripts.filter(script => !packageJson.scripts?.[script]);
  
  if (missingScripts.length > 0) {
    throw new Error(`Missing build scripts: ${missingScripts.join(', ')}`);
  }
  
  console.log('✅ All build scripts are configured');
  
  // Step 4: Verify platform configurations
  console.log('🖥️  Verifying platform configurations...');
  
  const platforms = ['win', 'mac', 'linux'];
  const missingPlatforms = platforms.filter(platform => !packageJson.build?.[platform]);
  
  if (missingPlatforms.length > 0) {
    console.warn(`⚠️  Missing platform configurations: ${missingPlatforms.join(', ')}`);
  } else {
    console.log('✅ All platform configurations are present');
  }
  
  // Step 5: Check for LICENSE file
  console.log('📄 Verifying LICENSE file...');
  
  const licensePath = path.join(process.cwd(), 'LICENSE');
  if (!fs.existsSync(licensePath)) {
    console.warn('⚠️  LICENSE file not found - required for some distribution formats');
  } else {
    console.log('✅ LICENSE file is present');
  }
  
  // Step 6: Display configuration summary
  console.log('\n📊 Build Configuration Summary:');
  console.log(`   App ID: ${packageJson.build.appId}`);
  console.log(`   Product Name: ${packageJson.build.productName}`);
  console.log(`   Version: ${packageJson.version}`);
  console.log(`   Output Directory: ${packageJson.build.directories.output}`);
  
  console.log('\n🎯 Platform Targets:');
  if (packageJson.build.win) {
    const targets = packageJson.build.win.target || [];
    console.log(`   Windows: ${targets.map(t => t.target || t).join(', ')}`);
  }
  if (packageJson.build.mac) {
    const targets = packageJson.build.mac.target || [];
    console.log(`   macOS: ${targets.map(t => t.target || t).join(', ')}`);
  }
  if (packageJson.build.linux) {
    const targets = packageJson.build.linux.target || [];
    console.log(`   Linux: ${targets.map(t => t.target || t).join(', ')}`);
  }
  
  console.log('\n✅ Build configuration test completed successfully!');
  console.log('🎉 Configuration is valid and ready for distribution builds.');
  console.log('\n💡 Next steps:');
  console.log('   1. Replace placeholder icons with actual application icons');
  console.log('   2. Test actual packaging with: npm run pack');
  console.log('   3. Build for distribution with: npm run dist');
  
} catch (error) {
  console.error('❌ Configuration test failed:', error.message);
  process.exit(1);
}