import { AIServiceError } from './ai-authoring'
import { errorHandler } from './error-handler'
import { AppError, ErrorRecoveryOptions } from '@/types'

/**
 * Specialized error handler for AI authoring operations
 */
export class AIAuthoringErrorHandler {
  private static instance: AIAuthoringErrorHandler

  static getInstance(): AIAuthoringErrorHandler {
    if (!AIAuthoringErrorHandler.instance) {
      AIAuthoringErrorHandler.instance = new AIAuthoringErrorHandler()
    }
    return AIAuthoringErrorHandler.instance
  }

  /**
   * Handle AI authoring errors with specific recovery options
   */
  handleError(
    error: AIServiceError | Error,
    context: {
      operation: string
      retryCallback?: () => Promise<void>
      fallbackCallback?: () => void
      [key: string]: any
    }
  ): AppError {
    let aiError: AIServiceError

    if (error instanceof AIServiceError) {
      aiError = error
    } else {
      aiError = new AIServiceError(error.message, {
        retryable: true,
        errorType: 'unknown',
        context: { originalError: error }
      })
    }

    // Create recovery options based on error type
    const recoveryOptions: ErrorRecoveryOptions = {}

    if (aiError.retryable && context.retryCallback) {
      recoveryOptions.retry = context.retryCallback
    }

    if (context.fallbackCallback) {
      recoveryOptions.fallback = context.fallbackCallback
    }

    // Add specific recovery actions based on error type
    switch (aiError.errorType) {
      case 'auth':
        recoveryOptions.fallback = () => {
          // Open settings to configure API key
          if (window.electronAPI && 'openSettings' in window.electronAPI) {
            (window.electronAPI as any).openSettings('ai')
          }
        }
        break

      case 'rate_limit':
        // Auto-retry after delay for rate limits
        if (context.retryCallback) {
          const retryAfter = aiError.context?.retryAfter || 60
          setTimeout(() => {
            context.retryCallback?.()
          }, retryAfter * 1000)
        }
        break

      case 'network':
        // Offer offline mode or cached results
        recoveryOptions.fallback = () => {
          this.handleNetworkFallback(context)
        }
        break

      case 'validation':
        // Offer to simplify the request
        recoveryOptions.fallback = () => {
          this.handleValidationFallback(context)
        }
        break
    }

    // Handle through global error handler
    return errorHandler.handleAIServiceError(aiError, context)
  }

  /**
   * Handle generation errors with specific context
   */
  handleGenerationError(
    error: AIServiceError | Error,
    request: any,
    retryCallback?: () => Promise<void>
  ): AppError {
    return this.handleError(error, {
      operation: 'kata_generation',
      request,
      retryCallback,
      fallbackCallback: () => this.handleGenerationFallback(request)
    })
  }

  /**
   * Handle variation generation errors
   */
  handleVariationError(
    error: AIServiceError | Error,
    sourceKata: any,
    options: any,
    retryCallback?: () => Promise<void>
  ): AppError {
    return this.handleError(error, {
      operation: 'variation_generation',
      sourceKata,
      options,
      retryCallback,
      fallbackCallback: () => this.handleVariationFallback(sourceKata, options)
    })
  }

  /**
   * Handle file saving errors
   */
  handleSaveError(
    error: AIServiceError | Error,
    content: any,
    retryCallback?: () => Promise<void>
  ): AppError {
    return this.handleError(error, {
      operation: 'file_save',
      content,
      retryCallback,
      fallbackCallback: () => this.handleSaveFallback(content)
    })
  }

  /**
   * Handle validation errors
   */
  handleValidationError(
    error: AIServiceError | Error,
    content: any,
    retryCallback?: () => Promise<void>
  ): AppError {
    return this.handleError(error, {
      operation: 'content_validation',
      content,
      retryCallback,
      fallbackCallback: () => this.handleValidationFallback({ content })
    })
  }

  /**
   * Get user-friendly error message for AI authoring errors
   */
  getUserFriendlyMessage(error: AIServiceError): string {
    const baseMessage = error.getUserFriendlyMessage()
    
    // Add context-specific information
    switch (error.errorType) {
      case 'auth':
        return `${baseMessage}\n\nTo fix this:\n1. Go to Settings\n2. Enter your OpenAI API key\n3. Make sure your key has sufficient credits`
      
      case 'rate_limit':
        const retryAfter = error.context?.retryAfter || 60
        return `${baseMessage}\n\nThe system will automatically retry in ${retryAfter} seconds, or you can try again later.`
      
      case 'network':
        return `${baseMessage}\n\nPlease check your internet connection and try again. If you're using a VPN, try disabling it temporarily.`
      
      case 'validation':
        return `${baseMessage}\n\nTry simplifying your kata description or changing the generation parameters.`
      
      case 'timeout':
        return `${baseMessage}\n\nThis usually happens with complex requests. Try breaking down your kata into simpler parts.`
      
      default:
        return baseMessage
    }
  }

  /**
   * Get recovery suggestions for AI authoring errors
   */
  getRecoverySuggestions(error: AIServiceError): string[] {
    const baseSuggestions = error.getRecoverySuggestions()
    
    // Add AI authoring specific suggestions
    const suggestions = [...baseSuggestions]
    
    switch (error.errorType) {
      case 'auth':
        suggestions.push(
          'Visit OpenAI\'s website to check your account status',
          'Make sure you\'re using the correct API key format'
        )
        break
      
      case 'validation':
        suggestions.push(
          'Try generating a simpler kata first',
          'Check if your description contains any unusual characters',
          'Make sure the selected language supports your kata type'
        )
        break
      
      case 'timeout':
        suggestions.push(
          'Break complex katas into smaller parts',
          'Reduce the number of requirements in your description',
          'Try generating without hidden tests first'
        )
        break
    }
    
    return suggestions
  }

  /**
   * Private fallback handlers
   */
  private handleNetworkFallback(context: any): void {
    console.log('Network fallback for AI authoring:', context.operation)
    // Could implement offline mode or cached templates
  }

  private handleGenerationFallback(request: any): void {
    console.log('Generation fallback for request:', request)
    // Could offer to use templates or simplified generation
  }

  private handleVariationFallback(sourceKata: any, options: any): void {
    console.log('Variation fallback for:', sourceKata.slug, options)
    // Could offer manual variation creation
  }

  private handleSaveFallback(content: any): void {
    console.log('Save fallback for content:', content.metadata?.slug)
    // Could offer to export as JSON or save to different location
  }

  private handleValidationFallback(context: any): void {
    console.log('Validation fallback for:', context)
    // Could offer to skip validation or use simplified content
  }
}

// Export singleton instance
export const aiAuthoringErrorHandler = AIAuthoringErrorHandler.getInstance()
export default aiAuthoringErrorHandler