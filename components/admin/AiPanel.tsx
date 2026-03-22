"use client";

/**
 * AI Panel Component
 *
 * Provides AI-powered features for article editing:
 * - SEO suggestions
 * - Meta generation
 * - Keyword extraction
 * - Content assistance
 * - Grammar checking
 *
 * Phase 2 Frontend Audit - Refactored to use sub-components for better maintainability
 */

import { useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { AiPanelTabs } from "./ai/AiPanelTabs";
import { AiPanelEmptyState } from "./ai/AiPanelEmptyState";
import { AiPanelError } from "./ai/AiPanelError";
import { AiSeoTab } from "./ai/AiSeoTab";
import { AiMetaTab } from "./ai/AiMetaTab";
import { AiKeywordsTab } from "./ai/AiKeywordsTab";
import { AiContentTab } from "./ai/AiContentTab";
import { AiGrammarTab } from "./ai/AiGrammarTab";
import {
  TabId,
  SeoSuggestion,
  MetaTitleSuggestion,
  MetaDescriptionSuggestion,
  ExtractedKeyword,
  GrammarError,
} from "./ai/types";

// Props interface
interface AiPanelProps {
  title: string;
  content: string;
  excerpt?: string;
  metaTitle?: string;
  metaDescription?: string;
  focusKeyword?: string;
  onMetaTitleChange?: (value: string) => void;
  onMetaDescriptionChange?: (value: string) => void;
  onFocusKeywordChange?: (value: string) => void;
  onContentInsert?: (text: string, position: "start" | "end" | "cursor") => void;
  onContentReplace?: (text: string) => void;
}

export function AiPanel({
  title,
  content,
  excerpt,
  metaTitle,
  metaDescription,
  focusKeyword,
  onMetaTitleChange,
  onMetaDescriptionChange,
  onFocusKeywordChange,
  onContentInsert,
  onContentReplace,
}: AiPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("seo");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<(() => void) | null>(null);

  // SEO state
  const [seoSuggestions, setSeoSuggestions] = useState<SeoSuggestion[]>([]);
  const [seoAssessment, setSeoAssessment] = useState<string>("");

  // Meta state
  const [metaTitles, setMetaTitles] = useState<MetaTitleSuggestion[]>([]);
  const [metaDescriptions, setMetaDescriptions] = useState<MetaDescriptionSuggestion[]>([]);

  // Keywords state
  const [keywords, setKeywords] = useState<ExtractedKeyword[]>([]);
  const [recommendedKeyword, setRecommendedKeyword] = useState<string>("");

  // Content state
  const [generatedIntro, setGeneratedIntro] = useState<string>("");
  const [generatedConclusion, setGeneratedConclusion] = useState<string>("");

  // Grammar state
  const [grammarErrors, setGrammarErrors] = useState<GrammarError[]>([]);
  const [correctedText, setCorrectedText] = useState<string>("");
  const [grammarQuality, setGrammarQuality] = useState<string>("");

  // API call helper
  const fetchApi = useCallback(
    async <T,>(endpoint: string, body: object): Promise<T> => {
      const response = await fetch(`/api/admin/ai/${endpoint}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "فشل في الاتصال بالخادم");
      }

      return response.json();
    },
    []
  );

  // Check if there's enough content to analyze
  const hasContent = content.length > 50 && title.length > 0;

  // ============================================
  // SEO Suggestions
  // ============================================
  const fetchSeoSuggestions = useCallback(async () => {
    if (!hasContent) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchApi<{
        suggestions: SeoSuggestion[];
        overallAssessment: string;
      }>("seo-suggestions", {
        title,
        content,
        excerpt,
        metaTitle,
        metaDescription,
        focusKeyword,
      });

      setSeoSuggestions(data.suggestions || []);
      setSeoAssessment(data.overallAssessment || "");
      setLastAction(() => fetchSeoSuggestions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ غير معروف");
      setLastAction(() => fetchSeoSuggestions);
    } finally {
      setLoading(false);
    }
  }, [hasContent, title, content, excerpt, metaTitle, metaDescription, focusKeyword, fetchApi]);

  // ============================================
  // Meta Generation
  // ============================================
  const fetchMetaTitles = useCallback(async () => {
    if (!hasContent) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchApi<{
        suggestions: MetaTitleSuggestion[];
      }>("meta-title", {
        title,
        content,
        focusKeyword,
      });

      setMetaTitles(data.suggestions || []);
      setLastAction(() => fetchMetaTitles);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ غير معروف");
      setLastAction(() => fetchMetaTitles);
    } finally {
      setLoading(false);
    }
  }, [hasContent, title, content, focusKeyword, fetchApi]);

  const fetchMetaDescriptions = useCallback(async () => {
    if (!hasContent) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchApi<{
        suggestions: MetaDescriptionSuggestion[];
      }>("meta-description", {
        title,
        content,
        focusKeyword,
      });

      setMetaDescriptions(data.suggestions || []);
      setLastAction(() => fetchMetaDescriptions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ غير معروف");
      setLastAction(() => fetchMetaDescriptions);
    } finally {
      setLoading(false);
    }
  }, [hasContent, title, content, focusKeyword, fetchApi]);

  // ============================================
  // Keywords
  // ============================================
  const fetchKeywords = useCallback(async () => {
    if (!hasContent) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchApi<{
        keywords: ExtractedKeyword[];
        recommendedFocusKeyword: string;
      }>("keywords", {
        title,
        content,
      });

      setKeywords(data.keywords || []);
      setRecommendedKeyword(data.recommendedFocusKeyword || "");
      setLastAction(() => fetchKeywords);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ غير معروف");
      setLastAction(() => fetchKeywords);
    } finally {
      setLoading(false);
    }
  }, [hasContent, title, content, fetchApi]);

  // ============================================
  // Content Assistance
  // ============================================
  const generateIntroduction = useCallback(async () => {
    if (!hasContent) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchApi<{
        introductions: { text: string }[];
        recommended: number;
      }>("content", {
        action: "introduction",
        title,
        content,
        focusKeyword,
      });

      const intro = data.introductions?.[data.recommended]?.text || data.introductions?.[0]?.text;
      setGeneratedIntro(intro || "");
      setLastAction(() => generateIntroduction);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ غير معروف");
      setLastAction(() => generateIntroduction);
    } finally {
      setLoading(false);
    }
  }, [hasContent, title, content, focusKeyword, fetchApi]);

  const generateConclusionText = useCallback(async () => {
    if (!hasContent) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchApi<{
        conclusions: { text: string }[];
        recommended: number;
      }>("content", {
        action: "conclusion",
        title,
        content,
        focusKeyword,
      });

      const conclusion = data.conclusions?.[data.recommended]?.text || data.conclusions?.[0]?.text;
      setGeneratedConclusion(conclusion || "");
      setLastAction(() => generateConclusionText);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ غير معروف");
      setLastAction(() => generateConclusionText);
    } finally {
      setLoading(false);
    }
  }, [hasContent, title, content, focusKeyword, fetchApi]);

  // ============================================
  // Grammar Check
  // ============================================
  const checkGrammarNow = useCallback(async () => {
    if (!hasContent) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchApi<{
        errors: GrammarError[];
        correctedText: string;
        overallQuality: string;
      }>("grammar", {
        content,
      });

      setGrammarErrors(data.errors || []);
      setCorrectedText(data.correctedText || "");
      setGrammarQuality(data.overallQuality || "");
      setLastAction(() => checkGrammarNow);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ غير معروف");
      setLastAction(() => checkGrammarNow);
    } finally {
      setLoading(false);
    }
  }, [hasContent, content, fetchApi]);

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <h3 className="font-semibold text-foreground">مساعد الذكاء الاصطناعي</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Gemini 3 Flash</p>
      </div>

      {/* Tabs */}
      <AiPanelTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Content */}
      <div className="p-4 max-h-[500px] overflow-y-auto">
        {!hasContent ? (
          <AiPanelEmptyState />
        ) : (
          <>
            {error && (
              <AiPanelError
                error={error}
                onDismiss={() => setError(null)}
                onRetry={() => {
                  setError(null);
                  lastAction?.();
                }}
                isRetrying={loading}
              />
            )}

            {/* SEO Tab */}
            {activeTab === "seo" && (
              <AiSeoTab
                loading={loading}
                onAnalyze={fetchSeoSuggestions}
                seoAssessment={seoAssessment}
                seoSuggestions={seoSuggestions}
              />
            )}

            {/* Meta Tab */}
            {activeTab === "meta" && (
              <AiMetaTab
                loading={loading}
                onGenerateTitles={fetchMetaTitles}
                onGenerateDescriptions={fetchMetaDescriptions}
                onTitleSelect={(title) => onMetaTitleChange?.(title)}
                onDescriptionSelect={(desc) => onMetaDescriptionChange?.(desc)}
                metaTitles={metaTitles}
                metaDescriptions={metaDescriptions}
              />
            )}

            {/* Keywords Tab */}
            {activeTab === "keywords" && (
              <AiKeywordsTab
                loading={loading}
                onExtract={fetchKeywords}
                onKeywordSelect={(kw) => onFocusKeywordChange?.(kw)}
                keywords={keywords}
                recommendedKeyword={recommendedKeyword}
              />
            )}

            {/* Content Tab */}
            {activeTab === "content" && (
              <AiContentTab
                loading={loading}
                onGenerateIntro={generateIntroduction}
                onGenerateConclusion={generateConclusionText}
                onInsertIntro={(text) => onContentInsert?.(text, "start")}
                onInsertConclusion={(text) => onContentInsert?.(text, "end")}
                generatedIntro={generatedIntro}
                generatedConclusion={generatedConclusion}
              />
            )}

            {/* Grammar Tab */}
            {activeTab === "grammar" && (
              <AiGrammarTab
                loading={loading}
                onCheck={checkGrammarNow}
                onApplyCorrections={(text) => onContentReplace?.(text)}
                grammarErrors={grammarErrors}
                correctedText={correctedText}
                grammarQuality={grammarQuality}
              />
            )}
          </>
        )}
      </div>
    </Card>
  );
}
