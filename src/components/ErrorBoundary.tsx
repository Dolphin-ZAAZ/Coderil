import React, { Component, ReactNode } from 'react'
import { ErrorBoundaryState } from '@/types'
import { errorHandler } from '@/services/error-handler'
import './ErrorBoundary.css'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: Error, errorInfo: any, retry: () => void) => ReactNode
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    this.setState({
      error,
      errorInfo
    })

    // Log error through global error handler
    errorHandler.handleError(error, {
      component: 'ErrorBoundary',
      errorInfo,
      stack: errorInfo.componentStack
    })
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.state.errorInfo, this.handleRetry)
      }

      // Default error UI
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-boundary-icon">⚠️</div>
            <h2 className="error-boundary-title">Something went wrong</h2>
            <p className="error-boundary-message">
              An unexpected error occurred in the application. You can try refreshing the page or restarting the application.
            </p>
            
            <div className="error-boundary-actions">
              <button 
                className="error-boundary-button primary"
                onClick={this.handleRetry}
              >
                Try Again
              </button>
              <button 
                className="error-boundary-button"
                onClick={() => window.location.reload()}
              >
                Refresh Page
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && (
              <details className="error-boundary-details">
                <summary>Error Details (Development)</summary>
                <div className="error-boundary-stack">
                  <h4>Error:</h4>
                  <pre>{this.state.error.message}</pre>
                  
                  <h4>Stack Trace:</h4>
                  <pre>{this.state.error.stack}</pre>
                  
                  {this.state.errorInfo && (
                    <>
                      <h4>Component Stack:</h4>
                      <pre>{this.state.errorInfo.componentStack}</pre>
                    </>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Higher-order component for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: (error: Error, errorInfo: any, retry: () => void) => ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}

export default ErrorBoundary