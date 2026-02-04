// Notification service for creating and managing notifications

import { prisma } from "@/lib/prisma";
import type {
  NotificationCreateInput,
  NotificationStats,
  NotificationWithMetadata,
} from "./types";

/**
 * Create a new notification
 */
export async function createNotification(
  input: NotificationCreateInput
): Promise<NotificationWithMetadata> {
  const notification = await prisma.notification.create({
    data: {
      ...input,
      // Convert metadata to Prisma JsonValue format
      metadata: input.metadata
        ? JSON.parse(JSON.stringify(input.metadata))
        : undefined,
    },
  });

  return notification as NotificationWithMetadata;
}

/**
 * Create a notification for article published
 */
export async function notifyArticlePublished(
  userId: string,
  articleId: string,
  articleTitle: string
): Promise<void> {
  await createNotification({
    userId,
    type: "article_published",
    title: "تم نشر المقال",
    message: `تم نشر مقال "${articleTitle}" بنجاح`,
    actionUrl: `/admin/articles/${articleId}/edit`,
    actionLabel: "عرض المقال",
    metadata: { articleId, articleTitle },
  });
}

/**
 * Create a notification for article scheduled
 */
export async function notifyArticleScheduled(
  userId: string,
  articleId: string,
  articleTitle: string,
  scheduledAt: Date
): Promise<void> {
  const dateStr = new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(scheduledAt);

  await createNotification({
    userId,
    type: "article_scheduled",
    title: "تم جدولة المقال",
    message: `تم جدولة مقال "${articleTitle}" للنشر في ${dateStr}`,
    actionUrl: `/admin/articles/${articleId}/edit`,
    actionLabel: "عرض المقال",
    metadata: { articleId, articleTitle, scheduledAt: scheduledAt.toISOString() },
  });
}

/**
 * Create a notification for publication failed
 */
export async function notifyPublicationFailed(
  userId: string,
  articleId: string,
  articleTitle: string,
  error?: string
): Promise<void> {
  await createNotification({
    userId,
    type: "publication_failed",
    title: "فشل النشر التلقائي",
    message: `فشل النشر التلقائي للمقال "${articleTitle}"${error ? `: ${error}` : ""}`,
    actionUrl: `/admin/articles/${articleId}/edit`,
    actionLabel: "عرض المقال",
    metadata: { articleId, articleTitle, error },
  });
}

/**
 * Get all notifications for a user
 */
export async function getUserNotifications(
  userId: string,
  options: { limit?: number; includeRead?: boolean } = {}
): Promise<NotificationWithMetadata[]> {
  const { limit = 50, includeRead = true } = options;

  return await prisma.notification.findMany({
    where: {
      userId,
      ...(includeRead ? {} : { read: false }),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  }) as NotificationWithMetadata[];
}

/**
 * Get notification statistics for a user
 */
export async function getNotificationStats(
  userId: string,
  options: { recentLimit?: number } = {}
): Promise<NotificationStats> {
  const { recentLimit = 5 } = options;

  const [total, unread, recent] = await Promise.all([
    prisma.notification.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, read: false } }),
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: recentLimit,
    }),
  ]);

  return {
    total,
    unread,
    recent: recent as NotificationWithMetadata[],
  };
}

/**
 * Mark a notification as read
 */
export async function markNotificationRead(
  notificationId: string,
  userId: string
): Promise<void> {
  await prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId, // Ensure user can only mark their own notifications
    },
    data: {
      read: true,
      readAt: new Date(),
    },
  });
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: {
      userId,
      read: false,
    },
    data: {
      read: true,
      readAt: new Date(),
    },
  });
}

/**
 * Delete a notification
 */
export async function deleteNotification(
  notificationId: string,
  userId: string
): Promise<void> {
  await prisma.notification.deleteMany({
    where: {
      id: notificationId,
      userId, // Ensure user can only delete their own notifications
    },
  });
}

/**
 * Delete all read notifications for a user
 */
export async function deleteReadNotifications(userId: string): Promise<void> {
  await prisma.notification.deleteMany({
    where: {
      userId,
      read: true,
    },
  });
}

/**
 * Clean up old notifications (cron job utility)
 */
export async function cleanupOldNotifications(
  daysToKeep: number = 90
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const result = await prisma.notification.deleteMany({
    where: {
      createdAt: {
        lt: cutoffDate,
      },
      read: true, // Only delete read notifications
    },
  });

  return result.count;
}
