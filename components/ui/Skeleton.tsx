import { cn } from '@/lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
  className,
  variant = 'rounded',
  width,
  height,
  animation = 'pulse',
  ...props
}: SkeletonProps) {
  const variantStyles = {
    text: 'rounded-sm h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-md',
  };

  const animationStyles = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  };

  return (
    <div
      className={cn(
        'bg-muted',
        variantStyles[variant],
        animationStyles[animation],
        'relative overflow-hidden',
        className
      )}
      style={{ width, height }}
      {...props}
    >
      {animation === 'wave' && (
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      )}
    </div>
  );
}

// Pre-built skeleton components for common patterns

export interface SkeletonCardProps {
  showImage?: boolean;
  lines?: number;
}

export function SkeletonCard({ showImage = true, lines = 3 }: SkeletonCardProps) {
  return (
    <div className="border border-border-subtle rounded-lg overflow-hidden bg-card p-4 space-y-3">
      {showImage && (
        <Skeleton variant="rectangular" className="w-full aspect-[4/3]" />
      )}
      <div className="space-y-2">
        <Skeleton variant="text" className="w-1/4 h-3" />
        <Skeleton variant="text" className="w-full h-6" />
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            variant="text"
            className={i === lines - 1 ? 'w-2/3' : 'w-full'}
          />
        ))}
      </div>
    </div>
  );
}

export function SkeletonStatsCard() {
  return (
    <div className="border border-border-subtle rounded-lg bg-card p-6 space-y-3">
      <Skeleton variant="text" className="w-20 h-4" />
      <Skeleton variant="text" className="w-32 h-8" />
      <Skeleton variant="text" className="w-16 h-3" />
    </div>
  );
}

export function SkeletonTableRow({ cells = 6 }: { cells?: number }) {
  return (
    <tr className="border-b">
      <td className="py-3 px-4">
        <Skeleton variant="circular" width={16} height={16} />
      </td>
      {Array.from({ length: cells }).map((_, i) => (
        <td key={i} className="py-3 px-4">
          <Skeleton variant="text" className="w-full max-w-[200px]" />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonTable({ rows = 5, cells = 6 }: { rows?: number; cells?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b bg-muted/30">
          <tr>
            <th className="py-3 px-4 w-10">
              <Skeleton variant="circular" width={16} height={16} />
            </th>
            {Array.from({ length: cells }).map((_, i) => (
              <th key={i} className="text-right py-3 px-4">
                <Skeleton variant="text" className="w-24 h-4" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonTableRow key={i} cells={cells} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Hero section skeleton for homepage
export function SkeletonHero() {
  return (
    <section className="border-b border-border">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <Skeleton variant="rectangular" className="w-full aspect-[4/3] lg:aspect-[3/2] rounded-lg" />
          <div className="space-y-4">
            <Skeleton variant="text" className="w-32 h-4" />
            <Skeleton variant="text" className="w-full h-16 md:h-20" />
            <Skeleton variant="text" className="w-full h-6" />
            <Skeleton variant="text" className="w-48 h-6" />
            <Skeleton variant="rectangular" className="w-40 h-12 rounded-md" />
          </div>
        </div>
      </div>
    </section>
  );
}
