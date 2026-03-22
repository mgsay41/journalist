/**
 * Swipe Gesture Utilities for Mobile
 * Provides touch-based swipe detection for navigation
 */

import { useEffect, useRef, RefObject } from 'react';
import React from 'react';

export interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

export interface SwipeGesturesOptions {
  threshold?: number;        // Minimum distance for swipe (default: 50px)
  restraint?: number;        // Maximum perpendicular movement (default: 100px)
  allowedTime?: number;      // Maximum duration for swipe (default: 300ms)
}

const DEFAULT_OPTIONS: SwipeGesturesOptions = {
  threshold: 50,
  restraint: 100,
  allowedTime: 300,
};

/**
 * React hook for detecting swipe gestures on an element
 */
export function useSwipeGestures(
  ref: RefObject<HTMLElement | null>,
  handlers: SwipeHandlers,
  options: SwipeGesturesOptions = {}
) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      touchStartRef.current = {
        x: touch.pageX,
        y: touch.pageY,
        time: Date.now(),
      };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return;

      const touch = e.changedTouches[0];
      const elapsedTime = Date.now() - touchStartRef.current.time;

      // Check if swipe was too slow
      if (elapsedTime > opts.allowedTime!) return;

      const distX = touch.pageX - touchStartRef.current.x;
      const distY = touch.pageY - touchStartRef.current.y;

      // Check if distance meets threshold
      if (Math.abs(distX) < opts.threshold! && Math.abs(distY) < opts.threshold!) return;

      // Check if perpendicular movement is within restraint
      if (Math.abs(distX) > Math.abs(distY)) {
        // Horizontal swipe
        if (Math.abs(distY) > opts.restraint!) return;

        if (distX > 0) {
          handlers.onSwipeRight?.();
        } else {
          handlers.onSwipeLeft?.();
        }
      } else {
        // Vertical swipe
        if (Math.abs(distX) > opts.restraint!) return;

        if (distY > 0) {
          handlers.onSwipeDown?.();
        } else {
          handlers.onSwipeUp?.();
        }
      }

      touchStartRef.current = null;
    };

    element.addEventListener('touchstart', handleTouchStart as EventListener, { passive: true });
    element.addEventListener('touchend', handleTouchEnd as EventListener, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart as EventListener);
      element.removeEventListener('touchend', handleTouchEnd as EventListener);
    };
  }, [ref, handlers, opts]);
}

/**
 * React hook for swipe navigation between pages
 */
export function useSwipeNavigation(handlers: SwipeHandlers, options?: SwipeGesturesOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  useSwipeGestures(containerRef, handlers, options);

  return containerRef;
}

/**
 * Component wrapper for adding swipe gestures to children
 */
interface SwipeGesturesProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  className?: string;
}

export function SwipeGestures({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
  className = '',
}: SwipeGesturesProps) {
  const ref = useRef<HTMLDivElement>(null);

  useSwipeGestures(ref, { onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown }, { threshold });

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
