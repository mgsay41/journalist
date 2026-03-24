'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import type { RichTextEditorRef } from '@/components/admin/RichTextEditor';
import {
  convertGrammarIssuesToMarks,
  convertSeoSuggestionsToMarks,
  calculateReadabilityGrade,
  countPassiveVoice,
  getReadabilityLabel,
  getReadabilityColor,
  type GrammarMark,
  type SeoMark,
} from '@/lib/ai/inline-marks';
import type { CompleteArticleResult, RewriteArticleResult, ArticleGrammarIssue } from '@/lib/ai';
import { analyzeArticle, type ArticleContent } from '@/lib/seo';

interface SuggestedCategory {
  name: string;
  isExisting: boolean;
  confidence: number;
  reason?: string;
  id?: string;
}

interface SuggestedTag {
  name: string;
  isExisting: boolean;
  relevance: 'high' | 'medium' | 'low';
  id?: string;
}

interface MetaTitleOption {
  title: string;
  length: number;
  score: number;
  hasKeyword: boolean;
}

interface MetaDescriptionOption {
  description: string;
  length: number;
  score: number;
  hasKeyword: boolean;
  hasCTA: boolean;
}

interface TitleSuggestion {
  title: string;
  improvements: string[];
  score: number;
  hasPowerWords: boolean;
  hasNumber: boolean;
  hasKeywordAtStart: boolean;
}

interface CompletionResults {
  focusKeyword: string;
  secondaryKeywords: string[];
  suggestedCategories: SuggestedCategory[];
  suggestedTags: SuggestedTag[];
  slug: string;
  titleSuggestions: TitleSuggestion[];
  metaTitles: MetaTitleOption[];
  metaDescriptions: MetaDescriptionOption[];
  excerpt: string;
  grammarIssues: ArticleGrammarIssue[];
  seoAnalysis: {
    score: number;
    status: 'good' | 'needs-improvement' | 'poor';
    topIssues: string[];
  };
  availableCategories: Array<{ id: string; name: string }>;
  availableTags: Array<{ id: string; name: string }>;
}

type AiPhase = 'idle' | 'analyzing' | 'rewriting' | 'complete' | 'error';

interface UnifiedAiPanelProps {
  editorRef: React.RefObject<RichTextEditorRef | null>;
  title: string;
  content: string;
  articleId?: string;
  articleType: string;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
  onArticleTypeChange: (type: string) => void;
  onSlugChange: (slug: string) => void;
  onMetaTitleChange: (metaTitle: string) => void;
  onMetaDescriptionChange: (metaDescription: string) => void;
  onExcerptChange: (excerpt: string) => void;
  onFocusKeywordChange: (keyword: string) => void;
  selectedCategoryIds: string[];
  onCategoriesChange: (ids: string[], newNames: string[]) => void;
  selectedTagIds: string[];
  onTagsChange: (ids: string[], newNames: string[]) => void;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  excerpt: string;
  focusKeyword: string;
  hasFeaturedImage: boolean;
  imageCount: number;
  imagesWithAlt: number;
  onComplete?: (data: { articleId: string }) => void;
}

const ARTICLE_TYPE_OPTIONS = [
  { value: 'article', label: 'مقال' },
  { value: 'news', label: 'خبر عاجل' },
  { value: 'report', label: 'تقرير' },
  { value: 'investigation', label: 'تحقيق' },
  { value: 'opinion', label: 'رأي' },
];

const TABS = [
  { id: 'ai', label: 'تحسين AI', icon: '⚡' },
  { id: 'seo', label: 'SEO', icon: '📊' },
  { id: 'meta', label: 'ميتا', icon: '📝' },
  { id: 'taxonomy', label: 'التصنيف', icon: '🏷️' },
] as const;

type TabId = typeof TABS[number]['id'];

export function UnifiedAiPanel({
  editorRef,
  title,
  content,
  articleId,
  articleType,
  onTitleChange,
  onContentChange,
  onArticleTypeChange,
  onSlugChange,
  onMetaTitleChange,
  onMetaDescriptionChange,
  onExcerptChange,
  onFocusKeywordChange,
  selectedCategoryIds,
  onCategoriesChange,
  selectedTagIds,
  onTagsChange,
  slug,
  metaTitle,
  metaDescription,
  excerpt,
  focusKeyword,
  hasFeaturedImage,
  imageCount,
  imagesWithAlt,
  onComplete,
}: UnifiedAiPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('ai');
  const [aiPhase, setAiPhase] = useState<AiPhase>('idle');
  const [aiStep, setAiStep] = useState(0);
  const [aiMessage, setAiMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [completionResults, setCompletionResults] = useState<CompletionResults | null>(null);
  const [aiIteration, setAiIteration] = useState(0);
  const [rewriteChanges, setRewriteChanges] = useState<string[]>([]);
  const [grammarMarksActive, setGrammarMarksActive] = useState(false);
  const [seoMarksActive, setSeoMarksActive] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [newCategoryNames, setNewCategoryNames] = useState<string[]>([]);
  const [newTagNames, setNewTagNames] = useState<string[]>([]);
  const [liveSeoScore, setLiveSeoScore] = useState<{ score: number; status: string }>({ score: 0, status: 'needs-improvement' });

  const abortControllerRef = useRef<AbortController | null>(null);

  const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).filter(w => w.length > 0).length;
  const readabilityGrade = calculateReadabilityGrade(content);
  const passiveVoiceCount = countPassiveVoice(content);

  useEffect(() => {
    const timer = setTimeout(() => {
      const articleContent: ArticleContent = {
        title,
        content,
        metaTitle: metaTitle || undefined,
        metaDescription: metaDescription || undefined,
        focusKeyword: focusKeyword || undefined,
        slug: slug || undefined,
        hasFeaturedImage,
        imageCount,
        imagesWithAlt,
      };
      const result = analyzeArticle(articleContent);
      setLiveSeoScore({ score: result.percentage, status: result.status });
    }, 500);
    return () => clearTimeout(timer);
  }, [title, content, metaTitle, metaDescription, focusKeyword, slug, hasFeaturedImage, imageCount, imagesWithAlt]);

  const handleAnalyze = useCallback(async () => {
    if (!title.trim() || wordCount < 50) {
      setError('العنوان ومحتوى 50 كلمة على الأقل مطلوبان للتحليل');
      return;
    }

    setError(null);
    setAiPhase('analyzing');
    setAiStep(0);
    setAiMessage('جاري التحليل...');

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/admin/ai/complete-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('فشل في الاتصال بخدمة التحليل');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('لا يمكن قراءة الاستجابة');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'step') {
                setAiStep(data.step);
                const stepMessages = [
                  'جاري التحليل...',
                  'استخراج الكلمات المفتاحية...',
                  'إنشاء بيانات الميتا...',
                  'فحص القواعد النحوية...',
                  'حساب درجة SEO...',
                ];
                setAiMessage(stepMessages[data.step] || 'جاري المعالجة...');
              } else if (data.type === 'complete') {
                setCompletionResults(data.data);
                if (data.data.focusKeyword) {
                  onFocusKeywordChange(data.data.focusKeyword);
                }
                if (data.data.slug) {
                  onSlugChange(data.data.slug);
                }
                if (data.data.excerpt) {
                  onExcerptChange(data.data.excerpt);
                }
                if (data.data.metaTitles?.[0]) {
                  onMetaTitleChange(data.data.metaTitles[0].title);
                }
                if (data.data.metaDescriptions?.[0]) {
                  onMetaDescriptionChange(data.data.metaDescriptions[0].description);
                }
                const existingCatIds = data.data.suggestedCategories
                  .filter((c: SuggestedCategory) => c.isExisting && c.id)
                  .map((c: SuggestedCategory) => c.id);
                const newCats = data.data.suggestedCategories
                  .filter((c: SuggestedCategory) => !c.isExisting)
                  .map((c: SuggestedCategory) => c.name);
                onCategoriesChange(existingCatIds, newCats);
                setNewCategoryNames(newCats);

                const existingTagIds = data.data.suggestedTags
                  .filter((t: SuggestedTag) => t.isExisting && t.id)
                  .map((t: SuggestedTag) => t.id);
                const newTags = data.data.suggestedTags
                  .filter((t: SuggestedTag) => !t.isExisting)
                  .map((t: SuggestedTag) => t.name);
                onTagsChange(existingTagIds, newTags);
                setNewTagNames(newTags);

                setAiPhase('complete');
                setAiMessage('اكتمل التحليل');
              } else if (data.type === 'error') {
                throw new Error(data.message);
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setAiPhase('idle');
        setAiMessage('');
        return;
      }
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء التحليل');
      setAiPhase('error');
    }
  }, [title, content, wordCount, onFocusKeywordChange, onSlugChange, onExcerptChange, onMetaTitleChange, onMetaDescriptionChange, onCategoriesChange, onTagsChange]);

  const handleRewrite = useCallback(async () => {
    if (!focusKeyword.trim()) {
      setError('الكلمة المفتاحية مطلوبة لإعادة الكتابة');
      return;
    }

    setError(null);
    setAiPhase('rewriting');
    setAiStep(0);
    setAiMessage('تحليل المحتوى...');

    abortControllerRef.current = new AbortController();

    try {
      const seoTopIssues = completionResults?.seoAnalysis?.topIssues || [];

      const response = await fetch('/api/admin/ai/rewrite-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId,
          title,
          content,
          focusKeyword,
          seoScore: liveSeoScore.score,
          seoTopIssues,
          iteration: aiIteration,
          articleType,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('فشل في الاتصال بخدمة إعادة الكتابة');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('لا يمكن قراءة الاستجابة');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'step') {
                setAiStep(data.step);
                const stepMessages = ['تحليل المحتوى...', 'إعادة الكتابة بالذكاء الاصطناعي...', 'اكتمل'];
                setAiMessage(stepMessages[data.step] || 'جاري المعالجة...');
              } else if (data.type === 'complete') {
                const result: RewriteArticleResult = data.data;
                onContentChange(result.rewrittenContent);
                if (result.rewrittenTitle) {
                  onTitleChange(result.rewrittenTitle);
                }
                setRewriteChanges(result.changesSummary || []);
                setAiIteration(prev => prev + 1);
                setAiPhase('complete');
                setAiMessage('اكتملت إعادة الكتابة');

                setTimeout(() => {
                  handleAnalyze();
                }, 1000);
              } else if (data.type === 'error') {
                throw new Error(data.message);
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setAiPhase('idle');
        setAiMessage('');
        return;
      }
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء إعادة الكتابة');
      setAiPhase('error');
    }
  }, [focusKeyword, articleId, title, content, liveSeoScore.score, aiIteration, articleType, onContentChange, onTitleChange, handleAnalyze, completionResults]);

  const handleApplyGrammarMarks = useCallback(() => {
    if (!editorRef.current || !completionResults?.grammarIssues) return;

    const marks = convertGrammarIssuesToMarks(completionResults.grammarIssues);
    const grammarIssues = marks.map(m => ({
      id: m.id,
      type: m.type,
      original: m.original,
      correction: m.correction,
      explanation: m.explanation,
    }));

    editorRef.current.applyGrammarMarks(grammarIssues);
    setGrammarMarksActive(true);
  }, [editorRef, completionResults]);

  const handleApplySeoMarks = useCallback(() => {
    if (!editorRef.current || !completionResults) return;

    const suggestions = completionResults.seoAnalysis.topIssues.map((issue, i) => ({
      type: 'improve-readability' as const,
      issue,
      suggestion: issue,
      priority: 'medium' as const,
      autoFixable: false,
      fixData: undefined,
    }));

    const marks = convertSeoSuggestionsToMarks(suggestions, content);
    const seoSuggestions = marks.map(m => ({
      id: m.id,
      type: m.type,
      original: m.original,
      suggestedText: m.suggestedText,
      reason: m.reason,
      priority: m.priority,
    }));

    editorRef.current.applySeoMarks(seoSuggestions);
    setSeoMarksActive(true);
  }, [editorRef, completionResults, content]);

  const handleClearAllMarks = useCallback(() => {
    if (!editorRef.current) return;
    editorRef.current.clearAllMarks();
    setGrammarMarksActive(false);
    setSeoMarksActive(false);
  }, [editorRef]);

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const renderAiTab = () => (
    <div className="space-y-4">
      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5, 6].map(step => (
            <div
              key={step}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                aiPhase !== 'idle' && step <= aiStep + 1
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted-foreground/20 text-muted-foreground'
              }`}
            >
              {step}
            </div>
          ))}
        </div>
        {aiMessage && <span className="text-sm text-muted-foreground mr-2">{aiMessage}</span>}
      </div>

      {aiPhase === 'idle' && (
        <Button onClick={handleAnalyze} fullWidth disabled={!title.trim() || wordCount < 50}>
          تحليل أولي
        </Button>
      )}

      {(aiPhase === 'analyzing' || aiPhase === 'rewriting') && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
            <span className="text-sm">{aiMessage}</span>
          </div>
          <Button variant="outline" onClick={handleCancel} fullWidth>
            إلغاء
          </Button>
        </div>
      )}

      {aiPhase === 'complete' && completionResults && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  liveSeoScore.score >= 70 ? 'text-success' :
                  liveSeoScore.score >= 50 ? 'text-warning' : 'text-danger'
                }`}>
                  {liveSeoScore.score}
                </div>
                <div className="text-xs text-muted-foreground">SEO</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">
                  {completionResults.grammarIssues?.length || 0}
                </div>
                <div className="text-xs text-muted-foreground">أخطاء لغوية</div>
              </div>
            </div>
            {aiIteration > 0 && (
              <div className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                التحسين #{aiIteration}
              </div>
            )}
          </div>

          {aiIteration >= 3 && (
            <Alert variant="warning">
              ملاحظة: إعادة الكتابة المتكررة قد تزيل تعديلاتك اليدوية
            </Alert>
          )}

          {rewriteChanges.length > 0 && (
            <div className="p-3 bg-success/10 rounded-lg">
              <h4 className="font-medium text-sm mb-2">التغييرات المطبقة:</h4>
              <ul className="text-xs space-y-1 text-muted-foreground">
                {rewriteChanges.map((change, i) => (
                  <li key={i}>• {change}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-2">
            <Button
              onClick={handleRewrite}
              fullWidth
              disabled={!focusKeyword.trim()}
              variant="secondary"
            >
              إعادة كتابة بالذكاء الاصطناعي
            </Button>

            <Button
              onClick={handleApplyGrammarMarks}
              fullWidth
              variant="outline"
              disabled={!completionResults.grammarIssues?.length || grammarMarksActive}
            >
              {grammarMarksActive ? 'علامات نحوية مفعّلة' : 'تطبيق التدقيق اللغوي المضمّن'}
            </Button>

            {grammarMarksActive && (
              <Button onClick={handleClearAllMarks} fullWidth variant="ghost">
                مسح جميع العلامات
              </Button>
            )}
          </div>

          <Button onClick={handleAnalyze} fullWidth variant="ghost">
            إعادة التحليل
          </Button>
        </div>
      )}

      {aiPhase === 'error' && (
        <div className="space-y-3">
          <Alert variant="error">{error}</Alert>
          <Button onClick={handleAnalyze} fullWidth>
            إعادة المحاولة
          </Button>
        </div>
      )}
    </div>
  );

  const renderSeoTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-center p-6">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="56"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-muted"
            />
            <circle
              cx="64"
              cy="64"
              r="56"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeDasharray={`${(liveSeoScore.score / 100) * 352} 352`}
              className={
                liveSeoScore.score >= 70 ? 'text-success' :
                liveSeoScore.score >= 50 ? 'text-warning' : 'text-danger'
              }
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-bold ${
              liveSeoScore.score >= 70 ? 'text-success' :
              liveSeoScore.score >= 50 ? 'text-warning' : 'text-danger'
            }`}>
              {liveSeoScore.score}
            </span>
            <span className="text-xs text-muted-foreground">من 100</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between p-2 bg-muted rounded">
          <span className="text-sm">قابلية القراءة</span>
          <span className={`text-sm font-medium ${getReadabilityColor(readabilityGrade)}`}>
            {getReadabilityLabel(readabilityGrade)}
          </span>
        </div>
        <div className="flex items-center justify-between p-2 bg-muted rounded">
          <span className="text-sm">صيغة المبني للمجهول</span>
          <span className={`text-sm font-medium ${passiveVoiceCount > 3 ? 'text-warning' : 'text-success'}`}>
            {passiveVoiceCount} حالة
          </span>
        </div>
        <div className="flex items-center justify-between p-2 bg-muted rounded">
          <span className="text-sm">عدد الكلمات</span>
          <span className="text-sm font-medium">{wordCount}</span>
        </div>
      </div>

      {completionResults?.seoAnalysis?.topIssues && completionResults.seoAnalysis.topIssues.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-sm">أهم المشاكل:</h4>
          <ul className="text-xs space-y-1">
            {completionResults.seoAnalysis.topIssues.slice(0, 3).map((issue, i) => (
              <li key={i} className="flex items-start gap-2 text-muted-foreground">
                <span className="text-warning">⚠</span>
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Button
        onClick={handleApplySeoMarks}
        fullWidth
        variant="outline"
        disabled={seoMarksActive}
      >
        {seoMarksActive ? 'علامات SEO مفعّلة' : 'تطبيق اقتراحات SEO مضمّنة'}
      </Button>

      {seoMarksActive && (
        <Button onClick={handleClearAllMarks} fullWidth variant="ghost">
          مسح جميع العلامات
        </Button>
      )}
    </div>
  );

  const renderMetaTab = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">نوع المقال</label>
        <Select
          value={articleType}
          onChange={(e) => onArticleTypeChange(e.target.value)}
          options={ARTICLE_TYPE_OPTIONS}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">الكلمة المفتاحية</label>
        <Input
          value={focusKeyword}
          onChange={(e) => onFocusKeywordChange(e.target.value)}
          placeholder="الكلمة المفتاحية الرئيسية..."
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">عنوان الميتا</label>
          <span className={`text-xs ${metaTitle.length >= 50 && metaTitle.length <= 60 ? 'text-success' : 'text-warning'}`}>
            {metaTitle.length}/60
          </span>
        </div>
        <Input
          value={metaTitle}
          onChange={(e) => onMetaTitleChange(e.target.value)}
          placeholder="عنوان الميتا..."
          maxLength={70}
        />
        {completionResults?.metaTitles && completionResults.metaTitles.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {completionResults.metaTitles.slice(0, 3).map((opt, i) => (
              <button
                key={i}
                onClick={() => onMetaTitleChange(opt.title)}
                className="px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded truncate max-w-full"
              >
                {opt.title}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">وصف الميتا</label>
          <span className={`text-xs ${metaDescription.length >= 140 && metaDescription.length <= 160 ? 'text-success' : 'text-warning'}`}>
            {metaDescription.length}/160
          </span>
        </div>
        <Textarea
          value={metaDescription}
          onChange={(e) => onMetaDescriptionChange(e.target.value)}
          placeholder="وصف الميتا..."
          rows={3}
          maxLength={170}
        />
        {completionResults?.metaDescriptions && completionResults.metaDescriptions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {completionResults.metaDescriptions.slice(0, 2).map((opt, i) => (
              <button
                key={i}
                onClick={() => onMetaDescriptionChange(opt.description)}
                className="px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded truncate max-w-full"
              >
                {opt.description.substring(0, 50)}...
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">مقتطف المقال</label>
        <Textarea
          value={excerpt}
          onChange={(e) => onExcerptChange(e.target.value)}
          placeholder="ملخص قصير للمقال..."
          rows={3}
          maxLength={300}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">رابط المقال (Slug)</label>
        <Input
          value={slug}
          onChange={(e) => onSlugChange(e.target.value)}
          placeholder="article-url"
          dir="ltr"
          className="text-left"
        />
      </div>
    </div>
  );

  const renderTaxonomyTab = () => {
    const allCategories = [
      ...(completionResults?.availableCategories || []),
      ...newCategoryNames.map(name => ({ id: `new-${name}`, name })),
    ];
    const allTags = [
      ...(completionResults?.availableTags || []),
      ...newTagNames.map(name => ({ id: `new-${name}`, name })),
    ];

    return (
      <div className="space-y-4">
        <div>
          <h4 className="font-medium text-sm mb-2">
            التصنيفات
            <span className="text-muted-foreground font-normal mr-1">
              ({selectedCategoryIds.length + newCategoryNames.filter(n => selectedCategoryIds.includes(`new-${n}`)).length})
            </span>
          </h4>
          <div className="flex flex-wrap gap-2">
            {allCategories.map((cat) => {
              const isNew = cat.id.startsWith('new-');
              const isSelected = isNew
                ? newCategoryNames.includes(cat.name) && selectedCategoryIds.includes(cat.id)
                : selectedCategoryIds.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    if (isNew) {
                      if (isSelected) {
                        onCategoriesChange(
                          selectedCategoryIds.filter(id => id !== cat.id),
                          newCategoryNames
                        );
                      } else {
                        onCategoriesChange([...selectedCategoryIds, cat.id], newCategoryNames);
                      }
                    } else {
                      if (isSelected) {
                        onCategoriesChange(
                          selectedCategoryIds.filter(id => id !== cat.id),
                          newCategoryNames
                        );
                      } else {
                        onCategoriesChange([...selectedCategoryIds, cat.id], newCategoryNames);
                      }
                    }
                  }}
                  className={`px-3 py-1 text-sm rounded-full flex items-center gap-1 ${
                    isSelected
                      ? isNew
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-success/20 text-success border border-success/30'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {cat.name}
                  {isNew && isSelected && (
                    <span className="text-xs bg-amber-200 px-1 rounded">جديد</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <h4 className="font-medium text-sm mb-2">
            الوسوم
            <span className="text-muted-foreground font-normal mr-1">
              ({selectedTagIds.length + newTagNames.filter(n => selectedTagIds.includes(`new-${n}`)).length})
            </span>
          </h4>
          <div className="flex flex-wrap gap-2">
            {allTags.slice(0, 20).map((tag) => {
              const isNew = tag.id.startsWith('new-');
              const isSelected = isNew
                ? newTagNames.includes(tag.name) && selectedTagIds.includes(tag.id)
                : selectedTagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  onClick={() => {
                    if (isNew) {
                      if (isSelected) {
                        onTagsChange(
                          selectedTagIds.filter(id => id !== tag.id),
                          newTagNames
                        );
                      } else {
                        onTagsChange([...selectedTagIds, tag.id], newTagNames);
                      }
                    } else {
                      if (isSelected) {
                        onTagsChange(
                          selectedTagIds.filter(id => id !== tag.id),
                          newTagNames
                        );
                      } else {
                        onTagsChange([...selectedTagIds, tag.id], newTagNames);
                      }
                    }
                  }}
                  className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 ${
                    isSelected
                      ? isNew
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-success/20 text-success border border-success/30'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {tag.name}
                  {isNew && isSelected && (
                    <span className="text-xs bg-amber-200 px-1 rounded">جديد</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  if (!isPanelOpen) {
    return (
      <button
        onClick={() => setIsPanelOpen(true)}
        className="fixed left-4 top-20 z-40 p-3 bg-card border rounded-lg shadow-lg hover:bg-muted transition-colors"
        title="فتح لوحة AI"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed right-0 top-16 bottom-0 w-96 bg-card border-l z-30 flex flex-col">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-2 py-1 text-xs rounded ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setIsPanelOpen(false)}
          className="p-1 hover:bg-muted rounded"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'ai' && renderAiTab()}
        {activeTab === 'seo' && renderSeoTab()}
        {activeTab === 'meta' && renderMetaTab()}
        {activeTab === 'taxonomy' && renderTaxonomyTab()}
      </div>
    </div>
  );
}

export default UnifiedAiPanel;
