/**
 * AI Service - High-level API for AI features
 *
 * Provides easy-to-use functions for all AI capabilities:
 * - SEO suggestions
 * - Meta generation
 * - Keyword extraction
 * - Content assistance
 * - Grammar checking
 * - Alt text generation
 */

import {
  generateContent,
  GeminiError,
  type GenerateOptions,
  type GeminiModelId,
} from "../gemini";

// Token usage info returned by AI functions
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  model: GeminiModelId;
  cached: boolean;
}
import {
  ARABIC_SYSTEM_INSTRUCTION,
  buildSeoSuggestionsPrompt,
  buildMetaTitlePrompt,
  buildMetaDescriptionPrompt,
  buildKeywordExtractionPrompt,
  buildExpandContentPrompt,
  buildSummarizeContentPrompt,
  buildRewriteContentPrompt,
  buildGenerateIntroPrompt,
  buildGenerateConclusionPrompt,
  buildGrammarCheckPrompt,
  buildAltTextPrompt,
  buildRelatedTopicsPrompt,
  buildAutoFixInternalLinksPrompt,
  buildAutoFixExternalLinksPrompt,
  buildAutoFixLongParagraphsPrompt,
  buildAutoFixSeoIssuesPrompt,
} from "./prompts";

// Default model
const DEFAULT_MODEL: GeminiModelId = "gemini-2.5-flash";

// Default options for AI generation
const DEFAULT_OPTIONS: GenerateOptions = {
  model: DEFAULT_MODEL,
  temperature: 0.7,
  useCache: true,
  systemInstruction: ARABIC_SYSTEM_INSTRUCTION,
};

// Wrapper type for AI function results with usage tracking
export interface AiResultWithUsage<T> {
  data: T;
  usage: TokenUsage;
}

// Helper to parse JSON from AI response
export function parseJsonResponse<T>(text: string): T {
  let jsonStr = text.trim();

  // Remove markdown code block wrapper if present
  if (jsonStr.startsWith("```")) {
    // Find the end of the opening fence
    const firstNewline = jsonStr.indexOf("\n");
    if (firstNewline !== -1) {
      // Remove opening fence (```json or ```)
      jsonStr = jsonStr.substring(firstNewline + 1);
    }
    // Remove closing fence
    if (jsonStr.endsWith("```")) {
      jsonStr = jsonStr.slice(0, -3).trim();
    }
  }

  // Try to parse directly
  try {
    return JSON.parse(jsonStr);
  } catch (parseError) {
    // Try to find and extract just the JSON object
    const objectStart = jsonStr.indexOf("{");
    const objectEnd = jsonStr.lastIndexOf("}");

    if (objectStart !== -1 && objectEnd !== -1 && objectEnd > objectStart) {
      const extracted = jsonStr.substring(objectStart, objectEnd + 1);
      try {
        return JSON.parse(extracted);
      } catch {
        // Try fixing common issues
        const fixed = extracted
          .replace(/,(\s*[}\]])/g, "$1") // Remove trailing commas
          .replace(/\n/g, " "); // Remove newlines that might break strings
        try {
          return JSON.parse(fixed);
        } catch {
          // Continue to error
        }
      }
    }

    // Log for debugging - show more of the response
    console.error("=== AI Response Parse Error ===");
    console.error("Original length:", text.length);
    console.error("Cleaned jsonStr:", jsonStr.substring(0, 1500));
    console.error("Parse error:", parseError);
    throw new GeminiError(
      "فشل في معالجة رد الذكاء الاصطناعي",
      "INVALID_RESPONSE"
    );
  }
}

// Helper to extract usage info from generateContent result
function extractUsage(
  result: { tokensUsed?: { input: number; output: number }; cached: boolean; model: string },
  model: GeminiModelId
): TokenUsage {
  return {
    inputTokens: result.tokensUsed?.input || 0,
    outputTokens: result.tokensUsed?.output || 0,
    model,
    cached: result.cached,
  };
}

// ============================================
// SEO Suggestions
// ============================================

export interface SeoSuggestion {
  type: "title" | "meta" | "content" | "keyword" | "structure";
  priority: "high" | "medium" | "low";
  issue: string;
  suggestion: string;
  example?: string;
}

export interface SeoSuggestionsResult {
  suggestions: SeoSuggestion[];
  overallAssessment: string;
  topPriority: string;
}

export async function getSeoSuggestions(data: {
  title: string;
  content: string;
  excerpt?: string;
  metaTitle?: string;
  metaDescription?: string;
  focusKeyword?: string;
}): Promise<AiResultWithUsage<SeoSuggestionsResult>> {
  const prompt = buildSeoSuggestionsPrompt(data);
  const result = await generateContent(prompt, {
    ...DEFAULT_OPTIONS,
    maxTokens: 8192,
  });
  return {
    data: parseJsonResponse<SeoSuggestionsResult>(result.text),
    usage: extractUsage(result, DEFAULT_MODEL),
  };
}

// ============================================
// Meta Title Generation
// ============================================

export interface MetaTitleSuggestion {
  title: string;
  length: number;
  hasKeyword: boolean;
  reason: string;
}

export interface MetaTitleResult {
  suggestions: MetaTitleSuggestion[];
  recommended: number;
}

export async function generateMetaTitle(data: {
  title: string;
  content: string;
  focusKeyword?: string;
}): Promise<AiResultWithUsage<MetaTitleResult>> {
  const prompt = buildMetaTitlePrompt(data);
  const result = await generateContent(prompt, {
    ...DEFAULT_OPTIONS,
    maxTokens: 8192,
  });
  return {
    data: parseJsonResponse<MetaTitleResult>(result.text),
    usage: extractUsage(result, DEFAULT_MODEL),
  };
}

// ============================================
// Meta Description Generation
// ============================================

export interface MetaDescriptionSuggestion {
  description: string;
  length: number;
  hasKeyword: boolean;
  hasCTA: boolean;
  reason: string;
}

export interface MetaDescriptionResult {
  suggestions: MetaDescriptionSuggestion[];
  recommended: number;
}

export async function generateMetaDescription(data: {
  title: string;
  content: string;
  focusKeyword?: string;
}): Promise<AiResultWithUsage<MetaDescriptionResult>> {
  const prompt = buildMetaDescriptionPrompt(data);
  const result = await generateContent(prompt, {
    ...DEFAULT_OPTIONS,
    maxTokens: 8192,
  });
  return {
    data: parseJsonResponse<MetaDescriptionResult>(result.text),
    usage: extractUsage(result, DEFAULT_MODEL),
  };
}

// ============================================
// Keyword Extraction
// ============================================

export interface ExtractedKeyword {
  keyword: string;
  relevance: "high" | "medium" | "low";
  density: number;
  type: "primary" | "secondary" | "long-tail";
}

export interface KeywordExtractionResult {
  keywords: ExtractedKeyword[];
  recommendedFocusKeyword: string;
  relatedTopics: string[];
}

export async function extractKeywords(data: {
  title: string;
  content: string;
}): Promise<AiResultWithUsage<KeywordExtractionResult>> {
  const prompt = buildKeywordExtractionPrompt(data);
  const result = await generateContent(prompt, {
    ...DEFAULT_OPTIONS,
    maxTokens: 8192,
  });
  return {
    data: parseJsonResponse<KeywordExtractionResult>(result.text),
    usage: extractUsage(result, DEFAULT_MODEL),
  };
}

// ============================================
// Content Expansion
// ============================================

export interface ExpandContentResult {
  expandedText: string;
  addedDetails: string[];
  wordCountOriginal: number;
  wordCountExpanded: number;
}

export async function expandContent(data: {
  selectedText: string;
  context: string;
  tone?: "formal" | "casual" | "professional";
}): Promise<AiResultWithUsage<ExpandContentResult>> {
  const prompt = buildExpandContentPrompt(data);
  const result = await generateContent(prompt, {
    ...DEFAULT_OPTIONS,
    maxTokens: 8192,
    useCache: false, // Don't cache creative content
  });
  return {
    data: parseJsonResponse<ExpandContentResult>(result.text),
    usage: extractUsage(result, DEFAULT_MODEL),
  };
}

// ============================================
// Content Summarization
// ============================================

export interface SummarizeContentResult {
  summary: string;
  keyPoints: string[];
  wordCount: number;
}

export async function summarizeContent(data: {
  content: string;
  targetLength?: "short" | "medium" | "long";
}): Promise<AiResultWithUsage<SummarizeContentResult>> {
  const prompt = buildSummarizeContentPrompt(data);
  const result = await generateContent(prompt, {
    ...DEFAULT_OPTIONS,
    maxTokens: 8192,
  });
  return {
    data: parseJsonResponse<SummarizeContentResult>(result.text),
    usage: extractUsage(result, DEFAULT_MODEL),
  };
}

// ============================================
// Content Rewriting
// ============================================

export interface RewriteContentResult {
  rewrittenText: string;
  changesApplied: string[];
  readabilityImproved: boolean;
}

export async function rewriteContent(data: {
  content: string;
  tone: "formal" | "casual" | "professional" | "simplified";
  preserveMeaning?: boolean;
}): Promise<AiResultWithUsage<RewriteContentResult>> {
  const prompt = buildRewriteContentPrompt({
    ...data,
    preserveMeaning: data.preserveMeaning ?? true,
  });
  const result = await generateContent(prompt, {
    ...DEFAULT_OPTIONS,
    maxTokens: 8192,
    useCache: false,
  });
  return {
    data: parseJsonResponse<RewriteContentResult>(result.text),
    usage: extractUsage(result, DEFAULT_MODEL),
  };
}

// ============================================
// Introduction Generation
// ============================================

export interface IntroductionSuggestion {
  text: string;
  hook: string;
  wordCount: number;
  hasKeyword: boolean;
}

export interface GenerateIntroResult {
  introductions: IntroductionSuggestion[];
  recommended: number;
}

export async function generateIntroduction(data: {
  title: string;
  content: string;
  focusKeyword?: string;
}): Promise<AiResultWithUsage<GenerateIntroResult>> {
  const prompt = buildGenerateIntroPrompt(data);
  const result = await generateContent(prompt, {
    ...DEFAULT_OPTIONS,
    maxTokens: 8192,
    useCache: false,
  });
  return {
    data: parseJsonResponse<GenerateIntroResult>(result.text),
    usage: extractUsage(result, DEFAULT_MODEL),
  };
}

// ============================================
// Conclusion Generation
// ============================================

export interface ConclusionSuggestion {
  text: string;
  hasSummary: boolean;
  hasCTA: boolean;
  wordCount: number;
}

export interface GenerateConclusionResult {
  conclusions: ConclusionSuggestion[];
  recommended: number;
}

export async function generateConclusion(data: {
  title: string;
  content: string;
  focusKeyword?: string;
}): Promise<AiResultWithUsage<GenerateConclusionResult>> {
  const prompt = buildGenerateConclusionPrompt(data);
  const result = await generateContent(prompt, {
    ...DEFAULT_OPTIONS,
    maxTokens: 8192,
    useCache: false,
  });
  return {
    data: parseJsonResponse<GenerateConclusionResult>(result.text),
    usage: extractUsage(result, DEFAULT_MODEL),
  };
}

// ============================================
// Grammar and Spelling Check
// ============================================

export interface GrammarError {
  type: "spelling" | "grammar" | "punctuation" | "style";
  original: string;
  correction: string;
  position: string;
  explanation: string;
}

export interface GrammarCheckResult {
  errors: GrammarError[];
  correctedText: string;
  summary: {
    spellingErrors: number;
    grammarErrors: number;
    punctuationErrors: number;
    styleIssues: number;
  };
  overallQuality: "excellent" | "good" | "needsImprovement";
}

export async function checkGrammar(data: {
  content: string;
}): Promise<AiResultWithUsage<GrammarCheckResult>> {
  const prompt = buildGrammarCheckPrompt(data);
  const result = await generateContent(prompt, {
    ...DEFAULT_OPTIONS,
    maxTokens: 8192,
    temperature: 0.3, // Lower temperature for accuracy
  });
  return {
    data: parseJsonResponse<GrammarCheckResult>(result.text),
    usage: extractUsage(result, DEFAULT_MODEL),
  };
}

// ============================================
// Image Alt Text Generation
// ============================================

export interface AltTextSuggestion {
  altText: string;
  length: number;
  isDescriptive: boolean;
  hasKeywords: boolean;
}

export interface GenerateAltTextResult {
  suggestions: AltTextSuggestion[];
  recommended: number;
}

export async function generateAltText(data: {
  articleTitle: string;
  articleContext: string;
  imagePosition: "featured" | "inline";
  existingCaption?: string;
}): Promise<AiResultWithUsage<GenerateAltTextResult>> {
  const prompt = buildAltTextPrompt(data);
  const result = await generateContent(prompt, {
    ...DEFAULT_OPTIONS,
    maxTokens: 8192,
  });
  return {
    data: parseJsonResponse<GenerateAltTextResult>(result.text),
    usage: extractUsage(result, DEFAULT_MODEL),
  };
}

// ============================================
// Related Topics Suggestion
// ============================================

export interface RelatedArticleSuggestion {
  title: string;
  angle: string;
  relevance: "high" | "medium";
}

export interface RelatedTopicsResult {
  relatedArticles: RelatedArticleSuggestion[];
  suggestedTags: string[];
  suggestedCategories: string[];
}

export async function suggestRelatedTopics(data: {
  title: string;
  content: string;
  existingCategories?: string[];
  existingTags?: string[];
}): Promise<AiResultWithUsage<RelatedTopicsResult>> {
  const prompt = buildRelatedTopicsPrompt(data);
  const result = await generateContent(prompt, {
    ...DEFAULT_OPTIONS,
    maxTokens: 8192,
  });
  return {
    data: parseJsonResponse<RelatedTopicsResult>(result.text),
    usage: extractUsage(result, DEFAULT_MODEL),
  };
}

// ============================================
// SEO Auto-Fix Functions
// ============================================

export interface AddedInternalLink {
  articleTitle: string;
  linkUrl: string;
  anchorText: string;
  position: string;
  reason: string;
}

export interface AutoFixInternalLinksResult {
  modifiedContent: string;
  addedLinks: AddedInternalLink[];
  linksCount: number;
}

export async function autoFixInternalLinks(data: {
  title: string;
  content: string;
  availableArticles: Array<{ title: string; slug: string; category: string }>;
  targetCount?: number;
}): Promise<AiResultWithUsage<AutoFixInternalLinksResult>> {
  const prompt = buildAutoFixInternalLinksPrompt(data);
  const result = await generateContent(prompt, {
    ...DEFAULT_OPTIONS,
    maxTokens: 16384, // Need more tokens for content modification
    temperature: 0.5,
    useCache: false,
  });
  return {
    data: parseJsonResponse<AutoFixInternalLinksResult>(result.text),
    usage: extractUsage(result, DEFAULT_MODEL),
  };
}

export interface AddedExternalLink {
  url: string;
  anchorText: string;
  sourceType: "wikipedia" | "government" | "organization" | "news" | "research";
  position: string;
  reason: string;
}

export interface AutoFixExternalLinksResult {
  modifiedContent: string;
  addedLinks: AddedExternalLink[];
  linksCount: number;
}

export async function autoFixExternalLinks(data: {
  title: string;
  content: string;
  targetCount?: number;
}): Promise<AiResultWithUsage<AutoFixExternalLinksResult>> {
  const prompt = buildAutoFixExternalLinksPrompt(data);
  const result = await generateContent(prompt, {
    ...DEFAULT_OPTIONS,
    maxTokens: 16384,
    temperature: 0.5,
    useCache: false,
  });
  return {
    data: parseJsonResponse<AutoFixExternalLinksResult>(result.text),
    usage: extractUsage(result, DEFAULT_MODEL),
  };
}

export interface SplitParagraphInfo {
  originalPosition: string;
  originalWordCount: number;
  newParagraphsCount: number;
  splitReason: string;
}

export interface AutoFixLongParagraphsResult {
  modifiedContent: string;
  splitParagraphs: SplitParagraphInfo[];
  totalParagraphsModified: number;
}

export async function autoFixLongParagraphs(data: {
  content: string;
  maxWords?: number;
}): Promise<AiResultWithUsage<AutoFixLongParagraphsResult>> {
  const prompt = buildAutoFixLongParagraphsPrompt(data);
  const result = await generateContent(prompt, {
    ...DEFAULT_OPTIONS,
    maxTokens: 16384,
    temperature: 0.5,
    useCache: false,
  });
  return {
    data: parseJsonResponse<AutoFixLongParagraphsResult>(result.text),
    usage: extractUsage(result, DEFAULT_MODEL),
  };
}

export interface AutoFixSeoIssuesChanges {
  internalLinksAdded?: AddedInternalLink[];
  externalLinksAdded?: AddedExternalLink[];
  paragraphsSplit?: number | SplitParagraphInfo[];
}

export interface AutoFixSeoIssuesResult {
  modifiedContent: string;
  changes: AutoFixSeoIssuesChanges;
  summary: string;
}

export async function autoFixSeoIssues(data: {
  title: string;
  content: string;
  issuesToFix: Array<"internal-links" | "external-links" | "long-paragraphs">;
  availableArticles?: Array<{ title: string; slug: string; category: string }>;
}): Promise<AiResultWithUsage<AutoFixSeoIssuesResult>> {
  const prompt = buildAutoFixSeoIssuesPrompt(data);
  const result = await generateContent(prompt, {
    ...DEFAULT_OPTIONS,
    maxTokens: 16384,
    temperature: 0.5,
    useCache: false,
  });
  return {
    data: parseJsonResponse<AutoFixSeoIssuesResult>(result.text),
    usage: extractUsage(result, DEFAULT_MODEL),
  };
}

// ============================================
// Error Handling Wrapper
// ============================================

export interface AiResult<T> {
  success: boolean;
  data?: T;
  usage?: TokenUsage;
  error?: {
    code: string;
    message: string;
  };
}

export async function safeAiCall<T>(
  fn: () => Promise<AiResultWithUsage<T>>
): Promise<AiResult<T>> {
  try {
    const result = await fn();
    return { success: true, data: result.data, usage: result.usage };
  } catch (error) {
    if (error instanceof GeminiError) {
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      };
    }
    return {
      success: false,
      error: {
        code: "UNKNOWN",
        message: error instanceof Error ? error.message : "خطأ غير معروف",
      },
    };
  }
}
