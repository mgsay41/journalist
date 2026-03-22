/**
 * Touch-Optimized Button Component
 * Ensures minimum tap target size of 44px for mobile usability
 */

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { useHaptic } from '@/lib/mobile/haptic-feedback';

export interface TouchButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  haptic?: boolean;        // Enable haptic feedback
  hapticType?: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning' | 'selection' | 'impact';
  icon?: React.ReactNode;  // Icon only button
}

const TouchButton = forwardRef<HTMLButtonElement, TouchButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      haptic = false,
      hapticType = 'selection',
      icon,
      children,
      disabled,
      onClick,
      ...props
    },
    ref
  ) => {
    const triggerHaptic = useHaptic();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (haptic && !disabled) {
        triggerHaptic.trigger(hapticType);
      }
      onClick?.(e);
    };

    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-foreground focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
      primary: 'bg-foreground text-background hover:bg-foreground/90',
      secondary: 'bg-muted text-foreground hover:bg-muted/80',
      danger: 'bg-danger text-white hover:bg-danger/90',
      ghost: 'bg-transparent text-foreground hover:bg-muted',
      outline: 'border border-border bg-transparent text-foreground hover:bg-muted hover:border-border',
    };

    // Touch-optimized sizes - minimum 44px (HIG standard)
    const sizes = {
      sm: 'min-h-[44px] px-4 py-2.5 text-sm',
      md: 'min-h-[48px] px-5 py-3 text-base',
      lg: 'min-h-[52px] px-6 py-3.5 text-lg',
      xl: 'min-h-[56px] px-8 py-4 text-xl',
    };

    // Icon-only button - always square
    const iconOnlyStyles = icon && !children
      ? 'aspect-square p-0'
      : '';

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          iconOnlyStyles,
          className
        )}
        disabled={disabled}
        onClick={handleClick}
        {...props}
      >
        {icon && <span className="flex-shrink-0">{icon}</span>}
        {children && <span className="flex items-center gap-2">{children}</span>}
      </button>
    );
  }
);

TouchButton.displayName = 'TouchButton';

export { TouchButton };
