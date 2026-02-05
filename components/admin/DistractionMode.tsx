'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';

interface DistractionModeProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
}

export function DistractionMode({ isOpen, onClose, children, title, actions }: DistractionModeProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, onClose]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 bg-background ${
        isFullscreen ? 'p-0' : 'p-4 md:p-8'
      }`}
    >
      {/* Header bar - always visible but minimal */}
      <div className="fixed top-0 left-0 right-0 bg-background/95 backdrop-blur border-b z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {title && (
              <h1 className="text-lg font-semibold truncate max-w-md">{title}</h1>
            )}
          </div>
          <div className="flex items-center gap-2">
            {actions}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'الخروج من ملء الشاشة' : 'ملء الشاشة'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isFullscreen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5 5m4-4h4m0 0v-4m0 4l-5-5" />
                )}
              </svg>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              title="الخروج من وضع التركيز"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
        </div>
      </div>

      {/* Content area - scrollable */}
      <div className={`pt-16 h-full overflow-auto ${isFullscreen ? 'px-4 md:px-8' : ''}`}>
        <div className="max-w-4xl mx-auto">
          {children}
        </div>
      </div>

      {/* Keyboard shortcut hint */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 text-sm text-muted-foreground opacity-50 hover:opacity-100 transition-opacity">
        اضغط <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-xs mx-1">Esc</kbd> للخروج
      </div>
    </div>
  );
}

export default DistractionMode;
