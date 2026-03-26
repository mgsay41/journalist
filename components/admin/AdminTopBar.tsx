"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { DarkModeToggle } from "@/components/admin/DarkModeToggle";
import { NotificationBell } from "@/components/admin/NotificationBell";

interface BreadcrumbProps {
  className?: string;
}

export function Breadcrumb({ className }: BreadcrumbProps) {
  // We'll get the current path in a server component context
  // For now, this is a placeholder that will be used from the layout
  return null;
}

interface BreadcrumbClientProps {
  breadcrumbs: Array<{ title: string; href: string }>;
  className?: string;
}

export function BreadcrumbClient({
  breadcrumbs,
  className,
}: BreadcrumbClientProps) {
  if (breadcrumbs.length <= 1) return null;

  return (
    <nav
      className={cn("flex items-center gap-2 text-sm", className)}
      aria-label="Breadcrumb"
      dir="rtl"
    >
      {breadcrumbs.map((crumb, index) => (
        <div key={crumb.href} className="flex items-center gap-2">
          {index > 0 && (
            <svg
              className="w-4 h-4 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          )}
          {index === breadcrumbs.length - 1 ? (
            <span className="text-foreground font-medium">{crumb.title}</span>
          ) : (
            <Link
              href={crumb.href}
              className="text-muted-foreground hover:text-foreground transition-colors no-underline"
            >
              {crumb.title}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}

interface TopBarProps {
  userName?: string;
  userImage?: string;
  breadcrumbs?: Array<{ title: string; href: string }>;
  actions?: ReactNode;
  className?: string;
}

export function AdminTopBar({
  userName,
  userImage,
  breadcrumbs,
  actions,
  className,
}: TopBarProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 bg-card/95 backdrop-blur-sm border-b border-border shadow-sm",
        "h-14 flex items-center justify-between px-4 lg:px-6",
        className,
      )}
      dir="rtl"
    >
      {/* Right side - Breadcrumbs */}
      <div className="flex items-center gap-4 pe-14 lg:pe-0">
        {breadcrumbs && <BreadcrumbClient breadcrumbs={breadcrumbs} />}
      </div>

      {/* Left side - Actions, User */}
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center min-h-11 min-w-11">
          <DarkModeToggle />
        </div>
        <div className="flex items-center justify-center min-h-11 min-w-11">
          <NotificationBell />
        </div>
        {actions}

        {/* Separator */}
        <div className="w-px h-6 bg-border hidden sm:block" />

        {/* User menu */}
        <div className="flex items-center gap-3">
          <div className="text-end hidden sm:block">
            <p
              className="text-sm font-semibold text-foreground"
              style={{ lineHeight: 1, marginBottom: 3 }}
            >
              {userName || "المدير"}
            </p>
            <p
              className="text-xs text-muted-foreground"
              style={{ lineHeight: 1, marginBottom: 0 }}
            >
              مسؤول النظام
            </p>
          </div>

          <div className="relative group">
            <button className="flex items-center gap-2 p-1 rounded-xl hover:bg-muted transition-colors">
              {userImage ? (
                <img
                  src={userImage}
                  alt={userName || "المدير"}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-border"
                />
              ) : (
                <div className="w-10 h-10 bg-linear-to-br from-accent/20 to-accent/5 border border-accent/20 rounded-full flex items-center justify-center">
                  <span className="text-accent text-sm font-bold">
                    {userName && userName.length > 0 ? userName.charAt(0) : "م"}
                  </span>
                </div>
              )}
            </button>

            {/* Dropdown menu */}
            <div className="absolute end-0 top-full mt-2 w-48 bg-card border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <div className="p-2">
                <form action="/api/auth/logout" method="POST">
                  <button
                    type="submit"
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger/10 rounded-lg transition-colors text-start"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    تسجيل الخروج
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
