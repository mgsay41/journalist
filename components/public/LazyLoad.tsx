'use client';

import { lazy, Suspense, ReactNode, useState, useRef, useEffect, ComponentType } from 'react';
import { Loading } from '@/components/ui/Loading';

interface LazyLoadProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * LazyLoad wrapper component with loading fallback
 */
export function LazyLoad({ children, fallback }: LazyLoadProps) {
  return (
    <Suspense fallback={fallback || <Loading />}>
      {children}
    </Suspense>
  );
}

/**
 * Higher-order component for lazy loading with error boundary
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: ReactNode
) {
  const LazyComponent = lazy(importFn);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function WrappedLazyComponent(props: any) {
    return (
      <Suspense fallback={fallback || <Loading />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

/**
 * Lazy load options for different loading strategies
 */
export const LazyLoadOptions = {
  // Above the fold - load immediately
  critical: {
    fallback: <Loading />,
  },
  // Below the fold - lazy load
  nonCritical: {
    fallback: <div className="animate-pulse bg-muted h-40 rounded" />,
  },
  // On interaction - load when user interacts
  onDemand: {
    fallback: null,
  },
} as const;

/**
 * Intersection Observer wrapper for viewport-based lazy loading
 */
export function ViewportLazyLoad({
  children,
  rootMargin = '50px',
  threshold = 0.1,
  fallback,
}: {
  children: ReactNode;
  rootMargin?: string;
  threshold?: number;
  fallback?: ReactNode;
}) {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [rootMargin, threshold]);

  return (
    <div ref={ref}>
      {isInView ? (
        children
      ) : (
        fallback || <div className="animate-pulse bg-muted h-40 rounded" />
      )}
    </div>
  );
}
