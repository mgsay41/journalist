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
  onTitleSuggestionsReady?: (titles: string[]) => void;
  onIntroGenerated?: (intro: string) => void;
  onConclusionGenerated?: (conclusion: string) => void;
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

function ScoreRing({ score, label }: { score: number; label: string }) {
  const color = score >= 70 ? "#16a34a" : score >= 50 ? "#ca8a04" : "#dc2626";
  const r = 18;
  const circ = 2 * Math.PI * r;
  const pct = (score / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="48" height="48" viewBox="0 0 48 48">
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-muted/30"
        />
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={`${pct} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 24 24)"
          style={{ transition: "stroke-dasharray 0.5s ease" }}
        />
        <text
          x="24"
          y="28"
          textAnchor="middle"
          fontSize="11"
          fontWeight="600"
          fill={color}
        >
          {score}
        </text>
      </svg>
      <span className="text-[10px] text-muted-foreground font-medium">
        {label}
      </span>
    </div>
  );
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
  onTitleSuggestionsReady,
  onIntroGenerated,
  onConclusionGenerated,
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
  const [dismissedGrammarIndices, setDismissedGrammarIndices] = useState<Set<number>>(new Set());

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
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error || 'فشل في الاتصال بخدمة التحليل');
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
          if (!line.startsWith('data: ')) continue;
          let data;
          try {
            data = JSON.parse(line.slice(6));
          } catch {
            continue;
          }
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
            setDismissedGrammarIndices(new Set());
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

            if (data.data.titleSuggestions?.length > 0) {
              onTitleSuggestionsReady?.(
                data.data.titleSuggestions.map((s: TitleSuggestion) => s.title)
              );
            }

            if (onIntroGenerated || onConclusionGenerated) {
              const [introRes, conclusionRes] = await Promise.allSettled([
                fetch('/api/admin/ai/content', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'introduction', title, content }),
                }).then(r => r.json()),
                fetch('/api/admin/ai/content', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'conclusion', title, content }),
                }).then(r => r.json()),
              ]);
              if (introRes.status === 'fulfilled' && introRes.value?.introductions?.length > 0) {
                const rec = introRes.value.recommended ?? 0;
                onIntroGenerated?.(introRes.value.introductions[rec]?.text ?? introRes.value.introductions[0].text);
              }
              if (conclusionRes.status === 'fulfilled' && conclusionRes.value?.conclusions?.length > 0) {
                const rec = conclusionRes.value.recommended ?? 0;
                onConclusionGenerated?.(conclusionRes.value.conclusions[rec]?.text ?? conclusionRes.value.conclusions[0].text);
              }
            }

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
  }, [title, content, wordCount, onFocusKeywordChange, onSlugChange, onExcerptChange, onMetaTitleChange, onMetaDescriptionChange, onCategoriesChange, onTagsChange, editorRef, onTitleSuggestionsReady, onIntroGenerated, onConclusionGenerated]);

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
      const liveSeoResult = analyzeArticle(articleContent);
      const liveSeoIssues = liveSeoResult.criteria
        .filter(c => c.status === 'failed' || c.status === 'warning')
        .map(c => c.recommendationAr || c.descriptionAr || c.nameAr)
        .slice(0, 6);

      const liveGeoResult = analyzeGeo(content);
      const liveGeoIssues = liveGeoResult.criteria
        .filter(c => c.status === 'failed')
        .map(c => c.recommendationAr || c.nameAr);

      const response = await fetch('/api/admin/ai/rewrite-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId,
          title,
          content,
          focusKeyword,
          seoScore: liveSeoScore.score,
          seoTopIssues: liveSeoIssues,
          geoTopIssues: liveGeoIssues,
          iteration: aiIteration,
          articleType,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error || 'فشل في الاتصال بخدمة إعادة الكتابة');
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
          if (!line.startsWith('data: ')) continue;
          let data;
          try {
            data = JSON.parse(line.slice(6));
          } catch {
            continue;
          }
          if (data.type === 'step') {
            setAiStep(data.step);
            const stepMessages = ['تحليل المحتوى...', 'إعادة الكتابة بالذكاء الاصطناعي...', 'اكتمل'];
            setAiMessage(stepMessages[data.step] || 'جاري المعالجة...');
          } else if (data.type === 'complete') {
            const result: RewriteArticleResult = data.data;
            const diffResults = computeParagraphDiff(content, result.rewrittenContent);
            const modified = diffResults.filter((d) => d.type === "modified");

            const editorInstance = editorRef.current?.getEditor();
            if (editorInstance) {
              editorInstance.commands.setContent(result.rewrittenContent);
              editorRef.current?.clearAllMarks();
              setGrammarMarksActive(false);
            }

            if (modified.length > 0) {
              const marks = buildAiEditMarksFromDiff(diffResults, result.rewrittenContent);
              editorRef.current?.applyAiEditMarks(marks);
              setAiEditCount(modified.length);

              const changes: AiChange[] = modified.map((d, i) => ({
                id: `ai-edit-${i}`,
                originalText: d.originalText || '',
                aiText: d.rewrittenText || '',
              }));
              setAiChanges(changes);
              setShowReviewModal(true);
            }

            if (result.rewrittenTitle) {
              onTitleChange(result.rewrittenTitle);
            }
            setRewriteChanges(result.changesSummary || []);
            setAiIteration(prev => prev + 1);
            setAiPhase('complete');
            setAiMessage('اكتملت إعادة الكتابة');
            onContentChange(result.rewrittenContent);
          } else if (data.type === 'error') {
            throw new Error(data.message);
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
  }, [focusKeyword, articleId, title, content, metaTitle, metaDescription, slug, hasFeaturedImage, imageCount, imagesWithAlt, liveSeoScore.score, aiIteration, articleType, onContentChange, onTitleChange, editorRef]);

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
      className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
    >
      <div className="flex items-center gap-2">
        <span className="font-medium text-sm text-foreground">{title}</span>
        {count !== undefined && count > 0 && (
          <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-danger/10 text-danger rounded-full">
            {count}
          </span>
        )}
      </div>
      <svg
        className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${sectionStates[section] ? "rotate-180" : ""}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </button>
  );

  const renderQuickStatsSection = () => (
    <div className="space-y-4">
      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <div className="flex items-center justify-center gap-8 p-4">
        <ScoreRing score={liveSeoScore.score} label="SEO" />
        <ScoreRing score={liveGeoScore.score} label="GEO" />
        <div className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
            <span className="text-lg font-bold text-foreground">{wordCount}</span>
          </div>
          <span className="text-[10px] text-muted-foreground font-medium">كلمة</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5, 6].map((step) => (
            <div
              key={step}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                aiPhase !== 'idle' && step <= aiStep + 1
                  ? 'bg-accent'
                  : 'bg-muted-foreground/20'
              }`}
            />
          ))}
        </div>
        {aiMessage && <span className="text-xs text-muted-foreground text-center block">{aiMessage}</span>}
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
    const allGrammarIssues = completionResults?.grammarIssues || [];
    const seoIssues = completionResults?.seoAnalysis?.topIssues || [];
    
    const grammarIssues = allGrammarIssues.filter(
      (_, i) => !dismissedGrammarIndices.has(i)
    );

    return (
      <div className="space-y-2">
        {grammarIssues.length === 0 && seoIssues.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            لا توجد مشاكل بعد التحليل
          </p>
        )}

        {allGrammarIssues.map((issue, originalIndex) => {
          if (dismissedGrammarIndices.has(originalIndex)) return null;
          
          const issueTypeLabel = issue.type === 'spelling' ? 'إملائي' : issue.type === 'grammar' ? 'نحوي' : issue.type === 'punctuation' ? 'ترقيم' : 'أسلوب';
          
          return (
            <div 
              key={`grammar-${originalIndex}`} 
              className="flex items-start justify-between gap-3 py-2.5 px-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors group"
            >
              <div className="flex-1 min-w-0 space-y-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-danger/70">
                  {issueTypeLabel}
                </span>
                <div className="text-xs text-muted-foreground line-through">{issue.original}</div>
                <div className="text-xs text-success font-medium">{issue.correction}</div>
              </div>
              <button
                onClick={() => {
                  if (editorRef.current) {
                    const editor = editorRef.current.getEditor();
                    if (editor) {
                      editor.commands.applyGrammarCorrection(`grammar-${originalIndex}`, issue.correction);
                    }
                  }
                  setDismissedGrammarIndices(prev => new Set([...prev, originalIndex]));
                }}
                className="shrink-0 text-xs text-accent hover:text-accent-hover font-medium px-2 py-1 rounded-md hover:bg-accent/10 transition-colors"
              >
                إصلاح
              </button>
            </div>
          );
        })}

        {seoIssues.slice(0, 3).map((issue, i) => (
          <div key={`seo-${i}`} className="flex items-start gap-2 py-2 px-3 rounded-lg bg-warning/5 text-sm text-foreground/80">
            <span className="mt-0.5 text-warning text-xs">▲</span>
            <span>{issue}</span>
          </div>
        ))}

        <div className="flex items-center justify-between py-2 px-3 text-sm border-t border-border/40">
          <span className="text-muted-foreground text-xs">قابلية القراءة</span>
          <span className={`text-xs font-semibold ${getReadabilityColor(readabilityGrade)}`}>
            {getReadabilityLabel(readabilityGrade)}
          </span>
        </div>
        <div className="flex items-center justify-between py-2 px-3 text-sm border-t border-border/40">
          <span className="text-muted-foreground text-xs">صيغة المبني للمجهول</span>
          <span className={`text-xs font-semibold ${passiveVoiceCount > 3 ? 'text-warning' : 'text-success'}`}>
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
      <div className="flex flex-col h-full overflow-y-auto bg-background" dir="rtl">
        <div className="p-3 space-y-3">
          <div className="border border-border/60 rounded-xl overflow-hidden bg-card shadow-sm">
            <button
              onClick={() => toggleSection('quickStats')}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm text-foreground">التحليل السريع</span>
              </div>
              <svg
                className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${sectionStates.quickStats ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {sectionStates.quickStats && (
              <div className="px-4 pb-4 border-t border-border/60">
                {renderQuickStatsSection()}
              </div>
            )}
          </div>

          <div className="border border-border/60 rounded-xl overflow-hidden bg-card shadow-sm">
            {renderSectionHeader('المشاكل', 'issues', ((completionResults?.grammarIssues?.length || 0) - dismissedGrammarIndices.size) + (completionResults?.seoAnalysis?.topIssues?.length || 0))}
            {sectionStates.issues && (
              <div ref={issuesSectionRef} className="px-4 pb-4 border-t border-border/60">
                {renderIssuesSection()}
              </div>
            )}
          </div>

          <div className="border border-border/60 rounded-xl overflow-hidden bg-card shadow-sm">
            {renderSectionHeader('بيانات الميتا', 'meta')}
            {sectionStates.meta && (
              <div ref={metaSectionRef} className="px-4 pb-4 border-t border-border/60">
                {renderMetaSection()}
              </div>
            )}
          </div>

          <div className="border border-border/60 rounded-xl overflow-hidden bg-card shadow-sm">
            {renderSectionHeader('التصنيف', 'taxonomy')}
            {sectionStates.taxonomy && (
              <div ref={taxonomySectionRef} className="px-4 pb-4 border-t border-border/60">
                {renderTaxonomySection()}
              </div>
            )}
          </div>

          <div className="border border-border/60 rounded-xl overflow-hidden bg-card shadow-sm">
            <button
              onClick={() => toggleSection('structure')}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm text-foreground">هيكل المقال</span>
              </div>
              <svg
                className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${sectionStates.structure ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {sectionStates.structure && (
              <div className="px-4 pb-4 border-t border-border/60">
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
