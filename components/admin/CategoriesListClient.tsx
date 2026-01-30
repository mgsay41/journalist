'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Modal } from '@/components/ui/Modal';
import { Alert, Toast } from '@/components/ui/Alert';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [reassignTo, setReassignTo] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parentId: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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
    setFormData({ name: '', description: '', parentId: '' });
    setErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
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
    setFormData({ name: '', description: '', parentId: '' });
    setErrors({});
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeletingCategory(null);
    setReassignTo('');
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
      setToast({
        type: 'success',
        message: editingCategory ? 'تم تحديث التصنيف بنجاح' : 'تم إنشاء التصنيف بنجاح',
      });
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
        setToast({ type: 'error', message: data.error || 'حدث خطأ أثناء الحذف' });
        return;
      }

      // Refresh categories
      await refreshCategories();
      closeDeleteModal();
      setToast({ type: 'success', message: 'تم حذف التصنيف بنجاح' });
    } catch (error) {
      setToast({ type: 'error', message: 'حدث خطأ في الاتصال' });
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

  // Build display tree from flat list
  const displayCategories = categories.filter(cat => !cat.parentId);

  const renderCategoryRow = (category: Category, level = 0) => {
    const childCategories = categories.filter(c => c.parentId === category.id);

    return (
      <div key={category.id}>
        <div className="flex items-center justify-between py-4 px-6 hover:bg-muted/50 border-b border-border last:border-b-0">
          <div className="flex items-center gap-4">
            {/* Indentation */}
            <div style={{ width: level * 24 }} />

            {/* Folder icon */}
            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      {/* Toast notification */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Add Category Button */}
      <div className="flex justify-end mb-4">
        <Button onClick={openAddModal}>
          <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          إضافة تصنيف
        </Button>
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
    </>
  );
}
