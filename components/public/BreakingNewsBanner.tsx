'use client';

import { useState } from 'react';

interface BreakingNewsBannerProps {
  text: string;
  url?: string | null;
}

export function BreakingNewsBanner({ text, url }: BreakingNewsBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [animatingOut, setAnimatingOut] = useState(false);

  const handleDismiss = () => {
    setAnimatingOut(true);
    setTimeout(() => setDismissed(true), 300);
  };

  if (dismissed) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="overflow-hidden"
      style={{
        maxHeight: animatingOut ? '0' : '80px',
        opacity: animatingOut ? 0 : 1,
        transition: 'max-height 0.3s ease-in-out, opacity 0.3s ease-in-out',
      }}
    >
      <div
        className="relative w-full text-sm font-semibold animate-slide-in-from-top"
        style={{ backgroundColor: 'var(--accent)', color: 'var(--foreground)' }}
      >
        <div className="container mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* Pulsing red dot */}
            <span
              className="shrink-0 w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse-dot"
              aria-hidden="true"
            />
            {/* عاجل badge */}
            <span
              className="shrink-0 inline-flex items-center px-2 py-0.5 text-xs font-bold tracking-widest"
              style={{ backgroundColor: 'rgba(0,0,0,0.18)', borderRadius: '2px' }}
            >
              عاجل
            </span>
            {url ? (
              <a
                href={url}
                className="hover:underline truncate font-medium"
                style={{ color: 'var(--foreground)' }}
              >
                {text}
              </a>
            ) : (
              <span className="truncate font-medium">{text}</span>
            )}
          </div>

          <button
            onClick={handleDismiss}
            aria-label="إغلاق الخبر العاجل"
            className="shrink-0 p-1 rounded transition-colors hover:bg-black/15"
            style={{ color: 'var(--foreground)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
