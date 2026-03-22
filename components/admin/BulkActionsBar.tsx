'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { gooeyToast } from 'goey-toast';

interface CategoryOption {
  id: string;
  name: string;
}

interface TagOption {
  id: string;
  name: string;
}

interface BulkActionsBarProps {
  selectedIds: string[];
  onClearSelection: () => void;
  categories?: CategoryOption[];
  tags?: TagOption[];
}

export function BulkActionsBar({ selectedIds, onClearSelection, categories = [], tags = [] }: BulkActionsBarProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkEditData, setBulkEditData] = useState({
    categoryIds: [] as string[],
    tagIds: [] as string[],
  });
  const [error, setError] = useState<string | null>(null);

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
        gooeyToast.success(data.message);
        onClearSelection();
        router.refresh();
      } else {
        const error = await response.json();
        gooeyToast.error(error.error || 'فشل تنفيذ العملية');
      }
    } catch (error) {
      console.error('Bulk action failed:', error);
      gooeyToast.error('حدث خطأ أثناء تنفيذ العملية');
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  };

  const handleBulkEdit = async () => {
    if (selectedIds.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/articles/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit',
          articleIds: selectedIds,
          categoryIds: bulkEditData.categoryIds,
          tagIds: bulkEditData.tagIds,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setShowBulkEditModal(false);
        setBulkEditData({ categoryIds: [], tagIds: [] });
        onClearSelection();
        router.refresh();
        gooeyToast.success(data.message || 'تم تحديث المقالات بنجاح');
      } else {
        const error = await response.json();
        setError(error.error || 'فشل تنفيذ العملية');
      }
    } catch (error) {
      console.error('Bulk edit failed:', error);
      setError('حدث خطأ أثناء تنفيذ العملية');
    } finally {
      setIsLoading(false);
    }
  };

  if (selectedIds.length === 0) return null;

  return (
    <>
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
              onClick={() => setShowBulkEditModal(true)}
              disabled={isLoading}
            >
              تعديل
            </Button>
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

      {/* Bulk Edit Modal */}
      <Modal
        isOpen={showBulkEditModal}
        onClose={() => {
          setShowBulkEditModal(false);
          setError(null);
          setBulkEditData({ categoryIds: [], tagIds: [] });
        }}
        title="تعديل المقالات المحددة"
        size="md"
      >
        <div className="space-y-4">
          {error && <Alert type="error" message={error} />}

          <p className="text-sm text-muted-foreground">
            سيتم تطبيق التغييرات على {selectedIds.length} مقال محدد. اترك الحقول فارغة للحفاظ على القيم الحالية.
          </p>

          {/* Categories */}
          <div>
            <label className="block text-sm font-medium mb-2">
              التصنيفات (استبدل التصنيفات الحالية)
            </label>
            <Select
              value=""
              onChange={(e) => {
                const value = e.target.value;
                if (value && !bulkEditData.categoryIds.includes(value)) {
                  setBulkEditData({
                    ...bulkEditData,
                    categoryIds: [...bulkEditData.categoryIds, value],
                  });
                }
              }}
              options={[
                { value: '', label: 'اختر التصنيفات...' },
                ...categories.map(cat => ({ value: cat.id, label: cat.name }))
              ]}
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {bulkEditData.categoryIds.map((catId) => {
                const category = categories.find(c => c.id === catId);
                return (
                  <span
                    key={catId}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-sm rounded"
                  >
                    {category?.name || catId}
                    <button
                      type="button"
                      onClick={() => setBulkEditData({
                        ...bulkEditData,
                        categoryIds: bulkEditData.categoryIds.filter(c => c !== catId),
                      })}
                      className="hover:text-danger"
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium mb-2">
              الوسوم (إضافة إلى الوسوم الحالية)
            </label>
            <Select
              value=""
              onChange={(e) => {
                const value = e.target.value;
                if (value && !bulkEditData.tagIds.includes(value)) {
                  setBulkEditData({
                    ...bulkEditData,
                    tagIds: [...bulkEditData.tagIds, value],
                  });
                }
              }}
              options={[
                { value: '', label: 'اختر الوسوم...' },
                ...tags.map(tag => ({ value: tag.id, label: tag.name }))
              ]}
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {bulkEditData.tagIds.map((tagId) => {
                const tag = tags.find(t => t.id === tagId);
                return (
                  <span
                    key={tagId}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-sm rounded"
                  >
                    {tag?.name || tagId}
                    <button
                      type="button"
                      onClick={() => setBulkEditData({
                        ...bulkEditData,
                        tagIds: bulkEditData.tagIds.filter(t => t !== tagId),
                      })}
                      className="hover:text-danger"
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleBulkEdit}
              disabled={isLoading || (bulkEditData.categoryIds.length === 0 && bulkEditData.tagIds.length === 0)}
              className="flex-1"
            >
              {isLoading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowBulkEditModal(false);
                setError(null);
                setBulkEditData({ categoryIds: [], tagIds: [] });
              }}
            >
              إلغاء
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
