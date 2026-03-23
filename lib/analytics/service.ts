// Analytics service functions

import { prisma } from "@/lib/prisma";
import type {
  AnalyticsOverview,
  ArticleStats,
  CategoryDistribution,
  DateRange,
  StatusDistribution,
  TagStats,
  TopArticlesParams,
  ViewsChartData,
} from "./types";

/**
 * Increment article view count
 * Prevents duplicate counts from same session using cookies
 */
export async function recordArticleView(
  articleId: string,
  sessionId?: string
): Promise<{ success: boolean; views: number }> {
  try {
    // If sessionId provided, check if already viewed
    if (sessionId) {
      const existingView = await prisma.articleView.findFirst({
        where: {
          articleId,
          sessionId,
        },
      });

      if (existingView) {
        // Already viewed, return current count
        const article = await prisma.article.findUnique({
          where: { id: articleId },
          select: { views: true },
        });
        return { success: false, views: article?.views || 0 };
      }
    }

    // Record the view
    if (sessionId) {
      await prisma.articleView.create({
        data: {
          articleId,
          sessionId,
        },
      });
    }

    // Increment article view count
    const article = await prisma.article.update({
      where: { id: articleId },
      data: {
        views: {
          increment: 1,
        },
      },
      select: {
        views: true,
      },
    });

    return { success: true, views: article.views };
  } catch (error) {
    console.error("Error recording article view:", error);
    return { success: false, views: 0 };
  }
}

/**
 * Get analytics overview stats with optional time period filtering
 * @param period - Time period for trend comparison: 'today' | 'week' | 'month' | 'all'
 */
export async function getAnalyticsOverview(period: 'today' | 'week' | 'month' | 'all' = 'all'): Promise<AnalyticsOverview & { trends?: AnalyticsTrends }> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  // Create new Date instances to avoid mutating the original
  const weekDate = new Date(now);
  weekDate.setDate(weekDate.getDate() - weekDate.getDay());
  const startOfWeek = new Date(weekDate.setHours(0, 0, 0, 0));
  const startOfDay = new Date(new Date(now).setHours(0, 0, 0, 0));

  // Calculate previous period for trend comparison
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const previousWeekStart = new Date(startOfWeek);
  previousWeekStart.setDate(previousWeekStart.getDate() - 7);
  const previousWeekEnd = new Date(startOfWeek);
  previousWeekEnd.setDate(previousWeekEnd.getDate() - 1);
  const previousDayStart = new Date(startOfDay);
  previousDayStart.setDate(previousDayStart.getDate() - 1);
  const previousDayEnd = new Date(startOfDay);
  previousDayEnd.setMilliseconds(previousDayEnd.getMilliseconds() - 1);

  const [
    totalViewsResult,
    viewsThisMonthResult,
    viewsThisWeekResult,
    viewsTodayResult,
    totalArticles,
    publishedArticles,
    avgReadingTimeResult,
    avgSeoScoreResult,
    // Previous period data for trends
    prevMonthViewsResult,
    prevWeekViewsResult,
    prevDayViewsResult,
    prevMonthArticlesResult,
    prevWeekArticlesResult,
    prevDayArticlesResult,
  ] = await Promise.all([
    // Total views (all time)
    prisma.article.aggregate({
      _sum: { views: true },
      where: { status: "published" },
    }),

    // Views this month
    prisma.article.aggregate({
      _sum: { views: true },
      where: {
        status: "published",
        publishedAt: { gte: startOfMonth },
      },
    }),

    // Views this week
    prisma.article.aggregate({
      _sum: { views: true },
      where: {
        status: "published",
        publishedAt: { gte: startOfWeek },
      },
    }),

    // Views today
    prisma.article.aggregate({
      _sum: { views: true },
      where: {
        status: "published",
        publishedAt: { gte: startOfDay },
      },
    }),

    // Total articles
    prisma.article.count(),

    // Published articles
    prisma.article.count({
      where: { status: "published" },
    }),

    // Average reading time
    prisma.article.aggregate({
      _avg: { readingTime: true },
      where: {
        status: "published",
        readingTime: { not: null },
      },
    }),

    // Average SEO score
    prisma.article.aggregate({
      _avg: { seoScore: true },
      where: {
        status: "published",
      },
    }),

    // Previous month views (for trend)
    prisma.article.aggregate({
      _sum: { views: true },
      where: {
        status: "published",
        publishedAt: { gte: previousMonthStart, lte: previousMonthEnd },
      },
    }),

    // Previous week views (for trend)
    prisma.article.aggregate({
      _sum: { views: true },
      where: {
        status: "published",
        publishedAt: { gte: previousWeekStart, lte: previousWeekEnd },
      },
    }),

    // Previous day views (for trend)
    prisma.article.aggregate({
      _sum: { views: true },
      where: {
        status: "published",
        publishedAt: { gte: previousDayStart, lte: previousDayEnd },
      },
    }),

    // Previous month articles (for trend)
    prisma.article.count({
      where: {
        status: "published",
        publishedAt: { gte: previousMonthStart, lte: previousMonthEnd },
      },
    }),

    // Previous week articles (for trend)
    prisma.article.count({
      where: {
        status: "published",
        publishedAt: { gte: previousWeekStart, lte: previousWeekEnd },
      },
    }),

    // Previous day articles (for trend)
    prisma.article.count({
      where: {
        status: "published",
        publishedAt: { gte: previousDayStart, lte: previousDayEnd },
      },
    }),
  ]);

  const overview = {
    totalViews: totalViewsResult._sum.views || 0,
    viewsThisMonth: viewsThisMonthResult._sum.views || 0,
    viewsThisWeek: viewsThisWeekResult._sum.views || 0,
    viewsToday: viewsTodayResult._sum.views || 0,
    totalArticles: publishedArticles,
    publishedArticles,
    averageReadingTime: Math.round(avgReadingTimeResult._avg.readingTime || 0),
    averageSeoScore: Math.round(avgSeoScoreResult._avg.seoScore || 0),
  };

  // Calculate trends based on period
  const trends: AnalyticsTrends = {
    viewsTrend: calculateTrend(
      period === 'month' ? viewsThisMonthResult._sum.views || 0 :
      period === 'week' ? viewsThisWeekResult._sum.views || 0 :
      period === 'today' ? viewsTodayResult._sum.views || 0 :
      overview.totalViews,
      period === 'month' ? prevMonthViewsResult._sum.views || 0 :
      period === 'week' ? prevWeekViewsResult._sum.views || 0 :
      period === 'today' ? prevDayViewsResult._sum.views || 0 :
      prevWeekViewsResult._sum.views || 0
    ),
    articlesTrend: calculateTrend(
      period === 'month' ? 0 : // Articles don't reset monthly
      period === 'week' ? 0 :
      period === 'today' ? 0 :
      overview.publishedArticles,
      period === 'month' ? prevMonthArticlesResult :
      period === 'week' ? prevWeekArticlesResult :
      period === 'today' ? prevDayArticlesResult :
      prevWeekArticlesResult
    ),
  };

  return { ...overview, trends };
}

/**
 * Calculate trend percentage
 */
function calculateTrend(current: number, previous: number): { value: number; direction: 'up' | 'down' | 'neutral' } {
  if (previous === 0) {
    return { value: current > 0 ? 100 : 0, direction: current > 0 ? 'up' : 'neutral' };
  }
  const change = ((current - previous) / previous) * 100;
  const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';
  return { value: Math.abs(Math.round(change)), direction };
}

/**
 * Analytics trends interface
 */
export interface AnalyticsTrends {
  viewsTrend: { value: number; direction: 'up' | 'down' | 'neutral' };
  articlesTrend: { value: number; direction: 'up' | 'down' | 'neutral' };
}

/**
 * Get top articles by views
 */
export async function getTopArticles(params: TopArticlesParams = {}): Promise<ArticleStats[]> {
  const { limit = 10, dateRange, categoryId, tagId } = params;

  const where: Record<string, unknown> = {
    status: "published",
    publishedAt: { lte: new Date() },
  };

  // Apply date range filter
  if (dateRange?.from || dateRange?.to) {
    const publishedAtFilter: { gte?: Date; lte?: Date } = {};
    if (dateRange.from) {
      publishedAtFilter.gte = dateRange.from;
    }
    if (dateRange.to) {
      publishedAtFilter.lte = dateRange.to;
    }
    where.publishedAt = publishedAtFilter;
  }

  // Apply category filter
  if (categoryId) {
    where.categories = {
      some: {
        id: categoryId,
      },
    };
  }

  // Apply tag filter
  if (tagId) {
    where.tags = {
      some: {
        id: tagId,
      },
    };
  }

  const articles = await prisma.article.findMany({
    where,
    orderBy: { views: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      slug: true,
      views: true,
      publishedAt: true,
      readingTime: true,
      categories: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
        take: 2,
      },
    },
  });

  return articles as ArticleStats[];
}

/**
 * Get views chart data for the last N days
 * Returns actual daily views from ArticleView records, not cumulative totals
 */
export async function getViewsChartData(days: number = 30): Promise<ViewsChartData[]> {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  // Get all ArticleView records within the date range
  const articleViews = await prisma.articleView.findMany({
    where: {
      viewedAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      viewedAt: true,
    },
    orderBy: { viewedAt: "asc" },
  });

  // Initialize all dates with 0
  const dateMap = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];
    dateMap.set(dateStr, 0);
  }

  // Count views per day
  for (const view of articleViews) {
    const dateStr = view.viewedAt.toISOString().split("T")[0];
    dateMap.set(dateStr, (dateMap.get(dateStr) || 0) + 1);
  }

  // Convert to array
  return Array.from(dateMap.entries()).map(([date, views]) => ({
    date,
    views,
  }));
}

/**
 * Get article status distribution
 */
export async function getStatusDistribution(): Promise<StatusDistribution[]> {
  const [total, draftCount, publishedCount, scheduledCount, archivedCount] =
    await Promise.all([
      prisma.article.count(),
      prisma.article.count({ where: { status: "draft" } }),
      prisma.article.count({ where: { status: "published" } }),
      prisma.article.count({ where: { status: "scheduled" } }),
      prisma.article.count({ where: { status: "archived" } }),
    ]);

  const calculatePercentage = (count: number) =>
    total > 0 ? Math.round((count / total) * 100) : 0;

  return [
    { status: "draft", count: draftCount, percentage: calculatePercentage(draftCount) },
    {
      status: "published",
      count: publishedCount,
      percentage: calculatePercentage(publishedCount),
    },
    {
      status: "scheduled",
      count: scheduledCount,
      percentage: calculatePercentage(scheduledCount),
    },
    {
      status: "archived",
      count: archivedCount,
      percentage: calculatePercentage(archivedCount),
    },
  ];
}

/**
 * Get category distribution (for charts)
 */
export async function getCategoryDistribution(): Promise<CategoryDistribution[]> {
  const categories = await prisma.category.findMany({
    include: {
      _count: {
        select: {
          articles: {
            where: { status: "published" },
          },
        },
      },
    },
    orderBy: {
      articles: {
        _count: "desc",
      },
    },
    take: 10,
  });

  const totalPublished = await prisma.article.count({
    where: { status: "published" },
  });

  return categories
    .map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      articleCount: cat._count.articles,
      percentage:
        totalPublished > 0
          ? Math.round((cat._count.articles / totalPublished) * 100)
          : 0,
    }))
    .filter((cat) => cat.articleCount > 0);
}

/**
 * Get most used tags
 */
export async function getMostUsedTags(limit: number = 10): Promise<TagStats[]> {
  const tags = await prisma.tag.findMany({
    include: {
      _count: {
        select: {
          articles: {
            where: { status: "published" },
          },
        },
      },
    },
    orderBy: {
      articles: {
        _count: "desc",
      },
    },
    take: limit,
  });

  return tags
    .map((tag) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      articleCount: tag._count.articles,
    }))
    .filter((tag) => tag.articleCount > 0);
}

/**
 * Get publishing frequency (articles per month)
 */
export async function getPublishingFrequency(months: number = 6) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  startDate.setDate(1);
  startDate.setHours(0, 0, 0, 0);

  const articles = await prisma.article.findMany({
    where: {
      status: "published",
      publishedAt: { gte: startDate },
    },
    select: {
      publishedAt: true,
    },
    orderBy: { publishedAt: "asc" },
  });

  // Group by month
  const monthMap = new Map<string, number>();

  for (let i = 0; i < months; i++) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + i);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthMap.set(monthKey, 0);
  }

  for (const article of articles) {
    if (article.publishedAt) {
      const monthKey = `${article.publishedAt.getFullYear()}-${String(
        article.publishedAt.getMonth() + 1
      ).padStart(2, "0")}`;
      monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + 1);
    }
  }

  return Array.from(monthMap.entries()).map(([month, count]) => ({
    month,
    count,
  }));
}

/**
 * Get average article length
 * Uses the wordCount field for efficiency, with fallback calculation for articles without it
 */
export async function getAverageArticleLength(): Promise<number> {
  // Try to get average from wordCount field (new articles)
  const avgFromWordCount = await prisma.article.aggregate({
    _avg: { wordCount: true },
    where: {
      status: "published",
      wordCount: { not: null },
    },
  });

  if (avgFromWordCount._avg.wordCount) {
    return Math.round(avgFromWordCount._avg.wordCount);
  }

  // Fallback: Calculate for articles without wordCount (legacy data)
  const articles = await prisma.article.findMany({
    where: {
      status: "published",
      wordCount: null,
    },
    select: {
      content: true,
    },
    take: 100, // Limit for performance
  });

  if (articles.length === 0) return 0;

  let totalWords = 0;
  for (const article of articles) {
    // Strip HTML tags
    const text = article.content.replace(/<[^>]*>/g, "");
    const words = text.split(/\s+/).length;
    totalWords += words;
  }

  return Math.round(totalWords / articles.length);
}

/**
 * Get mini chart data for dashboard sparklines
 * Returns daily data points for the specified period
 */
export async function getMiniChartData(
  type: 'views' | 'articles',
  period: 'today' | 'week' | 'month' | 'all' = 'all',
  dataPoints: number = 7
): Promise<number[]> {
  const now = new Date();
  let startDate: Date;
  let days: number;

  // Determine date range based on period
  switch (period) {
    case 'today':
      days = 24; // Hourly data for today
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      days = 7;
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'month':
      days = dataPoints; // Use specified data points (default 7 for last 7 days of month)
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - (dataPoints - 1));
      startDate.setHours(0, 0, 0, 0);
      break;
    default: // 'all'
      days = dataPoints;
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - (dataPoints - 1));
      startDate.setHours(0, 0, 0, 0);
  }

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + days);
  endDate.setMilliseconds(endDate.getMilliseconds() - 1);

  const data: number[] = new Array(days).fill(0);

  if (type === 'views') {
    // Get all views in the date range in a single query
    const views = await prisma.articleView.findMany({
      where: {
        viewedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        viewedAt: true,
      },
    });

    // Group by day/hour
    for (const view of views) {
      const viewDate = new Date(view.viewedAt);

      if (period === 'today') {
        // Hourly grouping for today
        const hour = viewDate.getHours();
        if (hour >= 0 && hour < 24) {
          data[hour]++;
        }
      } else {
        // Daily grouping
        const dayDiff = Math.floor((viewDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        if (dayDiff >= 0 && dayDiff < days) {
          data[dayDiff]++;
        }
      }
    }
  } else if (type === 'articles') {
    // Get all published articles in the date range in a single query
    const articles = await prisma.article.findMany({
      where: {
        status: 'published',
        publishedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        publishedAt: true,
      },
    });

    // Group by day
    for (const article of articles) {
      if (article.publishedAt) {
        const dayDiff = Math.floor((article.publishedAt.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        if (dayDiff >= 0 && dayDiff < days) {
          data[dayDiff]++;
        }
      }
    }
  }

  return data;
}

/**
 * Get chart data for dashboard stats cards
 * Returns both views and articles chart data for the specified period
 */
export async function getDashboardChartsData(
  period: 'today' | 'week' | 'month' | 'all' = 'all',
  dataPoints: number = 7
): Promise<{
  viewsChart: number[];
  articlesChart: number[];
}> {
  const [viewsChart, articlesChart] = await Promise.all([
    getMiniChartData('views', period, dataPoints),
    getMiniChartData('articles', period, dataPoints),
  ]);

  return { viewsChart, articlesChart };
}
