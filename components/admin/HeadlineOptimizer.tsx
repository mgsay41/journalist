'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

export interface HeadlineSuggestion {
  headline: string;
  score: number;
  length: number;
  type: 'professional' | 'catchy' | 'power-words' | 'number';
  hasPowerWords: boolean;
  hasNumber: boolean;
  improvements: string[];
}

export interface HeadlineAnalysis {
  currentHeadline: {
    headline: string;
    score: number;
    length: number;
    hasPowerWords: boolean;
    hasNumber: boolean;
    issues: string[];
  };
  suggestions: HeadlineSuggestion[];
  recommended: number;
}

interface HeadlineOptimizerProps {
  headline: string;
  content?: string;
  category?: string;
  onHeadlineSelect?: (headline: string) => void;
  disabled?: boolean;
  autoAnalyze?: boolean;
  analyzeDelay?: number;
}

export function HeadlineOptimizer({
  headline,
  content = '',
  category = '',
  onHeadlineSelect,
  disabled = false,
  autoAnalyze = false,
  analyzeDelay = 1500,
}: HeadlineOptimizerProps) {
  const [analysis, setAnalysis] = useState<HeadlineAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<number | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const analyzeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Analyze headline
  const analyzeHeadline = useCallback(async () => {
    if (!headline.trim() || isAnalyzing) return;

    setIsAnalyzing(true);
    setError(null);

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/admin/ai/optimize-headline', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headline: headline.trim(),
          content: content || undefined,
          category: category || undefined,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'فشل في تحليل العنوان');
      }

      const data = await response.json();
      if (data.success && data.analysis) {
        setAnalysis(data.analysis);
        setShowSuggestions(true);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Request was cancelled
      }
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء تحليل العنوان');
    } finally {
      setIsAnalyzing(false);
    }
  }, [headline, content, category, isAnalyzing]);

  // Auto-analyze with debounce
  useEffect(() => {
    if (!autoAnalyze || !headline.trim()) {
      return;
    }

    if (analyzeTimeoutRef.current) {
      clearTimeout(analyzeTimeoutRef.current);
    }

    analyzeTimeoutRef.current = setTimeout(() => {
      analyzeHeadline();
    }, analyzeDelay);

    return () => {
      if (analyzeTimeoutRef.current) {
        clearTimeout(analyzeTimeoutRef.current);
      }
    };
  }, [headline, autoAnalyze, analyzeDelay, analyzeHeadline]);

  // Select a suggestion
  const selectSuggestion = useCallback((suggestion: HeadlineSuggestion) => {
    onHeadlineSelect?.(suggestion.headline);
    setSelectedSuggestion(analysis?.suggestions.indexOf(suggestion) ?? null);
  }, [onHeadlineSelect, analysis?.suggestions]);

  // Get score color
  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-danger';
  };

  // Get score background
  const getScoreBg = (score: number): string => {
    if (score >= 80) return 'bg-success/10 border-success/20';
    if (score >= 60) return 'bg-warning/10 border-warning/20';
    return 'bg-danger/10 border-danger/20';
  };

  // Get type label
  const getTypeLabel = (type: HeadlineSuggestion['type']): string => {
    const labels = {
      'professional': 'احترافي',
      'catchy': 'جذاب',
      'power-words': 'كلمات قوية',
      'number': 'رقمي',
    };
    return labels[type];
  };

  // Get type color
  const getTypeColor = (type: HeadlineSuggestion['type']): string => {
    const colors = {
      'professional': 'bg-blue-500/10 text-blue-600',
      'catchy': 'bg-purple-500/10 text-purple-600',
      'power-words': 'bg-orange-500/10 text-orange-600',
      'number': 'bg-green-500/10 text-green-600',
    };
    return colors[type];
  };

  return (
    <div className="space-y-4">
      {/* Current Headline Score */}
      {analysis && !isAnalyzing && (
        <div className={`p-4 rounded-lg border ${getScoreBg(analysis.currentHeadline.score)}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">درجة العنوان الحالي</p>
              <p className={`text-2xl font-bold ${getScoreColor(analysis.currentHeadline.score)}`}>
                {analysis.currentHeadline.score}
                <span className="text-sm text-muted-foreground mr-2">/ 100</span>
              </p>
            </div>
            <div className="text-left">
              <p className="text-xs text-muted-foreground mb-1">الطول</p>
              <p className="text-sm font-medium">
                {analysis.currentHeadline.length} / 100 حرف
              </p>
            </div>
          </div>

          {/* Issues */}
          {analysis.currentHeadline.issues.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">نقاط للتحسين:</p>
              <ul className="space-y-1">
                {analysis.currentHeadline.issues.map((issue, index) => (
                  <li key={index} className="text-xs flex items-start gap-2">
                    <svg className="w-3 h-3 text-warning mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="text-muted-foreground">{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Features */}
          <div className="mt-3 flex gap-3">
            {analysis.currentHeadline.hasPowerWords && (
              <span className="text-xs flex items-center gap-1.5 px-2 py-1 rounded-md bg-success/10 text-success">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                كلمات قوية
              </span>
            )}
            {analysis.currentHeadline.hasNumber && (
              <span className="text-xs flex items-center gap-1.5 px-2 py-1 rounded-md bg-success/10 text-success">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                يحتوي أرقام
              </span>
            )}
          </div>
        </div>
      )}

      {/* Analyze Button (if not auto) */}
      {!autoAnalyze && (
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={analyzeHeadline}
            disabled={!headline.trim() || isAnalyzing || disabled}
            className="gap-2"
          >
            {isAnalyzing ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                جاري التحليل...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                تحليل العنوان
              </>
            )}
          </Button>

          {analysis && !showSuggestions && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowSuggestions(true)}
              className="text-primary"
            >
              عرض الاقتراحات
            </Button>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <Alert variant="error" onClose={() => setError(null)} className="text-xs py-2">
          {error}
        </Alert>
      )}

      {/* Suggestions */}
      {showSuggestions && analysis && analysis.suggestions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">عناوين مقترحة</h4>
            <button
              type="button"
              onClick={() => setShowSuggestions(false)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              إخفاء
            </button>
          </div>

          <div className="space-y-2">
            {analysis.suggestions.map((suggestion, index) => {
              const isRecommended = analysis.recommended === index;
              const isSelected = selectedSuggestion === index;

              return (
                <div
                  key={index}
                  className={`p-3 rounded-lg border-2 transition-all cursor-pointer hover:border-primary/30 ${
                    isRecommended
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  } ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                  onClick={() => selectSuggestion(suggestion)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${isRecommended ? 'text-primary' : 'text-foreground'}`}>
                        {suggestion.headline}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${getTypeColor(suggestion.type)}`}>
                          {getTypeLabel(suggestion.type)}
                        </span>
                        <span className={`text-xs font-semibold ${getScoreColor(suggestion.score)}`}>
                          {suggestion.score}/100
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {suggestion.length} حرف
                        </span>
                      </div>
                    </div>

                    {/* Recommended badge */}
                    {isRecommended && (
                      <span className="shrink-0 px-2 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                        مقترح
                      </span>
                    )}

                    {/* Apply button on hover */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        selectSuggestion(suggestion);
                      }}
                      className="shrink-0 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-md hover:bg-primary/90 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      تطبيق
                    </button>
                  </div>

                  {/* Improvements */}
                  {suggestion.improvements.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-1">التحسينات:</p>
                      <ul className="flex flex-wrap gap-1">
                        {suggestion.improvements.slice(0, 3).map((improvement, i) => (
                          <li key={i} className="text-xs px-2 py-0.5 bg-success/10 text-success rounded">
                            {improvement}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Features badges */}
                  <div className="mt-2 flex gap-2">
                    {suggestion.hasPowerWords && (
                      <span className="text-xs px-2 py-0.5 rounded bg-success/10 text-success flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        كلمات قوية
                      </span>
                    )}
                    {suggestion.hasNumber && (
                      <span className="text-xs px-2 py-0.5 rounded bg-success/10 text-success flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 101.414 1.414L8 6.414V5z" />
                        </svg>
                        أرقام
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default HeadlineOptimizer;
