import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'secondary';
  size?: 'sm' | 'md';
}

const variantStyles = {
  default: 'bg-secondary text-white',
  success: 'bg-success text-white',
  warning: 'bg-warning text-white',
  danger: 'bg-danger text-white',
  info: 'bg-primary text-white',
  secondary: 'bg-secondary text-white',
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};

export function Badge({
  className,
  variant = 'default',
  size = 'md',
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

// Status badge for articles
export function ArticleStatusBadge({
  status,
  className,
}: {
  status: 'draft' | 'published' | 'scheduled' | 'archived';
  className?: string;
}) {
  const statusConfig = {
    draft: { variant: 'secondary' as const, label: 'مسودة' },
    published: { variant: 'success' as const, label: 'منشورة' },
    scheduled: { variant: 'info' as const, label: 'مجدولة' },
    archived: { variant: 'warning' as const, label: 'مؤرشفة' },
  };

  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
