/**
 * Inline Marks Conversion Utilities
 * 
 * Converts AI-generated grammar issues and SEO suggestions
 * to TipTap editor mark format for inline accept/reject functionality
 */

import type { GrammarIssue, SeoAnalysis } from './article-completion';
import type { SeoSuggestionType } from '@/components/admin/editor/SeoSuggestionExtension';

export interface GrammarMark {
  id: string;
  type: 'spelling' | 'grammar' | 'punctuation' | 'style';
  original: string;
  correction: string;
  explanation: string;
}

export interface SeoMark {
  id: string;
  type: SeoSuggestionType;
  original: string;
  suggestedText: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

export interface SeoSuggestionForMark {
  type: string;
  issue: string;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
  autoFixable?: boolean;
  fixData?: {
    action: string;
    value: string;
  };
}

export function convertGrammarIssuesToMarks(issues: GrammarIssue[]): GrammarMark[] {
  return issues.map((issue, index) => ({
    id: `grammar-${index}`,
    type: issue.type,
    original: issue.original,
    correction: issue.correction,
    explanation: issue.explanation,
  }));
}

export function convertSeoSuggestionsToMarks(
  suggestions: SeoSuggestionForMark[],
  content: string
): SeoMark[] {
  const marks: SeoMark[] = [];
  let markId = 0;

  for (const suggestion of suggestions) {
    if (!suggestion.autoFixable || !suggestion.fixData) continue;

    if (suggestion.fixData.action === 'replace-text' && suggestion.fixData.value) {
      const typeMap: Record<string, SeoSuggestionType> = {
        'add-keyword': 'add-keyword',
        'improve-heading': 'improve-heading',
        'add-link': 'add-link',
        'shorten-paragraph': 'shorten-paragraph',
        'improve-readability': 'improve-readability',
        'add-alt-text': 'add-alt-text',
      };

      const originalText = extractOriginalText(content, suggestion);
      if (originalText) {
        marks.push({
          id: `seo-${markId++}`,
          type: typeMap[suggestion.type] || 'improve-readability',
          original: originalText,
          suggestedText: suggestion.fixData.value,
          reason: suggestion.suggestion,
          priority: suggestion.priority,
        });
      }
    }
  }

  return marks;
}

function extractOriginalText(content: string, suggestion: SeoSuggestionForMark): string | null {
  const plainContent = content.replace(/<[^>]*>/g, '');

  switch (suggestion.type) {
    case 'keyword-intro': {
      const firstParagraphMatch = plainContent.match(/^(.{50,200}?)[.!؟]/);
      return firstParagraphMatch ? firstParagraphMatch[0] : plainContent.substring(0, 100);
    }
    case 'keyword-heading': {
      const headingMatch = content.match(/<h[23][^>]*>(.*?)<\/h[23]>/i);
      return headingMatch ? headingMatch[1].replace(/<[^>]*>/g, '') : null;
    }
    case 'paragraph-length': {
      const paragraphs = plainContent.split(/\n\n+/);
      const longParagraph = paragraphs.find(p => p.split(/\s+/).length > 120);
      return longParagraph ? longParagraph.substring(0, 200) : null;
    }
    default:
      return null;
  }
}

export function calculateReadabilityGrade(content: string): 'easy' | 'medium' | 'hard' {
  const plainContent = content.replace(/<[^>]*>/g, '');
  const sentences = plainContent.split(/[.!؟؟]+/).filter(s => s.trim().length > 0);
  const words = plainContent.split(/\s+/).filter(w => w.length > 0);

  if (sentences.length === 0 || words.length === 0) return 'medium';

  const avgWordsPerSentence = words.length / sentences.length;

  if (avgWordsPerSentence <= 15) return 'easy';
  if (avgWordsPerSentence <= 25) return 'medium';
  return 'hard';
}

export function countPassiveVoice(content: string): number {
  const plainContent = content.replace(/<[^>]*>/g, '');
  const passivePatterns = [
    /تم\s+\S+/g,
    /تمت\s+\S+/g,
    /تموا\s+\S+/g,
    /يُفعل/g,
    /تُفعل/g,
    /يُكتب/g,
    /تُكتب/g,
    /يُقال/g,
    /تُقال/g,
    /أُعلن/g,
    /يُعلن/g,
    /تُعلن/g,
  ];

  let count = 0;
  for (const pattern of passivePatterns) {
    const matches = plainContent.match(pattern);
    if (matches) {
      count += matches.length;
    }
  }

  return count;
}

export function getReadabilityLabel(grade: 'easy' | 'medium' | 'hard'): string {
  const labels = {
    easy: 'سهل القراءة',
    medium: 'متوسط',
    hard: 'صعب',
  };
  return labels[grade];
}

export function getReadabilityColor(grade: 'easy' | 'medium' | 'hard'): string {
  const colors = {
    easy: 'text-success',
    medium: 'text-warning',
    hard: 'text-danger',
  };
  return colors[grade];
}
