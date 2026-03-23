'use client';

import { useState, useEffect } from 'react';

export function DarkModeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('admin-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resolved = stored === 'dark' || (!stored && prefersDark) ? 'dark' : 'light';
    // Apply DOM change synchronously to avoid flash, defer setState to avoid
    // React Compiler's "synchronous setState in effect" rule
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    const timer = setTimeout(() => setTheme(resolved), 0);
    return () => clearTimeout(timer);
  }, []);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    localStorage.setItem('admin-theme', next);
  };

  // Avoid hydration mismatch — render nothing until client-side theme is known
  if (theme === null) return null;

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
      aria-label={theme === 'dark' ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي'}
      title={theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}
    >
      {theme === 'dark' ? (
        // Sun icon — click to go light
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M18.364 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"
          />
        </svg>
      ) : (
        // Moon icon — click to go dark
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      )}
    </button>
  );
}
