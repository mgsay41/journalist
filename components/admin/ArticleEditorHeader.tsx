'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/* ── Types ─────────────────────────────────────────────── */

export type SaveState = 'idle' | 'saving' | 'saved' | 'unsaved' | 'error';

interface Scores {
  seo: number;
  geo: number;
  structure: number;
  structureTotal: number;
  grammar: number;
}

export interface ArticleEditorHeaderProps {
  articleTitle: string;
  articleSlug?: string;

  saveState?: SaveState;
  lastSavedAt?: Date | null;

  scores: Scores;
  wordCount: number;

  /** Current article status — read-only display pill */
  status?: string;
  /** Scheduled publish date — shown inside the scheduled pill */
  scheduledAt?: string | null;

  /** Always opens the readiness modal (SEO/GEO check) */
  onPublish: () => void;
  /** Opens schedule modal then calls POST /publish {action:'schedule'} */
  onSchedule?: (date: Date) => void;
  /** Reverts scheduled → draft */
  onUnschedule?: () => void;
  /** Used for "نشر الآن" in scheduled state — defaults to onPublish */
  onPublishNow?: () => void;
  /** Reverts published → draft */
  onUnpublish?: () => void;
  /** Restores archived → draft */
  onRestore?: () => void;

  publishing?: boolean;
  actionLoading?: 'schedule' | 'unschedule' | 'unpublish' | 'restore' | null;

  onDistractionMode?: () => void;
  panelOpen: boolean;
  onTogglePanel: () => void;
  onFocusSection?: (section: 'issues' | 'meta' | 'taxonomy') => void;
}

/* ── Score Ring ─────────────────────────────────────────── */

const RING = { SIZE: 28, R: 10 } as const;
const CIRCUMFERENCE = 2 * Math.PI * RING.R; // ≈ 62.83

function ringColor(score: number, max = 100): string {
  const pct = score / max;
  if (pct >= 0.7) return '#22c55e';
  if (pct >= 0.5) return '#f59e0b';
  return '#ef4444';
}

function ScoreRing({
  score,
  max = 100,
  label,
  onClick,
  children,
  empty,
}: {
  score: number;
  max?: number;
  label: string;
  onClick?: () => void;
  children?: React.ReactNode;
  empty?: boolean;
}) {
  const pct = Math.min(score / max, 1);
  const offset = CIRCUMFERENCE * (1 - pct);
  const color = empty ? '#9ca3af' : ringColor(score, max);

  const inner = (
    <>
      {/* Ring */}
      <div
        className="relative shrink-0"
        style={{ width: RING.SIZE, height: RING.SIZE }}
      >
        <svg
          width={RING.SIZE}
          height={RING.SIZE}
          className="absolute inset-0"
          style={{ transform: 'rotate(-90deg)' }}
        >
          <circle
            cx={RING.SIZE / 2}
            cy={RING.SIZE / 2}
            r={RING.R}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="text-border/40"
          />
          {!empty && (
            <circle
              cx={RING.SIZE / 2}
              cy={RING.SIZE / 2}
              r={RING.R}
              fill="none"
              stroke={color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease' }}
            />
          )}
        </svg>
        <span
          className="absolute inset-0 flex items-center justify-center font-bold leading-none select-none"
          style={{ fontSize: '8px', color, letterSpacing: '-0.03em' }}
        >
          {empty ? '--' : (children ?? score)}
        </span>
      </div>

      {/* Label */}
      <span className="text-xs text-muted-foreground font-medium leading-none">
        {label}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        title={`${label}: ${score}${max !== 100 ? `/${max}` : ''} — انقر للمراجعة`}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-muted/60 active:bg-muted transition-colors duration-150 cursor-pointer"
      >
        {inner}
      </button>
    );
  }

  return (
    <div
      title={`${label}: ${score}${max !== 100 ? `/${max}` : ''}`}
      className="flex items-center gap-1.5 px-2 py-1.5"
    >
      {inner}
    </div>
  );
}

/* ── Word Count Chip ────────────────────────────────────── */

function WordCount({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-1 px-2 py-1.5 text-xs text-muted-foreground">
      <svg
        className="w-3 h-3 opacity-50 shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <span className="font-medium tabular-nums">{count}</span>
      <span className="opacity-60">كلمة</span>
    </div>
  );
}

/* ── Save Indicator ─────────────────────────────────────── */

function SaveIndicator({
  state,
  lastSavedAt,
}: {
  state: SaveState;
  lastSavedAt?: Date | null;
}) {
  if (state === 'idle') return null;

  if (state === 'saving') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 rounded-full border border-amber-200/60 dark:border-amber-800/40 shrink-0">
        <svg className="w-3 h-3 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        حفظ...
      </span>
    );
  }

  if (state === 'saved') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-2.5 py-1 rounded-full border border-green-200/60 dark:border-green-800/40 shrink-0">
        <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
        {lastSavedAt
          ? `محفوظ ${lastSavedAt.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}`
          : 'محفوظ'}
      </span>
    );
  }

  if (state === 'unsaved') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 rounded-full border border-amber-200/60 dark:border-amber-800/40 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
        تغييرات غير محفوظة
      </span>
    );
  }

  if (state === 'error') {
    return (
      <span className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-2.5 py-1 rounded-full border border-red-200/60 dark:border-red-800/40 shrink-0">
        خطأ في الحفظ
      </span>
    );
  }

  return null;
}

/* ── Status Config ──────────────────────────────────────── */

const STATUS_CONFIG = {
  draft: {
    label: 'مسودة',
    color: 'text-gray-600 dark:text-gray-400',
    bg: 'bg-gray-100 dark:bg-gray-800',
    ring: 'ring-gray-200/80 dark:ring-gray-700/60',
    dot: 'bg-gray-400',
  },
  published: {
    label: 'منشور',
    color: 'text-green-700 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-950/40',
    ring: 'ring-green-300/60 dark:ring-green-800/40',
    dot: 'bg-green-500',
  },
  scheduled: {
    label: 'مجدول',
    color: 'text-blue-700 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    ring: 'ring-blue-300/60 dark:ring-blue-800/40',
    dot: 'bg-blue-500',
  },
  archived: {
    label: 'مؤرشف',
    color: 'text-orange-700 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    ring: 'ring-orange-300/60 dark:ring-orange-800/40',
    dot: 'bg-orange-400',
  },
} as const;

/* ── Status Pill (read-only) ────────────────────────────── */

function StatusPill({
  status,
  scheduledAt,
}: {
  status: string;
  scheduledAt?: string | null;
}) {
  const cfg =
    STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.draft;

  let dateLabel: string | null = null;
  if (status === 'scheduled' && scheduledAt) {
    try {
      dateLabel = new Intl.DateTimeFormat('ar-SA', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(scheduledAt));
    } catch {
      // ignore invalid date
    }
  }

  return (
    <span
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ring-1 shrink-0',
        cfg.bg,
        cfg.color,
        cfg.ring
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full shrink-0',
          cfg.dot,
          status === 'published' && 'animate-pulse'
        )}
      />
      {cfg.label}
      {dateLabel && (
        <span className="opacity-70 font-normal">: {dateLabel}</span>
      )}
    </span>
  );
}

/* ── Icon Button ────────────────────────────────────────── */

function IconButton({
  onClick,
  title,
  active,
  className,
  children,
}: {
  onClick?: () => void;
  title?: string;
  active?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150',
        active
          ? 'bg-muted text-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
        className
      )}
    >
      {children}
    </button>
  );
}

/* ── Divider ────────────────────────────────────────────── */

function Divider() {
  return <div className="shrink-0 w-px h-5 bg-border/50 mx-0.5" />;
}

/* ── Spinner ────────────────────────────────────────────── */

function Spinner() {
  return (
    <svg className="w-3 h-3 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

/* ── Publish Button (amber gradient) ────────────────────── */

function PublishButton({
  onClick,
  loading,
  label,
}: {
  onClick: () => void;
  loading?: boolean;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="shrink-0 flex items-center gap-1.5 h-8 px-4 rounded-lg text-sm font-semibold text-white transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        background: loading
          ? 'linear-gradient(135deg, #d97706, #b45309)'
          : 'linear-gradient(135deg, #f59e0b, #d97706)',
        boxShadow: loading ? 'none' : '0 2px 8px rgba(245,158,11,0.28)',
      }}
      onMouseEnter={(e) => {
        if (!loading)
          (e.currentTarget as HTMLButtonElement).style.boxShadow =
            '0 3px 12px rgba(245,158,11,0.42)';
      }}
      onMouseLeave={(e) => {
        if (!loading)
          (e.currentTarget as HTMLButtonElement).style.boxShadow =
            '0 2px 8px rgba(245,158,11,0.28)';
      }}
    >
      {loading ? (
        <>
          <Spinner />
          جاري النشر...
        </>
      ) : (
        label
      )}
    </button>
  );
}

/* ── Main Component ─────────────────────────────────────── */

export function ArticleEditorHeader({
  articleTitle,
  articleSlug,
  saveState = 'idle',
  lastSavedAt,
  scores,
  wordCount,
  status,
  scheduledAt,
  onPublish,
  onSchedule,
  onUnschedule,
  onPublishNow,
  onUnpublish,
  onRestore,
  publishing = false,
  actionLoading = null,
  onDistractionMode,
  panelOpen,
  onTogglePanel,
  onFocusSection,
}: ArticleEditorHeaderProps) {
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleInput, setScheduleInput] = useState('');
  const [minSchedule, setMinSchedule] = useState('');

  const isScoreEmpty = wordCount < 10;

  /* ── Context-aware action buttons ── */
  function renderActions() {
    switch (status) {
      case 'published':
        return (
          <button
            onClick={onUnpublish}
            disabled={actionLoading === 'unpublish'}
            className="shrink-0 flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-sm font-medium border border-border/80 bg-background text-foreground hover:bg-muted/60 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLoading === 'unpublish' ? (
              <>
                <Spinner />
                جاري إلغاء النشر...
              </>
            ) : (
              'إلغاء النشر'
            )}
          </button>
        );

      case 'scheduled':
        return (
          <>
            <button
              onClick={onUnschedule}
              disabled={actionLoading === 'unschedule'}
              className="shrink-0 flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-sm font-medium border border-border/80 bg-background text-foreground hover:bg-muted/60 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading === 'unschedule' ? (
                <>
                  <Spinner />
                  جاري الإلغاء...
                </>
              ) : (
                'إلغاء الجدولة'
              )}
            </button>
            <PublishButton
              onClick={onPublishNow ?? onPublish}
              loading={publishing}
              label="نشر الآن"
            />
          </>
        );

      case 'archived':
        return (
          <>
            <button
              onClick={onRestore}
              disabled={actionLoading === 'restore'}
              className="shrink-0 flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-sm font-medium border border-border/80 bg-background text-foreground hover:bg-muted/60 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading === 'restore' ? (
                <>
                  <Spinner />
                  جاري الاستعادة...
                </>
              ) : (
                'استعادة كمسودة'
              )}
            </button>
            <PublishButton onClick={onPublish} loading={publishing} label="نشر" />
          </>
        );

      case 'draft':
      default:
        return (
          <>
            {onSchedule && (
              <button
                onClick={() => {
                  setMinSchedule(new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16));
                  setShowScheduleModal(true);
                }}
                className="shrink-0 hidden sm:flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-sm font-medium border border-border/80 bg-background text-foreground hover:bg-muted/60 transition-all duration-150"
              >
                جدولة
              </button>
            )}
            <PublishButton onClick={onPublish} loading={publishing} label="نشر" />
          </>
        );
    }
  }

  return (
    <>
      <header
        dir="rtl"
        className="h-14 shrink-0 border-b border-border/60 bg-card/95 backdrop-blur-sm flex items-center gap-2 px-4 z-20"
      >
        {/* ── Back navigation ── */}
        <Link
          href="/admin/articles"
          className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <svg
            className="w-3.5 h-3.5 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
          المقالات
        </Link>

        <Divider />

        {/* ── Save indicator ── */}
        <SaveIndicator state={saveState} lastSavedAt={lastSavedAt} />

        {/* ── Article title preview (flex fill) ── */}
        <span
          className="flex-1 min-w-0 text-sm text-muted-foreground/40 truncate px-1 select-none"
          title={articleTitle || undefined}
        >
          {articleTitle || 'مقال جديد'}
        </span>

        {/* ── Scores section ── */}
        <div className="hidden md:flex items-center shrink-0">
          <ScoreRing
            score={scores.seo}
            label="SEO"
            empty={isScoreEmpty}
            onClick={onFocusSection ? () => onFocusSection('issues') : undefined}
          />
          <ScoreRing
            score={scores.geo}
            label="GEO"
            empty={isScoreEmpty}
            onClick={onFocusSection ? () => onFocusSection('issues') : undefined}
          />
          <ScoreRing
            score={scores.structure}
            max={scores.structureTotal}
            label="هيكل"
            empty={isScoreEmpty}
            onClick={onFocusSection ? () => onFocusSection('issues') : undefined}
          >
            {isScoreEmpty ? '--' : `${scores.structure}/${scores.structureTotal}`}
          </ScoreRing>

          <WordCount count={wordCount} />

          {scores.grammar > 0 && (
            <button
              onClick={
                onFocusSection ? () => onFocusSection('issues') : undefined
              }
              className="flex items-center gap-1 px-2 py-1 mx-1 rounded-md text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors border border-red-200/50 dark:border-red-800/40"
            >
              <svg
                className="w-3 h-3 shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              {scores.grammar}
            </button>
          )}
        </div>

        <Divider />

        {/* ── Utility icons ── */}
        {onDistractionMode && (
          <IconButton
            onClick={onDistractionMode}
            title="وضع التركيز (Ctrl+Shift+D)"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m4 0h4m0 0v-4"
              />
            </svg>
          </IconButton>
        )}

        {articleSlug && (
          <Link
            href={`/article/${articleSlug}`}
            target="_blank"
            title="معاينة المقال"
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-150"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          </Link>
        )}

        {(onDistractionMode || articleSlug) && <Divider />}

        {/* ── Status pill (read-only) ── */}
        {status && (
          <StatusPill status={status} scheduledAt={scheduledAt} />
        )}

        {status && <Divider />}

        {/* ── Context-aware action buttons ── */}
        {renderActions()}

        {/* ── Panel toggle ── */}
        <IconButton
          onClick={onTogglePanel}
          active={panelOpen}
          title={panelOpen ? 'إخفاء اللوحة الجانبية' : 'إظهار اللوحة الجانبية'}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"
            />
          </svg>
        </IconButton>
      </header>

      {/* ── Schedule Modal ── */}
      {showScheduleModal && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center"
          onClick={() => {
            setShowScheduleModal(false);
            setScheduleInput('');
          }}
        >
          <div
            className="bg-card border border-border rounded-xl shadow-2xl p-5 w-72"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <h3 className="text-sm font-semibold mb-3">جدولة النشر</h3>
            <label className="text-xs text-muted-foreground mb-1 block">
              تاريخ ووقت النشر
            </label>
            <input
              type="datetime-local"
              value={scheduleInput}
              onChange={(e) => setScheduleInput(e.target.value)}
              min={minSchedule}
              className="w-full text-sm px-3 py-2 rounded-lg border border-border/60 bg-background text-foreground outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-colors mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (scheduleInput && onSchedule) {
                    onSchedule(new Date(scheduleInput));
                    setShowScheduleModal(false);
                    setScheduleInput('');
                  }
                }}
                disabled={!scheduleInput || actionLoading === 'schedule'}
                className="flex-1 h-8 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {actionLoading === 'schedule' ? 'جاري الجدولة...' : 'جدولة'}
              </button>
              <button
                onClick={() => {
                  setShowScheduleModal(false);
                  setScheduleInput('');
                }}
                className="flex-1 h-8 rounded-lg text-sm border border-border/60 text-foreground hover:bg-muted/50 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ArticleEditorHeader;
