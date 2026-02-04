// Publishing service for handling article publication and scheduling

import { prisma } from "@/lib/prisma";
import {
  notifyArticlePublished,
  notifyArticleScheduled,
  notifyPublicationFailed,
} from "@/lib/notifications";
import type {
  ArticleStatus,
  PublishArticleInput,
  PublishResult,
  ScheduleArticleInput,
} from "./types";
import { isValidScheduledDate } from "./types";

/**
 * Get articles that are scheduled to be published
 * (for cron job to check)
 */
export async function getScheduledArticles() {
  const now = new Date();

  return await prisma.article.findMany({
    where: {
      status: "scheduled",
      scheduledAt: {
        lte: now,
      },
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      categories: true,
      tags: true,
    },
  });
}

/**
 * Publish an article immediately
 */
export async function publishArticle(
  articleId: string,
  userId?: string
): Promise<PublishResult> {
  try {
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      include: { author: true },
    });

    if (!article) {
      return { success: false, error: "المقال غير موجود" };
    }

    // Update article to published
    const updated = await prisma.article.update({
      where: { id: articleId },
      data: {
        status: "published",
        publishedAt: new Date(),
        scheduledAt: null,
      },
    });

    // Send notification
    await notifyArticlePublished(
      article.authorId,
      articleId,
      article.title
    ).catch(console.error);

    return {
      success: true,
      article: {
        id: updated.id,
        title: updated.title,
        slug: updated.slug,
        status: updated.status,
        publishedAt: updated.publishedAt,
        scheduledAt: updated.scheduledAt,
      },
    };
  } catch (error) {
    console.error("Error publishing article:", error);
    return { success: false, error: "فشل في نشر المقال" };
  }
}

/**
 * Schedule an article for future publication
 */
export async function scheduleArticle(
  input: ScheduleArticleInput
): Promise<PublishResult> {
  const { articleId, scheduledAt } = input;

  // Validate scheduled date
  if (!isValidScheduledDate(scheduledAt)) {
    return {
      success: false,
      error:
        "تاريخ الجدولة يجب أن يكون بعد 5 دقائق على الأقل ولمدة أقصاها سنة واحدة",
    };
  }

  try {
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      include: { author: true },
    });

    if (!article) {
      return { success: false, error: "المقال غير موجود" };
    }

    // Update article to scheduled
    const updated = await prisma.article.update({
      where: { id: articleId },
      data: {
        status: "scheduled",
        scheduledAt,
        publishedAt: null,
      },
    });

    // Send notification
    await notifyArticleScheduled(
      article.authorId,
      articleId,
      article.title,
      scheduledAt
    ).catch(console.error);

    return {
      success: true,
      article: {
        id: updated.id,
        title: updated.title,
        slug: updated.slug,
        status: updated.status,
        publishedAt: updated.publishedAt,
        scheduledAt: updated.scheduledAt,
      },
    };
  } catch (error) {
    console.error("Error scheduling article:", error);
    return { success: false, error: "فشل في جدولة المقال" };
  }
}

/**
 * Unschedule an article (return to draft)
 */
export async function unscheduleArticle(
  articleId: string
): Promise<PublishResult> {
  try {
    const article = await prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      return { success: false, error: "المقال غير موجود" };
    }

    const updated = await prisma.article.update({
      where: { id: articleId },
      data: {
        status: "draft",
        scheduledAt: null,
        publishedAt: null,
      },
    });

    return {
      success: true,
      article: {
        id: updated.id,
        title: updated.title,
        slug: updated.slug,
        status: updated.status,
        publishedAt: updated.publishedAt,
        scheduledAt: updated.scheduledAt,
      },
    };
  } catch (error) {
    console.error("Error unscheduling article:", error);
    return { success: false, error: "فشل في إلغاء جدولة المقال" };
  }
}

/**
 * Archive an article
 */
export async function archiveArticle(
  articleId: string
): Promise<PublishResult> {
  try {
    const article = await prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      return { success: false, error: "المقال غير موجود" };
    }

    const updated = await prisma.article.update({
      where: { id: articleId },
      data: {
        status: "archived",
      },
    });

    return {
      success: true,
      article: {
        id: updated.id,
        title: updated.title,
        slug: updated.slug,
        status: updated.status,
        publishedAt: updated.publishedAt,
        scheduledAt: updated.scheduledAt,
      },
    };
  } catch (error) {
    console.error("Error archiving article:", error);
    return { success: false, error: "فشل في أرشفة المقال" };
  }
}

/**
 * Get scheduled articles queue
 */
export async function getScheduledQueue(limit: number = 20) {
  const now = new Date();

  const [scheduled, publishing, recent] = await Promise.all([
    // Upcoming scheduled articles
    prisma.article.findMany({
      where: {
        status: "scheduled",
        scheduledAt: {
          gt: now,
        },
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
        categories: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { scheduledAt: "asc" },
      take: limit,
    }),

    // Articles that should be publishing now (for manual trigger)
    prisma.article.findMany({
      where: {
        status: "scheduled",
        scheduledAt: {
          lte: now,
        },
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { scheduledAt: "asc" },
      take: limit,
    }),

    // Recently published (last 24 hours)
    prisma.article.findMany({
      where: {
        status: "published",
        publishedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { publishedAt: "desc" },
      take: 5,
    }),
  ]);

  return {
    upcoming: scheduled,
    readyToPublish: publishing,
    recentlyPublished: recent,
  };
}

/**
 * Batch publish scheduled articles (for cron job)
 * Returns number of successfully published articles and any errors
 */
export async function publishScheduledArticles(): Promise<{
  published: number;
  errors: Array<{ articleId: string; title: string; error: string }>;
}> {
  const articles = await getScheduledArticles();
  const errors: Array<{ articleId: string; title: string; error: string }> =
    [];
  let published = 0;

  for (const article of articles) {
    try {
      const result = await publishArticle(article.id);
      if (result.success) {
        published++;
      } else {
        errors.push({
          articleId: article.id,
          title: article.title,
          error: result.error || "خطأ غير معروف",
        });
        // Notify about failure
        await notifyPublicationFailed(
          article.authorId,
          article.id,
          article.title,
          result.error
        ).catch(console.error);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "خطأ غير معروف";
      errors.push({
        articleId: article.id,
        title: article.title,
        error: errorMessage,
      });
      await notifyPublicationFailed(
        article.authorId,
        article.id,
        article.title,
        errorMessage
      ).catch(console.error);
    }
  }

  return { published, errors };
}

/**
 * Get article status counts for dashboard
 */
export async function getArticleStatusCounts() {
  const [draft, published, scheduled, archived] = await Promise.all([
    prisma.article.count({ where: { status: "draft" } }),
    prisma.article.count({ where: { status: "published" } }),
    prisma.article.count({ where: { status: "scheduled" } }),
    prisma.article.count({ where: { status: "archived" } }),
  ]);

  return {
    draft,
    published,
    scheduled,
    archived,
    total: draft + published + scheduled + archived,
  };
}
