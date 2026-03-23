/**
 * Article Completion Service
 *
 * Provides comprehensive AI-powered article analysis and metadata generation.
 * This is the main service for the "Complete Article" feature.
 */

import {
  generateContent,
  GeminiError,
  type GenerateOptions,
  type GeminiModelId,
} from "../gemini";

import {
  ARABIC_SYSTEM_INSTRUCTION,
  buildCompleteArticlePrompt,
} from "./prompts";

import type { TokenUsage, AiResultWithUsage } from "./service";

// Default model for article completion
const DEFAULT_MODEL: GeminiModelId = "gemini-2.5-flash";

// Default options
const DEFAULT_OPTIONS: GenerateOptions = {
  model: DEFAULT_MODEL,
  temperature: 0.7,
  useCache: false, // Don't cache article completion results
  systemInstruction: ARABIC_SYSTEM_INSTRUCTION,
  maxTokens: 16384, // Higher token limit for comprehensive analysis
};

// ============================================
// Types
// ============================================

export interface SuggestedCategory {
  name: string;
  isExisting: boolean;
  confidence: number;
  reason: string;
  id?: string; // Populated for existing categories
}

export interface SuggestedTag {
  name: string;
  isExisting: boolean;
  relevance: "high" | "medium" | "low";
  id?: string; // Populated for existing tags
}

export interface MetaTitleOption {
  title: string;
  length: number;
  score: number;
  hasKeyword: boolean;
}

export interface TitleSuggestion {
  title: string;
  improvements: string[];
  score: number;
  hasPowerWords: boolean;
  hasNumber: boolean;
  hasKeywordAtStart: boolean;
}

export interface MetaDescriptionOption {
  description: string;
  length: number;
  score: number;
  hasKeyword: boolean;
  hasCTA: boolean;
}

export interface ContentAnalysis {
  hasStrongIntro: boolean;
  hasConclusion: boolean;
  suggestedIntro: string | null;
  suggestedConclusion: string | null;
  tone: "formal" | "professional" | "casual";
  targetAudience: string;
}

export interface GrammarIssue {
  type: "spelling" | "grammar" | "punctuation" | "style";
  original: string;
  correction: string;
  explanation: string;
}

export interface SeoAnalysis {
  score: number;
  status: "good" | "needs-improvement" | "poor";
  topIssues: string[];
}

export interface CompleteArticleResult {
  // Keywords
  focusKeyword: string;
  secondaryKeywords: string[];

  // Classification
  suggestedCategories: SuggestedCategory[];
  suggestedTags: SuggestedTag[];

  // SEO
  slug: string;
  titleSuggestions: TitleSuggestion[];
  metaTitles: MetaTitleOption[];
  metaDescriptions: MetaDescriptionOption[];

  // Content
  excerpt: string;
  contentAnalysis: ContentAnalysis;

  // Grammar
  grammarIssues: GrammarIssue[];

  // SEO Score
  seoAnalysis: SeoAnalysis;
}

export interface CompleteArticleInput {
  title: string;
  content: string;
  availableCategories: Array<{ id: string; name: string }>;
  availableTags: Array<{ id: string; name: string }>;
}

// ============================================
// Helper Functions
// ============================================

function parseJsonResponse<T>(text: string): T {
  let jsonStr = text.trim();

  // Remove markdown code block wrapper if present
  if (jsonStr.startsWith("```")) {
    const firstNewline = jsonStr.indexOf("\n");
    if (firstNewline !== -1) {
      jsonStr = jsonStr.substring(firstNewline + 1);
    }
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

    console.error("=== AI Response Parse Error ===");
    console.error("Original length:", text.length);
    console.error("Cleaned jsonStr:", jsonStr.substring(0, 1500));
    throw new GeminiError(
      "فشل في معالجة رد الذكاء الاصطناعي",
      "INVALID_RESPONSE"
    );
  }
}

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

/**
 * Normalize Arabic text for comparison (remove diacritics, normalize spaces)
 */
function normalizeArabic(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Remove Arabic diacritics (tashkeel)
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // Normalize different forms of alef
    .replace(/[أإآٱ]/g, 'ا')
    // Normalize taa marbuta and haa
    .replace(/ة/g, 'ه')
    // Normalize yaa
    .replace(/[ىئ]/g, 'ي')
    // Normalize waw with hamza
    .replace(/ؤ/g, 'و')
    // Remove kashida (tatweel)
    .replace(/ـ/g, '')
    // Remove extra spaces
    .replace(/\s+/g, ' ');
}

/**
 * Calculate similarity score between two strings (0-1)
 */
function stringSimilarity(str1: string, str2: string): number {
  const s1 = normalizeArabic(str1);
  const s2 = normalizeArabic(str2);

  if (s1 === s2) return 1;

  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    const shorter = s1.length < s2.length ? s1 : s2;
    const longer = s1.length >= s2.length ? s1 : s2;
    return shorter.length / longer.length;
  }

  // Simple word overlap similarity
  const words1 = s1.split(' ');
  const words2 = s2.split(' ');
  const commonWords = words1.filter(w => words2.includes(w));

  if (commonWords.length === 0) return 0;

  return (commonWords.length * 2) / (words1.length + words2.length);
}

/**
 * Match AI-suggested categories with existing ones (more flexible matching)
 */
function matchCategories(
  suggestions: SuggestedCategory[],
  available: Array<{ id: string; name: string }>
): SuggestedCategory[] {
  return suggestions.map(suggestion => {
    const normalizedSuggestion = normalizeArabic(suggestion.name);

    // Try exact match first
    let match = available.find(
      item => item.name === suggestion.name
    );

    if (!match) {
      // Try case-insensitive match
      match = available.find(
        item => item.name.toLowerCase() === suggestion.name.toLowerCase()
      );
    }

    if (!match) {
      // Try normalized Arabic match (handles diacritics, alef forms, etc.)
      match = available.find(
        item => normalizeArabic(item.name) === normalizedSuggestion
      );
    }

    if (!match) {
      // Try partial match (suggestion contains or is contained in available)
      match = available.find(item => {
        const normalizedItem = normalizeArabic(item.name);
        return normalizedItem.includes(normalizedSuggestion) ||
               normalizedSuggestion.includes(normalizedItem);
      });
    }

    if (!match) {
      // Try fuzzy match with high similarity threshold (0.8+)
      let bestMatch: { item: { id: string; name: string }; score: number } | null = null;
      for (const item of available) {
        const score = stringSimilarity(suggestion.name, item.name);
        if (score >= 0.8 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { item, score };
        }
      }
      if (bestMatch) {
        match = bestMatch.item;
      }
    }

    return {
      ...suggestion,
      isExisting: !!match,
      id: match?.id,
      // Use the exact name from database if matched
      name: match ? match.name : suggestion.name,
    };
  });
}

/**
 * Match AI-suggested tags with existing ones (more flexible matching)
 */
function matchTags(
  suggestions: SuggestedTag[],
  available: Array<{ id: string; name: string }>
): SuggestedTag[] {
  return suggestions.map(suggestion => {
    const normalizedSuggestion = normalizeArabic(suggestion.name);

    // Try exact match first
    let match = available.find(
      item => item.name === suggestion.name
    );

    if (!match) {
      // Try case-insensitive match
      match = available.find(
        item => item.name.toLowerCase() === suggestion.name.toLowerCase()
      );
    }

    if (!match) {
      // Try normalized Arabic match (handles diacritics, alef forms, etc.)
      match = available.find(
        item => normalizeArabic(item.name) === normalizedSuggestion
      );
    }

    if (!match) {
      // Try fuzzy match with high similarity threshold (0.85+ for tags)
      let bestMatch: { item: { id: string; name: string }; score: number } | null = null;
      for (const item of available) {
        const score = stringSimilarity(suggestion.name, item.name);
        if (score >= 0.85 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { item, score };
        }
      }
      if (bestMatch) {
        match = bestMatch.item;
      }
    }

    return {
      ...suggestion,
      isExisting: !!match,
      id: match?.id,
      // Use the exact name from database if matched
      name: match ? match.name : suggestion.name,
    };
  });
}

// ============================================
// Main Function
// ============================================

/**
 * Complete article analysis - generates all metadata in one call
 *
 * This is the main function that powers the "Complete Article" button.
 * It analyzes the article content and generates:
 * - Focus keyword and secondary keywords
 * - Category suggestions (matched with existing categories)
 * - Tag suggestions (matched with existing tags)
 * - SEO-friendly English slug
 * - Multiple meta title options
 * - Multiple meta description options
 * - Article excerpt
 * - Content quality analysis (intro/conclusion suggestions)
 * - Grammar and spelling issues
 * - SEO score analysis
 */
export async function completeArticle(
  input: CompleteArticleInput
): Promise<AiResultWithUsage<CompleteArticleResult>> {
  const prompt = buildCompleteArticlePrompt({
    title: input.title,
    content: input.content,
    availableCategories: input.availableCategories,
    availableTags: input.availableTags,
  });

  const result = await generateContent(prompt, DEFAULT_OPTIONS);

  // Parse the response
  const parsed = parseJsonResponse<CompleteArticleResult>(result.text);

  // Match categories and tags with existing ones
  if (parsed.suggestedCategories) {
    parsed.suggestedCategories = matchCategories(
      parsed.suggestedCategories,
      input.availableCategories
    );
  }

  if (parsed.suggestedTags) {
    parsed.suggestedTags = matchTags(
      parsed.suggestedTags,
      input.availableTags
    );
  }

  // Ensure arrays exist
  parsed.titleSuggestions = parsed.titleSuggestions || [];
  parsed.metaTitles = parsed.metaTitles || [];
  parsed.metaDescriptions = parsed.metaDescriptions || [];
  parsed.secondaryKeywords = parsed.secondaryKeywords || [];
  parsed.grammarIssues = parsed.grammarIssues || [];
  parsed.suggestedCategories = parsed.suggestedCategories || [];
  parsed.suggestedTags = parsed.suggestedTags || [];

  // Ensure content analysis exists
  if (!parsed.contentAnalysis) {
    parsed.contentAnalysis = {
      hasStrongIntro: true,
      hasConclusion: true,
      suggestedIntro: null,
      suggestedConclusion: null,
      tone: "professional",
      targetAudience: "",
    };
  }

  // Ensure SEO analysis exists
  if (!parsed.seoAnalysis) {
    parsed.seoAnalysis = {
      score: 70,
      status: "needs-improvement",
      topIssues: [],
    };
  }

  return {
    data: parsed,
    usage: extractUsage(result, DEFAULT_MODEL),
  };
}

// ============================================
// Validation
// ============================================

/**
 * Validate article content before completion
 */
export function validateArticleForCompletion(title: string, content: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!title.trim()) {
    errors.push("العنوان مطلوب");
  }

  if (title.length > 200) {
    errors.push("العنوان طويل جداً (الحد الأقصى 200 حرف)");
  }

  const wordCount = content.replace(/<[^>]*>/g, "").split(/\s+/).filter(w => w.length > 0).length;

  if (wordCount < 50) {
    errors.push("المحتوى قصير جداً (الحد الأدنى 50 كلمة)");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
