'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { gooeyToast } from 'goey-toast';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  order: number;
  parentId: string | null;
  parent: { id: string; name: string; slug: string } | null;
  children: { id: string; name: string; slug: string }[];
  articleCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface CategoriesListClientProps {
  initialCategories: Category[];
}

export function CategoriesListClient({ initialCategories }: CategoriesListClientProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkColorModalOpen, setIsBulkColorModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [reassignTo, setReassignTo] = useState<string>('');
  const [bulkColor, setBulkColor] = useState<string>('#3b82f6');
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [draggedCategory, setDraggedCategory] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
    parentId: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);


  const flatCategories = flattenCategories(initialCategories);

  function flattenCategories(cats: Category[], level = 0): (Category & { level: number })[] {
    let result: (Category & { level: number })[] = [];
    for (const cat of cats) {
      result.push({ ...cat, level });
      if (cat.children && cat.children.length > 0) {
        const childCategories = cats.filter(c => c.parentId === cat.id);
        if (childCategories.length > 0) {
          result = result.concat(flattenCategories(childCategories, level + 1));
        }
      }
    }
    return result;
  }

  const openAddModal = () => {
    setEditingCategory(null);
    setFormData({ name: '', description: '', color: '#3b82f6', parentId: '' });
    setErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color || '#3b82f6',
      parentId: category.parentId || '',
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const openDeleteModal = (category: Category) => {
    setDeletingCategory(category);
    setReassignTo('');
    setIsDeleteModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setFormData({ name: '', description: '', color: '#3b82f6', parentId: '' });
    setErrors({});
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeletingCategory(null);
    setReassignTo('');
  };

  const closeBulkDeleteModal = () => {
    setIsBulkDeleteModalOpen(false);
    setReassignTo('');
  };

  const closeBulkColorModal = () => {
    setIsBulkColorModalOpen(false);
    setBulkColor('#3b82f6');
  };

  const toggleCategorySelection = (categoryId: string) => {
    const newSelection = new Set(selectedCategories);
    if (newSelection.has(categoryId)) {
      newSelection.delete(categoryId);
    } else {
      newSelection.add(categoryId);
    }
    setSelectedCategories(newSelection);
  };

  const selectAllCategories = () => {
    const flatIds = flatCategories.map(c => c.id);
    if (selectedCategories.size === flatIds.length) {
      setSelectedCategories(new Set());
    } else {
      setSelectedCategories(new Set(flatIds));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    try {
      const url = editingCategory
        ? `/api/admin/categories/${editingCategory.id}`
        : '/api/admin/categories';
      const method = editingCategory ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          color: formData.color || '#3b82f6',
          parentId: formData.parentId || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors({ submit: data.error || 'حدث خطأ' });
        return;
      }

      // Refresh categories
      await refreshCategories();
      closeModal();
      gooeyToast.success(editingCategory ? 'تم تحديث التصنيف بنجاح' : 'تم إنشاء التصنيف بنجاح');
    } catch (error) {
      setErrors({ submit: 'حدث خطأ في الاتصال' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;
    setIsLoading(true);

    try {
      const url = reassignTo
        ? `/api/admin/categories/${deletingCategory.id}?reassignTo=${reassignTo}`
        : `/api/admin/categories/${deletingCategory.id}`;

      const response = await fetch(url, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        gooeyToast.error(data.error || 'حدث خطأ أثناء الحذف');
        return;
      }

      // Refresh categories
      await refreshCategories();
      closeDeleteModal();
      gooeyToast.success('تم حذف التصنيف بنجاح');
    } catch (error) {
      gooeyToast.error('حدث خطأ في الاتصال');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshCategories = async () => {
    try {
      const response = await fetch('/api/admin/categories?includeCount=true&flat=true');
      const data = await response.json();
      if (response.ok) {
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Failed to refresh categories:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCategories.size === 0) return;
    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/categories/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selectedCategories),
          reassignTo: reassignTo || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        gooeyToast.error(data.error || 'حدث خطأ أثناء الحذف');
        return;
      }

      await refreshCategories();
      closeBulkDeleteModal();
      setSelectedCategories(new Set());
      gooeyToast.success(`تم حذف ${data.deletedCount} تصنيف بنجاح`);
    } catch (error) {
      gooeyToast.error('حدث خطأ في الاتصال');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkColorUpdate = async () => {
    if (selectedCategories.size === 0) return;
    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/categories/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selectedCategories),
          updates: { color: bulkColor },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        gooeyToast.error(data.error || 'حدث خطأ أثناء التحديث');
        return;
      }

      await refreshCategories();
      closeBulkColorModal();
      setSelectedCategories(new Set());
      gooeyToast.success(`تم تحديث ${data.updatedCount} تصنيف بنجاح`);
    } catch (error) {
      gooeyToast.error('حدث خطأ في الاتصال');
    } finally {
      setIsLoading(false);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (categoryId: string) => {
    setDraggedCategory(categoryId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetCategoryId: string) => {
    if (!draggedCategory || draggedCategory === targetCategoryId) return;

    // Find root categories only (no parent) and sort by order
    const rootCategories = categories
      .filter(cat => !cat.parentId)
      .sort((a, b) => a.order - b.order);

    const draggedIndex = rootCategories.findIndex(c => c.id === draggedCategory);
    const targetIndex = rootCategories.findIndex(c => c.id === targetCategoryId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Create new order
    const newOrder = [...rootCategories];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, rootCategories[draggedIndex]);

    // Update order values
    const updates = newOrder.map((cat, index) => ({ id: cat.id, order: index }));

    try {
      const response = await fetch('/api/admin/categories/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: updates }),
      });

      if (response.ok) {
        await refreshCategories();
        gooeyToast.success('تم إعادة ترتيب التصنيفات بنجاح');
      } else {
        gooeyToast.error('فشل في إعادة ترتيب التصنيفات');
      }
    } catch (error) {
      gooeyToast.error('حدث خطأ في الاتصال');
    }

    setDraggedCategory(null);
  };

  // Get parent options excluding current category and its descendants
  const getParentOptions = () => {
    const options = [{ value: '', label: 'بدون تصنيف أب' }];

    for (const cat of flatCategories) {
      // Skip the current category and its descendants
      if (editingCategory) {
        if (cat.id === editingCategory.id) continue;
        // Check if this is a descendant
        let isDescendant = false;
        let currentParent = cat.parentId;
        while (currentParent) {
          if (currentParent === editingCategory.id) {
            isDescendant = true;
            break;
          }
          const parent = flatCategories.find(c => c.id === currentParent);
          currentParent = parent?.parentId || null;
        }
        if (isDescendant) continue;
      }

      const prefix = '—'.repeat(cat.level);
      options.push({
        value: cat.id,
        label: prefix + (prefix ? ' ' : '') + cat.name,
      });
    }

    return options;
  };

  // Build display tree from flat list - sort root categories by order
  const displayCategories = categories
    .filter(cat => !cat.parentId)
    .sort((a, b) => a.order - b.order);

  const renderCategoryRow = (category: Category, level = 0) => {
    const childCategories = categories
      .filter(c => c.parentId === category.id)
      .sort((a, b) => a.order - b.order);

    const isRootLevel = level === 0;
    const isDragged = draggedCategory === category.id;
    const isSelected = selectedCategories.has(category.id);

    return (
      <div key={category.id}>
        <div
          className={`flex items-center justify-between py-4 px-6 hover:bg-muted/50 border-b border-border last:border-b-0 transition-all ${
            isDragged ? 'opacity-50 bg-muted' : ''
          } ${isSelected ? 'bg-muted/30' : ''} ${
            isReorderMode && isRootLevel ? 'cursor-move' : ''
          }`}
          draggable={isReorderMode && isRootLevel}
          onDragStart={() => handleDragStart(category.id)}
          onDragOver={handleDragOver}
          onDrop={() => handleDrop(category.id)}
        >
          <div className="flex items-center gap-4">
            {/* Selection checkbox (only in bulk mode) */}
            {isRootLevel && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleCategorySelection(category.id)}
                className="w-4 h-4 rounded border-border"
              />
            )}

            {/* Indentation */}
            <div style={{ width: level * 24 }} />

            {/* Drag handle indicator */}
            {isReorderMode && isRootLevel && (
              <div className="cursor-grab text-muted-foreground">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
                </svg>
              </div>
            )}

            {/* Folder icon with color */}
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: category.color + '20', border: `2px solid ${category.color}` }}
            >
              <svg className="w-5 h-5" style={{ color: category.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>

            {/* Category info */}
            <div>
              <h3 className="font-medium text-foreground">{category.name}</h3>
              <p className="text-sm text-muted-foreground">
                {category.slug}
                {category.articleCount !== undefined && (
                  <span className="mr-2">• {category.articleCount} مقال</span>
                )}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openEditModal(category)}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openDeleteModal(category)}
            >
              <svg className="w-4 h-4 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </Button>
          </div>
        </div>

        {/* Render children */}
        {childCategories.map(child => renderCategoryRow(child, level + 1))}
      </div>
    );
  };

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="flex items-center gap-2 flex-1">
          <Button onClick={openAddModal}>
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            إضافة تصنيف
          </Button>

          <Button
            variant={isReorderMode ? "primary" : "secondary"}
            onClick={() => setIsReorderMode(!isReorderMode)}
          >
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
            {isReorderMode ? 'إنهاء الترتيب' : 'إعادة ترتيب'}
          </Button>

          {isReorderMode && (
            <span className="text-sm text-muted-foreground">
              اسحب التصنيفات لإعادة ترتيبها
            </span>
          )}
        </div>

        {/* Bulk actions */}
        {selectedCategories.size > 0 && !isReorderMode && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedCategories.size} تصنيف محدد
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsBulkColorModalOpen(true)}
            >
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              تغيير اللون
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setIsBulkDeleteModalOpen(true)}
            >
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              حذف المحدد
            </Button>
          </div>
        )}

        {/* Select all button (only when not in reorder mode) */}
        {!isReorderMode && displayCategories.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={selectAllCategories}
          >
            {selectedCategories.size === flatCategories.length ? 'إلغاء التحديد' : 'تحديد الكل'}
          </Button>
        )}
      </div>

      {/* Categories List */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {displayCategories.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <h3 className="font-medium text-foreground mb-2">لا توجد تصنيفات</h3>
            <p className="text-sm text-muted-foreground mb-4">ابدأ بإضافة تصنيف جديد لتنظيم المقالات</p>
            <Button onClick={openAddModal}>إضافة تصنيف</Button>
          </div>
        ) : (
          displayCategories.map(category => renderCategoryRow(category))
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingCategory ? 'تعديل التصنيف' : 'إضافة تصنيف جديد'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.submit && (
            <Alert type="error" message={errors.submit} />
          )}

          <Input
            label="اسم التصنيف"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={errors.name}
            required
            autoFocus
          />

          <div>
            <label className="block text-sm font-medium mb-2">لون التصنيف</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-12 h-12 rounded-lg border-2 border-border cursor-pointer"
              />
              <Input
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                placeholder="#3b82f6"
                className="flex-1 font-mono"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                { color: '#3b82f6', name: 'أزرق' },
                { color: '#10b981', name: 'أخضر' },
                { color: '#f59e0b', name: 'برتقالي' },
                { color: '#ef4444', name: 'أحمر' },
                { color: '#8b5cf6', name: 'بنفسجي' },
                { color: '#ec4899', name: 'وردي' },
                { color: '#06b6d4', name: 'سماوي' },
                { color: '#84cc16', name: 'ليموني' },
              ].map((preset) => (
                <button
                  key={preset.color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: preset.color })}
                  className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                    formData.color === preset.color ? 'border-foreground scale-110' : 'border-border'
                  }`}
                  style={{ backgroundColor: preset.color }}
                  title={preset.name}
                />
              ))}
            </div>
          </div>

          <Textarea
            label="الوصف (اختياري)"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
          />

          <Select
            label="التصنيف الأب"
            value={formData.parentId}
            onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
            options={getParentOptions()}
          />

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? 'جارٍ الحفظ...' : editingCategory ? 'حفظ التغييرات' : 'إضافة التصنيف'}
            </Button>
            <Button type="button" variant="secondary" onClick={closeModal}>
              إلغاء
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        title="حذف التصنيف"
        size="md"
      >
        {deletingCategory && (
          <div className="space-y-4">
            <Alert
              type="warning"
              message={`هل أنت متأكد من حذف التصنيف "${deletingCategory.name}"؟`}
            />

            {deletingCategory.articleCount && deletingCategory.articleCount > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  يحتوي هذا التصنيف على {deletingCategory.articleCount} مقال. يمكنك نقل المقالات إلى تصنيف آخر.
                </p>
                <Select
                  label="نقل المقالات إلى (اختياري)"
                  value={reassignTo}
                  onChange={(e) => setReassignTo(e.target.value)}
                  options={[
                    { value: '', label: 'بدون نقل - إزالة التصنيف فقط' },
                    ...flatCategories
                      .filter(c => c.id !== deletingCategory.id)
                      .map(c => ({ value: c.id, label: c.name })),
                  ]}
                />
              </div>
            )}

            {deletingCategory.children && deletingCategory.children.length > 0 && (
              <Alert
                type="info"
                message={`سيتم نقل ${deletingCategory.children.length} تصنيفات فرعية إلى التصنيف الأب.`}
              />
            )}

            <div className="flex gap-3 pt-4">
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? 'جارٍ الحذف...' : 'حذف التصنيف'}
              </Button>
              <Button variant="secondary" onClick={closeDeleteModal}>
                إلغاء
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Bulk Delete Modal */}
      <Modal
        isOpen={isBulkDeleteModalOpen}
        onClose={closeBulkDeleteModal}
        title="حذف التصنيفات المحددة"
        size="md"
      >
        <div className="space-y-4">
          <Alert
            type="warning"
            message={`هل أنت متأكد من حذف ${selectedCategories.size} تصنيف؟`}
          />

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              يمكنك نقل المقالات من هذه التصنيفات إلى تصنيف آخر قبل الحذف.
            </p>
            <Select
              label="نقل المقالات إلى (اختياري)"
              value={reassignTo}
              onChange={(e) => setReassignTo(e.target.value)}
              options={[
                { value: '', label: 'بدون نقل - إزالة التصنيفات فقط' },
                ...flatCategories
                  .filter(c => !selectedCategories.has(c.id))
                  .map(c => ({ value: c.id, label: c.name })),
              ]}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="danger"
              onClick={handleBulkDelete}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? 'جارٍ الحذف...' : 'حذف التصنيفات'}
            </Button>
            <Button variant="secondary" onClick={closeBulkDeleteModal}>
              إلغاء
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Color Modal */}
      <Modal
        isOpen={isBulkColorModalOpen}
        onClose={closeBulkColorModal}
        title="تغيير لون التصنيفات"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            اختر لونًا جديدًا لـ {selectedCategories.size} تصنيف محدد.
          </p>

          <div>
            <label className="block text-sm font-medium mb-2">اللون</label>
            <div className="flex items-center gap-3 mb-3">
              <input
                type="color"
                value={bulkColor}
                onChange={(e) => setBulkColor(e.target.value)}
                className="w-12 h-12 rounded-lg border-2 border-border cursor-pointer"
              />
              <Input
                value={bulkColor}
                onChange={(e) => setBulkColor(e.target.value)}
                placeholder="#3b82f6"
                className="flex-1 font-mono"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { color: '#3b82f6', name: 'أزرق' },
                { color: '#10b981', name: 'أخضر' },
                { color: '#f59e0b', name: 'برتقالي' },
                { color: '#ef4444', name: 'أحمر' },
                { color: '#8b5cf6', name: 'بنفسجي' },
                { color: '#ec4899', name: 'وردي' },
                { color: '#06b6d4', name: 'سماوي' },
                { color: '#84cc16', name: 'ليموني' },
              ].map((preset) => (
                <button
                  key={preset.color}
                  type="button"
                  onClick={() => setBulkColor(preset.color)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                    bulkColor === preset.color ? 'border-foreground scale-110' : 'border-border'
                  }`}
                  style={{ backgroundColor: preset.color }}
                  title={preset.name}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleBulkColorUpdate}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? 'جارٍ التحديث...' : 'تحديث الألوان'}
            </Button>
            <Button variant="secondary" onClick={closeBulkColorModal}>
              إلغاء
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
