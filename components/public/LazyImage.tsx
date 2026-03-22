'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

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

/**
 * LazyImage Component
 *
 * An optimized image component that:
 * - Uses Intersection Observer API to detect when image is near viewport
 * - Only loads image when it's about to enter the viewport
 * - Shows placeholder/skeleton while loading
 * - Uses Next.js Image for automatic optimization
 * - Supports blur placeholders (LQIP)
 *
 * @param rootMargin - Margin around the viewport to trigger loading (default: '200px')
 * @param threshold - Percentage of element visibility to trigger loading (default: 0.01)
 */
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
  const [isInView, setIsInView] = useState(priority); // Priority images load immediately
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // If priority or already in view, skip intersection observer
    if (priority || isInView) return;

    // Create Intersection Observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            // Stop observing once in view
            if (imgRef.current) {
              observer.unobserve(imgRef.current);
            }
          }
        });
      },
      {
        rootMargin, // Start loading 200px before entering viewport
        threshold, // Trigger when at least 1% visible
      }
    );

    // Observe the image container
    const currentRef = imgRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    // Cleanup
    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [priority, isInView, rootMargin, threshold]);

  // Generate a simple blur placeholder if none provided
  const getBlurPlaceholder = () => {
    if (blurDataURL) return blurDataURL;
    // Generate a minimal data URI for blur effect
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2YzZjRmNiIvPjwvc3ZnPg==';
  };

  // Error state
  if (error) {
    return (
      <div
        ref={imgRef}
        className={cn(
          'bg-muted flex items-center justify-center',
          fill ? 'absolute inset-0' : 'rounded-lg',
          className
        )}
        style={{ width: fill ? undefined : width, height: fill ? undefined : height }}
      >
        <svg
          className="w-8 h-8 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
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

  // Loading state or not in view yet
  if (!isInView || isLoading) {
    return (
      <div
        ref={imgRef}
        className={cn('relative overflow-hidden', className)}
        style={{ width: fill ? undefined : width, height: fill ? undefined : height }}
      >
        {/* Skeleton/shimmer effect */}
        <div
          className={cn(
            'animate-shimmer absolute inset-0',
            fill ? '' : 'rounded-lg'
          )}
        />
        {isInView && (
          <Image
            src={src}
            alt={alt}
            width={fill ? undefined : width}
            height={fill ? undefined : height}
            fill={fill}
            sizes={sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'}
            quality={quality}
            priority={priority}
            placeholder={placeholder || (blurDataURL ? 'blur' : 'empty')}
            blurDataURL={blurDataURL || getBlurPlaceholder()}
            className={cn(
              'transition-opacity duration-300',
              isLoading ? 'opacity-0' : 'opacity-100',
              fill ? 'object-cover' : undefined
            )}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setError(true);
            }}
          />
        )}
      </div>
    );
  }

  // Image loaded successfully
  return (
    <div ref={imgRef} className={cn('relative overflow-hidden', className)}>
      <Image
        src={src}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        sizes={sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'}
        quality={quality}
        priority={priority}
        placeholder={placeholder || (blurDataURL ? 'blur' : 'empty')}
        blurDataURL={blurDataURL || getBlurPlaceholder()}
        className={cn(
          'transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100',
          fill ? 'object-cover' : undefined
        )}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setError(true);
        }}
      />
    </div>
  );
}
