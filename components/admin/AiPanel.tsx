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
 */

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Loading";
import { Card } from "@/components/ui/Card";

// Types
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

type TabId =
  | "seo"
  | "meta"
  | "keywords"
  | "content"
  | "grammar";

interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  { id: "seo", label: "SEO", icon: "📊" },
  { id: "meta", label: "ميتا", icon: "🏷️" },
  { id: "keywords", label: "كلمات مفتاحية", icon: "🔑" },
  { id: "content", label: "المحتوى", icon: "✍️" },
  { id: "grammar", label: "التدقيق", icon: "📝" },
];

// SEO Suggestion type
interface SeoSuggestion {
  type: string;
  priority: "high" | "medium" | "low";
  issue: string;
  suggestion: string;
  example?: string;
}

// Meta suggestion types
interface MetaTitleSuggestion {
  title: string;
  length: number;
  hasKeyword: boolean;
  reason: string;
}

interface MetaDescriptionSuggestion {
  description: string;
  length: number;
  hasKeyword: boolean;
  hasCTA: boolean;
  reason: string;
}

// Keyword type
interface ExtractedKeyword {
  keyword: string;
  relevance: "high" | "medium" | "low";
  density: number;
  type: "primary" | "secondary" | "long-tail";
}

// Grammar error type
interface GrammarError {
  type: string;
  original: string;
  correction: string;
  explanation: string;
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ غير معروف");
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ غير معروف");
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ غير معروف");
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ غير معروف");
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ غير معروف");
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ غير معروف");
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ غير معروف");
    } finally {
      setLoading(false);
    }
  }, [hasContent, content, fetchApi]);

  // Priority badge color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRelevanceColor = (relevance: string) => {
    switch (relevance) {
      case "high":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-gray-100 text-gray-600";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Get user-friendly error message
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
      <div className="border-b border-border">
        <div className="flex overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="text-sm">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-h-[500px] overflow-y-auto">
        {!hasContent ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
              <span className="text-2xl">✨</span>
            </div>
            <p>أضف عنواناً ومحتوى للمقال لتفعيل ميزات الذكاء الاصطناعي</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 p-3 rounded-md bg-danger/10 border border-danger/20">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-danger mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-danger font-medium">{getUserFriendlyError(error)}</p>
                    <button
                      onClick={() => setError(null)}
                      className="text-xs text-danger/70 hover:text-danger mt-1"
                    >
                      إغلاق
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SEO Tab */}
            {activeTab === "seo" && (
              <div className="space-y-4">
                <Button
                  onClick={fetchSeoSuggestions}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Spinner size="sm" />
                      جارٍ التحليل...
                    </span>
                  ) : (
                    "تحليل SEO بالذكاء الاصطناعي"
                  )}
                </Button>

                {seoAssessment && (
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm font-medium text-foreground">التقييم العام:</p>
                    <p className="text-sm text-muted-foreground mt-1">{seoAssessment}</p>
                  </div>
                )}

                {seoSuggestions.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-foreground">الاقتراحات:</p>
                    {seoSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="border border-border rounded-lg p-3"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${getPriorityColor(
                              suggestion.priority
                            )}`}
                          >
                            {suggestion.priority === "high"
                              ? "عالي"
                              : suggestion.priority === "medium"
                              ? "متوسط"
                              : "منخفض"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {suggestion.type}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          {suggestion.issue}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {suggestion.suggestion}
                        </p>
                        {suggestion.example && (
                          <p className="text-xs text-muted-foreground mt-2 bg-muted p-2 rounded">
                            مثال: {suggestion.example}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Meta Tab */}
            {activeTab === "meta" && (
              <div className="space-y-6">
                {/* Meta Title */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-foreground">عنوان الميتا</h4>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={fetchMetaTitles}
                      disabled={loading}
                    >
                      {loading ? <Spinner size="sm" /> : "توليد"}
                    </Button>
                  </div>

                  {metaTitles.length > 0 && (
                    <div className="space-y-2">
                      {metaTitles.map((item, index) => (
                        <div
                          key={index}
                          className="border border-border rounded-md p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => onMetaTitleChange?.(item.title)}
                        >
                          <p className="text-sm font-medium text-foreground">{item.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {item.length} حرف • {item.reason}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Meta Description */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-foreground">وصف الميتا</h4>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={fetchMetaDescriptions}
                      disabled={loading}
                    >
                      {loading ? <Spinner size="sm" /> : "توليد"}
                    </Button>
                  </div>

                  {metaDescriptions.length > 0 && (
                    <div className="space-y-2">
                      {metaDescriptions.map((item, index) => (
                        <div
                          key={index}
                          className="border border-border rounded-md p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => onMetaDescriptionChange?.(item.description)}
                        >
                          <p className="text-sm text-foreground">{item.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {item.length} حرف • {item.reason}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Keywords Tab */}
            {activeTab === "keywords" && (
              <div className="space-y-4">
                <Button
                  onClick={fetchKeywords}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Spinner size="sm" />
                      جارٍ الاستخراج...
                    </span>
                  ) : (
                    "استخراج الكلمات المفتاحية"
                  )}
                </Button>

                {recommendedKeyword && (
                  <div className="bg-success/10 border border-success/20 rounded-lg p-3">
                    <p className="text-sm font-medium text-success">
                      الكلمة المفتاحية المقترحة:
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-success font-semibold">
                        {recommendedKeyword}
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onFocusKeywordChange?.(recommendedKeyword)}
                      >
                        استخدام
                      </Button>
                    </div>
                  </div>
                )}

                {keywords.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      الكلمات المستخرجة:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {keywords.map((kw, index) => (
                        <button
                          key={index}
                          onClick={() => onFocusKeywordChange?.(kw.keyword)}
                          className={`text-sm px-3 py-1 rounded-full ${getRelevanceColor(
                            kw.relevance
                          )} hover:opacity-80 transition-opacity`}
                        >
                          {kw.keyword}
                          <span className="text-xs opacity-70 mr-1">
                            ({kw.density.toFixed(1)}%)
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Content Tab */}
            {activeTab === "content" && (
              <div className="space-y-6">
                {/* Introduction */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-foreground">توليد مقدمة</h4>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={generateIntroduction}
                      disabled={loading}
                    >
                      {loading ? <Spinner size="sm" /> : "توليد"}
                    </Button>
                  </div>

                  {generatedIntro && (
                    <div className="border border-border rounded-lg p-3">
                      <p className="text-sm text-foreground/80 leading-relaxed">
                        {generatedIntro}
                      </p>
                      <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onContentInsert?.(generatedIntro, "start")}
                        >
                          إضافة في البداية
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            navigator.clipboard.writeText(generatedIntro);
                          }}
                        >
                          نسخ
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Conclusion */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-foreground">توليد خاتمة</h4>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={generateConclusionText}
                      disabled={loading}
                    >
                      {loading ? <Spinner size="sm" /> : "توليد"}
                    </Button>
                  </div>

                  {generatedConclusion && (
                    <div className="border border-border rounded-lg p-3">
                      <p className="text-sm text-foreground/80 leading-relaxed">
                        {generatedConclusion}
                      </p>
                      <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onContentInsert?.(generatedConclusion, "end")}
                        >
                          إضافة في النهاية
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            navigator.clipboard.writeText(generatedConclusion);
                          }}
                        >
                          نسخ
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Grammar Tab */}
            {activeTab === "grammar" && (
              <div className="space-y-4">
                <Button
                  onClick={checkGrammarNow}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Spinner size="sm" />
                      جارٍ التدقيق...
                    </span>
                  ) : (
                    "تدقيق لغوي وإملائي"
                  )}
                </Button>

                {grammarQuality && (
                  <div
                    className={`p-3 rounded-lg ${
                      grammarQuality === "excellent"
                        ? "bg-success/10 border border-success/20"
                        : grammarQuality === "good"
                        ? "bg-warning/10 border border-warning/20"
                        : "bg-danger/10 border border-danger/20"
                    }`}
                  >
                    <p className={`text-sm font-medium ${
                      grammarQuality === "excellent"
                        ? "text-success"
                        : grammarQuality === "good"
                        ? "text-warning"
                        : "text-danger"
                    }`}>
                      جودة النص:{" "}
                      {grammarQuality === "excellent"
                        ? "ممتازة ✓"
                        : grammarQuality === "good"
                        ? "جيدة"
                        : "تحتاج تحسين"}
                    </p>
                  </div>
                )}

                {grammarErrors.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-foreground">
                      الأخطاء المكتشفة ({grammarErrors.length}):
                    </p>
                    {grammarErrors.map((error, index) => (
                      <div
                        key={index}
                        className="border border-border rounded-lg p-3"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs px-2 py-0.5 rounded bg-danger/10 text-danger">
                            {error.type === "spelling"
                              ? "إملائي"
                              : error.type === "grammar"
                              ? "نحوي"
                              : error.type === "punctuation"
                              ? "ترقيم"
                              : "أسلوبي"}
                          </span>
                        </div>
                        <p className="text-sm">
                          <span className="line-through text-danger">
                            {error.original}
                          </span>
                          <span className="mx-2 text-muted-foreground">←</span>
                          <span className="text-success font-medium">
                            {error.correction}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {error.explanation}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {correctedText && grammarErrors.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-foreground">
                        النص المصحح:
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onContentReplace?.(correctedText)}
                      >
                        تطبيق التصحيحات
                      </Button>
                    </div>
                  </div>
                )}

                {grammarQuality === "excellent" && grammarErrors.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-success/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-success" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p>لم يتم العثور على أخطاء لغوية</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
