'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { Spinner } from './Loading';

/**
 * PaginationLink Component
 *
 * A specialized link component for pagination that shows a loading state
 * during navigation. Phase 4 Frontend Audit - UX enhancement for pagination.
 */
export interface PaginationLinkProps {
  /**
   * URL to navigate to
   */
  href: string;
  /**
   * Link text content
   */
  children: React.ReactNode;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Whether the link is disabled
   */
  disabled?: boolean;
  /**
   * Variant style
   */
  variant?: 'default' | 'primary' | 'secondary' | 'ghost' | 'outline';
  /**
   * Click handler (optional, for client-side handling)
   */
  onClick?: (e: React.MouseEvent) => void;
}

const variantStyles = {
  default: 'px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors',
  primary: 'px-4 py-2 bg-foreground text-background rounded-md hover:bg-foreground/90 transition-colors',
  secondary: 'px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors',
  ghost: 'px-4 py-2 hover:bg-muted transition-colors',
  outline: 'px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors',
};

export function PaginationLink({
  href,
  children,
  className = '',
  disabled = false,
  variant = 'default',
  onClick,
}: PaginationLinkProps) {
  const [isPending, startTransition] = useTransition();

  const handleClick = (e: React.MouseEvent) => {
    if (disabled || isPending) {
      e.preventDefault();
      return;
    }

    if (onClick) {
      onClick(e);
    } else {
      // Use transition for smooth navigation
      startTransition(() => {
        // Let the default link behavior happen
      });
    }
  };

  if (disabled) {
    return (
      <span
        className={`${variantStyles[variant]} ${className} opacity-50 cursor-not-allowed flex items-center justify-center`}
        aria-disabled="true"
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={`${variantStyles[variant]} ${className} flex items-center justify-center gap-2 min-w-20`}
      aria-disabled={isPending}
    >
      {isPending ? (
        <>
          <Spinner size="sm" />
          <span className="sr-only">جاري التحميل</span>
        </>
      ) : (
        children
      )}
    </Link>
  );
}

/**
 * Pagination component with numbered pages
 */
export interface PaginationProps {
  /**
   * Current page number
   */
  currentPage: number;
  /**
   * Total number of pages
   */
  totalPages: number;
  /**
   * Base URL for pagination (e.g., /search?q=term)
   */
  baseUrl: string;
  /**
   * Query param name for page (default: 'page')
   */
  pageParam?: string;
  /**
   * Function to generate page URL
   */
  getPageUrl?: (page: number) => string;
  /**
   * Maximum number of page buttons to show
   */
  maxPagesToShow?: number;
  /**
   * Additional CSS classes
   */
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  baseUrl,
  pageParam = 'page',
  getPageUrl,
  maxPagesToShow = 5,
  className = '',
}: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  // Default page URL generator
  const defaultGetPageUrl = (page: number) => {
    const url = new URL(baseUrl, window.location.origin);
    url.searchParams.set(pageParam, String(page));
    return url.pathname + url.search;
  };

  const generatePageUrl = getPageUrl || defaultGetPageUrl;

  // Generate page numbers to show
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    if (totalPages <= maxPagesToShow) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | 'ellipsis')[] = [];
    const halfWindow = Math.floor(maxPagesToShow / 2);

    // Always show first page
    pages.push(1);

    if (currentPage <= halfWindow + 1) {
      // Near the start
      for (let i = 2; i <= maxPagesToShow - 1; i++) {
        pages.push(i);
      }
      pages.push('ellipsis');
    } else if (currentPage >= totalPages - halfWindow) {
      // Near the end
      pages.push('ellipsis');
      for (let i = totalPages - maxPagesToShow + 2; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // In the middle
      pages.push('ellipsis');
      for (let i = currentPage - halfWindow + 1; i <= currentPage + halfWindow - 1; i++) {
        pages.push(i);
      }
      pages.push('ellipsis');
    }

    // Always show last page
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <nav
      className={`flex items-center justify-center gap-2 ${className}`}
      aria-label="تنقل الصفحات"
    >
      {/* Previous Button */}
      {currentPage > 1 && (
        <PaginationLink
          href={generatePageUrl(currentPage - 1)}
          aria-label="الصفحة السابقة"
          variant="secondary"
        >
          <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
          السابق
        </PaginationLink>
      )}

      {/* Page Numbers */}
      {getPageNumbers().map((page, index) => {
        if (page === 'ellipsis') {
          return (
            <span
              key={`ellipsis-${index}`}
              className="px-4 py-2 text-muted-foreground"
              aria-hidden="true"
            >
              ...
            </span>
          );
        }

        const isActive = page === currentPage;

        return (
          <PaginationLink
            key={page}
            href={generatePageUrl(page)}
            aria-label={`الصفحة ${page}`}
            aria-current={isActive ? 'page' : undefined}
            variant={isActive ? 'primary' : 'default'}
          >
            {page}
          </PaginationLink>
        );
      })}

      {/* Next Button */}
      {currentPage < totalPages && (
        <PaginationLink
          href={generatePageUrl(currentPage + 1)}
          aria-label="الصفحة التالية"
          variant="secondary"
        >
          التالي
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </PaginationLink>
      )}
    </nav>
  );
}

/**
 * Simple pagination loading indicator
 * Shows when pagination navigation is in progress
 */
export function PaginationLoading({ isLoading }: { isLoading: boolean }) {
  if (!isLoading) return null;

  return (
    <div className="flex items-center justify-center py-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner size="sm" />
        <span>جاري تحميل الصفحة...</span>
      </div>
    </div>
  );
}

export default PaginationLink;
