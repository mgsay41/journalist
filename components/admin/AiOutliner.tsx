'use client';

import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

interface OutlineSection {
  level: number;
  title: string;
  description: string;
  keyPoints: string[];
  wordCount: number;
}

interface Introduction {
  title: string;
  suggestedHook: string;
  wordCount: number;
}

interface Conclusion {
  title: string;
  wordCount: number;
}

interface OutlineData {
  title: string;
  estimatedReadingTime: number;
  outline: OutlineSection[];
  introduction: Introduction;
  conclusion: Conclusion;
}

interface AiOutlinerProps {
  onOutlineSelect?: (outline: OutlineData) => void;
  onContentInsert?: (content: string) => void;
  className?: string;
}

type ToneOption = 'professional' | 'casual' | 'academic' | 'opinion';

const toneOptions: { value: ToneOption; label: string; description: string }[] = [
  { value: 'professional', label: 'احترافي', description: 'أسلوب صحفي رصين' },
  { value: 'casual', label: 'بسيط', description: 'أسلوب سهل ومباشر' },
  { value: 'academic', label: 'أكاديمي', description: 'أسلوب بحثي' },
  { value: 'opinion', label: 'رأي', description: 'أسلوب تحليلي شخصي' },
];

export function AiOutliner({ onOutlineSelect, onContentInsert, className = '' }: AiOutlinerProps) {
  const [topic, setTopic] = useState('');
  const [category, setCategory] = useState('');
  const [tone, setTone] = useState<ToneOption>('professional');
  const [targetLength, setTargetLength] = useState(800);
  const [keyPoints, setKeyPoints] = useState<string[]>([]);
  const [currentKeyPoint, setCurrentKeyPoint] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outline, setOutline] = useState<OutlineData | null>(null);
  const [selectedSections, setSelectedSections] = useState<Set<number>>(new Set());

  const abortControllerRef = useRef<AbortController | null>(null);

  // Add key point
  const addKeyPoint = useCallback(() => {
    if (currentKeyPoint.trim()) {
      setKeyPoints([...keyPoints, currentKeyPoint.trim()]);
      setCurrentKeyPoint('');
    }
  }, [currentKeyPoint, keyPoints]);

  // Remove key point
  const removeKeyPoint = useCallback((index: number) => {
    setKeyPoints(keyPoints.filter((_, i) => i !== index));
  }, [keyPoints]);

  // Generate outline
  const generateOutline = useCallback(async () => {
    if (!topic.trim()) {
      setError('يرجى إدخال موضوع المقال');
      return;
    }

    setIsGenerating(true);
    setError(null);

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/admin/ai/outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          category: category.trim() || undefined,
          tone,
          targetLength,
          keyPoints: keyPoints.length > 0 ? keyPoints : undefined,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'فشل في إنشاء المخطط');
      }

      const data = await response.json();
      if (data.success && data.outline) {
        setOutline(data.outline);
        // Select all sections by default
        setSelectedSections(new Set(data.outline.outline.map((_: any, i: number) => i)));
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Request was cancelled
      }
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء إنشاء المخطط');
    } finally {
      setIsGenerating(false);
    }
  }, [topic, category, tone, targetLength, keyPoints]);

  // Toggle section selection
  const toggleSection = useCallback((index: number) => {
    const newSelected = new Set(selectedSections);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedSections(newSelected);
  }, [selectedSections]);

  // Select all sections
  const selectAll = useCallback(() => {
    if (outline) {
      setSelectedSections(new Set(outline.outline.map((_, i) => i)));
    }
  }, [outline]);

  // Deselect all sections
  const deselectAll = useCallback(() => {
    setSelectedSections(new Set());
  }, []);

  // Insert selected sections as content
  const insertSelectedContent = useCallback(() => {
    if (!outline) return;

    let content = '';

    // Add introduction
    if (outline.introduction) {
      content += `<h2>${outline.introduction.title}</h2>\n\n`;
      content += `<p>${outline.introduction.suggestedHook}</p>\n\n`;
    }

    // Add selected sections
    outline.outline.forEach((section, index) => {
      if (selectedSections.has(index)) {
        const headingTag = section.level === 1 ? 'h2' : 'h3';
        content += `<${headingTag}>${section.title}</${headingTag}>\n\n`;
        if (section.description) {
          content += `<p>${section.description}</p>\n\n`;
        }
        if (section.keyPoints && section.keyPoints.length > 0) {
          content += '<ul>\n';
          section.keyPoints.forEach(point => {
            content += `  <li>${point}</li>\n`;
          });
          content += '</ul>\n\n';
        }
      }
    });

    // Add conclusion
    if (outline.conclusion) {
      content += `<h2>${outline.conclusion.title}</h2>\n\n`;
    }

    onContentInsert?.(content);
  }, [outline, selectedSections, onContentInsert]);

  // Use outline
  const useOutline = useCallback(() => {
    if (outline && onOutlineSelect) {
      onOutlineSelect(outline);
    }
  }, [outline, onOutlineSelect]);

  // Regenerate outline
  const regenerate = useCallback(() => {
    generateOutline();
  }, [generateOutline]);

  // Reset form
  const reset = useCallback(() => {
    setTopic('');
    setCategory('');
    setTone('professional');
    setTargetLength(800);
    setKeyPoints([]);
    setCurrentKeyPoint('');
    setOutline(null);
    setSelectedSections(new Set());
    setError(null);
  }, []);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Form */}
      {!outline ? (
        <div className="bg-card rounded-xl border border-border p-6 space-y-5">
          {/* Topic Input */}
          <div>
            <label htmlFor="topic" className="block text-sm font-medium text-foreground mb-2">
              موضوع المقال <span className="text-danger">*</span>
            </label>
            <input
              id="topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="مثال: التكنولوجيا الذكية وتأثيرها على التعليم"
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              disabled={isGenerating}
            />
          </div>

          {/* Category (Optional) */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-foreground mb-2">
              التصنيف <span className="text-muted-foreground text-xs">(اختياري)</span>
            </label>
            <input
              id="category"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="مثال: تقنية"
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              disabled={isGenerating}
            />
          </div>

          {/* Tone Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              الأسلوب
            </label>
            <div className="grid grid-cols-2 gap-2">
              {toneOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTone(option.value)}
                  disabled={isGenerating}
                  className={`p-3 rounded-lg border text-right transition-all ${
                    tone === option.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-muted-foreground/50'
                  } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="font-medium text-sm">{option.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{option.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Target Length */}
          <div>
            <label htmlFor="length" className="block text-sm font-medium text-foreground mb-2">
              الطول المستهدف: <span className="text-primary">{targetLength}</span> كلمة
            </label>
            <input
              id="length"
              type="range"
              min={300}
              max={3000}
              step={100}
              value={targetLength}
              onChange={(e) => setTargetLength(Number(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              disabled={isGenerating}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>300</span>
              <span>3000</span>
            </div>
          </div>

          {/* Key Points */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              النقاط الرئيسية <span className="text-muted-foreground text-xs">(اختياري)</span>
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={currentKeyPoint}
                onChange={(e) => setCurrentKeyPoint(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyPoint())}
                placeholder="أضف نقطة رئيسية..."
                className="flex-1 px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
                disabled={isGenerating}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={addKeyPoint}
                disabled={isGenerating || !currentKeyPoint.trim()}
              >
                إضافة
              </Button>
            </div>
            {keyPoints.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {keyPoints.map((point, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-muted text-sm rounded-md"
                  >
                    {point}
                    <button
                      type="button"
                      onClick={() => removeKeyPoint(index)}
                      className="text-muted-foreground hover:text-danger transition-colors"
                      disabled={isGenerating}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <Alert variant="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Generate Button */}
          <Button
            type="button"
            onClick={generateOutline}
            disabled={isGenerating || !topic.trim()}
            className="w-full h-12 text-base font-semibold gap-2"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                جاري إنشاء المخطط...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                إنشاء مخطط المقال
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Generated Outline Header */}
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-foreground">{outline.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  وقت القراءة المتوقع: {outline.estimatedReadingTime} دقائق
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={selectAll}
                  className="text-xs"
                >
                  تحديد الكل
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={deselectAll}
                  className="text-xs"
                >
                  إلغاء الكل
                </Button>
              </div>
            </div>

            {/* Introduction Preview */}
            {outline.introduction && (
              <div className="bg-muted/50 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-foreground text-sm mb-2">المقدمة</h4>
                <p className="text-sm text-muted-foreground">{outline.introduction.suggestedHook}</p>
              </div>
            )}

            {/* Outline Sections */}
            <div className="space-y-2">
              {outline.outline.map((section, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedSections.has(index)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                  onClick={() => toggleSection(index)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 w-5 h-5 rounded border flex items-center justify-center ${
                      selectedSections.has(index) ? 'border-primary bg-primary' : 'border-border'
                    }`}>
                      {selectedSections.has(index) && (
                        <svg className="w-3 h-3 text-background" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground text-sm">{section.title}</h4>
                      {section.description && (
                        <p className="text-xs text-muted-foreground mt-1">{section.description}</p>
                      )}
                      {section.keyPoints && section.keyPoints.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {section.keyPoints.slice(0, 2).map((point, i) => (
                            <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                              <span className="text-primary">•</span>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>{section.wordCount} كلمة</span>
                        <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                        <span>المستوى {section.level}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Conclusion Preview */}
            {outline.conclusion && (
              <div className="bg-muted/50 rounded-lg p-4 mt-4">
                <h4 className="font-semibold text-foreground text-sm mb-2">الخاتمة</h4>
                <p className="text-sm text-muted-foreground">{outline.conclusion.title}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              type="button"
              onClick={insertSelectedContent}
              disabled={selectedSections.size === 0}
              className="flex-1 h-11 font-semibold gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              إدراج في المحرر
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={useOutline}
              className="flex-1 h-11 font-semibold gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              استخدام المخطط
            </Button>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={regenerate}
              disabled={isGenerating}
              className="flex-1 h-10 gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              إعادة الإنشاء
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={reset}
              className="flex-1 h-10 gap-2 text-muted-foreground hover:text-danger"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              بدء جديد
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AiOutliner;
