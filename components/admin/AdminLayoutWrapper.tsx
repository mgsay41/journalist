'use client';

import { useState } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { KeyboardShortcuts } from '@/components/admin/KeyboardShortcuts';
import type { Breadcrumb } from '@/lib/admin-nav';

interface AdminLayoutWrapperProps {
  userName?: string;
  breadcrumbs: Breadcrumb[];
  children: React.ReactNode;
}

export function AdminLayoutWrapper({
  userName,
  breadcrumbs,
  children,
}: AdminLayoutWrapperProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Sidebar */}
      <AdminSidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileOpen}
        onMobileClose={() => setIsMobileOpen(false)}
      />

      {/* Main content area — me-* creates right margin in RTL for the right-side sidebar */}
      <div className={cn('transition-all duration-300', isSidebarCollapsed ? 'lg:me-24' : 'lg:me-56')}>
        {/* Top Bar */}
        <AdminTopBar
          userName={userName}
          breadcrumbs={breadcrumbs}
          isMobileMenuOpen={isMobileOpen}
          onMobileMenuToggle={() => setIsMobileOpen(!isMobileOpen)}
        />

        {/* Page content */}
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>

      {/* Keyboard Shortcuts */}
      <KeyboardShortcuts showHint={true} />
    </div>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
