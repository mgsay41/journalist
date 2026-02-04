// Notification types for the publishing system

export type NotificationType =
  | "article_published"
  | "article_scheduled"
  | "article_draft_saved"
  | "publication_failed"
  | "article_updated"
  | "system";

export interface NotificationCreateInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationWithMetadata {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl: string | null;
  actionLabel: string | null;
  read: boolean;
  readAt: Date | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface NotificationStats {
  total: number;
  unread: number;
  recent: NotificationWithMetadata[];
}

// Notification messages in Arabic
export const NotificationMessages = {
  article_published: {
    title: "تم نشر المقال",
    message: (articleTitle: string) => `تم نشر مقال "${articleTitle}" بنجاح`,
    actionLabel: "عرض المقال",
  },
  article_scheduled: {
    title: "تم جدولة المقال",
    message: (articleTitle: string, date: Date) =>
      `تم جدولة مقال "${articleTitle}" للنشر في ${formatArabicDate(date)}`,
    actionLabel: "عرض المقال",
  },
  article_draft_saved: {
    title: "تم حفظ المسودة",
    message: (articleTitle: string) => `تم حفظ مسودة "${articleTitle}"`,
    actionLabel: "تحرير",
  },
  publication_failed: {
    title: "فشل النشر التلقائي",
    message: (articleTitle: string) => `فشل النشر التلقائي للمقال "${articleTitle}"`,
    actionLabel: "عرض المقال",
  },
  article_updated: {
    title: "تم تحديث المقال",
    message: (articleTitle: string) => `تم تحديث مقال "${articleTitle}"`,
    actionLabel: "عرض التغييرات",
  },
  system: {
    title: "تنبيه النظام",
    message: (msg: string) => msg,
    actionLabel: undefined,
  },
} as const;

// Helper function to format date in Arabic
function formatArabicDate(date: Date): string {
  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
