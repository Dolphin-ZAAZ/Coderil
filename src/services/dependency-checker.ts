import { spawn } from 'child_process'
import { promisify } from 'util'

export interface DependencyStatus {
  name: string
  available: boolean
  version?: string
  error?: string
  installationGuide?: string
}

export interface SystemDependencies {
  python: DependencyStatus
  nodejs: DependencyStatus
  cpp: DependencyStatus
  allAvailable: boolean
}

export class DependencyChecker {
  private static instance: DependencyChecker

  public static getInstance(): DependencyChecker {
    if (!DependencyChecker.instance) {
      DependencyChecker.instance = new DependencyChecker()
    }
    return DependencyChecker.instance
  }

  /**
   * Check all runtime dependencies
   */
  public async checkAllDependencies(): Promise<SystemDependencies> {
    console.log('Checking system dependencies...')
    
    const [python, nodejs, cpp] = await Promise.all([
      this.checkPython(),
      this.checkNodeJS(),
      this.checkCppCompiler()
    ])

    const allAvailable = python.available && nodejs.available && cpp.available

    console.log('Dependency check results:', {
      python: python.available,
      nodejs: nodejs.available,
      cpp: cpp.available,
      allAvailable
    })

    return {
      python,
      nodejs,
      cpp,
      allAvailable
    }
  }

  /**
   * Check Python availability and version
   */
  private async checkPython(): Promise<DependencyStatus> {
    try {
      const result = await this.executeCommand('python', ['--version'])
      
      if (result.success && result.stdout) {
        const version = result.stdout.trim()
        console.log('Python found:', version)
        
        // Check if version is 3.8+
        const versionMatch = version.match(/Python (\d+)\.(\d+)/)
        if (versionMatch) {
          const major = parseInt(versionMatch[1])
          const minor = parseInt(versionMatch[2])
          
          if (major >= 3 && minor >= 8) {
            return {
              name: 'Python',
              available: true,
              version: version
            }
          } else {
            return {
              name: 'Python',
              available: false,
              version: version,
              error: 'Python 3.8+ is required',
              installationGuide: this.getPythonInstallationGuide()
            }
          }
        }
      }

      // Try python3 command as fallback
      const python3Result = await this.executeCommand('python3', ['--version'])
      if (python3Result.success && python3Result.stdout) {
        const version = python3Result.stdout.trim()
        console.log('Python3 found:', version)
        
        return {
          name: 'Python',
          available: true,
          version: version
        }
      }

      return {
        name: 'Python',
        available: false,
        error: 'Python not found in PATH',
        installationGuide: this.getPythonInstallationGuide()
      }
    } catch (error: any) {
      console.error('Python check failed:', error)
      return {
        name: 'Python',
        available: false,
        error: error.message,
        installationGuide: this.getPythonInstallationGuide()
      }
    }
  }

  /**
   * Check Node.js availability and version
   */
  private async checkNodeJS(): Promise<DependencyStatus> {
    try {
      const result = await this.executeCommand('node', ['--version'])
      
      if (result.success && result.stdout) {
        const version = result.stdout.trim()
        console.log('Node.js found:', version)
        
        // Check if version is 18+
        const versionMatch = version.match(/v(\d+)\.(\d+)/)
        if (versionMatch) {
          const major = parseInt(versionMatch[1])
          
          if (major >= 18) {
            return {
              name: 'Node.js',
              available: true,
              version: version
            }
          } else {
            return {
              name: 'Node.js',
              available: false,
              version: version,
              error: 'Node.js 18+ is required',
              installationGuide: this.getNodeJSInstallationGuide()
            }
          }
        }
        
        // If we can't parse version but node exists, assume it's OK
        return {
          name: 'Node.js',
          available: true,
          version: version
        }
      }

      return {
        name: 'Node.js',
        available: false,
        error: 'Node.js not found in PATH',
        installationGuide: this.getNodeJSInstallationGuide()
      }
    } catch (error: any) {
      console.error('Node.js check failed:', error)
      return {
        name: 'Node.js',
        available: false,
        error: error.message,
        installationGuide: this.getNodeJSInstallationGuide()
      }
    }
  }

  /**
   * Check C++ compiler availability
   */
  private async checkCppCompiler(): Promise<DependencyStatus> {
    // Try different compilers in order of preference
    const compilers = [
      { command: 'g++', name: 'GCC' },
      { command: 'clang++', name: 'Clang' },
      { command: 'cl', name: 'MSVC' } // Windows Visual Studio compiler
    ]

    for (const compiler of compilers) {
      try {
        const result = await this.executeCommand(compiler.command, ['--version'])
        
        if (result.success) {
          const version = result.stdout?.trim() || result.stderr?.trim() || 'Unknown version'
          console.log(`${compiler.name} found:`, version)
          
          return {
            name: `C++ Compiler (${compiler.name})`,
            available: true,
            version: version.split('\n')[0] // Take first line only
          }
        }
      } catch (error) {
        // Continue to next compiler
        console.log(`${compiler.name} not available, trying next...`)
      }
    }

    return {
      name: 'C++ Compiler',
      available: false,
      error: 'No C++ compiler found (tried g++, clang++, cl)',
      installationGuide: this.getCppInstallationGuide()
    }
  }

  /**
   * Execute a command and return the result
   */
  private executeCommand(command: string, args: string[]): Promise<{
    success: boolean
    stdout?: string
    stderr?: string
    error?: string
  }> {
    return new Promise((resolve) => {
      const process = spawn(command, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
        timeout: 5000 // 5 second timeout
      })

      let stdout = ''
      let stderr = ''

      process.stdout?.on('data', (data) => {
        stdout += data.toString()
      })

      process.stderr?.on('data', (data) => {
        stderr += data.toString()
      })

      process.on('close', (code) => {
        resolve({
          success: code === 0,
          stdout: stdout || undefined,
          stderr: stderr || undefined
        })
      })

      process.on('error', (error) => {
        resolve({
          success: false,
          error: error.message
        })
      })
    })
  }

  /**
   * Get Python installation guide based on platform
   */
  private getPythonInstallationGuide(): string {
    const platform = process.platform
    
    switch (platform) {
      case 'win32':
        return 'Install Python from https://python.org/downloads/ or use Microsoft Store. Make sure to check "Add Python to PATH" during installation.'
      case 'darwin':
        return 'Install Python using Homebrew: "brew install python" or download from https://python.org/downloads/'
      case 'linux':
        return 'Install Python using your package manager: "sudo apt install python3" (Ubuntu/Debian) or "sudo yum install python3" (RHEL/CentOS)'
      default:
        return 'Install Python 3.8+ from https://python.org/downloads/ and ensure it\'s added to your PATH'
    }
  }

  /**
   * Get Node.js installation guide based on platform
   */
  private getNodeJSInstallationGuide(): string {
    const platform = process.platform
    
    switch (platform) {
      case 'win32':
        return 'Install Node.js from https://nodejs.org/downloads/ or use a package manager like Chocolatey: "choco install nodejs"'
      case 'darwin':
        return 'Install Node.js using Homebrew: "brew install node" or download from https://nodejs.org/downloads/'
      case 'linux':
        return 'Install Node.js using NodeSource repository or your package manager. See https://nodejs.org/en/download/package-manager/'
      default:
        return 'Install Node.js 18+ from https://nodejs.org/downloads/'
    }
  }

  /**
   * Get C++ compiler installation guide based on platform
   */
  private getCppInstallationGuide(): string {
    const platform = process.platform
    
    switch (platform) {
      case 'win32':
        return 'Install Visual Studio Build Tools or Visual Studio Community from https://visualstudio.microsoft.com/downloads/ or install MinGW-w64'
      case 'darwin':
        return 'Install Xcode Command Line Tools: "xcode-select --install" or install via Homebrew: "brew install gcc"'
      case 'linux':
        return 'Install build-essential: "sudo apt install build-essential" (Ubuntu/Debian) or "sudo yum groupinstall \'Development Tools\'" (RHEL/CentOS)'
      default:
        return 'Install a C++ compiler (GCC, Clang, or MSVC) and ensure it\'s available in your PATH'
    }
  }
}