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
 * Get analytics overview stats
 */
export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  // Create new Date instances to avoid mutating the original
  const weekDate = new Date(now);
  weekDate.setDate(weekDate.getDate() - weekDate.getDay());
  const startOfWeek = new Date(weekDate.setHours(0, 0, 0, 0));
  const startOfDay = new Date(new Date(now).setHours(0, 0, 0, 0));

  const [
    totalViewsResult,
    viewsThisMonthResult,
    viewsThisWeekResult,
    viewsTodayResult,
    totalArticles,
    publishedArticles,
    avgReadingTimeResult,
    avgSeoScoreResult,
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
  ]);

  return {
    totalViews: totalViewsResult._sum.views || 0,
    viewsThisMonth: viewsThisMonthResult._sum.views || 0,
    viewsThisWeek: viewsThisWeekResult._sum.views || 0,
    viewsToday: viewsTodayResult._sum.views || 0,
    totalArticles,
    publishedArticles,
    averageReadingTime: Math.round(avgReadingTimeResult._avg.readingTime || 0),
    averageSeoScore: Math.round(avgSeoScoreResult._avg.seoScore || 0),
  };
}

/**
 * Get top articles by views
 */
export async function getTopArticles(params: TopArticlesParams = {}): Promise<ArticleStats[]> {
  const { limit = 10, dateRange, categoryId, tagId } = params;

  const where: any = {
    status: "published",
    publishedAt: { lte: new Date() },
  };

  // Apply date range filter
  if (dateRange?.from || dateRange?.to) {
    where.publishedAt = {};
    if (dateRange.from) {
      where.publishedAt.gte = dateRange.from;
    }
    if (dateRange.to) {
      where.publishedAt.lte = dateRange.to;
    }
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
