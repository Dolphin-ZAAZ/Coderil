# Build and Distribution Guide

This document describes how to build and distribute the Code Kata Electron App across different platforms.

## Prerequisites

### Development Environment
- Node.js 18+ 
- npm or yarn
- Git

### Platform-Specific Requirements

#### Windows
- Windows 10+ (for building Windows targets)
- Optional: Code signing certificate for Windows Store distribution

#### macOS
- macOS 10.15+ (for building macOS targets)
- Xcode Command Line Tools
- Optional: Apple Developer account for code signing and notarization

#### Linux
- Linux distribution with standard build tools
- `fakeroot` and `rpm` packages for building DEB and RPM packages

## Build Scripts

### Development Builds

```bash
# Build for development (no packaging)
npm run build:dev

# Test build configuration without full packaging
npm run build:test
```

### Production Builds

```bash
# Build for current platform
npm run build

# Build for specific platform
npm run build:platform windows
npm run build:platform mac
npm run build:platform linux
npm run build:platform all

# Direct electron-builder commands
npm run dist           # Current platform
npm run dist:win       # Windows
npm run dist:mac       # macOS  
npm run dist:linux     # Linux
npm run dist:all       # All platforms
```

### Package Testing

```bash
# Create unpacked directory (for testing)
npm run pack
```

## Build Configuration

The build configuration is defined in `package.json` under the `build` section and includes:

### Application Metadata
- **App ID**: `com.codekata.app`
- **Product Name**: Code Kata App
- **Copyright**: Copyright © 2025 Code Kata App
- **License**: MIT

### Platform Targets

#### Windows
- **Formats**: NSIS installer, Portable executable
- **Architectures**: x64, ia32
- **Features**: 
  - Desktop shortcut creation
  - Start menu integration
  - File association for `.kata` files
  - Uninstaller with app data cleanup option

#### macOS
- **Formats**: DMG disk image, ZIP archive
- **Architectures**: x64 (Intel), arm64 (Apple Silicon)
- **Features**:
  - Universal binaries for both architectures
  - Dark mode support
  - Hardened runtime for security
  - Gatekeeper compatibility

#### Linux
- **Formats**: AppImage, DEB package, RPM package
- **Architecture**: x64
- **Features**:
  - Desktop integration
  - Dependency declarations for Python and Node.js
  - Standard Linux application structure

## Build Assets

### Icons
- **Windows**: `build/icon.ico` (multi-resolution ICO file)
- **macOS**: `build/icon.icns` (Apple icon format)
- **Linux**: `build/icon.png` (512x512 PNG)

### Installer Assets
- **macOS DMG**: `build/background.png` (540x380 background image)
- **Windows NSIS**: `build/installer.nsh` (custom installer script)
- **macOS Entitlements**: `build/entitlements.mac.plist` (security permissions)

## Code Signing (Optional)

### Environment Variables

For automated code signing, set these environment variables:

#### Windows
```bash
WIN_CSC_LINK=path/to/certificate.p12
WIN_CSC_KEY_PASSWORD=certificate_password
```

#### macOS
```bash
MAC_CSC_LINK=path/to/certificate.p12
MAC_CSC_KEY_PASSWORD=certificate_password
APPLE_ID=your_apple_id@example.com
APPLE_ID_PASSWORD=app_specific_password
```

### Manual Code Signing

If certificates are not configured, electron-builder will skip code signing and produce unsigned binaries.

## Build Optimization

### File Exclusions
The build automatically excludes:
- Development dependencies
- Test files and directories
- Documentation files
- Source maps (in production)
- Unnecessary node_modules content

### Bundle Size Optimization
- Tree shaking for unused code
- Asset compression
- Native module rebuilding for target platform

## Distribution

### File Locations
Built applications are output to the `release/` directory:

```
release/
├── Code Kata App-1.0.0.dmg              # macOS DMG
├── Code Kata App-1.0.0-mac.zip          # macOS ZIP
├── Code Kata App Setup 1.0.0.exe        # Windows installer
├── Code Kata App 1.0.0.exe              # Windows portable
├── Code Kata App-1.0.0.AppImage         # Linux AppImage
├── code-kata-app_1.0.0_amd64.deb        # Linux DEB
└── code-kata-app-1.0.0.x86_64.rpm       # Linux RPM
```

### Installation Sizes
- **Windows**: ~150-200 MB (installed)
- **macOS**: ~120-180 MB (app bundle)
- **Linux**: ~140-190 MB (extracted)

## Troubleshooting

### Common Issues

#### Build Fails on Native Dependencies
```bash
# Rebuild native modules
npm run postinstall
```

#### Missing Icons
Ensure all icon files exist in the `build/` directory. Placeholder files are provided but should be replaced with actual icons.

#### Code Signing Errors
- Verify certificate paths and passwords
- Check certificate validity and permissions
- Ensure proper entitlements for macOS

#### Large Bundle Size
- Check for unnecessary dependencies in `package.json`
- Verify file exclusion patterns in build configuration
- Use `npm run pack` to inspect bundle contents

### Platform-Specific Issues

#### Windows
- Ensure Windows SDK is installed for native modules
- Check antivirus software isn't blocking the build process

#### macOS
- Install Xcode Command Line Tools: `xcode-select --install`
- For notarization, ensure Apple ID has app-specific password

#### Linux
- Install required system packages: `sudo apt-get install fakeroot rpm`
- Ensure proper permissions for AppImage creation

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build and Release

on:
  push:
    tags: ['v*']

jobs:
  build:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    
    runs-on: ${{ matrix.os }}
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          
      - run: npm ci
      - run: npm run build:test
      - run: npm run dist
      
      - uses: actions/upload-artifact@v3
        with:
          name: release-${{ matrix.os }}
          path: release/
```

This configuration will build the application for all supported platforms and upload the artifacts for distribution.