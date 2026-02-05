'use client';

import { ThemeProvider } from '@/components/public/DarkModeToggle';
import { FontSizeProvider } from '@/components/public/FontSizeControls';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider>
      <FontSizeProvider>
        {children}
      </FontSizeProvider>
    </ThemeProvider>
  );
}
