'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { adminNavConfig, isActivePath, navIcons, type NavItem } from '@/lib/admin-nav';

interface SidebarProps {
  className?: string;
  isCollapsed?: boolean;
  onToggle?: () => void;
  siteName?: string;
}

export function AdminSidebar({ className, isCollapsed = false, onToggle, siteName = 'صحيفتي' }: SidebarProps) {
  const pathname = usePathname();
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleSection = (title: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 end-0 h-full bg-card border-s border-border z-50',
          'flex flex-col transition-transform duration-300 ease-in-out',
          isCollapsed ? 'w-15' : 'w-60',
          '-translate-x-full lg:translate-x-0',
          isMobileOpen && '!translate-x-0',
          className
        )}
        dir="rtl"
      >
        {/* Header area - Logo + Collapse button (both on right side in RTL) */}
        <div className="h-14 flex items-center justify-start px-3 border-b border-border gap-2 relative">
          <div className="absolute bottom-0 inset-x-0 h-px bg-linear-to-l from-accent/40 via-accent/10 to-transparent" />
          {/* Collapse button - on the right of the logo (right side in RTL) */}
          <button
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-muted transition-colors shrink-0 order-1"
            aria-label={isCollapsed ? 'فتح القائمة' : 'طي القائمة'}
          >
            <svg
              className={cn('w-5 h-5 text-foreground transition-transform duration-200', isCollapsed && 'rotate-180')}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Logo - always visible */}
          <Link href="/admin/dashboard" className="flex items-center gap-2 no-underline order-2 min-w-0">
            <div className="w-9 h-9 bg-accent rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </div>
            {!isCollapsed && (
              <span className="text-sm font-bold text-foreground truncate">{siteName}</span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          {adminNavConfig.map((section) => (
            <div key={section.title} className="mb-4">
              {!isCollapsed && (
                <div className="flex items-center gap-2 px-3 mb-2">
                  <div className="w-0.5 h-3.5 rounded-full bg-accent/60" />
                  <p className="text-xs font-bold uppercase tracking-widest text-accent/80">
                    {section.title}
                  </p>
                </div>
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <NavItemComponent
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    isCollapsed={isCollapsed}
                    isSectionCollapsed={collapsedSections.has(item.title)}
                    onToggle={() => toggleSection(item.title)}
                    onMobileClick={() => setIsMobileOpen(false)}
                  />
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer - View Site Link */}
        <div className="border-t border-border p-2 bg-muted/30">
          <Link
            href="/"
            target="_blank"
            className={cn(
              'flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors no-underline',
              isCollapsed && 'justify-center'
            )}
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            {!isCollapsed && <span>عرض الموقع</span>}
          </Link>
        </div>
      </aside>

      {/* Mobile toggle button - positioned on the left side (end in RTL) */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 end-4 z-50 p-2.5 bg-card border border-border rounded-lg shadow-md hover:bg-muted transition-colors"
        aria-label={isMobileOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
      >
        <svg
          className="w-5 h-5 text-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isMobileOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>
    </>
  );
}

interface NavItemComponentProps {
  item: NavItem;
  pathname: string;
  isCollapsed: boolean;
  isSectionCollapsed: boolean;
  onToggle: () => void;
  onMobileClick: () => void;
}

function NavItemComponent({
  item,
  pathname,
  isCollapsed,
  isSectionCollapsed,
  onToggle,
  onMobileClick,
}: NavItemComponentProps) {
  const hasChildren = item.children && item.children.length > 0;
  const isActive = isActivePath(item.href, pathname);
  const isChildActive = item.children?.some((child) => isActivePath(child.href, pathname));

  return (
    <li>
      {/* Parent item */}
      <div className="flex items-center">
        <Link
          href={item.href}
          onClick={onMobileClick}
          className={cn(
            'flex items-center gap-2 px-2 py-2 rounded-lg transition-colors text-sm',
            'w-full no-underline',
            isActive
              ? 'border-e-2 border-accent bg-accent/12 text-accent font-semibold'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/80',
            isChildActive && !isActive && 'bg-muted text-foreground',
            isCollapsed && 'justify-center px-2'
          )}
          title={isCollapsed ? item.title : undefined}
        >
          {item.icon && (
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={navIcons[item.icon] || ''}
              />
            </svg>
          )}
          {!isCollapsed && (
            <span className="truncate">{item.title}</span>
          )}
          {item.badge && !isCollapsed && (
            <span className="mr-auto px-1.5 py-0.5 text-xs bg-danger text-white rounded-full">
              {item.badge}
            </span>
          )}
        </Link>

        {!isCollapsed && hasChildren && (
          <button
            onClick={(e) => {
              e.preventDefault();
              onToggle();
            }}
            className="p-1 rounded hover:bg-muted transition-colors"
            aria-label={isSectionCollapsed ? 'فتح' : 'طي'}
          >
            <svg
              className={cn('w-3.5 h-3.5 text-secondary transition-transform', isSectionCollapsed && '-rotate-90')}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* Nested items */}
      {hasChildren && !isCollapsed && !isSectionCollapsed && (
        <ul className="mr-4 mt-0.5 space-y-0.5">
          {item.children!.map((child) => {
            const isChildActiveItem = isActivePath(child.href, pathname);
            return (
              <li key={child.href}>
                <Link
                  href={child.href}
                  onClick={onMobileClick}
                  className={cn(
                    'flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors text-xs no-underline',
                    isChildActiveItem
                      ? 'border-e-2 border-accent/60 bg-accent/8 text-accent font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  )}
                >
                  {child.icon && (
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d={navIcons[child.icon] || ''}
                      />
                    </svg>
                  )}
                  <span className="truncate">{child.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}
