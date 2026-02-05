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

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <AdminSidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main content area */}
      <div className={cn('transition-all duration-300', isSidebarCollapsed ? 'lg:ms-24' : 'lg:ms-56')}>
        {/* Top Bar */}
        <AdminTopBar
          userName={userName}
          breadcrumbs={breadcrumbs}
        />

        {/* Page content */}
        <main className="p-6">
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
