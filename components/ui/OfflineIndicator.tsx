'use client';

/**
 * Offline Status Indicator Component
 *
 * Displays a visual indicator when the user is offline.
 * Phase 2 Frontend Audit - UX enhancement for offline awareness
 */

import { useState, useEffect } from 'react';
import { gooeyToast } from 'goey-toast';

interface OfflineIndicatorProps {
  /**
   * Position of the indicator
   */
  position?: 'top' | 'bottom';
  /**
   * Additional class names
   */
  className?: string;
}

export function OfflineIndicator({ position = 'bottom', className = '' }: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const initialOnline = navigator.onLine;
    const timer = setTimeout(() => { setIsOnline(initialOnline); }, 0);

    const handleOnline = () => {
      setIsOnline(true);
      gooeyToast.success('أنت متصل الآن');
    };

    const handleOffline = () => {
      setIsOnline(false);
      gooeyToast.error('لا يوجد اتصال بالإنترنت');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Show a persistent banner only while offline
  if (isOnline) return null;

  const positionStyles = position === 'top'
    ? 'top-0 left-0 right-0 rounded-b-lg'
    : 'bottom-0 left-0 right-0 rounded-t-lg';

  return (
    <div className={`fixed z-50 ${positionStyles} ${className}`}>
      <div className="mx-auto max-w-md px-4 py-3 flex items-center justify-center gap-3 bg-danger/95 text-danger-foreground">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
        <span className="text-sm font-medium">لا يوجد اتصال بالإنترنت</span>
      </div>
    </div>
  );
}

/**
 * Hook to use online/offline status
 *
 * @returns Object with online status and current status
 *
 * @example
 * const { isOnline, status } = useOnlineStatus();
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    status: isOnline ? 'online' : 'offline',
  };
}

/**
 * Small offline status badge component
 *
 * Can be placed in the header or sidebar
 */
export function OfflineStatusBadge() {
  const { isOnline } = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-danger/10 text-danger text-xs font-medium rounded-full">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-danger"></span>
      </span>
      <span>غير متصل</span>
    </div>
  );
}

export default OfflineIndicator;
