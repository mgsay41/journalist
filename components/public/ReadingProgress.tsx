'use client';

import { useEffect, useState } from 'react';

interface ReadingProgressProps {
  contentId?: string;
  position?: 'top' | 'bottom';
  showPercentage?: boolean;
  color?: string;
  height?: number;
}

export function ReadingProgress({
  contentId = 'article-content',
  position = 'top',
  showPercentage = false,
  color = 'currentColor',
  height = 3,
}: ReadingProgressProps) {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = document.getElementById(contentId);
    if (!element) return;

    // Calculate initial position
    const calculateProgress = () => {
      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight - windowHeight;
      const scrolled = window.scrollY;

      // Element position relative to viewport
      const elementTop = rect.top + scrolled;
      const elementBottom = rect.bottom + scrolled;

      // Calculate progress within the element
      const startPoint = elementTop - windowHeight;
      const endPoint = elementBottom;
      const totalDistance = endPoint - startPoint;

      if (totalDistance <= 0) {
        setProgress(0);
        return;
      }

      const currentProgress = ((scrolled - startPoint) / totalDistance) * 100;
      setProgress(Math.max(0, Math.min(100, currentProgress)));

      // Check if progress bar should be visible
      setIsVisible(rect.top < windowHeight && rect.bottom > 0);
    };

    // Throttle calculation for performance
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          calculateProgress();
          ticking = false;
        });
        ticking = true;
      }
    };

    // Initial calculation
    calculateProgress();

    // Add scroll listener
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', calculateProgress);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', calculateProgress);
    };
  }, [contentId]);

  if (!isVisible && position === 'top') {
    return null;
  }

  return (
    <div
      className={`fixed left-0 right-0 z-50 bg-background/80 backdrop-blur-sm ${
        position === 'top' ? 'top-0' : 'bottom-0'
      }`}
      style={{ height: `${height}px` }}
    >
      <div
        className="h-full transition-all duration-150 ease-out"
        style={{
          width: `${progress}%`,
          backgroundColor: color,
        }}
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`تقدم القراءة: ${Math.round(progress)}%`}
      />
      {showPercentage && (
        <span
          className="absolute text-xs font-medium text-foreground"
          style={{
            [position === 'top' ? 'top' : 'bottom']: `${height + 4}px`,
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          {Math.round(progress)}%
        </span>
      )}
    </div>
  );
}

// Simplified version that only shows at the top
export function ReadingProgressBar({
  contentId,
  color = 'var(--primary)',
}: Pick<ReadingProgressProps, 'contentId' | 'color'>) {
  return <ReadingProgress contentId={contentId} color={color} position="top" height={3} />;
}
