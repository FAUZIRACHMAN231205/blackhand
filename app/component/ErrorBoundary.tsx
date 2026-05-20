'use client';

import React, { ReactNode, Component, ErrorInfo } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="bg-gradient-to-br from-gray-900 to-black rounded-lg p-8 border border-red-900/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-red-900/20 rounded-lg">
                  <AlertTriangle size={24} className="text-red-400" />
                </div>
                <h1 className="text-2xl font-cormorant font-medium">Something went wrong</h1>
              </div>

              <p className="text-gray-400 text-sm mb-4">
                An unexpected error occurred. Please try again or contact support if the problem persists.
              </p>

              <details className="mb-6">
                <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400 mb-2">
                  Error Details
                </summary>
                <pre className="bg-black/50 p-3 rounded text-xs text-gray-400 overflow-auto max-h-32 border border-gray-800">
                  {this.state.error.message}
                </pre>
              </details>

              <div className="flex gap-3">
                <button
                  onClick={this.handleReset}
                  className="flex-1 px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                >
                  Try Again
                </button>
                <Link
                  href="/"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm"
                >
                  <ArrowLeft size={16} />
                  Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
