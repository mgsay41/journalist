'use client';

import { ReactNode, useState } from 'react';
import { cn } from '@/lib/utils';

export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps {
  variant?: AlertVariant;
  type?: AlertVariant; // Alias for variant
  title?: string;
  children?: ReactNode;
  message?: string; // Alternative to children
  onClose?: () => void;
  className?: string;
}

const alertStyles = {
  info: 'border-blue-200 bg-blue-50 text-blue-900',
  success: 'border-green-200 bg-green-50 text-green-900',
  warning: 'border-yellow-200 bg-yellow-50 text-yellow-900',
  error: 'border-red-200 bg-red-50 text-red-900',
};

const iconMap = {
  info: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  ),
  success: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  ),
  warning: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    />
  ),
  error: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  ),
};

export function Alert({
  variant,
  type,
  title,
  children,
  message,
  onClose,
  className,
}: AlertProps) {
  const [isExiting, setIsExiting] = useState(false);
  const resolvedVariant = variant || type || 'info';
  const content = children || message;

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose?.();
    }, 200);
  };

  return (
    <div
      className={cn(
        'border rounded-lg p-4 flex items-start gap-3',
        'transition-all duration-200',
        alertStyles[resolvedVariant],
        isExiting && 'opacity-0 -translate-x-full',
        className
      )}
      role="alert"
      dir="rtl"
    >
      {/* Icon */}
      <svg
        className="w-5 h-5 shrink-0 mt-0.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        {iconMap[resolvedVariant]}
      </svg>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className="font-semibold mb-1 text-sm">{title}</h4>
        )}
        <div className="text-sm leading-relaxed">{content}</div>
      </div>

      {/* Close button - positioned on left side for RTL */}
      {onClose && (
        <button
          onClick={handleClose}
          className="shrink-0 p-1.5 -mt-1 -ml-1 rounded-md hover:bg-black/10 transition-colors"
          aria-label="إغلاق التنبيه"
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

// AlertDialog components for confirmation dialogs
export interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export interface AlertDialogContentProps {
  children: ReactNode;
}

export interface AlertDialogHeaderProps {
  children: ReactNode;
}

export interface AlertDialogTitleProps {
  children: ReactNode;
}

export interface AlertDialogDescriptionProps {
  children: ReactNode;
}

export interface AlertDialogFooterProps {
  children: ReactNode;
}

export interface AlertDialogActionProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'danger';
  asChild?: boolean;
}

export interface AlertDialogCancelProps {
  children: ReactNode;
  onClick?: () => void;
}

export function AlertDialog({ open, onOpenChange, children }: AlertDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      <div className="relative bg-card rounded-xl shadow-2xl w-full max-w-md mx-4 animate-slide-in">
        {children}
      </div>
    </div>
  );
}

export function AlertDialogContent({ children }: AlertDialogContentProps) {
  return <div className="p-6">{children}</div>;
}

export function AlertDialogHeader({ children }: AlertDialogHeaderProps) {
  return <div className="mb-4">{children}</div>;
}

export function AlertDialogTitle({ children }: AlertDialogTitleProps) {
  return <h2 className="text-lg font-semibold mb-2">{children}</h2>;
}

export function AlertDialogDescription({ children }: AlertDialogDescriptionProps) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

export function AlertDialogFooter({ children }: AlertDialogFooterProps) {
  return <div className="flex justify-end gap-2 mt-6">{children}</div>;
}

export function AlertDialogAction({ children, onClick, variant = 'default', asChild }: AlertDialogActionProps) {
  if (asChild) {
    return <>{children}</>;
  }

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm rounded-md transition-colors ${
        variant === 'danger'
          ? 'bg-red-600 text-white hover:bg-red-700'
          : 'bg-foreground text-background hover:bg-foreground/90'
      }`}
    >
      {children}
    </button>
  );
}

export function AlertDialogCancel({ children, onClick }: AlertDialogCancelProps) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 text-sm rounded-md border hover:bg-muted transition-colors"
    >
      {children}
    </button>
  );
}
