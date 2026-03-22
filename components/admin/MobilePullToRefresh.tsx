'use client';

/**
 * Pull-to-Refresh Component for Mobile
 * Allows users to pull down to refresh content
 */

import { useState, useRef, useEffect, ReactNode } from 'react';
import { useHaptic } from '@/lib/mobile/haptic-feedback';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  threshold?: number;    // Distance in px to trigger refresh
  resistance?: number;   // Resistance factor (0-1, lower = more resistance)
  className?: string;
}

export function PullToRefresh({
  onRefresh,
  children,
  threshold = 80,
  resistance = 0.4,
  className = '',
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showIndicator, setShowIndicator] = useState(false);

  const startY = useRef(0);
  const currentY = useRef(0);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const haptic = useHaptic();

  // Reset pull state
  const resetPull = () => {
    setPullDistance(0);
    setShowIndicator(false);
    startY.current = 0;
    currentY.current = 0;
    isDragging.current = false;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    // Only trigger if at top of scroll
    const container = containerRef.current;
    if (!container) return;

    const target = e.target as HTMLElement;
    const scrollTop = container.scrollTop;

    // Check if we're at the top of the scrollable area
    if (scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      isDragging.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;

    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;

    // Only allow pulling down (positive diff)
    if (diff > 0) {
      // Apply resistance
      const withResistance = diff * resistance;
      setPullDistance(Math.min(withResistance, threshold * 1.5));

      // Show indicator if pulled enough
      if (withResistance > 20) {
        if (!showIndicator) {
          setShowIndicator(true);
          haptic.light();
        }
      }

      // Provide haptic feedback at threshold
      if (withResistance >= threshold && pullDistance < threshold) {
        haptic.medium();
      }
    }
  };

  const handleTouchEnd = async () => {
    if (!isDragging.current) return;

    // Check if threshold was reached
    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      haptic.success();

      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        resetPull();
      }
    } else {
      // Not pulled enough, reset
      resetPull();
    }
  };

  // Prevent scrolling while pulling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // If user scrolls up, cancel the pull
      if (isDragging.current && container.scrollTop > 0) {
        resetPull();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [pullDistance]);

  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = progress * 360;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-y-auto ${className}`}
      style={{
        height: '100%',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center bg-background border-b border-border transition-transform"
        style={{
          height: `${Math.min(pullDistance, threshold)}px`,
          opacity: showIndicator ? 1 : 0,
        }}
      >
        <div className="flex items-center gap-3">
          {isRefreshing ? (
            <>
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-muted-foreground">جاري التحديث...</span>
            </>
          ) : (
            <>
              <svg
                className="w-6 h-6 text-primary transition-transform"
                style={{ transform: `rotate(${rotation}deg)` }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {progress >= 1 ? (
                <span className="text-sm text-foreground font-medium">تحرير للتحديث</span>
              ) : (
                <span className="text-sm text-muted-foreground">اسحب للتحديث</span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="pt-0">{children}</div>
    </div>
  );
}

export default PullToRefresh;
