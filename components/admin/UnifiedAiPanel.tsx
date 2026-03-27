'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { AiChangeReviewModal } from '@/components/admin/AiChangeReviewModal';
import type { RichTextEditorRef } from '@/components/admin/RichTextEditor';
import {
  convertGrammarIssuesToMarks,
  calculateReadabilityGrade,
  countPassiveVoice,
  getReadabilityLabel,
  getReadabilityColor,
} from '@/lib/ai/inline-marks';
import type { RewriteArticleResult, ArticleGrammarIssue } from '@/lib/ai';
import { analyzeArticle, analyzeGeo, type ArticleContent } from '@/lib/seo';
import { computeParagraphDiff, buildAiEditMarksFromDiff } from '@/lib/ai/diff-utils';
import { ArticleStructurePanel, analyzeStructure } from './ArticleStructurePanel';
import { fetchWithCsrf } from '@/lib/security/csrf-client';

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

const ANALYSIS_STEPS = [
  'تحليل العنوان والمحتوى',
  'استخراج الكلمات المفتاحية',
  'إنشاء بيانات الميتا',
  'فحص القواعد النحوية',
  'حساب درجات SEO و GEO',
  'توليد المقدمة والخاتمة',
];

const REWRITE_STEPS = [
  'قراءة نقاط التحسين',
  'إعادة الكتابة بالذكاء الاصطناعي',
  'تطبيق التغييرات',
];

function AnalysisProgressSteps({
  steps,
  currentStep,
  phase,
  message,
}: {
  steps: string[];
  currentStep: number;
  phase: 'analyzing' | 'rewriting';
  message: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/40 bg-muted/30">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
        <span className="text-sm font-medium text-foreground">{message}</span>
      </div>
      <div className="px-4 py-3 space-y-2.5">
        {steps.map((step, i) => {
          const done = i < currentStep;
          const active = i === currentStep;
          return (
            <div
              key={i}
              className={`flex items-center gap-2.5 text-xs transition-all duration-300 ${
                done ? 'text-green-600 dark:text-green-400' :
                active ? 'text-foreground' :
                'text-muted-foreground/40'
              }`}
            >
              <div className="shrink-0 w-4 h-4 flex items-center justify-center">
                {done ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : active ? (
                  <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <div className="w-2 h-2 rounded-full border border-muted-foreground/30" />
                )}
              </div>
              <span className={active ? 'font-medium' : ''}>{step}</span>
            </div>
          );
        })}
      </div>
      {phase === 'analyzing' && (
        <div className="px-4 pb-3">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700"
              style={{ width: `${Math.max(8, ((currentStep + 0.5) / steps.length) * 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

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
    suggestions: true,
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

function ScoreRing({ score, label, empty }: { score: number; label: string; empty?: boolean }) {
  const color = empty ? "#9ca3af" : score >= 70 ? "#16a34a" : score >= 50 ? "#ca8a04" : "#dc2626";
  const r = 18;
  const circ = 2 * Math.PI * r;
  const pct = empty ? 0 : (score / 100) * circ;
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
        {!empty && (
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
        )}
        <text
          x="24"
          y="28"
          textAnchor="middle"
          fontSize="11"
          fontWeight="600"
          fill={color}
        >
          {empty ? '--' : score}
        </text>
      </svg>
      <span className="text-[10px] text-muted-foreground font-medium">
        {label}
      </span>
    </div>
  );
}

function SuggestionCard({
  label,
  text,
  applied,
  onApply,
  onDismiss,
}: {
  label: string;
  text: string | null;
  applied: boolean;
  onApply: () => void;
  onDismiss: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;

  const isLong = text.length > 120;
  const displayText = isLong && !expanded ? text.slice(0, 120) + '…' : text;

  return (
    <div className={`rounded-xl border overflow-hidden transition-all ${applied ? 'border-green-200/60 dark:border-green-800/40 bg-green-50/50 dark:bg-green-950/20' : 'border-border/60 bg-muted/20'}`}>
      <div className="flex items-center justify-between px-3 pt-3 pb-1.5">
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${applied ? 'bg-green-500' : 'bg-indigo-400'}`} />
          <span className="text-xs font-semibold text-foreground/70">{label}</span>
        </div>
        {applied && (
          <span className="text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-2 py-0.5 rounded-full">
            مُطبَّق
          </span>
        )}
      </div>
      <p className="text-xs text-foreground/80 leading-relaxed px-3 pb-1" dir="rtl">
        {displayText}
        {isLong && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-primary mr-1 hover:underline"
          >
            {expanded ? 'أقل' : 'المزيد'}
          </button>
        )}
      </p>
      <div className="flex border-t border-border/40 mt-1">
        <button
          onClick={onApply}
          disabled={applied}
          className="flex-1 py-2 text-xs font-medium text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {applied ? 'مُطبَّق' : 'تطبيق'}
        </button>
        <div className="w-px bg-border/40" />
        <button
          onClick={onDismiss}
          className="flex-1 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/60 transition-colors"
        >
          رفض
        </button>
      </div>
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
  const [grammarMarksActive, setGrammarMarksActive] = useState(false);
  const [newCategoryNames, setNewCategoryNames] = useState<string[]>([]);
  const [newTagNames, setNewTagNames] = useState<string[]>([]);
  const [liveSeoScore, setLiveSeoScore] = useState<{ score: number; status: string }>({ score: 0, status: 'needs-improvement' });
  const [aiEditCount, setAiEditCount] = useState(0);
  const [liveGeoScore, setLiveGeoScore] = useState<{ score: number; status: string }>({ score: 0, status: 'needs-improvement' });
  const [liveStructureScore, setLiveStructureScore] = useState<number>(0);
  const [faqLoading, setFaqLoading] = useState(false);
  const [takeawaysLoading, setTakeawaysLoading] = useState(false);
  const [aiChanges, setAiChanges] = useState<AiChange[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [sectionStates, setSectionStates] = useState<Record<string, boolean>>(loadSectionStates);
  const [dismissedGrammarIndices, setDismissedGrammarIndices] = useState<Set<number>>(new Set());
  const [introSuggestion, setIntroSuggestion] = useState<string | null>(null);
  const [conclusionSuggestion, setConclusionSuggestion] = useState<string | null>(null);
  const [introApplied, setIntroApplied] = useState(false);
  const [conclusionApplied, setConclusionApplied] = useState(false);
  const [preloadedCategories, setPreloadedCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [preloadedTags, setPreloadedTags] = useState<Array<{ id: string; name: string }>>([]);
  const [catSearchQuery, setCatSearchQuery] = useState("");
  const [catSearchOpen, setCatSearchOpen] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const [tagSearchOpen, setTagSearchOpen] = useState(false);
  const catSearchRef = useRef<HTMLDivElement>(null);
  const tagSearchRef = useRef<HTMLDivElement>(null);

  const RESULTS_KEY = `ai-results-${articleId ?? "new"}`;

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

  const createNewTaxonomy = useCallback(
    async (
      newCatNames: string[],
      newTagNames_: string[],
      existingCatIds: string[],
      existingTagIds: string[],
    ) => {
      const createdCatIds: string[] = [];
      const failedCatNames: string[] = [];
      for (const name of newCatNames) {
        try {
          const res = await fetchWithCsrf("/api/admin/categories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.id) createdCatIds.push(data.id);
            else failedCatNames.push(name);
          } else failedCatNames.push(name);
        } catch {
          failedCatNames.push(name);
        }
      }

      const createdTagIds: string[] = [];
      const failedTagNames: string[] = [];
      for (const name of newTagNames_) {
        try {
          const res = await fetchWithCsrf("/api/admin/tags", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.id) createdTagIds.push(data.id);
            else failedTagNames.push(name);
          } else failedTagNames.push(name);
        } catch {
          failedTagNames.push(name);
        }
      }

      const allCatIds = Array.from(
        new Set([...selectedCategoryIds, ...existingCatIds, ...createdCatIds]),
      );
      onCategoriesChange(allCatIds, failedCatNames);
      setNewCategoryNames(failedCatNames);

      const allTagIds = Array.from(
        new Set([...selectedTagIds, ...existingTagIds, ...createdTagIds]),
      );
      onTagsChange(allTagIds, failedTagNames);
      setNewTagNames(failedTagNames);

      if (createdCatIds.length > 0 || createdTagIds.length > 0) {
        fetch("/api/admin/categories?flat=true")
          .then((r) => r.json())
          .then((cats) => {
            setPreloadedCategories(
              (cats.categories || []).map((c: { id: string; name: string }) => ({
                id: c.id,
                name: c.name,
              })),
            );
          })
          .catch(() => {});
        fetch("/api/admin/tags?includeCount=false")
          .then((r) => r.json())
          .then((tags) => {
            setPreloadedTags(
              (tags.tags || []).map((t: { id: string; name: string }) => ({
                id: t.id,
                name: t.name,
              })),
            );
          })
          .catch(() => {});
      }
    },
    [selectedCategoryIds, selectedTagIds, onCategoriesChange, onTagsChange],
  );

  const createAndSelectCategory = useCallback(
    async (name: string) => {
      try {
        const res = await fetchWithCsrf("/api/admin/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.id) {
            onCategoriesChange(
              [...selectedCategoryIds, data.id],
              newCategoryNames,
            );
            setPreloadedCategories((prev) => [
              ...prev,
              { id: data.id, name: data.name },
            ]);
          }
        }
      } catch {}
      setCatSearchQuery("");
      setCatSearchOpen(false);
    },
    [selectedCategoryIds, newCategoryNames, onCategoriesChange],
  );

  const createAndSelectTag = useCallback(
    async (name: string) => {
      try {
        const res = await fetchWithCsrf("/api/admin/tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.id) {
            onTagsChange(
              [...selectedTagIds, data.id],
              newTagNames,
            );
            setPreloadedTags((prev) => [
              ...prev,
              { id: data.id, name: data.name },
            ]);
          }
        }
      } catch {}
      setTagSearchQuery("");
      setTagSearchOpen(false);
    },
    [selectedTagIds, newTagNames, onTagsChange],
  );

  // Preload categories and tags so taxonomy panel works before AI analysis
  useEffect(() => {
    Promise.all([
      fetch('/api/admin/categories?flat=true').then(r => r.json()),
      fetch('/api/admin/tags?includeCount=false').then(r => r.json()),
    ]).then(([cats, tags]) => {
      setPreloadedCategories(
        (cats.categories || []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))
      );
      setPreloadedTags(
        (tags.tags || []).map((t: { id: string; name: string }) => ({ id: t.id, name: t.name }))
      );
    }).catch(() => {});
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        catSearchRef.current &&
        !catSearchRef.current.contains(e.target as Node)
      )
        setCatSearchOpen(false);
      if (
        tagSearchRef.current &&
        !tagSearchRef.current.contains(e.target as Node)
      )
        setTagSearchOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (wordCount < 10) {
        setLiveSeoScore({ score: 0, status: "needs-improvement" });
        setLiveGeoScore({ score: 0, status: "needs-improvement" });
        onScoreChange?.({
          seo: 0,
          geo: 0,
          structure: 0,
          structureTotal: 10,
          grammar: 0,
        });
        return;
      }

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

      const structureChecklist = analyzeStructure(title, content, focusKeyword || undefined);
      const structurePassed = structureChecklist.filter(item => item.passed).length;
      const structureScore = structureChecklist.length > 0
        ? Math.round((structurePassed / structureChecklist.length) * 100)
        : 0;
      setLiveStructureScore(structureScore);

      onScoreChange?.({
        seo: result.percentage,
        geo: geoResult.percentage,
        structure: structurePassed,
        structureTotal: structureChecklist.length,
        grammar: completionResults?.grammarIssues?.length || 0,
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [title, content, metaTitle, metaDescription, focusKeyword, slug, hasFeaturedImage, imageCount, imagesWithAlt, onScoreChange, completionResults?.grammarIssues?.length, wordCount]);

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

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(RESULTS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setCompletionResults(parsed.results);
        setAiPhase("complete");
        setAiMessage("اكتمل التحليل");
        if (parsed.introSuggestion) setIntroSuggestion(parsed.introSuggestion);
        if (parsed.conclusionSuggestion) setConclusionSuggestion(parsed.conclusionSuggestion);

        // Re-apply AI-suggested data to parent state so categories/tags/keyword
        // are not lost after the new→edit page navigation
        const r = parsed.results;
        if (r) {
          if (r.focusKeyword && !focusKeyword) onFocusKeywordChange(r.focusKeyword);
          if (r.slug && !slug) onSlugChange(r.slug);
          if (r.excerpt && !excerpt) onExcerptChange(r.excerpt);
          if (r.metaTitles?.[0] && !metaTitle)
            onMetaTitleChange((r.metaTitles[0].title || '').slice(0, 60));
          if (r.metaDescriptions?.[0] && !metaDescription)
            onMetaDescriptionChange((r.metaDescriptions[0].description || '').slice(0, 200));

          const existingCatIds = (r.suggestedCategories || [])
            .filter((c: SuggestedCategory) => c.isExisting && c.id)
            .map((c: SuggestedCategory) => c.id as string);
          const newCats = (r.suggestedCategories || [])
            .filter((c: SuggestedCategory) => !c.isExisting)
            .map((c: SuggestedCategory) => c.name);
          if (existingCatIds.length > 0 || newCats.length > 0) {
            const mergedCatIds = Array.from(new Set([...selectedCategoryIds, ...existingCatIds]));
            onCategoriesChange(mergedCatIds, newCats);
            setNewCategoryNames(newCats);
          }

          const existingTagIds = (r.suggestedTags || [])
            .filter((t: SuggestedTag) => t.isExisting && t.id)
            .map((t: SuggestedTag) => t.id as string);
          const newTags = (r.suggestedTags || [])
            .filter((t: SuggestedTag) => !t.isExisting)
            .map((t: SuggestedTag) => t.name);
          if (existingTagIds.length > 0 || newTags.length > 0) {
            const mergedTagIds = Array.from(new Set([...selectedTagIds, ...existingTagIds]));
            onTagsChange(mergedTagIds, newTags);
            setNewTagNames(newTags);
          }

          // Open taxonomy section so restored categories/tags are visible
          if (
            existingCatIds.length > 0 || newCats.length > 0 ||
            existingTagIds.length > 0 || newTags.length > 0
          ) {
            setSectionStates(prev => ({ ...prev, taxonomy: true }));
          }
        }
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [RESULTS_KEY]);

  const handleAnalyze = useCallback(async () => {
    if (!title.trim() || wordCount < 50) {
      setError('العنوان ومحتوى 50 كلمة على الأقل مطلوبان للتحليل');
      return;
    }

    setError(null);
    setAiPhase('analyzing');
    setAiStep(0);
    setAiMessage('جاري التحليل...');

    try {
      sessionStorage.removeItem(RESULTS_KEY);
    } catch {}

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
            if (data.data.metaTitles?.[0]) {
              onMetaTitleChange((data.data.metaTitles[0].title || '').slice(0, 60));
            }
            if (data.data.metaDescriptions?.[0]) {
              onMetaDescriptionChange((data.data.metaDescriptions[0].description || '').slice(0, 200));
            }
            if (data.data.excerpt) {
              onExcerptChange(data.data.excerpt);
            }
            const existingCatIds = (data.data.suggestedCategories || [])
              .filter((c: SuggestedCategory) => c.isExisting && c.id)
              .map((c: SuggestedCategory) => c.id as string);
            const newCatNames = (data.data.suggestedCategories || [])
              .filter((c: SuggestedCategory) => !c.isExisting)
              .map((c: SuggestedCategory) => c.name);
            const existingTagIds = (data.data.suggestedTags || [])
              .filter((t: SuggestedTag) => t.isExisting && t.id)
              .map((t: SuggestedTag) => t.id as string);
            const newTagNames_ = (data.data.suggestedTags || [])
              .filter((t: SuggestedTag) => !t.isExisting)
              .map((t: SuggestedTag) => t.name);

            if (
              existingCatIds.length > 0 ||
              newCatNames.length > 0 ||
              existingTagIds.length > 0 ||
              newTagNames_.length > 0
            ) {
              await createNewTaxonomy(
                newCatNames,
                newTagNames_,
                existingCatIds,
                existingTagIds,
              );
              setSectionStates((prev) => ({ ...prev, taxonomy: true }));
            }

            setAiPhase('complete');
            setAiMessage('اكتمل التحليل');

            setSectionStates((prev) => ({
              ...prev,
              issues: true,
              meta: true,
              taxonomy: true,
            }));

            if (data.data.titleSuggestions?.length > 0) {
              onTitleSuggestionsReady?.(
                data.data.titleSuggestions.map((s: TitleSuggestion) => s.title)
              );
            }

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

            let fetchedIntro: string | null = null;
            let fetchedConclusion: string | null = null;

            if (introRes.status === 'fulfilled' && introRes.value?.introductions?.length > 0) {
              const idx = introRes.value.recommended ?? 0;
              const text =
                introRes.value.introductions[idx]?.text ??
                introRes.value.introductions[0].text;
              fetchedIntro = text;
              setIntroSuggestion(text);
              onIntroGenerated?.(text);
            } else if (introRes.status === 'rejected') {
              console.warn('Intro generation failed:', introRes.reason);
            }
            if (conclusionRes.status === 'fulfilled' && conclusionRes.value?.conclusions?.length > 0) {
              const idx = conclusionRes.value.recommended ?? 0;
              const text =
                conclusionRes.value.conclusions[idx]?.text ??
                conclusionRes.value.conclusions[0].text;
              fetchedConclusion = text;
              setConclusionSuggestion(text);
              onConclusionGenerated?.(text);
            } else if (conclusionRes.status === 'rejected') {
              console.warn('Conclusion generation failed:', conclusionRes.reason);
            }

            if (fetchedIntro || fetchedConclusion) {
              setSectionStates((prev) => ({ ...prev, suggestions: true }));
            }

            try {
              sessionStorage.setItem(
                RESULTS_KEY,
                JSON.stringify({
                  results: data.data,
                  introSuggestion: fetchedIntro,
                  conclusionSuggestion: fetchedConclusion,
                }),
              );
            } catch {}

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
  }, [title, content, wordCount, onFocusKeywordChange, onSlugChange, onExcerptChange, onMetaTitleChange, onMetaDescriptionChange, onCategoriesChange, onTagsChange, editorRef, onTitleSuggestionsReady, onIntroGenerated, onConclusionGenerated, RESULTS_KEY, createNewTaxonomy]);

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

      const structureChecklist = analyzeStructure(
        title,
        content,
        focusKeyword || undefined,
      );
      const structureTopIssues = structureChecklist
        .filter((item) => !item.passed)
        .filter((item) => !item.label.includes('رابط داخلي')) // AI can't add real internal links
        .map((item) => item.details ? `${item.label}: ${item.details}` : item.label)
        .slice(0, 5);

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
          structureTopIssues,
          preservedIntro: introApplied ? introSuggestion ?? undefined : undefined,
          preservedConclusion: conclusionApplied ? conclusionSuggestion ?? undefined : undefined,
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
            setAiIteration(prev => prev + 1);
            setAiPhase('idle');
            setAiMessage('');
            setCompletionResults(null);
            setDismissedGrammarIndices(new Set());
            onContentChange(result.rewrittenContent);
            try { sessionStorage.removeItem(RESULTS_KEY); } catch {}
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
  }, [focusKeyword, articleId, title, content, metaTitle, metaDescription, slug, hasFeaturedImage, imageCount, imagesWithAlt, liveSeoScore.score, aiIteration, articleType, onContentChange, onTitleChange, editorRef, RESULTS_KEY]);

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

  // Generate FAQ section and append to article content
  const handleGenerateFaq = useCallback(async () => {
    if (!title.trim() || !content.trim()) return;
    setFaqLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/ai/faq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'فشل توليد الأسئلة الشائعة');
        return;
      }
      if (data.html && editorRef.current) {
        onContentChange(content + data.html);
      }
    } catch {
      setError('فشل الاتصال بالخادم');
    } finally {
      setFaqLoading(false);
    }
  }, [title, content, editorRef, onContentChange]);

  // Generate Key Takeaways and prepend to article content (after first paragraph)
  const handleGenerateTakeaways = useCallback(async () => {
    if (!title.trim() || !content.trim()) return;
    setTakeawaysLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/ai/key-takeaways', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'فشل توليد أبرز النقاط');
        return;
      }
      if (data.html && editorRef.current) {
        // Insert after first </p> tag (after the lead paragraph)
        const firstParaEnd = content.indexOf('</p>');
        if (firstParaEnd !== -1) {
          const newContent = content.slice(0, firstParaEnd + 4) + data.html + content.slice(firstParaEnd + 4);
          onContentChange(newContent);
        } else {
          onContentChange(data.html + content);
        }
      }
    } catch {
      setError('فشل الاتصال بالخادم');
    } finally {
      setTakeawaysLoading(false);
    }
  }, [title, content, editorRef, onContentChange]);

  const allCategories = [
    ...(completionResults?.availableCategories || preloadedCategories),
    ...newCategoryNames.map(name => ({ id: `new-${name}`, name })),
  ];
  const allTags = [
    ...(completionResults?.availableTags || preloadedTags),
    ...newTagNames.map(name => ({ id: `new-${name}`, name })),
  ];

  // Maps for AI confidence/relevance — used to show coloured dots on taxonomy chips
  const categoryConfidenceMap = new Map<string, number>();
  completionResults?.suggestedCategories?.forEach(sc => {
    categoryConfidenceMap.set(sc.id ?? `new-${sc.name}`, sc.confidence);
  });
  const tagRelevanceMap = new Map<string, 'high' | 'medium' | 'low'>();
  completionResults?.suggestedTags?.forEach(st => {
    tagRelevanceMap.set(st.id ?? `new-${st.name}`, st.relevance);
  });

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

      <div className="flex items-center justify-center gap-4 py-3">
        <ScoreRing score={liveSeoScore.score} label="SEO" empty={wordCount < 10} />
        <ScoreRing score={liveGeoScore.score} label="GEO" empty={wordCount < 10} />
        <ScoreRing score={liveStructureScore} label="بنية" empty={wordCount < 10} />
        <div className="flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center">
            <span className="text-xs font-bold text-foreground">{wordCount}</span>
          </div>
          <span className="text-[10px] text-muted-foreground font-medium">كلمة</span>
        </div>
      </div>

      {/* idle: show analyze button + quick tools */}
      {aiPhase === 'idle' && (
        <div className="space-y-2">
          <button
            onClick={handleAnalyze}
            disabled={!title.trim() || wordCount < 50}
            className="w-full flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: (!title.trim() || wordCount < 50)
                ? undefined
                : 'linear-gradient(135deg, #6366f1, #4f46e5)',
              boxShadow: (!title.trim() || wordCount < 50) ? undefined : '0 2px 12px rgba(99,102,241,0.35)',
              backgroundColor: (!title.trim() || wordCount < 50) ? 'var(--muted)' : undefined,
              color: (!title.trim() || wordCount < 50) ? 'var(--muted-foreground)' : undefined,
            }}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            تحليل أولي
            {wordCount < 50 && wordCount > 0 && (
              <span className="text-[10px] opacity-70">({50 - wordCount} كلمة متبقية)</span>
            )}
          </button>

          {/* Quick GEO tools — available when article has enough content */}
          {wordCount >= 50 && title.trim() && (
            <div className="flex gap-1.5">
              <button
                onClick={handleGenerateFaq}
                disabled={faqLoading}
                className="flex-1 flex items-center justify-center gap-1 h-8 rounded-lg text-[11px] font-medium border border-border/60 hover:bg-muted/40 transition-colors disabled:opacity-50"
                title="توليد قسم أسئلة شائعة وإضافته في نهاية المقال"
              >
                {faqLoading ? (
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                أسئلة شائعة
              </button>
              <button
                onClick={handleGenerateTakeaways}
                disabled={takeawaysLoading}
                className="flex-1 flex items-center justify-center gap-1 h-8 rounded-lg text-[11px] font-medium border border-border/60 hover:bg-muted/40 transition-colors disabled:opacity-50"
                title="توليد قسم أبرز النقاط وإضافته في بداية المقال"
              >
                {takeawaysLoading ? (
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                )}
                أبرز النقاط
              </button>
            </div>
          )}
        </div>
      )}

      {/* analyzing / rewriting: show step progress */}
      {(aiPhase === 'analyzing' || aiPhase === 'rewriting') && (
        <div className="space-y-3">
          <AnalysisProgressSteps
            steps={aiPhase === 'analyzing' ? ANALYSIS_STEPS : REWRITE_STEPS}
            currentStep={aiStep}
            phase={aiPhase}
            message={aiMessage || (aiPhase === 'analyzing' ? 'جاري التحليل...' : 'جاري إعادة الكتابة...')}
          />
          <button
            onClick={handleCancel}
            className="w-full h-8 rounded-lg text-xs font-medium text-muted-foreground border border-border/60 hover:bg-muted/40 transition-colors"
          >
            إلغاء
          </button>
        </div>
      )}

      {/* complete: action buttons */}
      {aiPhase === 'complete' && completionResults && (
        <div className="space-y-2.5">
          {/* Rewrite button */}
          <button
            onClick={handleRewrite}
            disabled={!focusKeyword.trim()}
            className="w-full flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: focusKeyword.trim()
                ? 'linear-gradient(135deg, #10b981, #059669)'
                : undefined,
              boxShadow: focusKeyword.trim() ? '0 2px 12px rgba(16,185,129,0.35)' : undefined,
              backgroundColor: !focusKeyword.trim() ? 'var(--muted)' : undefined,
              color: !focusKeyword.trim() ? 'var(--muted-foreground)' : undefined,
            }}
            title={!focusKeyword.trim() ? 'الكلمة المفتاحية مطلوبة' : undefined}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            إعادة كتابة بالذكاء الاصطناعي
            {(introApplied || conclusionApplied) && (
              <span className="text-[10px] opacity-75">(يحافظ على {introApplied && conclusionApplied ? 'المقدمة والخاتمة' : introApplied ? 'المقدمة' : 'الخاتمة'})</span>
            )}
          </button>

          {aiIteration >= 3 && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 text-center">
              إعادة الكتابة المتكررة قد تزيل تعديلاتك اليدوية
            </p>
          )}

          {/* AI edits pending review */}
          {aiEditCount > 0 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 rounded-xl">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                  {aiEditCount} تعديل بانتظار المراجعة
                </span>
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => setShowReviewModal(true)} className="flex-1 h-7 rounded-lg text-xs font-medium bg-amber-600 text-white hover:bg-amber-700 transition-colors">
                  مراجعة
                </button>
                <button onClick={handleAcceptAllAiEdits} className="flex-1 h-7 rounded-lg text-xs font-medium border border-amber-300 text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
                  قبول الكل
                </button>
                <button onClick={handleRejectAllAiEdits} className="flex-1 h-7 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted/60 transition-colors">
                  رفض الكل
                </button>
              </div>
            </div>
          )}

          {/* Grammar marks */}
          {grammarMarksActive ? (
            <button onClick={handleClearGrammarMarks} className="w-full h-8 rounded-lg text-xs font-medium text-muted-foreground border border-border/60 hover:bg-muted/40 transition-colors">
              مسح علامات التدقيق اللغوي
            </button>
          ) : (completionResults.grammarIssues?.length ?? 0) > 0 && (
            <button onClick={handleApplyGrammarMarks} className="w-full h-8 rounded-lg text-xs font-medium border border-border/60 hover:bg-muted/40 transition-colors text-foreground/80">
              تمييز أخطاء التدقيق ({completionResults.grammarIssues.length})
            </button>
          )}

          {/* Re-analyze */}
          <button onClick={handleAnalyze} className="w-full h-8 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">
            إعادة التحليل
          </button>
        </div>
      )}

      {aiPhase === 'error' && (
        <div className="space-y-3">
          <Alert variant="error">{error}</Alert>
          <button onClick={handleAnalyze} className="w-full h-10 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
            إعادة المحاولة
          </button>
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

  const renderSuggestionsSection = () => {
    if (aiPhase !== 'complete') return null;
    if (!introSuggestion && !conclusionSuggestion) return null;

    return (
      <div className="border border-border/60 rounded-xl overflow-hidden bg-card shadow-sm">
        <button
          onClick={() => toggleSection('suggestions')}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-foreground">اقتراحات الكتابة</span>
          </div>
          <svg
            className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${sectionStates.suggestions ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {sectionStates.suggestions && (
          <div className="px-4 pb-4 border-t border-border/60 space-y-3">
            {introSuggestion && (
              <SuggestionCard
                label="مقترح المقدمة"
                text={introSuggestion}
                applied={introApplied}
                onApply={() => {
                  const editor = editorRef.current?.getEditor();
                  if (editor && introSuggestion) {
                    editor.commands.insertContentAt(0, `<p>${introSuggestion}</p>`);
                    setIntroApplied(true);
                  }
                }}
                onDismiss={() => setIntroSuggestion(null)}
              />
            )}
            {conclusionSuggestion && (
              <SuggestionCard
                label="مقترح الخاتمة"
                text={conclusionSuggestion}
                applied={conclusionApplied}
                onApply={() => {
                  const editor = editorRef.current?.getEditor();
                  if (editor && conclusionSuggestion) {
                    const endPos = editor.state.doc.content.size;
                    editor.commands.insertContentAt(endPos, `<p>${conclusionSuggestion}</p>`);
                    setConclusionApplied(true);
                  }
                }}
                onDismiss={() => setConclusionSuggestion(null)}
              />
            )}
          </div>
        )}
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
        {completionResults?.titleSuggestions && completionResults.titleSuggestions.length > 0 && (
          <div className="mt-3">
            <label className="block text-xs text-muted-foreground mb-1.5">اقتراحات العنوان</label>
            <div className="space-y-1.5">
              {completionResults.titleSuggestions.slice(0, 3).map((s, i) => (
                <button
                  key={i}
                  onClick={() => onTitleChange(s.title)}
                  className="w-full text-right text-xs px-2.5 py-2 bg-muted hover:bg-muted/80 rounded-lg leading-relaxed"
                  dir="rtl"
                >
                  {s.title}
                </button>
              ))}
            </div>
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
            ({selectedCategoryIds.length + newCategoryNames.length})
          </span>
        </h4>
        <div className="flex flex-wrap gap-2">
          {allCategories.map((cat) => {
            const isNew = cat.id.startsWith('new-');
            const isSelected = isNew
              ? newCategoryNames.includes(cat.name)
              : selectedCategoryIds.includes(cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => {
                  if (isSelected) {
                    if (isNew) {
                      onCategoriesChange(selectedCategoryIds, newCategoryNames.filter(n => n !== cat.name));
                    } else {
                      onCategoriesChange(selectedCategoryIds.filter(id => id !== cat.id), newCategoryNames);
                    }
                  } else {
                    if (isNew) {
                      onCategoriesChange(selectedCategoryIds, [...newCategoryNames, cat.name]);
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
                {(() => {
                  const conf = categoryConfidenceMap.get(cat.id);
                  if (conf === undefined) return null;
                  const color = conf >= 0.8 ? 'bg-green-400' : conf >= 0.5 ? 'bg-amber-400' : 'bg-gray-400';
                  return <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${color}`} title={`ثقة ${Math.round(conf * 100)}%`} />;
                })()}
              </button>
            );
          })}
        </div>
        <div ref={catSearchRef} className="relative mt-2">
          <input
            type="text"
            value={catSearchQuery}
            onChange={(e) => {
              setCatSearchQuery(e.target.value);
              setCatSearchOpen(true);
            }}
            onFocus={() => setCatSearchOpen(true)}
            placeholder="ابحث عن تصنيف أو أضف جديداً..."
            dir="rtl"
            className="w-full px-3 py-1.5 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
          />
          {catSearchOpen && catSearchQuery.trim() && (
            <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {allCategories
                .filter(
                  (c) =>
                    !c.id.startsWith("new-") &&
                    !selectedCategoryIds.includes(c.id) &&
                    c.name.includes(catSearchQuery.trim()),
                )
                .slice(0, 8)
                .map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      onCategoriesChange(
                        [...selectedCategoryIds, cat.id],
                        newCategoryNames,
                      );
                      setCatSearchQuery("");
                      setCatSearchOpen(false);
                    }}
                    className="w-full text-right px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
                  >
                    <svg
                      className="w-3.5 h-3.5 text-muted-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                      />
                    </svg>
                    {cat.name}
                  </button>
                ))}
              {!allCategories.some(
                (c) => c.name === catSearchQuery.trim(),
              ) && (
                <button
                  onClick={() => createAndSelectCategory(catSearchQuery.trim())}
                  className="w-full text-right px-3 py-2 text-sm hover:bg-muted text-primary flex items-center gap-2"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  إضافة: &quot;{catSearchQuery.trim()}&quot;
                </button>
              )}
              {allCategories.filter(
                (c) =>
                  !c.id.startsWith("new-") &&
                  c.name.includes(catSearchQuery.trim()),
              ).length === 0 &&
                allCategories.some((c) => c.name === catSearchQuery.trim()) && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    لا توجد نتائج
                  </div>
                )}
            </div>
          )}
        </div>
      </div>

      <div>
        <h4 className="font-medium text-sm mb-2">
          الوسوم
          <span className="text-muted-foreground font-normal mr-1">
            ({selectedTagIds.length + newTagNames.length})
          </span>
        </h4>
        <div className="flex flex-wrap gap-2">
          {allTags.map((tag) => {
            const isNew = tag.id.startsWith('new-');
            const isSelected = isNew
              ? newTagNames.includes(tag.name)
              : selectedTagIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                onClick={() => {
                  if (isSelected) {
                    if (isNew) {
                      onTagsChange(selectedTagIds, newTagNames.filter(n => n !== tag.name));
                    } else {
                      onTagsChange(selectedTagIds.filter(id => id !== tag.id), newTagNames);
                    }
                  } else {
                    if (isNew) {
                      onTagsChange(selectedTagIds, [...newTagNames, tag.name]);
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
                {(() => {
                  const rel = tagRelevanceMap.get(tag.id);
                  if (!rel) return null;
                  const color = rel === 'high' ? 'bg-green-400' : rel === 'medium' ? 'bg-amber-400' : 'bg-gray-400';
                  const label = rel === 'high' ? 'صلة عالية' : rel === 'medium' ? 'صلة متوسطة' : 'صلة منخفضة';
                  return <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${color}`} title={label} />;
                })()}
              </button>
            );
          })}
        </div>
        <div ref={tagSearchRef} className="relative mt-2">
          <input
            type="text"
            value={tagSearchQuery}
            onChange={(e) => {
              setTagSearchQuery(e.target.value);
              setTagSearchOpen(true);
            }}
            onFocus={() => setTagSearchOpen(true)}
            placeholder="ابحث عن وسم أو أضف جديداً..."
            dir="rtl"
            className="w-full px-3 py-1.5 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
          />
          {tagSearchOpen && tagSearchQuery.trim() && (
            <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {allTags
                .filter(
                  (t) =>
                    !t.id.startsWith("new-") &&
                    !selectedTagIds.includes(t.id) &&
                    t.name.includes(tagSearchQuery.trim()),
                )
                .slice(0, 8)
                .map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => {
                      onTagsChange([...selectedTagIds, tag.id], newTagNames);
                      setTagSearchQuery("");
                      setTagSearchOpen(false);
                    }}
                    className="w-full text-right px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
                  >
                    <svg
                      className="w-3.5 h-3.5 text-muted-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                      />
                    </svg>
                    {tag.name}
                  </button>
                ))}
              {!allTags.some((t) => t.name === tagSearchQuery.trim()) && (
                <button
                  onClick={() => createAndSelectTag(tagSearchQuery.trim())}
                  className="w-full text-right px-3 py-2 text-sm hover:bg-muted text-primary flex items-center gap-2"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  إضافة: &quot;{tagSearchQuery.trim()}&quot;
                </button>
              )}
              {allTags.filter(
                (t) =>
                  !t.id.startsWith("new-") &&
                  t.name.includes(tagSearchQuery.trim()),
              ).length === 0 &&
                allTags.some((t) => t.name === tagSearchQuery.trim()) && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    لا توجد نتائج
                  </div>
                )}
            </div>
          )}
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

          {renderSuggestionsSection()}

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
