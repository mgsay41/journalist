'use client';

/**
 * Form Error Summary Component
 *
 * Displays a summary of form validation errors with links to jump to each field.
 * Phase 2 Frontend Audit - UX enhancement for form error display
 */

export interface FormErrorField {
  name: string;
  label: string;
  error: string | undefined | null;
  ref?: React.RefObject<HTMLElement>;
}

interface FormErrorSummaryProps {
  /**
   * Array of form fields with errors
   */
  errors: FormErrorField[];
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Title for the error summary
   */
  title?: string;
  /**
   * Whether to show focus icon
   */
  showIcon?: boolean;
}

/**
 * Get error message from various error types
 */
function getErrorMessage(error: string | null | undefined): string | null {
  if (!error) return null;
  return error;
}

/**
 * Scroll to and focus on a form element
 */
function focusField(element: HTMLElement | null) {
  if (!element) return;

  element.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  });

  // Focus the element if it's focusable
  if (
    element.tagName === 'INPUT' ||
    element.tagName === 'TEXTAREA' ||
    element.tagName === 'SELECT'
  ) {
    (element as HTMLInputElement | HTMLTextAreaElement).focus();
  }
  // For contenteditable elements
  else if (element.getAttribute('contenteditable') === 'true') {
    element.focus();
  }
}

/**
 * Component for displaying a single error item
 */
interface ErrorItemProps {
  field: FormErrorField;
  index: number;
}

function ErrorItem({ field, index }: ErrorItemProps) {
  const errorMessage = getErrorMessage(field.error);
  if (!errorMessage) return null;

  const handleClick = () => {
    if (field.ref?.current) {
      focusField(field.ref.current);
    }
  };

  return (
    <li>
      <button
        type="button"
        onClick={handleClick}
        className="flex items-start gap-2 w-full text-right hover:bg-danger/5 p-2 rounded transition-colors"
      >
        <span className="text-danger font-bold mt-0.5" aria-hidden="true">
          {index + 1}.
        </span>
        <div className="flex-1 text-right">
          <span className="font-medium text-foreground">{field.label}:</span>
          <span className="text-danger mr-1">{errorMessage}</span>
        </div>
        <svg
          className="w-4 h-4 text-muted-foreground shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>
    </li>
  );
}

export function FormErrorSummary({
  errors,
  className = '',
  title = 'يرجى تصحيح الأخطاء التالية:',
  showIcon = true,
}: FormErrorSummaryProps) {
  // Filter out fields without errors
  const validErrors = errors.filter(field => getErrorMessage(field.error));

  if (validErrors.length === 0) {
    return null;
  }

  return (
    <div
      className={`mb-4 p-4 bg-danger/10 border border-danger/20 rounded-lg ${className}`}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="flex items-start gap-3">
        {showIcon && (
          <svg
            className="w-5 h-5 text-danger shrink-0 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        )}
        <div className="flex-1">
          <h3 className="font-semibold text-danger mb-2">{title}</h3>
          <ul className="space-y-1">
            {validErrors.map((field, index) => (
              <ErrorItem key={field.name} field={field} index={index} />
            ))}
          </ul>
          <p className="text-xs text-muted-foreground mt-3">
            اضغط على أي خطأ للانتقال إلى الحقل المقابل
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Simplified inline error summary for smaller forms
 */
export interface InlineFormErrorsProps {
  errors: FormErrorField[];
  className?: string;
}

export function InlineFormErrors({ errors, className = '' }: InlineFormErrorsProps) {
  const validErrors = errors.filter(field => getErrorMessage(field.error));

  if (validErrors.length === 0) {
    return null;
  }

  return (
    <div className={`text-sm text-danger mb-4 ${className}`}>
      <p className="font-medium mb-1">يوجد أخطاء:</p>
      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
        {validErrors.map(field => (
          <li key={field.name}>
            <span className="font-medium text-foreground">{field.label}:</span>{' '}
            <span>{getErrorMessage(field.error)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default FormErrorSummary;
