/**
 * Core type definitions for the Arabic Journalist CMS
 */

// Article Status Types
export type ArticleStatus = 'draft' | 'published' | 'scheduled' | 'archived';

// Article Types
export interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string | null;
  featuredImageId?: string | null;
  status: ArticleStatus;
  publishedAt?: Date | null;
  scheduledAt?: Date | null;
  authorId: string;
  views: number;
  seoScore: number;
  metaTitle?: string | null;
  metaDescription?: string | null;
  focusKeyword?: string | null;
  createdAt: Date;
  updatedAt: Date;
  categories?: Category[];
  tags?: Tag[];
  featuredImage?: Image;
}

// Category Types
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  parentId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  children?: Category[];
  parent?: Category;
}

// Tag Types
export interface Tag {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
}

// Image Types
export interface Image {
  id: string;
  url: string;
  thumbnailUrl?: string | null;
  mediumUrl?: string | null;
  largeUrl?: string | null;
  altText?: string | null;
  caption?: string | null;
  filename: string;
  fileSize: number;
  width: number;
  height: number;
  mimeType: string;
  uploadedAt: Date;
}

// Video Types
export interface Video {
  id: string;
  youtubeUrl: string;
  youtubeId: string;
  title?: string | null;
  thumbnail: string;
  privacyMode: boolean;
  autoplay: boolean;
  startTime: number;
  position: number;
  articleId: string;
  createdAt: Date;
}

// SEO Analysis Types
export interface SeoAnalysis {
  id: string;
  articleId: string;
  score: number;
  suggestions: SeoSuggestion[];
  criteria: SeoCriteria;
  analyzedAt: Date;
}

export interface SeoSuggestion {
  type: 'title' | 'meta' | 'content' | 'technical';
  priority: 'high' | 'medium' | 'low';
  message: string;
  action?: string;
}

export interface SeoCriteria {
  titleLength: boolean;
  titleHasKeyword: boolean;
  metaLength: boolean;
  metaHasKeyword: boolean;
  wordCount: boolean;
  keywordDensity: boolean;
  headersUsed: boolean;
  imagesHaveAlt: boolean;
  internalLinks: boolean;
  externalLinks: boolean;
  uniqueSlug: boolean;
  featuredImage: boolean;
}

// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

// Session Types
export interface Session {
  id: string;
  expiresAt: Date;
  token: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Form Types
export interface ArticleFormData {
  title: string;
  slug?: string;
  content: string;
  excerpt?: string;
  featuredImageId?: string;
  status: ArticleStatus;
  publishedAt?: Date;
  scheduledAt?: Date;
  categoryIds?: string[];
  tagIds?: string[];
  metaTitle?: string;
  metaDescription?: string;
  focusKeyword?: string;
}

export interface CategoryFormData {
  name: string;
  slug?: string;
  description?: string;
  parentId?: string;
}

export interface TagFormData {
  name: string;
  slug?: string;
}

// ─── Prisma Json field types ────────────────────────────────────────────────
// These mirror the runtime shape of Prisma `Json` columns so callers can type-
// assert instead of using `any`.

/** Shape stored in Article.aiCompletionData */
export interface AiCompletionData {
  focusKeyword: string;
  secondaryKeywords: string[];
  slug: string;
  metaTitles: Array<{ text: string; length: number }>;
  metaDescriptions: Array<{ text: string; length: number }>;
  excerpt: string;
  suggestedCategories: Array<{ id?: string; name: string }>;
  suggestedTags: Array<{ id?: string; name: string }>;
  availableCategories: Array<{ id: string; name: string }>;
  availableTags: Array<{ id: string; name: string }>;
  titleSuggestions?: Array<{ text: string; score: number }>;
  contentAnalysis: Record<string, unknown>;
  grammarIssues: Array<{ text: string; suggestion: string; type: string }>;
  seoAnalysis: Record<string, unknown>;
}

/** Shape stored in Notification.metadata */
export interface NotificationMetadata {
  articleId?: string;
  articleTitle?: string;
  url?: string;
  [key: string]: unknown;
}

// ─── API Response Types ───────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Pagination Types
export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Filter Types
export interface ArticleFilters {
  status?: ArticleStatus;
  categoryId?: string;
  tagId?: string;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
}
