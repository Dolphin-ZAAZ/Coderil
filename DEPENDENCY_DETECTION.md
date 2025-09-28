# Runtime Dependency Detection

The Code Kata Electron App includes a comprehensive runtime dependency detection system that checks for the availability of required programming language runtimes and compilers.

## Overview

The dependency detection system automatically checks for:
- **Python 3.8+** - Required for Python kata execution
- **Node.js 18+** - Required for JavaScript/TypeScript kata execution  
- **C++ Compiler** - Required for C++ kata execution (supports GCC, Clang, MSVC)

## How It Works

### Startup Check
The application automatically checks dependencies when it starts:
1. Main process runs dependency checks during app initialization
2. Results are sent to the renderer process via IPC
3. Warning UI is displayed if any dependencies are missing

### Manual Refresh
Users can manually refresh dependency status:
- Click "Refresh" button in the dependency warning
- Calls `window.electronAPI.checkDependencies()` to re-check

### Warning Display
When dependencies are missing:
- Yellow warning banner appears at the top of the app
- Shows count of missing dependencies
- Expandable details show specific issues and installation guides
- Can be dismissed (will reappear on app restart)

## Implementation Details

### DependencyChecker Service
Located in `src/services/dependency-checker.ts`:
- Singleton pattern for consistent state
- Uses `child_process.spawn()` to check command availability
- 5-second timeout per command check
- Platform-specific installation guides

### React Integration
- `useDependencyChecker` hook manages state and IPC communication
- `DependencyWarning` component displays user-friendly warnings
- Integrated into main App component

### IPC Communication
- `check-dependencies` - Manual dependency check
- `dependency-status` - Startup dependency status broadcast

## Platform Support

### Windows
- Python: `python --version` or `python3 --version`
- Node.js: `node --version`
- C++: `g++ --version`, `clang++ --version`, or `cl --version`

### macOS
- Python: `python3 --version`
- Node.js: `node --version`  
- C++: `clang++ --version` or `g++ --version`

### Linux
- Python: `python3 --version`
- Node.js: `node --version`
- C++: `g++ --version` or `clang++ --version`

## Installation Guides

The system provides platform-specific installation guidance:

### Python
- **Windows**: Install from python.org or Microsoft Store
- **macOS**: Use Homebrew (`brew install python`)
- **Linux**: Use package manager (`sudo apt install python3`)

### Node.js
- **Windows**: Install from nodejs.org or use Chocolatey
- **macOS**: Use Homebrew (`brew install node`)
- **Linux**: Use NodeSource repository or package manager

### C++ Compiler
- **Windows**: Visual Studio Build Tools or MinGW-w64
- **macOS**: Xcode Command Line Tools (`xcode-select --install`)
- **Linux**: build-essential package (`sudo apt install build-essential`)

## Error Handling

The system gracefully handles various error conditions:
- Command not found (dependency missing)
- Command timeout (5 seconds)
- Version parsing failures
- Permission errors
- Network connectivity issues (for installation guides)

## Testing

### Unit Tests
- Mock `child_process.spawn()` for controlled testing
- Test success/failure scenarios
- Validate error handling and timeouts

### Integration Tests
- Test against real system dependencies
- Verify actual command execution
- Validate installation guide accuracy

### Component Tests
- Test React component rendering
- Verify user interaction handling
- Test state management and IPC integration

## Future Enhancements

Potential improvements:
- Cache dependency status to reduce startup time
- Add version requirement checking (e.g., Python 3.8+ specifically)
- Support for additional languages (Rust, Go, Java)
- Automatic installation suggestions/links
- Dependency status in system tray
- Integration with package managers for one-click installation