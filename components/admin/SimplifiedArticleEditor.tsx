'use client';

import { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { RichTextEditor, type RichTextEditorRef } from './RichTextEditor';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

// localStorage key for draft persistence
const DRAFT_STORAGE_KEY = 'article-draft-simplified';
const LOCAL_SAVE_DELAY = 1000; // 1 second debounce

interface DraftData {
  title: string;
  content: string;
  savedAt: number;
}

// Grammar issue from AI analysis
export interface GrammarIssueForEditor {
  id: string;
  type: 'spelling' | 'grammar' | 'punctuation' | 'style';
  original: string;
  correction: string;
  explanation: string;
}

// SEO suggestion from AI analysis
export interface SeoSuggestionForEditor {
  id: string;
  type: string;
  original: string;
  suggestedText: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

// Methods exposed via ref
export interface SimplifiedArticleEditorRef {
  applyGrammarMarks: (issues: GrammarIssueForEditor[]) => void;
  applySeoMarks: (suggestions: SeoSuggestionForEditor[]) => void;
  clearAllMarks: () => void;
}

interface SimplifiedArticleEditorProps {
  initialTitle?: string;
  initialContent?: string;
  isCompleting?: boolean;
  onComplete: (data: { title: string; content: string }) => void;
  onSaveDraft?: (data: { title: string; content: string }) => void;
  // Inline suggestions support
  enableInlineSuggestions?: boolean;
  onApplyGrammarCorrection?: (id: string, correction: string) => void;
  onIgnoreGrammarError?: (id: string) => void;
  onApplySeoSuggestion?: (id: string, suggestedText: string) => void;
  onIgnoreSeoSuggestion?: (id: string) => void;
}

export const SimplifiedArticleEditor = forwardRef<SimplifiedArticleEditorRef, SimplifiedArticleEditorProps>(
  function SimplifiedArticleEditor({
    initialTitle = '',
    initialContent = '',
    isCompleting = false,
    onComplete,
    onSaveDraft,
    enableInlineSuggestions = false,
    onApplyGrammarCorrection,
    onIgnoreGrammarError,
    onApplySeoSuggestion,
    onIgnoreSeoSuggestion,
  }, ref) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);

  // Refs
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);
  const initializedRef = useRef(false);
  const editorRef = useRef<RichTextEditorRef>(null);

  // Expose methods via ref for applying inline marks
  useImperativeHandle(ref, () => ({
    applyGrammarMarks: (issues: GrammarIssueForEditor[]) => {
      editorRef.current?.applyGrammarMarks(issues);
    },
    applySeoMarks: (suggestions: SeoSuggestionForEditor[]) => {
      editorRef.current?.applySeoMarks(suggestions);
    },
    clearAllMarks: () => {
      editorRef.current?.clearAllMarks();
    },
  }), []);

  // Load draft from localStorage on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // Don't load draft if we have initial values
    if (initialTitle || initialContent) return;

    try {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        const draft: DraftData = JSON.parse(savedDraft);
        setHasDraft(true);
        setTitle(draft.title || '');
        setContent(draft.content || '');
        setLastSaved(new Date(draft.savedAt));
        setDraftLoaded(true);
      }
    } catch (err) {
      console.error('Failed to load draft:', err);
    }
  }, [initialTitle, initialContent]);

  // Save draft to localStorage on changes (debounced)
  useEffect(() => {
    if (!initializedRef.current) return;
    if (!title && !content) return;

    if (autoSaveRef.current) {
      clearTimeout(autoSaveRef.current);
    }

    setAutoSaving(true);
    autoSaveRef.current = setTimeout(() => {
      try {
        const draft: DraftData = {
          title,
          content,
          savedAt: Date.now(),
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
        setLastSaved(new Date());
        setHasDraft(true);
        onSaveDraft?.({ title, content });
      } catch (err) {
        console.error('Failed to save draft:', err);
      } finally {
        setAutoSaving(false);
      }
    }, LOCAL_SAVE_DELAY);

    return () => {
      if (autoSaveRef.current) {
        clearTimeout(autoSaveRef.current);
      }
    };
  }, [title, content, onSaveDraft]);

  // Clear draft
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setHasDraft(false);
      setLastSaved(null);
    } catch (err) {
      console.error('Failed to clear draft:', err);
    }
  }, []);

  // Discard draft and reset
  const discardDraft = useCallback(() => {
    clearDraft();
    setTitle('');
    setContent('');
    setDraftLoaded(false);
  }, [clearDraft]);

  // Handle complete article
  const handleComplete = useCallback(() => {
    if (!title.trim() || !content.trim()) return;
    onComplete({ title: title.trim(), content: content.trim() });
  }, [title, content, onComplete]);

  // Calculate word count and reading time
  const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).filter(word => word.length > 0).length;
  const readingTime = Math.ceil(wordCount / 200);

  // Count images in content
  const imageCount = (content.match(/<img/gi) || []).length;

  // Content quality checks
  const hasMinimumContent = wordCount >= 50;
  const hasGoodContent = wordCount >= 300;
  const hasImages = imageCount > 0;

  // Check if can complete
  const canComplete = title.trim().length > 0 && hasMinimumContent;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter: Complete article
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (canComplete && !isCompleting) {
          handleComplete();
        }
      }

      // Ctrl+S: Save draft (prevent browser default)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        // Draft is auto-saved, just show feedback
        if (title || content) {
          const draft: DraftData = {
            title,
            content,
            savedAt: Date.now(),
          };
          try {
            localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
            setLastSaved(new Date());
            setHasDraft(true);
            onSaveDraft?.({ title, content });
          } catch (err) {
            console.error('Failed to save draft:', err);
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [canComplete, isCompleting, handleComplete, title, content, onSaveDraft]);

  return (
    <div className="space-y-8">
      {/* Draft Restored Notice */}
      {draftLoaded && (
        <div className="bg-info/10 border border-info/30 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-info/20 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-sm text-foreground">
              تم استعادة المسودة المحفوظة محلياً
              {lastSaved && <span className="text-muted-foreground"> - {lastSaved.toLocaleString('ar-SA')}</span>}
            </span>
          </div>
          <button
            onClick={() => setDraftLoaded(false)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Title Input */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <label htmlFor="article-title" className="text-base font-semibold text-foreground">
            عنوان المقال
          </label>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
            {title.length} / 200 حرف
          </span>
        </div>
        <Input
          id="article-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="أدخل عنوان المقال هنا..."
          className="text-xl font-bold h-14 border-2 focus:border-primary bg-background"
          maxLength={200}
          disabled={isCompleting}
        />
        {!title.trim() && (
          <p className="mt-2 text-sm text-danger flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            العنوان مطلوب
          </p>
        )}
      </div>

      {/* Content Editor */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <label className="text-base font-semibold text-foreground">
            محتوى المقال
          </label>
        </div>
        <div className="border-2 rounded-xl overflow-hidden focus-within:border-primary transition-colors bg-background">
          <RichTextEditor
            ref={editorRef}
            content={content}
            onChange={setContent}
            placeholder="ابدأ الكتابة هنا... أضف الصور والفيديوهات والروابط حسب الحاجة"
            minHeight="400px"
            enableInlineSuggestions={enableInlineSuggestions}
            onApplyGrammarCorrection={onApplyGrammarCorrection}
            onIgnoreGrammarError={onIgnoreGrammarError}
            onApplySeoSuggestion={onApplySeoSuggestion}
            onIgnoreSeoSuggestion={onIgnoreSeoSuggestion}
          />
        </div>
        <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-foreground font-medium">{wordCount} كلمة</span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-sm text-muted-foreground">{readingTime} دقيقة للقراءة</span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-sm text-muted-foreground">{imageCount} صورة</span>
            </div>
          </div>

          {/* Content validation warnings */}
          {(!hasMinimumContent || !hasGoodContent || !hasImages) && (
            <div className="flex flex-wrap gap-2">
              {!hasMinimumContent && (
                <span className="text-xs text-danger bg-danger/10 px-2 py-1 rounded-md flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  أقل من 50 كلمة
                </span>
              )}
              {hasMinimumContent && !hasGoodContent && (
                <span className="text-xs text-warning bg-warning/10 px-2 py-1 rounded-md flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  المحتوى قصير (أقل من 300 كلمة)
                </span>
              )}
              {!hasImages && (
                <span className="text-xs text-warning bg-warning/10 px-2 py-1 rounded-md flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                  </svg>
                  لا توجد صور
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Section */}
      <div className="bg-card rounded-xl border border-border p-6">
        {/* Auto-save status */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3 text-sm">
            {autoSaving ? (
              <span className="flex items-center gap-2 text-muted-foreground bg-muted px-3 py-1.5 rounded-lg">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                جاري الحفظ المحلي...
              </span>
            ) : lastSaved ? (
              <span className="flex items-center gap-2 text-success bg-success/10 px-3 py-1.5 rounded-lg">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                محفوظ محلياً: {lastSaved.toLocaleTimeString('ar-SA')}
              </span>
            ) : (
              <span className="text-muted-foreground">لم يتم الحفظ بعد</span>
            )}
          </div>

          {hasDraft && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={discardDraft}
              disabled={isCompleting}
              className="text-muted-foreground hover:text-danger gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              مسح الكل
            </Button>
          )}
        </div>

        {/* Main action button */}
        <Button
          type="button"
          onClick={handleComplete}
          disabled={!canComplete || isCompleting}
          className="w-full h-14 text-lg font-semibold gap-3 rounded-xl"
        >
          {isCompleting ? (
            <>
              <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              جاري التحليل...
            </>
          ) : (
            <>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              إكمال المقال بالذكاء الاصطناعي
            </>
          )}
        </Button>

        {/* Keyboard shortcuts hint */}
        <div className="mt-4 flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-muted rounded border border-border font-mono text-[10px]">Ctrl</kbd>
            <span>+</span>
            <kbd className="px-1.5 py-0.5 bg-muted rounded border border-border font-mono text-[10px]">Enter</kbd>
            <span className="mr-1">إكمال</span>
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-muted rounded border border-border font-mono text-[10px]">Ctrl</kbd>
            <span>+</span>
            <kbd className="px-1.5 py-0.5 bg-muted rounded border border-border font-mono text-[10px]">S</kbd>
            <span className="mr-1">حفظ</span>
          </span>
        </div>

        {/* Help text */}
        {!canComplete && (
          <div className="mt-6 bg-muted/50 rounded-xl p-4">
            <p className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              ملاحظة:
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground mb-4">
              {!title.trim() && (
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-danger shrink-0" />
                  أضف عنوان للمقال
                </li>
              )}
              {wordCount < 50 && (
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" />
                  اكتب 50 كلمة على الأقل في محتوى المقال
                </li>
              )}
            </ul>
            <p className="text-sm text-muted-foreground border-t border-border pt-4">
              عند النقر على &quot;إكمال المقال&quot;، سيقوم الذكاء الاصطناعي بتحليل المحتوى وتوليد:
              التصنيفات، الوسوم، الكلمات المفتاحية، عنوان ووصف SEO، والمزيد.
            </p>
          </div>
        )}
      </div>
    </div>
  );
});

export default SimplifiedArticleEditor;
