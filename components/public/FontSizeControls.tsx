'use client';

import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/Button';

export type FontSize = 'small' | 'medium' | 'large' | 'xlarge';

interface FontSizeContextType {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  resetFontSize: () => void;
}

const FontSizeContext = createContext<FontSizeContextType | undefined>(undefined);

export function useFontSize() {
  const context = useContext(FontSizeContext);
  if (!context) {
    throw new Error('useFontSize must be used within a FontSizeProvider');
  }
  return context;
}

const FONT_SIZE_COOKIE_KEY = 'fontSize';
const FONT_SIZE_STORAGE_KEY = 'article-font-size';

const fontSizes: Record<FontSize, { label: string; value: string; className: string }> = {
  small: { label: 'صغير', value: '16px', className: 'text-base' },
  medium: { label: 'متوسط', value: '18px', className: 'text-lg' },
  large: { label: 'كبير', value: '20px', className: 'text-xl' },
  xlarge: { label: 'كبير جداً', value: '22px', className: 'text-2xl' },
};

const sizeOrder: FontSize[] = ['small', 'medium', 'large', 'xlarge'];

interface FontSizeProviderProps {
  children: React.ReactNode;
  defaultSize?: FontSize;
}

export function FontSizeProvider({ children, defaultSize = 'medium' }: FontSizeProviderProps) {
  // defaultSize comes from a server-read cookie — no hydration mismatch.
  const [fontSize, setFontSizeState] = useState<FontSize>(defaultSize);

  // Apply font size to document
  useEffect(() => {
    const size = fontSizes[fontSize];
    document.documentElement.style.setProperty('--article-font-size', size.value);
    document.documentElement.setAttribute('data-font-size', fontSize);
  }, [fontSize]);

  const setFontSize = useCallback((size: FontSize) => {
    setFontSizeState(size);
    // Persist to cookie (server-readable, no hydration mismatch on next load)
    document.cookie = `${FONT_SIZE_COOKIE_KEY}=${size}; path=/; max-age=31536000; SameSite=Lax`;
    // Also persist to localStorage as fallback
    try {
      localStorage.setItem(FONT_SIZE_STORAGE_KEY, size);
    } catch (e) {
      // ignore
    }
  }, []);

  const increaseFontSize = useCallback(() => {
    const currentIndex = sizeOrder.indexOf(fontSize);
    if (currentIndex < sizeOrder.length - 1) {
      setFontSize(sizeOrder[currentIndex + 1]);
    }
  }, [fontSize, setFontSize]);

  const decreaseFontSize = useCallback(() => {
    const currentIndex = sizeOrder.indexOf(fontSize);
    if (currentIndex > 0) {
      setFontSize(sizeOrder[currentIndex - 1]);
    }
  }, [fontSize, setFontSize]);

  const resetFontSize = useCallback(() => {
    setFontSize('medium');
  }, [setFontSize]);

  const contextValue = useMemo(
    () => ({ fontSize, setFontSize, increaseFontSize, decreaseFontSize, resetFontSize }),
    [fontSize, setFontSize, increaseFontSize, decreaseFontSize, resetFontSize]
  );

  return (
    <FontSizeContext.Provider value={contextValue}>
      {children}
    </FontSizeContext.Provider>
  );
}

interface FontSizeControlsProps {
  variant?: 'buttons' | 'dropdown';
  showLabel?: boolean;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function FontSizeControls({
  variant = 'buttons',
  showLabel = false,
  orientation = 'horizontal',
  className = '',
}: FontSizeControlsProps) {
  const { fontSize, setFontSize, increaseFontSize, decreaseFontSize, resetFontSize } = useFontSize();

  const currentIndex = sizeOrder.indexOf(fontSize);
  const canDecrease = currentIndex > 0;
  const canIncrease = currentIndex < sizeOrder.length - 1;

  if (variant === 'dropdown') {
    return (
      <div className={`flex items-center gap-2 ${orientation === 'vertical' ? 'flex-col' : ''} ${className}`}>
        {showLabel && (
          <span className="text-sm text-muted-foreground">حجم الخط:</span>
        )}
        <select
          value={fontSize}
          onChange={(e) => setFontSize(e.target.value as FontSize)}
          className="px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
        >
          {Object.entries(fontSizes).map(([key, { label }]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${orientation === 'vertical' ? 'flex-col' : ''} ${className}`}>
      {showLabel && (
        <span className="text-sm text-muted-foreground whitespace-nowrap">حجم الخط:</span>
      )}

      <div className={`flex items-center bg-muted rounded-lg p-1 ${orientation === 'vertical' ? 'flex-col' : ''}`}>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={decreaseFontSize}
          disabled={!canDecrease}
          className="h-8 w-8 p-0"
          aria-label="تصغير الخط"
          title="تصغير الخط"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </Button>

        <span className="px-3 text-sm font-medium min-w-[60px] text-center">
          {fontSizes[fontSize].label}
        </span>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={increaseFontSize}
          disabled={!canIncrease}
          className="h-8 w-8 p-0"
          aria-label="تكبير الخط"
          title="تكبير الخط"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </Button>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={resetFontSize}
        disabled={fontSize === 'medium'}
        className="text-xs"
        title="إعادة تعيين"
      >
        إعادة تعيين
      </Button>
    </div>
  );
}

// Article content wrapper that applies the font size
interface ArticleContentProps {
  children: React.ReactNode;
  className?: string;
}

export function ArticleContent({ children, className = '' }: ArticleContentProps) {
  const { fontSize } = useFontSize();

  return (
    <div
      className={`article-content ${fontSizes[fontSize].className} ${className}`}
      style={{
        fontSize: `var(--article-font-size, ${fontSizes.medium.value})`,
      }}
    >
      {children}
    </div>
  );
}

export default FontSizeControls;

// Font size settings component
interface ReadingSettingsProps {
  position?: 'fixed' | 'static';
  showLabel?: boolean;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function ReadingSettings({
  position = 'static',
  showLabel = false,
  orientation = 'horizontal',
  className = '',
}: ReadingSettingsProps) {
  const positionClass =
    position === 'fixed' ? 'fixed bottom-4 left-4 z-40' :
    position === 'sticky' ? 'sticky bottom-4 z-40 w-fit ms-auto' :
    '';

  return (
    <div
      data-reading-settings
      className={`flex items-center gap-2 bg-card border border-border rounded-lg p-2 shadow-sm ${positionClass} ${orientation === 'vertical' ? 'flex-col' : ''} ${className}`}
    >
      {/* Font size label */}
      <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">حجم الخط</span>

      {/* Divider */}
      <div className="w-px h-4 bg-border" />

      {/* Font Size Controls */}
      <FontSizeControls variant="buttons" orientation={orientation} />
    </div>
  );
}
