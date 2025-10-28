import React, { ErrorInfo, ReactNode, Component } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in preview:", error, errorInfo);
  }
  
  componentDidUpdate(prevProps: Props) {
    // When the children prop changes (e.g., code is updated), reset the error state.
    // This allows the preview to recover from a runtime error once the code is fixed.
    if (prevProps.children !== this.props.children && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 m-4 bg-red-100 border-l-4 border-red-500 text-red-800">
          <h3 className="font-bold">Runtime Error</h3>
          <p>Your component crashed. Check the browser console for more details.</p>
          <pre className="mt-2 text-sm whitespace-pre-wrap bg-red-50 p-2 rounded">
            {this.state.error?.toString()}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
