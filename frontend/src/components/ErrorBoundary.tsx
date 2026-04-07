import { Component, ErrorInfo, ReactNode } from 'react';
import './ErrorBoundary.css';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary-container">
          <div className="error-boundary-content">
            <span className="error-boundary-icon">⚠️</span>
            <h1>Something went wrong</h1>
            <p>An unexpected error occurred in the application.</p>
            {(import.meta as any).env?.DEV && this.state.error && (
              <pre className="error-details">{this.state.error.toString()}</pre>
            )}
            <div className="error-boundary-actions">
              <button className="btn-secondary" onClick={this.handleGoHome}>
                Go to Homepage
              </button>
              <button className="btn-primary" onClick={this.handleReload}>
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
