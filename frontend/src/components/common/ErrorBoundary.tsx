import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flexh-screen w-full items-center justify-center p-4 text-center">
          <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm">
            <h2 className="mb-2 text-xl font-bold text-red-700">Something went wrong</h2>
            <p className="text-red-600 mb-4 text-sm">
              An unexpected error occurred in the application interface.
            </p>
            {this.state.error && (
              <pre className="mt-4 rounded bg-red-100 p-2 text-left text-xs text-red-800 overflow-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <button
              className="mt-6 rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700 font-medium"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
