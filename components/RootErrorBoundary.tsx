'use client';

import { ErrorBoundary } from './ErrorBoundary';

interface RootErrorBoundaryProps {
  children: React.ReactNode;
}

export function RootErrorBoundary({ children }: RootErrorBoundaryProps) {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log error to console in development
        if (process.env.NODE_ENV === 'development') {
          console.error('Global error boundary caught:', error, errorInfo);
        }
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
