'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'cms-theme';
const SYSTEM_THEME_QUERY = '(prefers-color-scheme: dark)';

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
}

export function ThemeProvider({ children, defaultTheme = 'system' }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return defaultTheme;
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
      if (stored && ['light', 'dark', 'system'].includes(stored)) return stored;
    } catch {}
    return defaultTheme;
  });
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
      if (stored === 'dark') return 'dark';
      if (stored === 'light') return 'light';
    } catch {}
    return window.matchMedia(SYSTEM_THEME_QUERY).matches ? 'dark' : 'light';
  });

  // Apply resolved theme class to document root
  useEffect(() => {
    const root = document.documentElement;
    let resolved: 'light' | 'dark' = 'light';

    if (theme === 'system') {
      resolved = window.matchMedia(SYSTEM_THEME_QUERY).matches ? 'dark' : 'light';
    } else {
      resolved = theme;
    }

    setResolvedTheme(resolved);

    // Update document class and data attribute
    root.classList.remove('light', 'dark');
    root.classList.add(resolved);
    root.setAttribute('data-theme', resolved);
  }, [theme]);

  // Listen for system theme changes when using system theme
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia(SYSTEM_THEME_QUERY);

    const handleChange = (e: MediaQueryListEvent) => {
      const resolved = e.matches ? 'dark' : 'light';
      setResolvedTheme(resolved);
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(resolved);
      document.documentElement.setAttribute('data-theme', resolved);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (e) {
      console.error('Failed to save theme to localStorage:', e);
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

interface DarkModeToggleProps {
  showLabel?: boolean;
  variant?: 'button' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function DarkModeToggle({
  showLabel = false,
  variant = 'button',
  size = 'md',
  className = '',
}: DarkModeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const cycleTheme = useCallback(() => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  }, [theme, setTheme]);

  const getThemeLabel = useCallback(() => {
    if (theme === 'light') return 'الوضع الفاتح';
    if (theme === 'dark') return 'الوضع الداكن';
    return 'تلقائي';
  }, [theme]);

  const getThemeIcon = useCallback(() => {
    // Show icon based on resolved theme (what user actually sees)
    if (resolvedTheme === 'dark') {
      return (
        <svg className="w-[1.25em] h-[1.25em]" fill="currentColor" viewBox="0 0 20 20">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      );
    }
    return (
      <svg className="w-[1.25em] h-[1.25em]" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
      </svg>
    );
  }, [resolvedTheme]);

  const sizeClasses = {
    sm: 'h-8 px-2 text-sm',
    md: 'h-10 px-3',
    lg: 'h-12 px-4 text-base',
  };

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={cycleTheme}
        className={`rounded-lg p-2 hover:bg-muted transition-colors text-foreground ${className}`}
        title={getThemeLabel()}
        aria-label={`تبديل الوضع: ${getThemeLabel()}`}
      >
        {getThemeIcon()}
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      onClick={cycleTheme}
      className={`${sizeClasses[size]} gap-2 ${className}`}
      title={`تبديل الوضع: ${getThemeLabel()}`}
    >
      {getThemeIcon()}
      {showLabel && <span>{getThemeLabel()}</span>}
    </Button>
  );
}

export default DarkModeToggle;
