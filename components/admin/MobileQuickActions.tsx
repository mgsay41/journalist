'use client';

/**
 * Mobile Quick Actions Component
 * Provides one-tap publish, status change, and preview for mobile users
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TouchButton } from '@/components/ui/TouchButton';
import { useHaptic } from '@/lib/mobile/haptic-feedback';
import { cn } from '@/lib/utils';

interface Article {
  id: string;
  title: string;
  status: 'draft' | 'published' | 'scheduled' | 'archived';
  slug?: string;
  scheduledAt?: Date | null;
}

interface MobileQuickActionsProps {
  article: Article | null;
  onPublish?: () => Promise<void>;
  onSchedule?: (date: Date) => Promise<void>;
  onArchive?: () => Promise<void>;
  onDraft?: () => Promise<void>;
  onPreview?: () => void;
  className?: string;
  variant?: 'floating' | 'fixed' | 'inline';
}

const statusLabels: Record<Article['status'], string> = {
  draft: 'مسودة',
  published: 'منشور',
  scheduled: 'مجدول',
  archived: 'مؤرشف',
};

const statusColors: Record<Article['status'], string> = {
  draft: 'bg-warning',
  published: 'bg-success',
  scheduled: 'bg-info',
  archived: 'bg-muted',
};

export function MobileQuickActions({
  article,
  onPublish,
  onSchedule,
  onArchive,
  onDraft,
  onPreview,
  className = '',
  variant = 'floating',
}: MobileQuickActionsProps) {
  const [isActionPending, setIsActionPending] = useState<string | null>(null);
  const router = useRouter();
  const haptic = useHaptic();

  const handleAction = async (action: () => Promise<void>, actionName: string) => {
    setIsActionPending(actionName);
    haptic.medium();

    try {
      await action();
      haptic.success();
    } catch (error) {
      console.error(`Error ${actionName}:`, error);
      haptic.error();
    } finally {
      setIsActionPending(null);
    }
  };

  const handlePublish = async () => {
    if (!onPublish || !article) return;
    await handleAction(onPublish, 'publish');
  };

  const handleSchedule = async () => {
    if (!article) return;

    // Quick schedule for tomorrow at 9 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    if (onSchedule) {
      await handleAction(() => onSchedule(tomorrow), 'schedule');
    }
  };

  const handleArchive = async () => {
    if (!onArchive || !article) return;
    await handleAction(onArchive, 'archive');
  };

  const handleDraft = async () => {
    if (!onDraft || !article) return;
    await handleAction(onDraft, 'draft');
  };

  const handlePreview = () => {
    haptic.light();
    if (onPreview) {
      onPreview();
    } else if (article?.slug) {
      router.push(`/article/${article.slug}`);
    } else if (article?.id) {
      router.push(`/preview/${article.id}`);
    }
  };

  if (!article) {
    return (
      <div className={cn('flex gap-2', className)}>
        <TouchButton
          variant="primary"
          disabled
          className="flex-1"
        >
          لا يوجد مقال
        </TouchButton>
      </div>
    );
  }

  // Floating action button style
  if (variant === 'floating') {
    return (
      <div className={cn('fixed bottom-24 left-4 right-4 z-40', className)}>
        <div className="flex flex-col gap-2">
          {/* One-tap publish button */}
          {article.status === 'draft' && onPublish && (
            <TouchButton
              variant="primary"
              onClick={handlePublish}
              disabled={isActionPending === 'publish'}
              haptic
              hapticType="impact"
              className="w-full min-h-[56px] text-lg font-bold shadow-lg"
              icon={
                isActionPending === 'publish' ? (
                  <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2L2 10l8 8 8-8-8-8zM0 10l10 10L20 10H0z" />
                  </svg>
                )
              }
            >
              {isActionPending === 'publish' ? 'جاري النشر...' : 'نشر الآن'}
            </TouchButton>
          )}

          {/* Quick actions row */}
          <div className="flex gap-2">
            {/* Preview */}
            <TouchButton
              variant="secondary"
              onClick={handlePreview}
              haptic
              hapticType="light"
              className="flex-1"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              }
            >
              معاينة
            </TouchButton>

            {/* Schedule */}
            {article.status === 'draft' && onSchedule && (
              <TouchButton
                variant="outline"
                onClick={handleSchedule}
                disabled={isActionPending === 'schedule'}
                haptic
                hapticType="medium"
                className="flex-1"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                }
              >
                {isActionPending === 'schedule' ? 'جاري...' : 'غداً 9ص'}
              </TouchButton>
            )}

            {/* Status change menu */}
            <select
              value={article.status}
              onChange={(e) => {
                const newStatus = e.target.value as Article['status'];
                haptic.light();

                switch (newStatus) {
                  case 'published':
                    handlePublish();
                    break;
                  case 'scheduled':
                    handleSchedule();
                    break;
                  case 'archived':
                    handleArchive();
                    break;
                  case 'draft':
                    handleDraft();
                    break;
                }
              }}
              className="min-h-[48px] px-4 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="draft">مسودة</option>
              <option value="published">منشور</option>
              <option value="scheduled">مجدول</option>
              <option value="archived">مؤرشف</option>
            </select>
          </div>
        </div>
      </div>
    );
  }

  // Fixed bottom bar style
  if (variant === 'fixed') {
    return (
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 p-4 safe-area-pb',
          className
        )}
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom, 16px) + 16px)',
        }}
      >
        <div className="flex items-center gap-3">
          {/* Status indicator */}
          <div className="shrink-0">
            <div className={cn('w-3 h-3 rounded-full', statusColors[article.status])} />
          </div>

          {/* Current status */}
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              {statusLabels[article.status]}
            </p>
            {article.status === 'scheduled' && article.scheduledAt && (
              <p className="text-xs text-muted-foreground">
                {new Date(article.scheduledAt).toLocaleDateString('ar-SA')}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {onPreview && (
              <TouchButton
                variant="ghost"
                size="sm"
                onClick={handlePreview}
                haptic
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                }
              />
            )}

            {article.status === 'draft' && onPublish && (
              <TouchButton
                variant="primary"
                size="sm"
                onClick={handlePublish}
                disabled={isActionPending === 'publish'}
                haptic
                hapticType="impact"
              >
                {isActionPending === 'publish' ? '...' : 'نشر'}
              </TouchButton>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Inline style
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {article.status === 'draft' && onPublish && (
        <TouchButton
          variant="primary"
          onClick={handlePublish}
          disabled={isActionPending === 'publish'}
          haptic
          hapticType="impact"
        >
          نشر الآن
        </TouchButton>
      )}

      {article.status === 'draft' && onSchedule && (
        <TouchButton
          variant="outline"
          onClick={handleSchedule}
          disabled={isActionPending === 'schedule'}
          haptic
        >
          جدول لغدٍ
        </TouchButton>
      )}

      {onPreview && (
        <TouchButton
          variant="secondary"
          onClick={handlePreview}
          haptic
        >
          معاينة
        </TouchButton>
      )}

      <TouchButton
        variant="ghost"
        onClick={handleArchive}
        disabled={isActionPending === 'archive'}
        haptic
      >
        أرشفة
      </TouchButton>
    </div>
  );
}

export default MobileQuickActions;
