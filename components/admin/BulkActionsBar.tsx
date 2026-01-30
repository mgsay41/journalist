'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

interface BulkActionsBarProps {
  selectedIds: string[];
  onClearSelection: () => void;
}

export function BulkActionsBar({ selectedIds, onClearSelection }: BulkActionsBarProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const handleBulkAction = async (action: 'delete' | 'publish' | 'draft' | 'archive') => {
    if (selectedIds.length === 0) return;

    const actionLabels = {
      delete: 'حذف',
      publish: 'نشر',
      draft: 'تحويل إلى مسودة',
      archive: 'أرشفة',
    };

    const confirmMessage = `هل أنت متأكد من ${actionLabels[action]} ${selectedIds.length} مقال؟`;
    if (!confirm(confirmMessage)) return;

    setIsLoading(true);
    setLoadingAction(action);

    try {
      const response = await fetch('/api/admin/articles/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, articleIds: selectedIds }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        onClearSelection();
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.error || 'فشل تنفيذ العملية');
      }
    } catch (error) {
      console.error('Bulk action failed:', error);
      alert('حدث خطأ أثناء تنفيذ العملية');
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  };

  if (selectedIds.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-card border rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">
          تم تحديد {selectedIds.length} مقال
        </span>
        <div className="h-6 w-px bg-border" />
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleBulkAction('publish')}
            disabled={isLoading}
          >
            {loadingAction === 'publish' ? 'جاري النشر...' : 'نشر'}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleBulkAction('draft')}
            disabled={isLoading}
          >
            {loadingAction === 'draft' ? 'جاري التحويل...' : 'مسودة'}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleBulkAction('archive')}
            disabled={isLoading}
          >
            {loadingAction === 'archive' ? 'جاري الأرشفة...' : 'أرشفة'}
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleBulkAction('delete')}
            disabled={isLoading}
          >
            {loadingAction === 'delete' ? 'جاري الحذف...' : 'حذف'}
          </Button>
        </div>
        <div className="h-6 w-px bg-border" />
        <button
          type="button"
          onClick={onClearSelection}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          disabled={isLoading}
        >
          إلغاء التحديد
        </button>
      </div>
    </div>
  );
}
