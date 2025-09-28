import { 
  AppError, 
  ErrorNotification, 
  ErrorAction,
  ErrorRecoveryOptions,
  FileSystemError,
  ExecutionError,
  AIServiceError,
  DatabaseError
} from '@/types'

class GlobalErrorHandler {
  private errorListeners: ((error: AppError) => void)[] = []
  private notificationListeners: ((notification: ErrorNotification) => void)[] = []
  private errorLog: AppError[] = []

  // Subscribe to error events
  onError(callback: (error: AppError) => void): () => void {
    this.errorListeners.push(callback)
    return () => {
      const index = this.errorListeners.indexOf(callback)
      if (index > -1) {
        this.errorListeners.splice(index, 1)
      }
    }
  }

  // Subscribe to notification events
  onNotification(callback: (notification: ErrorNotification) => void): () => void {
    this.notificationListeners.push(callback)
    return () => {
      const index = this.notificationListeners.indexOf(callback)
      if (index > -1) {
        this.notificationListeners.splice(index, 1)
      }
    }
  }

  // Handle different types of errors
  handleError(error: Error | AppError, context?: Record<string, any>, recoveryOptions?: ErrorRecoveryOptions): AppError {
    let appError: AppError

    if (this.isAppError(error)) {
      appError = error
    } else {
      appError = this.createAppError(error, context)
    }

    // Log error
    this.logError(appError)

    // Notify listeners
    this.notifyError(appError)

    // Create notification with recovery actions
    this.createNotification(appError, recoveryOptions)

    return appError
  }

  // Handle file system errors
  handleFileSystemError(error: FileSystemError, context?: Record<string, any>): AppError {
    const appError: AppError = {
      type: 'FILE_SYSTEM_ERROR',
      message: this.getFileSystemErrorMessage(error),
      details: error.message,
      timestamp: new Date(),
      recoverable: this.isFileSystemErrorRecoverable(error),
      context: { ...context, code: error.code, path: error.path },
      stack: error.stack
    }

    return this.handleError(appError, context, {
      retry: context?.retry as (() => Promise<void>) | undefined,
      fallback: () => this.handleFileSystemFallback(error)
    })
  }

  // Handle execution errors
  handleExecutionError(error: ExecutionError, context?: Record<string, any>): AppError {
    const appError: AppError = {
      type: 'EXECUTION_ERROR',
      message: this.getExecutionErrorMessage(error),
      details: error.stderr || error.message,
      timestamp: new Date(),
      recoverable: !error.timeout,
      context: { ...context, exitCode: error.exitCode, timeout: error.timeout },
      stack: error.stack
    }

    return this.handleError(appError, context, {
      retry: context?.retry as (() => Promise<void>) | undefined,
      fallback: () => this.handleExecutionFallback(error)
    })
  }

  // Handle AI service errors
  handleAIServiceError(error: AIServiceError, context?: Record<string, any>): AppError {
    const appError: AppError = {
      type: 'AI_SERVICE_ERROR',
      message: this.getAIServiceErrorMessage(error),
      details: error.message,
      timestamp: new Date(),
      recoverable: error.retryable || false,
      context: { ...context, statusCode: error.statusCode },
      stack: error.stack
    }

    return this.handleError(appError, context, {
      retry: error.retryable ? (context?.retry as (() => Promise<void>) | undefined) : undefined,
      fallback: () => this.handleAIServiceFallback(error)
    })
  }

  // Handle database errors
  handleDatabaseError(error: DatabaseError, context?: Record<string, any>): AppError {
    const appError: AppError = {
      type: 'DATABASE_ERROR',
      message: this.getDatabaseErrorMessage(error),
      details: error.message,
      timestamp: new Date(),
      recoverable: this.isDatabaseErrorRecoverable(error),
      context: { ...context, code: error.code, constraint: error.constraint },
      stack: error.stack
    }

    return this.handleError(appError, context, {
      retry: context?.retry as (() => Promise<void>) | undefined,
      fallback: () => this.handleDatabaseFallback(error)
    })
  }

  // Handle network errors
  handleNetworkError(error: Error, context?: Record<string, any>): AppError {
    const appError: AppError = {
      type: 'NETWORK_ERROR',
      message: 'Network connection failed',
      details: error.message,
      timestamp: new Date(),
      recoverable: true,
      context,
      stack: error.stack
    }

    return this.handleError(appError, context, {
      retry: context?.retry as (() => Promise<void>) | undefined,
      fallback: () => this.handleNetworkFallback()
    })
  }

  // Get error history
  getErrorLog(): AppError[] {
    return [...this.errorLog]
  }

  // Clear error log
  clearErrorLog(): void {
    this.errorLog = []
  }

  // Private helper methods
  private isAppError(error: any): error is AppError {
    return error && typeof error === 'object' && 'type' in error && 'timestamp' in error
  }

  private createAppError(error: Error, context?: Record<string, any>): AppError {
    return {
      type: 'UNKNOWN_ERROR',
      message: error.message || 'An unknown error occurred',
      details: error.stack,
      timestamp: new Date(),
      recoverable: false,
      context,
      stack: error.stack
    }
  }

  private logError(error: AppError): void {
    // Add to in-memory log
    this.errorLog.push(error)

    // Keep only last 100 errors
    if (this.errorLog.length > 100) {
      this.errorLog = this.errorLog.slice(-100)
    }

    // Console logging for development
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorHandler]', error)
    }

    // TODO: Add file logging for production
  }

  private notifyError(error: AppError): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(error)
      } catch (err) {
        console.error('Error in error listener:', err)
      }
    })
  }

  private createNotification(error: AppError, recoveryOptions?: ErrorRecoveryOptions): void {
    const actions: ErrorAction[] = []

    if (recoveryOptions?.retry) {
      actions.push({
        label: 'Retry',
        action: async () => {
          try {
            await recoveryOptions.retry!()
          } catch (err) {
            this.handleError(err as Error)
          }
        },
        primary: true
      })
    }

    if (recoveryOptions?.fallback) {
      actions.push({
        label: 'Use Fallback',
        action: recoveryOptions.fallback
      })
    }

    if (recoveryOptions?.ignore) {
      actions.push({
        label: 'Ignore',
        action: recoveryOptions.ignore
      })
    }

    const notification: ErrorNotification = {
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      error,
      dismissed: false,
      actions: actions.length > 0 ? actions : undefined
    }

    this.notificationListeners.forEach(listener => {
      try {
        listener(notification)
      } catch (err) {
        console.error('Error in notification listener:', err)
      }
    })
  }

  // Error message generators
  private getFileSystemErrorMessage(error: FileSystemError): string {
    switch (error.code) {
      case 'ENOENT':
        return `File or directory not found: ${error.path || 'unknown path'}`
      case 'EACCES':
        return `Permission denied: ${error.path || 'unknown path'}`
      case 'EEXIST':
        return `File or directory already exists: ${error.path || 'unknown path'}`
      case 'ENOTDIR':
        return `Not a directory: ${error.path || 'unknown path'}`
      case 'EISDIR':
        return `Is a directory: ${error.path || 'unknown path'}`
      case 'EMFILE':
        return 'Too many open files'
      case 'ENOSPC':
        return 'No space left on device'
      default:
        return `File system error: ${error.message}`
    }
  }

  private getExecutionErrorMessage(error: ExecutionError): string {
    if (error.timeout) {
      return 'Code execution timed out'
    }
    if (error.exitCode !== undefined && error.exitCode !== 0) {
      return `Code execution failed with exit code ${error.exitCode}`
    }
    return 'Code execution failed'
  }

  private getAIServiceErrorMessage(error: AIServiceError): string {
    if (error.statusCode) {
      switch (error.statusCode) {
        case 401:
          return 'AI service authentication failed - check API key'
        case 403:
          return 'AI service access forbidden'
        case 429:
          return 'AI service rate limit exceeded - please try again later'
        case 500:
          return 'AI service internal error'
        case 503:
          return 'AI service temporarily unavailable'
        default:
          return `AI service error (${error.statusCode}): ${error.message}`
      }
    }
    return `AI service error: ${error.message}`
  }

  private getDatabaseErrorMessage(error: DatabaseError): string {
    if (error.code) {
      switch (error.code) {
        case 'SQLITE_BUSY':
          return 'Database is busy - please try again'
        case 'SQLITE_LOCKED':
          return 'Database is locked'
        case 'SQLITE_READONLY':
          return 'Database is read-only'
        case 'SQLITE_CORRUPT':
          return 'Database file is corrupted'
        case 'SQLITE_FULL':
          return 'Database disk is full'
        case 'SQLITE_CONSTRAINT':
          return `Database constraint violation: ${error.constraint || 'unknown'}`
        default:
          return `Database error (${error.code}): ${error.message}`
      }
    }
    return `Database error: ${error.message}`
  }

  // Recovery helpers
  private isFileSystemErrorRecoverable(error: FileSystemError): boolean {
    const recoverableCodes = ['ENOENT', 'ENOTDIR', 'EISDIR']
    return recoverableCodes.includes(error.code)
  }

  private isDatabaseErrorRecoverable(error: DatabaseError): boolean {
    const recoverableCodes = ['SQLITE_BUSY', 'SQLITE_LOCKED']
    return error.code ? recoverableCodes.includes(error.code) : false
  }

  // Fallback handlers
  private handleFileSystemFallback(error: FileSystemError): void {
    console.warn('Using file system fallback for:', error.code)
    // Could implement fallback strategies like using default files
  }

  private handleExecutionFallback(error: ExecutionError): void {
    console.warn('Using execution fallback for:', error.message)
    // Could implement fallback like showing cached results
  }

  private handleAIServiceFallback(error: AIServiceError): void {
    console.warn('Using AI service fallback for:', error.statusCode)
    // Could implement fallback like local validation
  }

  private handleDatabaseFallback(error: DatabaseError): void {
    console.warn('Using database fallback for:', error.code)
    // Could implement fallback like in-memory storage
  }

  private handleNetworkFallback(): void {
    console.warn('Using network fallback - working offline')
    // Could implement offline mode
  }
}

// Export singleton instance
export const errorHandler = new GlobalErrorHandler()
export default errorHandler