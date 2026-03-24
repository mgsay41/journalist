/**
 * AI Module - Main exports
 *
 * Usage:
 * import { getSeoSuggestions, generateMetaTitle } from '@/lib/ai';
 */

// Re-export all service functions
export {
  getSeoSuggestions,
  generateMetaTitle,
  generateMetaDescription,
  extractKeywords,
  expandContent,
  summarizeContent,
  rewriteContent,
  generateIntroduction,
  generateConclusion,
  checkGrammar,
  generateAltText,
  suggestRelatedTopics,
  autoFixInternalLinks,
  autoFixExternalLinks,
  autoFixLongParagraphs,
  autoFixSeoIssues,
  safeAiCall,
  parseJsonResponse,
} from "./service";

// Re-export types
export type {
  SeoSuggestion,
  SeoSuggestionsResult,
  MetaTitleSuggestion,
  MetaTitleResult,
  MetaDescriptionSuggestion,
  MetaDescriptionResult,
  ExtractedKeyword,
  KeywordExtractionResult,
  ExpandContentResult,
  SummarizeContentResult,
  RewriteContentResult,
  IntroductionSuggestion,
  GenerateIntroResult,
  ConclusionSuggestion,
  GenerateConclusionResult,
  GrammarError,
  GrammarCheckResult,
  AltTextSuggestion,
  GenerateAltTextResult,
  RelatedArticleSuggestion,
  RelatedTopicsResult,
  AddedInternalLink,
  AutoFixInternalLinksResult,
  AddedExternalLink,
  AutoFixExternalLinksResult,
  SplitParagraphInfo,
  AutoFixLongParagraphsResult,
  AutoFixSeoIssuesChanges,
  AutoFixSeoIssuesResult,
  AiResult,
  AiResultWithUsage,
  TokenUsage,
} from "./service";

// Re-export Gemini utilities
export {
  isGeminiConfigured,
  getRateLimitStatus,
  clearCache,
  getModelInfo,
  GEMINI_MODELS,
  GeminiError,
} from "../gemini";

export type { GeminiModelId, GenerateOptions, GenerateResult } from "../gemini";

// Re-export usage tracking functions
export {
  recordAiUsage,
  calculateCost,
  getUserUsageStats,
  getAllUsersStats,
  getRecentUsage,
} from "./usage";

export type {
  AiFeature,
  UsageRecord,
  UserUsageStats,
  AllUsersStats,
} from "./usage";

// Re-export article completion service
export {
  completeArticle,
  validateArticleForCompletion,
  completeArticlePhase1,
  completeArticlePhase2,
  completeArticlePhase3,
  rewriteArticle,
} from "./article-completion";

export type {
  CompleteArticleResult,
  CompleteArticleInput,
  SuggestedCategory,
  SuggestedTag,
  MetaTitleOption,
  MetaDescriptionOption,
  ContentAnalysis,
  GrammarIssue as ArticleGrammarIssue,
  SeoAnalysis as ArticleSeoAnalysis,
  KeywordsPhaseResult,
  MetaPhaseResult,
  RewriteArticleInput,
  RewriteArticleResult,
} from "./article-completion";
