// SEO Analysis Types

export type CriterionStatus = 'passed' | 'warning' | 'failed';

export interface SeoCriterion {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  weight: number;
  status: CriterionStatus;
  score: number;
  maxScore: number;
  value?: string | number;
  recommendation?: string;
  recommendationAr?: string;
}

export interface SeoCategory {
  id: string;
  name: string;
  nameAr: string;
  criteria: SeoCriterion[];
  score: number;
  maxScore: number;
}

export interface SeoAnalysisResult {
  score: number;
  maxScore: number;
  percentage: number;
  status: 'good' | 'needs-improvement' | 'poor';
  categories: SeoCategory[];
  criteria: SeoCriterion[];
  suggestions: SeoSuggestion[];
  analyzedAt: Date;
}

export interface SeoSuggestion {
  id: string;
  priority: 'high' | 'medium' | 'low';
  criterionId: string;
  message: string;
  messageAr: string;
  action?: string;
  actionAr?: string;
}

export interface ArticleContent {
  title: string;
  content: string;
  excerpt?: string;
  metaTitle?: string;
  metaDescription?: string;
  focusKeyword?: string;
  slug?: string;
  hasFeaturedImage: boolean;
  imageCount: number;
  imagesWithAlt: number;
  authorName?: string;
}

// SEO Thresholds
export const SEO_THRESHOLDS = {
  title: {
    minLength: 40,
    maxLength: 65,
    optimalMin: 50,
    optimalMax: 60,
  },
  metaDescription: {
    minLength: 120,
    maxLength: 165,
    optimalMin: 140,
    optimalMax: 160,
  },
  content: {
    minWords: 300,
    goodWords: 800,
    excellentWords: 1500,
  },
  headings: {
    minH2: 3,
    minH3: 1,
  },
  images: {
    minRequired: 1,
    altTextRequired: true,
  },
  links: {
    minInternal: 3,
    minExternal: 2,
  },
  keyword: {
    minDensity: 0.5, // percentage
    maxDensity: 2.5, // percentage
    optimalDensity: 1.5,
    inTitle: true,
    inFirstParagraph: true,
    inMetaDescription: true,
  },
  readability: {
    maxSentenceLength: 25,
    idealSentenceMin: 12,
    idealSentenceMax: 20,
    maxParagraphLength: 120,
  },
  eatSignals: {
    minQuotes: 1,
    minExternalAuthority: 1,
  },
};

// Score thresholds for status (based on RankMath criteria)
// Green (81-100): Ready to publish
// Yellow (51-80): Needs improvement
// Red (0-50): Poorly optimized
export const SCORE_THRESHOLDS = {
  good: 81,
  needsImprovement: 51,
};

// SEO Score Weights (Total: 100 points)
// Based on ARTICLE_UX_IMPROVEMENT_PLAN.md
export const SEO_WEIGHTS = {
  // Basic SEO Tests (40 points)
  basicSeo: {
    keywordInTitle: 5,
    keywordInMetaDescription: 5,
    keywordInUrl: 5,
    keywordAtBeginningOfContent: 5,
    keywordInContent: 5,
    contentLength: 10,
    keywordUniqueness: 5,
  },
  // Additional SEO Tests (25 points)
  additionalSeo: {
    keywordInSubheading: 5,
    keywordInImageAlt: 5,
    keywordDensity: 5,
    urlLength: 3,
    externalLinks: 3,
    internalLinks: 4,
  },
  // Title Readability Tests (15 points)
  titleReadability: {
    keywordAtBeginningOfTitle: 4,
    sentimentInTitle: 4,
    powerWordsInTitle: 4,
    numberInTitle: 3,
  },
  // Content Readability Tests (16 points — reduced to make room for E-E-A-T)
  contentReadability: {
    tableOfContents: 3,
    shortParagraphs: 5,
    mediaPresence: 5,
    readabilityScore: 3,
  },
  // E-E-A-T Tests (10 points)
  eeat: {
    authorMention: 4,
    quotePresence: 3,
    authorityExternalLinks: 3,
  },
};
