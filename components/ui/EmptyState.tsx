import { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-12',
        className
      )}
      dir="rtl"
    >
      {icon && (
        <div className="w-16 h-16 mb-4 text-secondary flex items-center justify-center">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-secondary text-sm max-w-sm mb-6 leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        action.href ? (
          <Link
            href={action.href}
            className="px-4 py-2 bg-foreground text-background rounded-md hover:bg-foreground/90 transition-colors text-sm font-medium"
          >
            {action.label}
          </Link>
        ) : (
          <button
            onClick={action.onClick}
            className="px-4 py-2 bg-foreground text-background rounded-md hover:bg-foreground/90 transition-colors text-sm font-medium"
          >
            {action.label}
          </button>
        )
      )}
    </div>
  );
}

// Pre-built empty states for common scenarios
export function EmptyArticles({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon={
        <svg
          className="w-full h-full"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
          />
        </svg>
      }
      title="لا توجد مقالات"
      description="ابدأ بإنشاء أول مقال لك. يمكنك كتابة المحتوى، إضافة الوسائط، ونشره للقراء."
      action={{
        label: 'إنشاء مقال جديد',
        onClick: onCreate,
      }}
    />
  );
}

export function EmptyImages({ onUpload }: { onUpload: () => void }) {
  return (
    <EmptyState
      icon={
        <svg
          className="w-full h-full"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      }
      title="لا توجد صور"
      description="لم يتم رفع أي صور بعد. ابدأ بإضافة صور إلى ألبومك."
      action={{
        label: 'رفع صور',
        onClick: onUpload,
      }}
    />
  );
}

export function EmptyCategories({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon={
        <svg
          className="w-full h-full"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
          />
        </svg>
      }
      title="لا توجد تصنيفات"
      description="قم بإنشاء تصنيفات لتنظيم مقالاتك وجعلها سهلة الوصول للقراء."
      action={{
        label: 'إنشاء تصنيف',
        onClick: onCreate,
      }}
    />
  );
}

export function EmptyTags({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon={
        <svg
          className="w-full h-full"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
          />
        </svg>
      }
      title="لا توجد وسوم"
      description="الوسوم تساعد القراء في العثور على محتوى مشابه. أضف وسوماً لمقالاتك."
      action={{
        label: 'إنشاء وسم',
        onClick: onCreate,
      }}
    />
  );
}

export function EmptySearchResults({ searchTerm }: { searchTerm: string }) {
  return (
    <EmptyState
      icon={
        <svg
          className="w-full h-full"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      }
      title="لا توجد نتائج"
      description={`لم نعثر على نتائج مطابقة لـ "${searchTerm}". جرب كلمات بحث مختلفة.`}
    />
  );
}
