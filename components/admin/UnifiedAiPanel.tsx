'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { AiChangeReviewModal } from '@/components/admin/AiChangeReviewModal';
import type { RichTextEditorRef } from '@/components/admin/RichTextEditor';
import {
  convertGrammarIssuesToMarks,
  convertSeoSuggestionsToMarks,
  calculateReadabilityGrade,
  countPassiveVoice,
  getReadabilityLabel,
  getReadabilityColor,
} from '@/lib/ai/inline-marks';
import type { CompleteArticleResult, RewriteArticleResult, ArticleGrammarIssue } from '@/lib/ai';
import { analyzeArticle, analyzeGeo, type ArticleContent } from '@/lib/seo';
import { computeParagraphDiff, buildAiEditMarksFromDiff } from '@/lib/ai/diff-utils';
import { ArticleStructurePanel } from './ArticleStructurePanel';

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
  onFocusSection?: (section: string) => void;
  focusSection?: string;
  onScoreChange?: (scores: { seo: number; geo: number; structure: number; structureTotal: number; grammar: number }) => void;
}

interface AiChange {
  id: string;
  originalText: string;
  aiText: string;
}

const ARTICLE_TYPE_OPTIONS = [
  { value: 'article', label: 'مقال' },
  { value: 'news', label: 'خبر عاجل' },
  { value: 'report', label: 'تقرير' },
  { value: 'investigation', label: 'تحقيق' },
  { value: 'opinion', label: 'رأي' },
];

const SECTION_STORAGE_KEY = 'unified-panel-sections';

function getDefaultSectionStates(): Record<string, boolean> {
  return {
    quickStats: true,
    issues: true,
    meta: false,
    taxonomy: false,
  };
}

function loadSectionStates(): Record<string, boolean> {
  if (typeof window === 'undefined') return getDefaultSectionStates();
  try {
    const stored = sessionStorage.getItem(SECTION_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return getDefaultSectionStates();
}

function saveSectionStates(states: Record<string, boolean>) {
  try {
    sessionStorage.setItem(SECTION_STORAGE_KEY, JSON.stringify(states));
  } catch {}
}

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
  onFocusSection,
  focusSection,
  onScoreChange,
}: UnifiedAiPanelProps) {
  const [aiPhase, setAiPhase] = useState<AiPhase>('idle');
  const [aiStep, setAiStep] = useState(0);
  const [aiMessage, setAiMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [completionResults, setCompletionResults] = useState<CompletionResults | null>(null);
  const [aiIteration, setAiIteration] = useState(0);
  const [rewriteChanges, setRewriteChanges] = useState<string[]>([]);
  const [grammarMarksActive, setGrammarMarksActive] = useState(false);
  const [newCategoryNames, setNewCategoryNames] = useState<string[]>([]);
  const [newTagNames, setNewTagNames] = useState<string[]>([]);
  const [liveSeoScore, setLiveSeoScore] = useState<{ score: number; status: string }>({ score: 0, status: 'needs-improvement' });
  const [aiEditCount, setAiEditCount] = useState(0);
  const [liveGeoScore, setLiveGeoScore] = useState<{ score: number; status: string }>({ score: 0, status: 'needs-improvement' });
  const [aiChanges, setAiChanges] = useState<AiChange[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [sectionStates, setSectionStates] = useState<Record<string, boolean>>(loadSectionStates);

  const abortControllerRef = useRef<AbortController | null>(null);
  const issuesSectionRef = useRef<HTMLDivElement>(null);
  const metaSectionRef = useRef<HTMLDivElement>(null);
  const taxonomySectionRef = useRef<HTMLDivElement>(null);

  const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).filter(w => w.length > 0).length;
  const readabilityGrade = calculateReadabilityGrade(content);
  const passiveVoiceCount = countPassiveVoice(content);

  const toggleSection = useCallback((section: string) => {
    setSectionStates(prev => {
      const newStates = { ...prev, [section]: !prev[section] };
      saveSectionStates(newStates);
      return newStates;
    });
  }, []);

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

      const geoResult = analyzeGeo(content);
      setLiveGeoScore({ score: geoResult.percentage, status: geoResult.status });

      onScoreChange?.({
        seo: result.percentage,
        geo: geoResult.percentage,
        structure: 0,
        structureTotal: 10,
        grammar: completionResults?.grammarIssues?.length || 0,
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [title, content, metaTitle, metaDescription, focusKeyword, slug, hasFeaturedImage, imageCount, imagesWithAlt, onScoreChange, completionResults?.grammarIssues?.length]);

  useEffect(() => {
    if (focusSection) {
      setSectionStates(prev => ({ ...prev, [focusSection]: true }));
      setTimeout(() => {
        if (focusSection === 'issues' && issuesSectionRef.current) {
          issuesSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (focusSection === 'meta' && metaSectionRef.current) {
          metaSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (focusSection === 'taxonomy' && taxonomySectionRef.current) {
          taxonomySectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [focusSection]);

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

                if (data.data.grammarIssues?.length > 0 && editorRef.current) {
                  const marks = convertGrammarIssuesToMarks(data.data.grammarIssues);
                  const grammarIssues = marks.map(m => ({
                    id: m.id,
                    type: m.type,
                    original: m.original,
                    correction: m.correction,
                    explanation: m.explanation,
                  }));
                  editorRef.current.applyGrammarMarks(grammarIssues);
                  setGrammarMarksActive(true);
                }
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
  }, [title, content, wordCount, onFocusKeywordChange, onSlugChange, onExcerptChange, onMetaTitleChange, onMetaDescriptionChange, onCategoriesChange, onTagsChange, editorRef]);

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
                const diffResults = computeParagraphDiff(content, result.rewrittenContent);
                const modified = diffResults.filter((d) => d.type === "modified");
                onContentChange(result.rewrittenContent);
                if (result.rewrittenTitle) {
                  onTitleChange(result.rewrittenTitle);
                }
                setRewriteChanges(result.changesSummary || []);
                setAiIteration(prev => prev + 1);
                setAiPhase('complete');
                setAiMessage('اكتملت إعادة الكتابة');
                
                if (modified.length > 0) {
                  const marks = buildAiEditMarksFromDiff(diffResults, result.rewrittenContent);
                  setTimeout(() => editorRef.current?.applyAiEditMarks(marks), 100);
                  setAiEditCount(modified.length);
                  
                  const changes: AiChange[] = modified.map((d, i) => ({
                    id: `ai-edit-${i}`,
                    originalText: d.originalText || '',
                    aiText: d.rewrittenText || '',
                  }));
                  setAiChanges(changes);
                  setShowReviewModal(true);
                }

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
  }, [focusKeyword, articleId, title, content, liveSeoScore.score, aiIteration, articleType, onContentChange, onTitleChange, handleAnalyze, completionResults, editorRef]);

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

  const handleClearGrammarMarks = useCallback(() => {
    if (!editorRef.current) return;
    editorRef.current.clearAllMarks();
    setGrammarMarksActive(false);
  }, [editorRef]);

  const handleAcceptAiEdit = useCallback((id: string) => {
    if (!editorRef.current) return;
    const editor = editorRef.current.getEditor();
    if (!editor) return;
    
    const { state, dispatch } = editor.view;
    const { tr } = state;
    
    state.doc.descendants((node, pos) => {
      if (node.isText && node.marks) {
        const aiEditMark = node.marks.find(m => m.type.name === 'aiEdit' && m.attrs.id === id);
        if (aiEditMark) {
          tr.removeMark(pos, pos + node.nodeSize, aiEditMark);
        }
      }
    });
    
    if (tr.docChanged) {
      dispatch(tr);
    }
    
    setAiChanges(prev => prev.filter(c => c.id !== id));
    setAiEditCount(prev => Math.max(0, prev - 1));
  }, [editorRef]);

  const handleRejectAiEdit = useCallback((id: string) => {
    if (!editorRef.current) return;
    const editor = editorRef.current.getEditor();
    if (!editor) return;
    
    const change = aiChanges.find(c => c.id === id);
    if (!change) return;
    
    const { state, dispatch } = editor.view;
    const { doc, tr } = state;
    
    doc.descendants((node, pos) => {
      if (node.isText && node.marks) {
        const aiEditMark = node.marks.find(m => m.type.name === 'aiEdit' && m.attrs.id === id);
        if (aiEditMark && node.text) {
          const nodeText = node.text;
          if (nodeText.includes(change.aiText.substring(0, 30))) {
            tr.insertText(change.originalText, pos, pos + node.nodeSize);
          }
        }
      }
    });
    
    if (tr.docChanged) {
      dispatch(tr);
    }
    
    setAiChanges(prev => prev.filter(c => c.id !== id));
    setAiEditCount(prev => Math.max(0, prev - 1));
  }, [editorRef, aiChanges]);

  const handleAcceptAllAiEdits = useCallback(() => {
    if (!editorRef.current) return;
    editorRef.current.acceptAllAiEdits();
    setAiEditCount(0);
    setAiChanges([]);
    setShowReviewModal(false);
  }, [editorRef]);

  const handleRejectAllAiEdits = useCallback(() => {
    if (!editorRef.current) return;
    editorRef.current.rejectAllAiEdits();
    setAiEditCount(0);
    setAiChanges([]);
    setShowReviewModal(false);
  }, [editorRef]);

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const allCategories = [
    ...(completionResults?.availableCategories || []),
    ...newCategoryNames.map(name => ({ id: `new-${name}`, name })),
  ];
  const allTags = [
    ...(completionResults?.availableTags || []),
    ...newTagNames.map(name => ({ id: `new-${name}`, name })),
  ];

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-success';
    if (score >= 50) return 'text-warning';
    return 'text-danger';
  };

  const renderSectionHeader = (title: string, section: string, count?: number) => (
    <button
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted transition-colors rounded-t-lg"
    >
      <div className="flex items-center gap-2">
        <span className={`transition-transform ${sectionStates[section] ? 'rotate-90' : ''}`}>▸</span>
        <span className="font-medium text-sm">{title}</span>
        {count !== undefined && count > 0 && (
          <span className="px-1.5 py-0.5 text-xs bg-warning/20 text-warning rounded-full">{count}</span>
        )}
      </div>
    </button>
  );

  const renderQuickStatsSection = () => (
    <div className="space-y-4">
      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <div className="flex items-center justify-center gap-6 p-4">
        <div className="text-center">
          <div className={`text-2xl font-bold ${getScoreColor(liveSeoScore.score)}`}>
            {liveSeoScore.score}
          </div>
          <div className="text-xs text-muted-foreground">SEO</div>
        </div>
        <div className="text-center">
          <div className={`text-2xl font-bold ${getScoreColor(liveGeoScore.score)}`}>
            {liveGeoScore.score}
          </div>
          <div className="text-xs text-muted-foreground">GEO</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">
            {wordCount}
          </div>
          <div className="text-xs text-muted-foreground">كلمة</div>
        </div>
      </div>

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
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button
              onClick={handleRewrite}
              fullWidth
              disabled={!focusKeyword.trim()}
              variant="secondary"
            >
              إعادة كتابة بالذكاء الاصطناعي
            </Button>
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

          {aiEditCount > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium text-amber-800">{aiEditCount} تعديل بالذكاء الاصطناعي</span>
              </div>
              <span className="text-xs text-amber-600 block mt-1">اضغط لمراجعة التغييرات</span>
              <div className="flex gap-2 mt-2">
                <Button size="sm" onClick={() => setShowReviewModal(true)}>مراجعة</Button>
                <Button size="sm" variant="outline" onClick={handleAcceptAllAiEdits}>
                  قبول الكل
                </Button>
                <Button size="sm" variant="ghost" onClick={handleRejectAllAiEdits}>
                  رفض الكل
                </Button>
              </div>
            </div>
          )}

          {grammarMarksActive ? (
            <Button onClick={handleClearGrammarMarks} fullWidth variant="ghost">
              مسح علامات التدقيق اللغوي
            </Button>
          ) : completionResults.grammarIssues?.length > 0 && (
            <Button onClick={handleApplyGrammarMarks} fullWidth variant="outline">
              تطبيق التدقيق اللغوي ({completionResults.grammarIssues.length} خطأ)
            </Button>
          )}

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

  const renderIssuesSection = () => {
    const grammarIssues = completionResults?.grammarIssues || [];
    const seoIssues = completionResults?.seoAnalysis?.topIssues || [];

    return (
      <div className="space-y-3">
        {grammarIssues.length === 0 && seoIssues.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            لا توجد مشاكل بعد التحليل
          </p>
        )}

        {grammarIssues.slice(0, 5).map((issue, i) => (
          <div key={`grammar-${i}`} className="p-2 bg-danger/5 border border-danger/20 rounded-lg">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-danger font-medium mb-1">
                  {issue.type === 'spelling' ? 'إملائي' : issue.type === 'grammar' ? 'نحوي' : issue.type === 'punctuation' ? 'ترقيم' : 'أسلوب'}
                </div>
                <div className="text-sm line-through text-muted-foreground">{issue.original}</div>
                <div className="text-sm text-success">{issue.correction}</div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (editorRef.current) {
                    const editor = editorRef.current.getEditor();
                    if (editor) {
                      editor.commands.applyGrammarCorrection(`grammar-${i}`, issue.correction);
                    }
                  }
                }}
              >
                إصلاح
              </Button>
            </div>
          </div>
        ))}

        {seoIssues.slice(0, 3).map((issue, i) => (
          <div key={`seo-${i}`} className="p-2 bg-warning/5 border border-warning/20 rounded-lg">
            <div className="flex items-start gap-2">
              <span className="text-warning">⚠</span>
              <span className="text-sm text-foreground">{issue}</span>
            </div>
          </div>
        ))}

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
      </div>
    );
  };

  const renderMetaSection = () => (
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

  const renderTaxonomySection = () => (
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
                  if (isSelected) {
                    onCategoriesChange(
                      selectedCategoryIds.filter(id => id !== cat.id),
                      newCategoryNames
                    );
                  } else {
                    onCategoriesChange([...selectedCategoryIds, cat.id], newCategoryNames);
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
                  if (isSelected) {
                    onTagsChange(
                      selectedTagIds.filter(id => id !== tag.id),
                      newTagNames
                    );
                  } else {
                    onTagsChange([...selectedTagIds, tag.id], newTagNames);
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

  return (
    <>
      <div className="flex flex-col h-full overflow-y-auto" dir="rtl">
        <div className="p-4 space-y-4">
          <div className="border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('quickStats')}
              className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className={`transition-transform ${sectionStates.quickStats ? 'rotate-90' : ''}`}>▸</span>
                <span className="font-medium text-sm">التحليل السريع</span>
              </div>
            </button>
            {sectionStates.quickStats && (
              <div className="p-4 border-t border-border">
                {renderQuickStatsSection()}
              </div>
            )}
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            {renderSectionHeader('المشاكل', 'issues', (completionResults?.grammarIssues?.length || 0) + (completionResults?.seoAnalysis?.topIssues?.length || 0))}
            {sectionStates.issues && (
              <div ref={issuesSectionRef} className="p-4 border-t border-border">
                {renderIssuesSection()}
              </div>
            )}
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            {renderSectionHeader('بيانات الميتا', 'meta')}
            {sectionStates.meta && (
              <div ref={metaSectionRef} className="p-4 border-t border-border">
                {renderMetaSection()}
              </div>
            )}
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            {renderSectionHeader('التصنيف', 'taxonomy')}
            {sectionStates.taxonomy && (
              <div ref={taxonomySectionRef} className="p-4 border-t border-border">
                {renderTaxonomySection()}
              </div>
            )}
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('structure')}
              className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className={`transition-transform ${sectionStates.structure ? 'rotate-90' : ''}`}>▸</span>
                <span className="font-medium text-sm">هيكل المقال</span>
              </div>
            </button>
            {sectionStates.structure && (
              <div className="p-4 border-t border-border">
                <ArticleStructurePanel
                  title={title}
                  content={content}
                  focusKeyword={focusKeyword}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <AiChangeReviewModal
        changes={aiChanges}
        isOpen={showReviewModal}
        onAccept={handleAcceptAiEdit}
        onReject={handleRejectAiEdit}
        onAcceptAll={handleAcceptAllAiEdits}
        onRejectAll={handleRejectAllAiEdits}
        onClose={() => setShowReviewModal(false)}
      />
    </>
  );
}

export default UnifiedAiPanel;
