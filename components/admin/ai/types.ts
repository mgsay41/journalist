/**
 * AI Panel Types
 *
 * Shared types for AI panel components.
 * Phase 2 Frontend Audit - Split from AiPanel for better maintainability
 */

export type TabId =
  | "seo"
  | "meta"
  | "keywords"
  | "content"
  | "grammar";

export interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

export const TABS: Tab[] = [
  { id: "seo", label: "SEO", icon: "📊" },
  { id: "meta", label: "ميتا", icon: "🏷️" },
  { id: "keywords", label: "كلمات مفتاحية", icon: "🔑" },
  { id: "content", label: "المحتوى", icon: "✍️" },
  { id: "grammar", label: "التدقيق", icon: "📝" },
];

// SEO Suggestion type
export interface SeoSuggestion {
  type: string;
  priority: "high" | "medium" | "low";
  issue: string;
  suggestion: string;
  example?: string;
}

// Meta suggestion types
export interface MetaTitleSuggestion {
  title: string;
  length: number;
  hasKeyword: boolean;
  reason: string;
}

export interface MetaDescriptionSuggestion {
  description: string;
  length: number;
  hasKeyword: boolean;
  hasCTA: boolean;
  reason: string;
}

// Keyword type
export interface ExtractedKeyword {
  keyword: string;
  relevance: "high" | "medium" | "low";
  density: number;
  type: "primary" | "secondary" | "long-tail";
}

// Grammar error type
export interface GrammarError {
  type: string;
  original: string;
  correction: string;
  explanation: string;
}
