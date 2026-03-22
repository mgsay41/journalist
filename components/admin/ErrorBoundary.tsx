'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary for admin components.
 * Catches unhandled render errors so one broken component
 * cannot unmount the entire admin UI.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // In production Rollbar would capture this; console is stripped by compiler
    console.error('ErrorBoundary caught an error:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          role="alert"
          className="flex flex-col items-center justify-center p-8 rounded-lg border border-red-200 bg-red-50 text-center gap-4"
        >
          <p className="text-red-700 font-semibold text-lg">حدث خطأ غير متوقع</p>
          <p className="text-red-600 text-sm">
            {this.state.error?.message || 'يرجى إعادة تحميل الصفحة أو المحاولة مرة أخرى.'}
          </p>
          <button
            onClick={this.handleReset}
            className="px-4 py-2 rounded bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
          >
            حاول مرة أخرى
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
