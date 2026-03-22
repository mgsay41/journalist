'use client';

import { ThemeProvider } from '@/components/public/DarkModeToggle';
import { FontSizeProvider } from '@/components/public/FontSizeControls';
import { OfflineIndicator } from '@/components/ui/OfflineIndicator';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider>
      <FontSizeProvider>
        {/* Phase 4 Frontend Audit - Offline status indicator */}
        <OfflineIndicator position="top" />
        {children}
      </FontSizeProvider>
    </ThemeProvider>
  );
}
