'use client';

import { ThemeProvider } from '@/components/public/DarkModeToggle';
import { FontSizeProvider, type FontSize } from '@/components/public/FontSizeControls';
import { OfflineIndicator } from '@/components/ui/OfflineIndicator';

interface ProvidersProps {
  children: React.ReactNode;
  initialFontSize?: FontSize;
}

export function Providers({ children, initialFontSize }: ProvidersProps) {
  return (
    <ThemeProvider>
      <FontSizeProvider defaultSize={initialFontSize}>
        {/* Phase 4 Frontend Audit - Offline status indicator */}
        <OfflineIndicator position="top" />
        {children}
      </FontSizeProvider>
    </ThemeProvider>
  );
}
