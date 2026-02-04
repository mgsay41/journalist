import { cn } from '@/lib/utils';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div
      className={cn(
        'spinner rounded-full border-primary border-t-transparent animate-spin',
        sizes[size],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">جاري التحميل...</span>
    </div>
  );
}

export interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'جاري التحميل...' }: LoadingScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <Spinner size="lg" />
      <p className="mt-4 text-secondary">{message}</p>
    </div>
  );
}

// Export Loading as alias for LoadingScreen for convenience
export { LoadingScreen as Loading };

// Export LoadingSpinner as alias for Spinner for convenience
export { Spinner as LoadingSpinner };

// Re-export Skeleton components for convenience
export {
  Skeleton,
  SkeletonCard,
  SkeletonStatsCard,
  SkeletonTableRow,
  SkeletonTable,
  SkeletonHero,
} from './Skeleton';
export type { SkeletonProps, SkeletonCardProps } from './Skeleton';
