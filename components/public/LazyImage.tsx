'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

// Module-level constant — generated once, not per render instance
const BLUR_PLACEHOLDER =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2YzZjRmNiIvPjwvc3ZnPg==';

interface LazyImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  fill?: boolean;
  sizes?: string;
  quality?: number;
  priority?: boolean;
  blurDataURL?: string;
  placeholder?: 'blur' | 'empty';
  rootMargin?: string;
  threshold?: number;
}

function ErrorPlaceholder({
  fill,
  width,
  height,
  className,
}: Pick<LazyImageProps, 'fill' | 'width' | 'height' | 'className'>) {
  return (
    <div
      className={cn(
        'bg-muted flex items-center justify-center',
        fill ? 'absolute inset-0' : 'rounded-lg',
        className
      )}
      style={{ width: fill ? undefined : width, height: fill ? undefined : height }}
    >
      <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    </div>
  );
}

export function LazyImage({
  src,
  alt,
  width,
  height,
  className,
  fill = false,
  sizes,
  quality = 85,
  priority = false,
  blurDataURL,
  placeholder,
  rootMargin = '200px',
  threshold = 0.01,
}: LazyImageProps) {
  const [isInView, setIsInView] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const resolvedSizes = sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw';
  const resolvedPlaceholder = placeholder || (blurDataURL ? 'blur' : 'empty');
  const resolvedBlur = blurDataURL || BLUR_PLACEHOLDER;

  useEffect(() => {
    // Priority images skip the intersection observer entirely
    if (priority) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold }
    );

    const el = containerRef.current;
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [priority, rootMargin, threshold]);

  if (error) {
    return <ErrorPlaceholder fill={fill} width={width} height={height} className={className} />;
  }

  // ── Priority images: render Image immediately, overlay shimmer until loaded ──
  // This is critical for LCP — no IntersectionObserver delay, no skeleton blocking paint.
  if (priority) {
    return (
      <div className={cn(fill ? 'absolute inset-0 overflow-hidden' : 'relative overflow-hidden', className)}>
        <Image
          src={src}
          alt={alt}
          width={fill ? undefined : width}
          height={fill ? undefined : height}
          fill={fill}
          sizes={resolvedSizes}
          quality={quality}
          priority
          placeholder={resolvedPlaceholder}
          blurDataURL={resolvedBlur}
          className={cn(
            'transition-opacity duration-500',
            isLoaded ? 'opacity-100' : 'opacity-0',
            fill ? 'object-cover' : undefined
          )}
          onLoad={() => setIsLoaded(true)}
          onError={() => setError(true)}
        />
        {/* Shimmer overlay — removed as soon as the image paints */}
        {!isLoaded && <div className="absolute inset-0 animate-shimmer" aria-hidden="true" />}
      </div>
    );
  }

  // ── Lazy images: skeleton until near viewport, then load ──
  return (
    <div
      ref={containerRef}
      className={cn(fill ? 'absolute inset-0 overflow-hidden' : 'relative overflow-hidden', className)}
      style={{ width: fill ? undefined : width, height: fill ? undefined : height }}
    >
      {/* Skeleton — always rendered, hidden once image is loaded */}
      {!isLoaded && (
        <div
          className={cn('animate-shimmer absolute inset-0', fill ? '' : 'rounded-lg')}
          aria-hidden="true"
        />
      )}
      {/* Image — only mounted once near the viewport */}
      {isInView && (
        <Image
          src={src}
          alt={alt}
          width={fill ? undefined : width}
          height={fill ? undefined : height}
          fill={fill}
          sizes={resolvedSizes}
          quality={quality}
          priority={false}
          placeholder={resolvedPlaceholder}
          blurDataURL={resolvedBlur}
          className={cn(
            'transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0',
            fill ? 'object-cover' : undefined
          )}
          onLoad={() => setIsLoaded(true)}
          onError={() => setError(true)}
        />
      )}
    </div>
  );
}
