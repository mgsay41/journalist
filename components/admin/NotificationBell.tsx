'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string | null;
}

interface NotificationData {
  stats: { total: number; unread: number };
  recent: Notification[];
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return 'الآن';
  if (diff < 3600) {
    const m = Math.floor(diff / 60);
    return `منذ ${m} ${m === 1 ? 'دقيقة' : 'دقائق'}`;
  }
  if (diff < 7200) return 'منذ ساعة';
  if (diff < 86400) {
    const h = Math.floor(diff / 3600);
    return `منذ ${h} ساعات`;
  }
  if (diff < 172800) return 'أمس';
  const d = Math.floor(diff / 86400);
  if (d < 30) return `منذ ${d} أيام`;
  if (d < 60) return 'منذ شهر';
  return `منذ ${Math.floor(d / 30)} أشهر`;
}

const typeIconPath: Record<string, string> = {
  info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  success: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  error: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
};

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<NotificationData | null>(null);
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/notifications?stats=true&recent=5', {
        credentials: 'same-origin',
      });
      if (!res.ok) return;
      const json = await res.json();
      setData(json);
    } catch {
      // silently fail — non-critical UI
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  const markAllRead = async () => {
    setIsMarkingRead(true);
    try {
      await fetch('/api/admin/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ action: 'markAllRead' }),
      });
      await fetchNotifications();
    } finally {
      setIsMarkingRead(false);
    }
  };

  const unread = data?.stats.unread ?? 0;
  const notifications = data?.recent ?? [];

  return (
    <div className="relative" dir="rtl">
      {/* Bell Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen((v) => !v)}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        aria-label={`الإشعارات${unread > 0 ? ` - ${unread} غير مقروء` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {/* Bell SVG */}
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={1.75}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread badge */}
        {unread > 0 && (
          <span
            className="absolute top-1 end-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-danger text-white text-[10px] font-bold leading-none px-1 shadow-sm"
            aria-hidden="true"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="الإشعارات"
          className="absolute end-0 top-full mt-2 w-80 bg-card border border-border rounded-xl z-50 overflow-hidden"
          style={{
            boxShadow: 'var(--shadow-lg)',
            animation: 'notifSlideIn 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}
        >
          <style>{`
            @keyframes notifSlideIn {
              from { opacity: 0; transform: translateY(-6px) scale(0.97); }
              to   { opacity: 1; transform: translateY(0)   scale(1); }
            }
          `}</style>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">الإشعارات</span>
              {unread > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-accent/15 text-accent text-[11px] font-bold">
                  {unread}
                </span>
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              aria-label="إغلاق"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Notification List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-border">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <p className="text-sm text-muted-foreground">لا توجد إشعارات</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const iconPath = typeIconPath[notif.type] ?? typeIconPath.info;
                const inner = (
                  <div
                    className={`flex gap-3 px-4 py-3 relative transition-colors ${
                      notif.read
                        ? 'hover:bg-muted/40'
                        : 'bg-accent/5 hover:bg-accent/10'
                    }`}
                  >
                    {/* Unread indicator bar */}
                    {!notif.read && (
                      <span
                        className="absolute end-0 top-2 bottom-2 w-0.5 rounded-full bg-accent"
                        aria-hidden="true"
                      />
                    )}

                    {/* Type icon */}
                    <div className="mt-0.5 shrink-0">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center ${
                          notif.type === 'success' ? 'bg-success/10' :
                          notif.type === 'warning' ? 'bg-warning/10' :
                          notif.type === 'error'   ? 'bg-danger/10'  :
                          'bg-accent/10'
                        }`}
                      >
                        <svg
                          className={`w-3.5 h-3.5 ${
                            notif.type === 'success' ? 'text-success' :
                            notif.type === 'warning' ? 'text-warning' :
                            notif.type === 'error'   ? 'text-danger'  :
                            'text-accent'
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
                        </svg>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground leading-snug truncate">
                        {notif.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>
                      <p className="text-[11px] text-muted-foreground/70 mt-1.5 font-medium">
                        {timeAgo(notif.createdAt)}
                      </p>
                    </div>
                  </div>
                );

                return notif.actionUrl ? (
                  <Link
                    key={notif.id}
                    href={notif.actionUrl}
                    onClick={() => setIsOpen(false)}
                    className="block no-underline"
                  >
                    {inner}
                  </Link>
                ) : (
                  <div key={notif.id}>{inner}</div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-muted/30">
              <button
                onClick={markAllRead}
                disabled={isMarkingRead || unread === 0}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isMarkingRead ? 'جاري التحديث...' : 'تحديد الكل كمقروء'}
              </button>
              <Link
                href="/admin/notifications"
                onClick={() => setIsOpen(false)}
                className="text-xs text-accent hover:text-accent/80 font-medium transition-colors no-underline"
              >
                مشاهدة الكل
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
