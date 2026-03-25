'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';

interface AiChange {
  id: string;
  originalText: string;
  aiText: string;
}

interface AiChangeReviewModalProps {
  changes: AiChange[];
  isOpen: boolean;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onClose: () => void;
}

function ModalContent({
  changes,
  onAccept,
  onReject,
  onAcceptAll,
  onRejectAll,
  onClose,
}: Omit<AiChangeReviewModalProps, 'isOpen'>) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());

  const pendingChanges = changes.filter(c => !reviewedIds.has(c.id));
  const currentChange = pendingChanges[currentIndex];
  const progress = changes.length - pendingChanges.length;
  const total = changes.length;
  const progressPct = total > 0 ? Math.round((progress / total) * 100) : 0;

  const handleAccept = useCallback(() => {
    if (!currentChange) return;
    onAccept(currentChange.id);
    setReviewedIds(prev => new Set(prev).add(currentChange.id));
    if (currentIndex >= pendingChanges.length - 1) {
      setCurrentIndex(Math.max(0, pendingChanges.length - 2));
    }
  }, [currentChange, onAccept, currentIndex, pendingChanges.length]);

  const handleReject = useCallback(() => {
    if (!currentChange) return;
    onReject(currentChange.id);
    setReviewedIds(prev => new Set(prev).add(currentChange.id));
    if (currentIndex >= pendingChanges.length - 1) {
      setCurrentIndex(Math.max(0, pendingChanges.length - 2));
    }
  }, [currentChange, onReject, currentIndex, pendingChanges.length]);

  const handleSkip = useCallback(() => {
    if (currentIndex < pendingChanges.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, pendingChanges.length]);

  const handleAcceptAll = useCallback(() => {
    onAcceptAll();
    setReviewedIds(new Set(changes.map(c => c.id)));
  }, [onAcceptAll, changes]);

  const handleRejectAll = useCallback(() => {
    onRejectAll();
    setReviewedIds(new Set(changes.map(c => c.id)));
  }, [onRejectAll, changes]);

  useEffect(() => {
    if (pendingChanges.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleAccept();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleReject();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleSkip();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingChanges.length, handleAccept, handleReject, handleSkip, onClose]);

  useEffect(() => {
    if (pendingChanges.length === 0) {
      onClose();
    }
  }, [pendingChanges.length, onClose]);

  if (!currentChange) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-primary/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-base">
              ✦
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">مراجعة تعديلات الذكاء الاصطناعي</h2>
              <p className="text-xs text-muted-foreground mt-0.5">راجع كل تعديل واقبله أو ارفضه</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium bg-primary/10 text-primary px-2.5 py-1 rounded-full">
              {progress + 1} / {total}
            </span>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-sm"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-muted w-full">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Original text */}
          <div className="rounded-xl border border-red-200 dark:border-red-900/40 overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-900/40">
              <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
              <span className="text-xs font-medium text-red-700 dark:text-red-400">النص الأصلي</span>
            </div>
            <div className="p-3 bg-red-50/30 dark:bg-red-950/10 text-sm leading-relaxed max-h-36 overflow-y-auto text-foreground/80">
              {currentChange.originalText}
            </div>
          </div>

          {/* AI suggestion */}
          <div className="rounded-xl border border-green-200 dark:border-green-900/40 overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-950/30 border-b border-green-200 dark:border-green-900/40">
              <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
              <span className="text-xs font-medium text-green-700 dark:text-green-400">التعديل المقترح</span>
            </div>
            <div className="p-3 bg-green-50/30 dark:bg-green-950/10 text-sm leading-relaxed max-h-36 overflow-y-auto text-foreground">
              {currentChange.aiText}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-4 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={handleReject}
            className="flex-1 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            رفض
          </Button>
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="flex-1 text-muted-foreground"
          >
            تخطي
          </Button>
          <Button
            onClick={handleAccept}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white border-0"
          >
            قبول
          </Button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-muted/30">
          <Button variant="ghost" size="sm" onClick={handleAcceptAll} className="text-xs text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30">
            قبول الكل
          </Button>
          <p className="text-xs text-muted-foreground">
            مفاتيح: ← قبول &nbsp;·&nbsp; → رفض &nbsp;·&nbsp; ↓ تخطي
          </p>
          <Button variant="ghost" size="sm" onClick={handleRejectAll} className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
            رفض الكل
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AiChangeReviewModal({
  changes,
  isOpen,
  onAccept,
  onReject,
  onAcceptAll,
  onRejectAll,
  onClose,
}: AiChangeReviewModalProps) {
  if (!isOpen) return null;

  return (
    <ModalContent
      changes={changes}
      onAccept={onAccept}
      onReject={onReject}
      onAcceptAll={onAcceptAll}
      onRejectAll={onRejectAll}
      onClose={onClose}
    />
  );
}

export default AiChangeReviewModal;
