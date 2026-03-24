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
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg p-6"
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">مراجعة تعديلات الذكاء الاصطناعي</h2>
          <span className="text-sm text-muted-foreground">
            {progress + 1} / {total}
          </span>
        </div>

        <div className="mb-4">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(progress / total) * 100}%` }}
            />
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">النص الأصلي:</label>
            <div className="p-3 bg-muted/50 rounded-lg border border-border text-sm leading-relaxed">
              {currentChange.originalText}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">التعديل المقترح:</label>
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 text-sm leading-relaxed">
              {currentChange.aiText}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReject}>
              ← رفض
            </Button>
            <Button variant="ghost" onClick={handleSkip}>
              تخطي ↓
            </Button>
            <Button onClick={handleAccept}>
              قبول ←
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button variant="ghost" size="sm" onClick={handleAcceptAll}>
            قبول الكل
          </Button>
          <Button variant="ghost" size="sm" onClick={handleRejectAll}>
            رفض الكل
          </Button>
        </div>

        <div className="text-xs text-muted-foreground text-center mt-2">
          استخدم ← للقبول، → للرفض، ↓ للتخطي
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
