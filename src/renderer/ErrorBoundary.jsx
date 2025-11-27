import React from 'react';

/**
 * Error Boundary Component
 * Catches JavaScript errors in child components and reports them to Sentry
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Store error info in state
    this.setState({ errorInfo });

    // Report to Sentry via IPC
    if (window.pcHealthAPI && window.pcHealthAPI.reportError) {
      window.pcHealthAPI.reportError({
        message: error.message,
        name: error.name,
        stack: error.stack,
        componentStack: errorInfo?.componentStack
      }, {
        component: 'ErrorBoundary',
        props: this.props.fallbackProps || {}
      }).catch(err => {
        console.error('Failed to report error to Sentry:', err);
      });
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-container">
          <div className="error-boundary-content">
            <div className="error-icon-large">
              <span role="img" aria-label="error">💥</span>
            </div>

            <h2>Something went wrong</h2>
            <p className="error-message">
              The application encountered an unexpected error. This has been automatically reported to help us fix it.
            </p>

            {this.state.error && (
              <div className="error-details">
                <details>
                  <summary>Technical Details</summary>
                  <div className="error-stack">
                    <strong>Error:</strong>
                    <pre>{this.state.error.toString()}</pre>
                    {this.state.error.stack && (
                      <>
                        <strong>Stack Trace:</strong>
                        <pre>{this.state.error.stack}</pre>
                      </>
                    )}
                    {this.state.errorInfo?.componentStack && (
                      <>
                        <strong>Component Stack:</strong>
                        <pre>{this.state.errorInfo.componentStack}</pre>
                      </>
                    )}
                  </div>
                </details>
              </div>
            )}

            <div className="error-actions">
              <button
                className="error-button primary"
                onClick={this.handleReload}
              >
                Reload Application
              </button>
              <button
                className="error-button secondary"
                onClick={this.handleReset}
              >
                Try Again
              </button>
            </div>

            <p className="error-support">
              If this problem persists, please check the logs or contact support.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
