# Native Dependencies Guide

This document explains how to handle native dependencies (like better-sqlite3) when building the Code Kata Electron App.

## The Challenge

The app uses `better-sqlite3`, a native Node.js module that requires compilation for the target platform. This can cause build issues when:

1. Visual Studio Build Tools aren't installed (Windows)
2. Xcode Command Line Tools aren't available (macOS)
3. Build tools are missing (Linux)
4. Cross-platform building from different host systems

## Solutions

### Option 1: Install Build Tools (Recommended for Development)

#### Windows
Install Visual Studio Build Tools with C++ workload:
```bash
# Using chocolatey
choco install visualstudio2022buildtools --package-parameters "--add Microsoft.VisualStudio.Workload.VCTools"

# Or download from Microsoft:
# https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022
```

#### macOS
```bash
xcode-select --install
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt-get install build-essential python3-dev
```

#### Linux (CentOS/RHEL)
```bash
sudo yum groupinstall "Development Tools"
sudo yum install python3-devel
```

### Option 2: Use Prebuilt Binaries

Configure npm to use prebuilt binaries when available:

```bash
# Set npm configuration
npm config set target_platform win32  # or darwin, linux
npm config set target_arch x64
npm config set runtime electron
npm config set cache_lock_retries 10
npm config set node_gyp_cache_lock_retries 10

# Force rebuild with electron version
npm run postinstall
```

### Option 3: Docker Build Environment

Use Docker for consistent cross-platform builds:

```dockerfile
# Dockerfile.build
FROM node:18-alpine

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build:dev
RUN npm run pack

# Extract built files
VOLUME ["/app/release"]
```

Build with Docker:
```bash
docker build -f Dockerfile.build -t kata-app-builder .
docker run --rm -v $(pwd)/release:/app/release kata-app-builder
```

### Option 4: GitHub Actions CI/CD

Use GitHub Actions for automated cross-platform builds:

```yaml
# .github/workflows/build.yml
name: Build and Release

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  build:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        
    runs-on: ${{ matrix.os }}
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build application
        run: npm run build:dev
        
      - name: Package application
        run: npm run dist
        env:
          # Code signing certificates (if available)
          CSC_LINK: ${{ secrets.CSC_LINK }}
          CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}
          # macOS notarization (if available)
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_ID_PASSWORD: ${{ secrets.APPLE_ID_PASSWORD }}
          
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: release-${{ matrix.os }}
          path: release/
```

## Alternative Database Options

If native dependencies continue to cause issues, consider these alternatives:

### Option A: sql.js (WebAssembly SQLite)
Already included as a dependency. Modify the database service to use sql.js instead of better-sqlite3:

```typescript
// src/services/database-wasm.ts
import initSqlJs from 'sql.js';

export class WasmDatabaseService {
  private SQL: any;
  private db: any;
  
  async initialize() {
    this.SQL = await initSqlJs({
      locateFile: file => `node_modules/sql.js/dist/${file}`
    });
    this.db = new this.SQL.Database();
    // Initialize schema...
  }
  
  // Implement same interface as DatabaseService
}
```

### Option B: IndexedDB (Browser Storage)
Use IndexedDB for persistence in the renderer process:

```typescript
// src/services/database-indexeddb.ts
export class IndexedDBService {
  private db: IDBDatabase;
  
  async initialize() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('KataApp', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      request.onupgradeneeded = (event) => {
        // Create object stores...
      };
    });
  }
}
```

## Build Troubleshooting

### Common Error Messages

#### "Could not find any Visual Studio installation to use"
- Install Visual Studio Build Tools with C++ workload
- Or use `npm config set msvs_version 2022`

#### "No Xcode or CLT version detected"
- Run `xcode-select --install`
- Or install full Xcode from App Store

#### "Python executable not found"
- Install Python 3.8+ and ensure it's in PATH
- Or use `npm config set python /path/to/python3`

#### "prebuild-install failed"
- Try `npm rebuild better-sqlite3`
- Or delete node_modules and run `npm ci`

### Debug Commands

```bash
# Check electron-builder configuration
npx electron-builder --help

# Verbose build output
DEBUG=electron-builder npm run dist

# Check native module compatibility
npx electron-rebuild --version

# Test without packaging
npm run build:test-config
```

## Production Recommendations

1. **Use CI/CD**: Build on clean environments with proper toolchains
2. **Code Signing**: Configure certificates for trusted distribution
3. **Auto-Updates**: Consider electron-updater for seamless updates
4. **Testing**: Test packages on clean systems before release
5. **Fallbacks**: Implement graceful degradation if native modules fail

## Performance Considerations

- **better-sqlite3**: Fastest, requires native compilation
- **sql.js**: Slower, but works everywhere (WebAssembly)
- **IndexedDB**: Browser-native, good for simple use cases

Choose based on your deployment requirements and build environment constraints.