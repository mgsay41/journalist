'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/Button';

interface TooltipData {
  type: 'grammar' | 'seo';
  id: string;
  errorType?: 'spelling' | 'grammar' | 'punctuation' | 'style';
  suggestionType?: string;
  original: string;
  correction?: string;
  suggestedText?: string;
  explanation?: string;
  reason?: string;
  priority?: 'high' | 'medium' | 'low';
  rect: DOMRect;
}

interface SuggestionTooltipProps {
  editor: Editor | null;
  onApplyGrammarCorrection?: (id: string, correction: string) => void;
  onIgnoreGrammarError?: (id: string) => void;
  onApplySeoSuggestion?: (id: string, suggestedText: string) => void;
  onIgnoreSeoSuggestion?: (id: string) => void;
}

export function SuggestionTooltip({
  editor,
  onApplyGrammarCorrection,
  onIgnoreGrammarError,
  onApplySeoSuggestion,
  onIgnoreSeoSuggestion,
}: SuggestionTooltipProps) {
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  const calculatePosition = useCallback((rect: DOMRect) => {
    // Position tooltip below the marked text
    const top = rect.bottom + window.scrollY + 8;
    const left = rect.left + window.scrollX + rect.width / 2;
    setPosition({ top, left });
  }, []);

  const handleApply = useCallback(() => {
    if (!tooltipData) return;

    if (tooltipData.type === 'grammar' && tooltipData.correction) {
      if (onApplyGrammarCorrection) {
        onApplyGrammarCorrection(tooltipData.id, tooltipData.correction);
      } else if (editor) {
        editor.commands.applyGrammarCorrection(tooltipData.id, tooltipData.correction);
      }
    } else if (tooltipData.type === 'seo' && tooltipData.suggestedText) {
      if (onApplySeoSuggestion) {
        onApplySeoSuggestion(tooltipData.id, tooltipData.suggestedText);
      } else if (editor) {
        editor.commands.applySeoSuggestion(tooltipData.id, tooltipData.suggestedText);
      }
    }

    setTooltipData(null);
  }, [tooltipData, editor, onApplyGrammarCorrection, onApplySeoSuggestion]);

  // Handle click outside to close tooltip
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setTooltipData(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!tooltipData) return;

      if (event.key === 'Escape') {
        setTooltipData(null);
      } else if (event.key === 'Tab' && !event.shiftKey) {
        // Tab to accept suggestion
        event.preventDefault();
        handleApply();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [tooltipData]);

  // Listen for hover events on marked elements
  useEffect(() => {
    if (!editor) return;

    const editorElement = editor.view.dom;

    const handleMouseOver = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Check for grammar error
      const grammarError = target.closest('[data-grammar-error]') as HTMLElement;
      if (grammarError) {
        const rect = grammarError.getBoundingClientRect();
        setTooltipData({
          type: 'grammar',
          id: grammarError.getAttribute('data-error-id') || '',
          errorType: grammarError.getAttribute('data-error-type') as TooltipData['errorType'],
          original: grammarError.textContent || '',
          correction: grammarError.getAttribute('data-correction') || '',
          explanation: grammarError.getAttribute('data-explanation') || '',
          rect,
        });
        calculatePosition(rect);
        return;
      }

      // Check for SEO suggestion
      const seoSuggestion = target.closest('[data-seo-suggestion]') as HTMLElement;
      if (seoSuggestion) {
        const rect = seoSuggestion.getBoundingClientRect();
        setTooltipData({
          type: 'seo',
          id: seoSuggestion.getAttribute('data-suggestion-id') || '',
          suggestionType: seoSuggestion.getAttribute('data-suggestion-type') || '',
          original: seoSuggestion.textContent || '',
          suggestedText: seoSuggestion.getAttribute('data-suggested-text') || '',
          reason: seoSuggestion.getAttribute('data-reason') || '',
          priority: seoSuggestion.getAttribute('data-priority') as TooltipData['priority'],
          rect,
        });
        calculatePosition(rect);
        return;
      }
    };

    editorElement.addEventListener('mouseover', handleMouseOver);
    return () => editorElement.removeEventListener('mouseover', handleMouseOver);
  }, [editor]);

  const handleIgnore = useCallback(() => {
    if (!tooltipData) return;

    if (tooltipData.type === 'grammar') {
      if (onIgnoreGrammarError) {
        onIgnoreGrammarError(tooltipData.id);
      } else if (editor) {
        editor.commands.removeGrammarError(tooltipData.id);
      }
    } else if (tooltipData.type === 'seo') {
      if (onIgnoreSeoSuggestion) {
        onIgnoreSeoSuggestion(tooltipData.id);
      } else if (editor) {
        editor.commands.removeSeoSuggestion(tooltipData.id);
      }
    }

    setTooltipData(null);
  }, [tooltipData, editor, onIgnoreGrammarError, onIgnoreSeoSuggestion]);

  const getErrorTypeLabel = (type?: string) => {
    switch (type) {
      case 'spelling':
        return 'خطأ إملائي';
      case 'grammar':
        return 'خطأ نحوي';
      case 'punctuation':
        return 'خطأ ترقيم';
      case 'style':
        return 'اقتراح أسلوبي';
      default:
        return 'خطأ';
    }
  };

  const getErrorTypeColor = (type?: string) => {
    switch (type) {
      case 'spelling':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'grammar':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'punctuation':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'style':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getSuggestionTypeLabel = (type?: string) => {
    switch (type) {
      case 'add-keyword':
        return 'إضافة كلمة مفتاحية';
      case 'improve-heading':
        return 'تحسين العنوان';
      case 'add-link':
        return 'إضافة رابط';
      case 'shorten-paragraph':
        return 'تقصير الفقرة';
      case 'improve-readability':
        return 'تحسين القراءة';
      case 'add-alt-text':
        return 'إضافة نص بديل';
      default:
        return 'اقتراح SEO';
    }
  };

  const getPriorityLabel = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'أولوية عالية';
      case 'medium':
        return 'أولوية متوسطة';
      case 'low':
        return 'أولوية منخفضة';
      default:
        return '';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'bg-green-100 text-green-700';
      case 'medium':
        return 'bg-green-50 text-green-600';
      case 'low':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  if (!tooltipData) return null;

  return (
    <div
      ref={tooltipRef}
      className="fixed z-50 animate-in fade-in zoom-in-95 duration-150"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateX(-50%)',
      }}
    >
      <div className="bg-card border border-border rounded-lg shadow-lg max-w-sm">
        {/* Arrow */}
        <div
          className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0"
          style={{
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderBottom: '8px solid var(--border)',
          }}
        />
        <div
          className="absolute -top-[7px] left-1/2 -translate-x-1/2 w-0 h-0"
          style={{
            borderLeft: '7px solid transparent',
            borderRight: '7px solid transparent',
            borderBottom: '7px solid var(--card)',
          }}
        />

        {/* Content */}
        <div className="p-3">
          {tooltipData.type === 'grammar' ? (
            <>
              {/* Grammar Error Header */}
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded border ${getErrorTypeColor(
                    tooltipData.errorType
                  )}`}
                >
                  {getErrorTypeLabel(tooltipData.errorType)}
                </span>
              </div>

              {/* Original Text */}
              <div className="mb-2">
                <span className="text-xs text-muted-foreground">النص الأصلي:</span>
                <p className="text-sm line-through text-red-500">{tooltipData.original}</p>
              </div>

              {/* Correction */}
              {tooltipData.correction && (
                <div className="mb-2">
                  <span className="text-xs text-muted-foreground">التصحيح:</span>
                  <p className="text-sm font-medium text-green-600">{tooltipData.correction}</p>
                </div>
              )}

              {/* Explanation */}
              {tooltipData.explanation && (
                <p className="text-xs text-muted-foreground mb-3">{tooltipData.explanation}</p>
              )}
            </>
          ) : (
            <>
              {/* SEO Suggestion Header */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 border border-green-200">
                  {getSuggestionTypeLabel(tooltipData.suggestionType)}
                </span>
                {tooltipData.priority && (
                  <span className={`text-xs px-2 py-0.5 rounded ${getPriorityColor(tooltipData.priority)}`}>
                    {getPriorityLabel(tooltipData.priority)}
                  </span>
                )}
              </div>

              {/* Current Text */}
              <div className="mb-2">
                <span className="text-xs text-muted-foreground">النص الحالي:</span>
                <p className="text-sm text-muted-foreground">{tooltipData.original}</p>
              </div>

              {/* Suggested Text */}
              {tooltipData.suggestedText && (
                <div className="mb-2">
                  <span className="text-xs text-muted-foreground">النص المقترح:</span>
                  <p className="text-sm font-medium text-green-600">{tooltipData.suggestedText}</p>
                </div>
              )}

              {/* Reason */}
              {tooltipData.reason && (
                <p className="text-xs text-muted-foreground mb-3">{tooltipData.reason}</p>
              )}
            </>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <Button
              size="sm"
              onClick={handleApply}
              className="flex-1"
            >
              {tooltipData.type === 'grammar' ? 'تصحيح' : 'قبول'}
              <span className="mr-2 text-xs opacity-70">(Tab)</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleIgnore}
            >
              تجاهل
              <span className="mr-2 text-xs opacity-70">(Esc)</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SuggestionTooltip;
