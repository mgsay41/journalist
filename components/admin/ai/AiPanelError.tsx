/**
 * AI Panel Error Component
 *
 * Displays user-friendly error messages with retry option.
 * Phase 2 Frontend Audit - Split from AiPanel, enhanced with retry button
 */

import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Loading";

interface AiPanelErrorProps {
  error: string;
  onDismiss: () => void;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export function AiPanelError({ error, onDismiss, onRetry, isRetrying = false }: AiPanelErrorProps) {
  const getUserFriendlyError = (errorMessage: string): string => {
    if (errorMessage.includes('JSON') || errorMessage.includes('parse')) {
      return 'حدث خطأ في معالجة الاستجابة. حاول مرة أخرى.';
    }
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return 'تعذر الاتصال بالخادم. تحقق من اتصالك بالإنترنت.';
    }
    if (errorMessage.includes('timeout')) {
      return 'انتهت مهلة الطلب. حاول مرة أخرى لاحقاً.';
    }
    if (errorMessage.includes('rate') || errorMessage.includes('limit')) {
      return 'تم تجاوز الحد المسموح. انتظر قليلاً ثم حاول مجدداً.';
    }
    return errorMessage;
  };

  const canRetry = error.includes('network') || error.includes('fetch') ||
                   error.includes('timeout') || error.includes('JSON') ||
                   error.includes('parse');

  return (
    <div className="mb-4 p-3 rounded-md bg-danger/10 border border-danger/20">
      <div className="flex items-start gap-2">
        <svg className="w-4 h-4 text-danger mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-danger font-medium">{getUserFriendlyError(error)}</p>
          <div className="flex items-center gap-3 mt-2">
            {canRetry && onRetry && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onRetry}
                disabled={isRetrying}
                className="text-xs h-7 px-3"
              >
                {isRetrying ? (
                  <span className="flex items-center gap-1">
                    <Spinner size="sm" />
                    جارِ إعادة المحاولة...
                  </span>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    إعادة المحاولة
                  </>
                )}
              </Button>
            )}
            <button
              onClick={onDismiss}
              className="text-xs text-danger/70 hover:text-danger"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
