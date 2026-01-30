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
}

// SEO Thresholds
export const SEO_THRESHOLDS = {
  title: {
    minLength: 40,
    maxLength: 60,
    optimalMin: 45,
    optimalMax: 55,
  },
  metaDescription: {
    minLength: 120,
    maxLength: 160,
    optimalMin: 130,
    optimalMax: 150,
  },
  content: {
    minWords: 300,
    goodWords: 600,
    excellentWords: 1000,
  },
  headings: {
    minH2: 2,
    minH3: 1,
  },
  images: {
    minRequired: 1,
    altTextRequired: true,
  },
  links: {
    minInternal: 1,
    minExternal: 1,
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
    maxParagraphLength: 150,
  },
};

// Score thresholds for status
export const SCORE_THRESHOLDS = {
  good: 70,
  needsImprovement: 50,
};
