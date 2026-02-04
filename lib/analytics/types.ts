// Analytics types and interfaces

export interface ArticleStats {
  id: string;
  title: string;
  slug: string;
  views: number;
  publishedAt: Date | null;
  readingTime: number | null;
  categories: Array<{ id: string; name: string; slug: string }>;
}

export interface AnalyticsOverview {
  totalViews: number;
  viewsThisMonth: number;
  viewsThisWeek: number;
  viewsToday: number;
  totalArticles: number;
  publishedArticles: number;
  averageReadingTime: number;
  averageSeoScore: number;
}

export interface ViewsChartData {
  date: string;
  views: number;
}

export interface StatusDistribution {
  status: string;
  count: number;
  percentage: number;
}

export interface CategoryDistribution {
  id: string;
  name: string;
  slug: string;
  articleCount: number;
  percentage: number;
}

export interface TagStats {
  id: string;
  name: string;
  slug: string;
  articleCount: number;
}

export interface DateRange {
  from?: Date;
  to?: Date;
}

export interface TopArticlesParams {
  limit?: number;
  dateRange?: DateRange;
  categoryId?: string;
  tagId?: string;
}
