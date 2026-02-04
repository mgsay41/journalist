// Publishing system types

export type ArticleStatus = "draft" | "published" | "scheduled" | "archived";

export interface PublishArticleInput {
  articleId: string;
  status: ArticleStatus;
  scheduledAt?: Date | null;
}

export interface ScheduleArticleInput {
  articleId: string;
  scheduledAt: Date;
}

export interface PublishResult {
  success: boolean;
  article?: {
    id: string;
    title: string;
    slug: string;
    status: string;
    publishedAt: Date | null;
    scheduledAt: Date | null;
  };
  error?: string;
}

// Validation helper for scheduled dates
export function isValidScheduledDate(date: Date): boolean {
  const now = new Date();
  // Must be at least 5 minutes in the future
  const minDate = new Date(now.getTime() + 5 * 60 * 1000);
  // Must not be more than 1 year in the future
  const maxDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  return date >= minDate && date <= maxDate;
}

// Timezone options for Arabic regions
export const ARABIC_TIMEZONES = [
  { value: "Asia/Riyadh", label: "الرياض (GMT+3)" },
  { value: "Asia/Dubai", label: "دبي (GMT+4)" },
  { value: "Asia/Kuwait", label: "الكويت (GMT+3)" },
  { value: "Asia/Bahrain", label: "البحرين (GMT+3)" },
  { value: "Asia/Qatar", label: "قطر (GMT+3)" },
  { value: "Asia/Muscat", label: "مسقط (GMT+4)" },
  { value: "Africa/Cairo", label: "القاهرة (GMT+2)" },
  { value: "Africa/Algiers", label: "الجزائر (GMT+1)" },
  { value: "Africa/Tunis", label: "تونس (GMT+1)" },
  { value: "Africa/Casablanca", label: "الدار البيضاء (GMT+1)" },
  { value: "Asia/Amman", label: "عمان (GMT+2)" },
  { value: "Asia/Beirut", label: "بيروت (GMT+2)" },
] as const;

export type ArabicTimezone = (typeof ARABIC_TIMEZONES)[number]["value"];
