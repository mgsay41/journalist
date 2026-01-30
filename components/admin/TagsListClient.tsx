'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Alert, Toast } from '@/components/ui/Alert';

interface Tag {
  id: string;
  name: string;
  slug: string;
  articleCount?: number;
  createdAt: string;
}

interface TagsListClientProps {
  initialTags: Tag[];
}

export function TagsListClient({ initialTags }: TagsListClientProps) {
  const [tags, setTags] = useState<Tag[]>(initialTags);
  const [filteredTags, setFilteredTags] = useState<Tag[]>(initialTags);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [deletingTag, setDeletingTag] = useState<Tag | null>(null);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [mergeTargetId, setMergeTargetId] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredTags(tags);
    } else {
      const lowerQuery = query.toLowerCase();
      setFilteredTags(tags.filter(tag =>
        tag.name.toLowerCase().includes(lowerQuery) ||
        tag.slug.toLowerCase().includes(lowerQuery)
      ));
    }
  };

  const openAddModal = () => {
    setEditingTag(null);
    setFormData({ name: '' });
    setErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (tag: Tag) => {
    setEditingTag(tag);
    setFormData({ name: tag.name });
    setErrors({});
    setIsModalOpen(true);
  };

  const openDeleteModal = (tag: Tag) => {
    setDeletingTag(tag);
    setIsDeleteModalOpen(true);
  };

  const openMergeModal = () => {
    if (selectedTags.size < 2) {
      setToast({ type: 'error', message: 'يجب تحديد وسمين على الأقل للدمج' });
      return;
    }
    setMergeTargetId('');
    setIsMergeModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTag(null);
    setFormData({ name: '' });
    setErrors({});
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeletingTag(null);
  };

  const closeMergeModal = () => {
    setIsMergeModalOpen(false);
    setMergeTargetId('');
  };

  const toggleTagSelection = (tagId: string) => {
    const newSelection = new Set(selectedTags);
    if (newSelection.has(tagId)) {
      newSelection.delete(tagId);
    } else {
      newSelection.add(tagId);
    }
    setSelectedTags(newSelection);
  };

  const selectAllTags = () => {
    if (selectedTags.size === filteredTags.length) {
      setSelectedTags(new Set());
    } else {
      setSelectedTags(new Set(filteredTags.map(t => t.id)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    try {
      const url = editingTag
        ? `/api/admin/tags/${editingTag.id}`
        : '/api/admin/tags';
      const method = editingTag ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors({ submit: data.error || 'حدث خطأ' });
        return;
      }

      // Refresh tags
      await refreshTags();
      closeModal();
      setToast({
        type: 'success',
        message: editingTag ? 'تم تحديث الوسم بنجاح' : 'تم إنشاء الوسم بنجاح',
      });
    } catch (error) {
      setErrors({ submit: 'حدث خطأ في الاتصال' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingTag) return;
    setIsLoading(true);

    try {
      const response = await fetch(`/api/admin/tags/${deletingTag.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        setToast({ type: 'error', message: data.error || 'حدث خطأ أثناء الحذف' });
        return;
      }

      // Refresh tags
      await refreshTags();
      closeDeleteModal();
      setToast({ type: 'success', message: 'تم حذف الوسم بنجاح' });
    } catch (error) {
      setToast({ type: 'error', message: 'حدث خطأ في الاتصال' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMerge = async () => {
    if (!mergeTargetId || selectedTags.size < 2) return;
    setIsLoading(true);

    try {
      const sourceTagIds = Array.from(selectedTags).filter(id => id !== mergeTargetId);

      const response = await fetch('/api/admin/tags/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceTagIds,
          targetTagId: mergeTargetId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setToast({ type: 'error', message: data.error || 'حدث خطأ أثناء الدمج' });
        return;
      }

      // Refresh tags
      await refreshTags();
      closeMergeModal();
      setSelectedTags(new Set());
      setToast({
        type: 'success',
        message: `تم دمج ${data.mergedCount} وسم بنجاح`,
      });
    } catch (error) {
      setToast({ type: 'error', message: 'حدث خطأ في الاتصال' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUnused = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/tags?unusedOnly=true', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        setToast({ type: 'error', message: data.error || 'حدث خطأ أثناء الحذف' });
        return;
      }

      // Refresh tags
      await refreshTags();
      setToast({
        type: 'success',
        message: data.deletedCount > 0
          ? `تم حذف ${data.deletedCount} وسم غير مستخدم`
          : 'لا توجد وسوم غير مستخدمة',
      });
    } catch (error) {
      setToast({ type: 'error', message: 'حدث خطأ في الاتصال' });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshTags = async () => {
    try {
      const response = await fetch('/api/admin/tags?includeCount=true');
      const data = await response.json();
      if (response.ok) {
        setTags(data.tags);
        setFilteredTags(data.tags);
        setSearchQuery('');
      }
    } catch (error) {
      console.error('Failed to refresh tags:', error);
    }
  };

  const selectedTagsList = tags.filter(t => selectedTags.has(t.id));

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

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="flex-1">
          <Input
            type="search"
            placeholder="البحث في الوسوم..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {selectedTags.size > 1 && (
            <Button variant="secondary" onClick={openMergeModal}>
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              دمج ({selectedTags.size})
            </Button>
          )}
          <Button variant="secondary" onClick={handleDeleteUnused} disabled={isLoading}>
            حذف غير المستخدمة
          </Button>
          <Button onClick={openAddModal}>
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            إضافة وسم
          </Button>
        </div>
      </div>

      {/* Tags Grid */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {filteredTags.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <h3 className="font-medium text-foreground mb-2">
              {searchQuery ? 'لا توجد نتائج' : 'لا توجد وسوم'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery ? 'جرب البحث بكلمات مختلفة' : 'ابدأ بإضافة وسم جديد لتنظيم المقالات'}
            </p>
            {!searchQuery && <Button onClick={openAddModal}>إضافة وسم</Button>}
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="flex items-center py-3 px-6 bg-muted/50 border-b border-border text-sm font-medium text-muted-foreground">
              <div className="w-8">
                <input
                  type="checkbox"
                  checked={selectedTags.size === filteredTags.length && filteredTags.length > 0}
                  onChange={selectAllTags}
                  className="rounded border-border"
                />
              </div>
              <div className="flex-1 mr-4">الاسم</div>
              <div className="w-24 text-center">المقالات</div>
              <div className="w-24 text-center">الإجراءات</div>
            </div>

            {/* Table Body */}
            {filteredTags.map(tag => (
              <div
                key={tag.id}
                className={`flex items-center py-4 px-6 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors ${
                  selectedTags.has(tag.id) ? 'bg-muted/30' : ''
                }`}
              >
                <div className="w-8">
                  <input
                    type="checkbox"
                    checked={selectedTags.has(tag.id)}
                    onChange={() => toggleTagSelection(tag.id)}
                    className="rounded border-border"
                  />
                </div>
                <div className="flex-1 mr-4">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-muted text-foreground">
                      <svg className="w-3 h-3 ml-1 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      {tag.name}
                    </span>
                    <span className="text-sm text-muted-foreground">{tag.slug}</span>
                  </div>
                </div>
                <div className="w-24 text-center">
                  <span className={`text-sm ${tag.articleCount === 0 ? 'text-muted-foreground' : 'text-foreground'}`}>
                    {tag.articleCount || 0}
                  </span>
                </div>
                <div className="w-24 flex justify-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditModal(tag)}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDeleteModal(tag)}
                  >
                    <svg className="w-4 h-4 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </Button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Results count */}
      {filteredTags.length > 0 && (
        <div className="text-sm text-muted-foreground mt-4">
          عرض {filteredTags.length} من {tags.length} وسم
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingTag ? 'تعديل الوسم' : 'إضافة وسم جديد'}
        size="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.submit && (
            <Alert type="error" message={errors.submit} />
          )}

          <Input
            label="اسم الوسم"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={errors.name}
            required
            autoFocus
            placeholder="مثال: تكنولوجيا"
          />

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? 'جارٍ الحفظ...' : editingTag ? 'حفظ التغييرات' : 'إضافة الوسم'}
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
        title="حذف الوسم"
        size="sm"
      >
        {deletingTag && (
          <div className="space-y-4">
            <Alert
              type="warning"
              message={`هل أنت متأكد من حذف الوسم "${deletingTag.name}"؟`}
            />

            {deletingTag.articleCount && deletingTag.articleCount > 0 && (
              <p className="text-sm text-muted-foreground">
                سيتم إزالة هذا الوسم من {deletingTag.articleCount} مقال.
              </p>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? 'جارٍ الحذف...' : 'حذف الوسم'}
              </Button>
              <Button variant="secondary" onClick={closeDeleteModal}>
                إلغاء
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Merge Modal */}
      <Modal
        isOpen={isMergeModalOpen}
        onClose={closeMergeModal}
        title="دمج الوسوم"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            حدد الوسم الهدف الذي ستُدمج فيه الوسوم المحددة. سيتم نقل جميع المقالات إلى الوسم الهدف.
          </p>

          <div className="space-y-2">
            <label className="block text-sm font-medium">الوسوم المحددة ({selectedTags.size})</label>
            <div className="flex flex-wrap gap-2">
              {selectedTagsList.map(tag => (
                <span
                  key={tag.id}
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm cursor-pointer transition-colors ${
                    mergeTargetId === tag.id
                      ? 'bg-foreground text-background'
                      : 'bg-muted text-foreground hover:bg-muted/80'
                  }`}
                  onClick={() => setMergeTargetId(tag.id)}
                >
                  {tag.name}
                  {mergeTargetId === tag.id && (
                    <span className="mr-1 text-xs">(الهدف)</span>
                  )}
                </span>
              ))}
            </div>
          </div>

          {!mergeTargetId && (
            <Alert
              type="info"
              message="انقر على أحد الوسوم أعلاه لتحديده كهدف للدمج"
            />
          )}

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleMerge}
              disabled={isLoading || !mergeTargetId}
              className="flex-1"
            >
              {isLoading ? 'جارٍ الدمج...' : 'دمج الوسوم'}
            </Button>
            <Button variant="secondary" onClick={closeMergeModal}>
              إلغاء
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
