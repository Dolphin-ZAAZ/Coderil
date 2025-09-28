import { useEffect, useCallback } from 'react'
import { 
  AppError, 
  ErrorRecoveryOptions,
  FileSystemError,
  ExecutionError,
  AIServiceError,
  DatabaseError
} from '@/types'
import { errorHandler } from '@/services/error-handler'

export function useErrorHandler() {
  // Generic error handler
  const handleError = useCallback((
    error: Error | AppError, 
    context?: Record<string, any>, 
    recoveryOptions?: ErrorRecoveryOptions
  ): AppError => {
    return errorHandler.handleError(error, context, recoveryOptions)
  }, [])

  // Specific error handlers
  const handleFileSystemError = useCallback((
    error: FileSystemError, 
    context?: Record<string, any>
  ): AppError => {
    return errorHandler.handleFileSystemError(error, context)
  }, [])

  const handleExecutionError = useCallback((
    error: ExecutionError, 
    context?: Record<string, any>
  ): AppError => {
    return errorHandler.handleExecutionError(error, context)
  }, [])

  const handleAIServiceError = useCallback((
    error: AIServiceError, 
    context?: Record<string, any>
  ): AppError => {
    return errorHandler.handleAIServiceError(error, context)
  }, [])

  const handleDatabaseError = useCallback((
    error: DatabaseError, 
    context?: Record<string, any>
  ): AppError => {
    return errorHandler.handleDatabaseError(error, context)
  }, [])

  const handleNetworkError = useCallback((
    error: Error, 
    context?: Record<string, any>
  ): AppError => {
    return errorHandler.handleNetworkError(error, context)
  }, [])

  // Async operation wrapper with error handling
  const withErrorHandling = useCallback(<T>(
    operation: () => Promise<T>,
    context?: Record<string, any>,
    recoveryOptions?: ErrorRecoveryOptions
  ) => {
    return async (): Promise<T | null> => {
      try {
        return await operation()
      } catch (error) {
        handleError(error as Error, context, recoveryOptions)
        return null
      }
    }
  }, [handleError])

  // Sync operation wrapper with error handling
  const withSyncErrorHandling = useCallback(<T>(
    operation: () => T,
    context?: Record<string, any>,
    recoveryOptions?: ErrorRecoveryOptions
  ) => {
    return (): T | null => {
      try {
        return operation()
      } catch (error) {
        handleError(error as Error, context, recoveryOptions)
        return null
      }
    }
  }, [handleError])

  return {
    handleError,
    handleFileSystemError,
    handleExecutionError,
    handleAIServiceError,
    handleDatabaseError,
    handleNetworkError,
    withErrorHandling,
    withSyncErrorHandling
  }
}

// Hook for listening to errors
export function useErrorListener(callback: (error: AppError) => void) {
  useEffect(() => {
    const unsubscribe = errorHandler.onError(callback)
    return unsubscribe
  }, [callback])
}

// Hook for getting error log
export function useErrorLog() {
  const getErrorLog = useCallback(() => {
    return errorHandler.getErrorLog()
  }, [])

  const clearErrorLog = useCallback(() => {
    errorHandler.clearErrorLog()
  }, [])

  return {
    getErrorLog,
    clearErrorLog
  }
}

export default useErrorHandler