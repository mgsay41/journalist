'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/Loading';
import {
  extractYouTubeId,
  getYouTubeThumbnail,
  buildYouTubeWatchUrl,
  formatDuration,
  isValidYouTubeUrl,
} from '@/lib/youtube';

interface VideoWithArticle {
  id: string;
  youtubeUrl: string;
  youtubeId: string;
  title: string | null;
  thumbnail: string;
  privacyMode: boolean;
  autoplay: boolean;
  startTime: number;
  position: number;
  articleId: string;
  createdAt: Date;
  article: {
    id: string;
    title: string;
    slug: string;
    status: string;
  };
}

interface ArticleOption {
  id: string;
  title: string;
  status: string;
}

interface VideosListClientProps {
  initialVideos: VideoWithArticle[];
  initialTotal: number;
  articles: ArticleOption[];
}

export default function VideosListClient({
  initialVideos,
  initialTotal,
  articles,
}: VideosListClientProps) {
  const [videos, setVideos] = useState<VideoWithArticle[]>(initialVideos);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [articleFilter, setArticleFilter] = useState('');
  const [page, setPage] = useState(1);

  // Selection
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);

  // Modals
  const [editingVideo, setEditingVideo] = useState<VideoWithArticle | null>(null);
  const [deletingVideo, setDeletingVideo] = useState<VideoWithArticle | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  // Form state for add/edit
  const [formData, setFormData] = useState({
    youtubeUrl: '',
    title: '',
    articleId: '',
    privacyMode: false,
    autoplay: false,
    startTime: 0,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const limit = 20;
  const totalPages = Math.ceil(total / limit);

  // Fetch videos with current filters
  const fetchVideos = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      if (search) params.set('search', search);
      if (articleFilter) params.set('articleId', articleFilter);

      const response = await fetch(`/api/admin/videos?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل في جلب الفيديوهات');
      }

      setVideos(data.videos);
      setTotal(data.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  }, [page, search, articleFilter]);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchVideos();
  };

  // Clear filters
  const clearFilters = () => {
    setSearch('');
    setArticleFilter('');
    setPage(1);
    fetchVideos();
  };

  // Toggle video selection
  const toggleVideoSelection = (videoId: string) => {
    setSelectedVideos((prev) =>
      prev.includes(videoId)
        ? prev.filter((id) => id !== videoId)
        : [...prev, videoId]
    );
  };

  // Toggle all selection
  const toggleAllSelection = () => {
    if (selectedVideos.length === videos.length) {
      setSelectedVideos([]);
    } else {
      setSelectedVideos(videos.map((v) => v.id));
    }
  };

  // Open add modal
  const openAddModal = () => {
    setFormData({
      youtubeUrl: '',
      title: '',
      articleId: articles[0]?.id || '',
      privacyMode: false,
      autoplay: false,
      startTime: 0,
    });
    setFormError(null);
    setShowAddModal(true);
  };

  // Open edit modal
  const openEditModal = (video: VideoWithArticle) => {
    setFormData({
      youtubeUrl: video.youtubeUrl,
      title: video.title || '',
      articleId: video.articleId,
      privacyMode: video.privacyMode,
      autoplay: video.autoplay,
      startTime: video.startTime,
    });
    setFormError(null);
    setEditingVideo(video);
  };

  // Save video (create or update)
  const saveVideo = async () => {
    setFormError(null);

    // Validate URL
    if (!isValidYouTubeUrl(formData.youtubeUrl)) {
      setFormError('رابط YouTube غير صالح');
      return;
    }

    if (!formData.articleId) {
      setFormError('يجب اختيار مقال');
      return;
    }

    setSaving(true);

    try {
      const isEditing = !!editingVideo;
      const url = isEditing
        ? `/api/admin/videos/${editingVideo.id}`
        : '/api/admin/videos';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل في حفظ الفيديو');
      }

      setSuccess(isEditing ? 'تم تحديث الفيديو بنجاح' : 'تم إضافة الفيديو بنجاح');
      setShowAddModal(false);
      setEditingVideo(null);
      fetchVideos();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

  // Delete single video
  const deleteVideo = async () => {
    if (!deletingVideo) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/videos/${deletingVideo.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل في حذف الفيديو');
      }

      setSuccess('تم حذف الفيديو بنجاح');
      setDeletingVideo(null);
      fetchVideos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

  // Bulk delete videos
  const bulkDeleteVideos = async () => {
    if (selectedVideos.length === 0) return;

    setSaving(true);
    try {
      const response = await fetch('/api/admin/videos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoIds: selectedVideos }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل في حذف الفيديوهات');
      }

      setSuccess(data.message);
      setSelectedVideos([]);
      setShowBulkDeleteModal(false);
      fetchVideos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: string): 'default' | 'success' | 'warning' | 'secondary' => {
    switch (status) {
      case 'published':
        return 'success';
      case 'draft':
        return 'secondary';
      case 'scheduled':
        return 'warning';
      default:
        return 'default';
    }
  };

  // Preview URL in form
  const previewVideoId = formData.youtubeUrl ? extractYouTubeId(formData.youtubeUrl) : null;

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {error && (
        <Alert type="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert type="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Filters and Actions */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-2 items-center">
          <Input
            type="search"
            placeholder="بحث عن فيديو..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Select
            value={articleFilter}
            onChange={(e) => {
              setArticleFilter(e.target.value);
              setPage(1);
            }}
            className="w-48"
            options={[
              { value: '', label: 'كل المقالات' },
              ...articles.map((article) => ({
                value: article.id,
                label: article.title,
              })),
            ]}
          />
          <Button type="submit" variant="secondary">
            بحث
          </Button>
          {(search || articleFilter) && (
            <Button type="button" variant="ghost" onClick={clearFilters}>
              مسح الفلاتر
            </Button>
          )}
        </form>

        <div className="flex gap-2">
          {selectedVideos.length > 0 && (
            <Button
              variant="danger"
              onClick={() => setShowBulkDeleteModal(true)}
            >
              حذف المحدد ({selectedVideos.length})
            </Button>
          )}
          <Button onClick={openAddModal}>
            <svg
              className="w-4 h-4 ml-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            إضافة فيديو
          </Button>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        عرض {videos.length} من {total} فيديو
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Empty state */}
      {!loading && videos.length === 0 && (
        <EmptyState
          title="لا توجد فيديوهات"
          description="لم يتم العثور على فيديوهات. أضف فيديو جديد من YouTube."
          icon={
            <svg
              className="w-12 h-12 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
      )}

      {/* Videos Table */}
      {!loading && videos.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-right">
                  <input
                    type="checkbox"
                    checked={selectedVideos.length === videos.length}
                    onChange={toggleAllSelection}
                    className="rounded"
                  />
                </th>
                <th className="p-3 text-right">الفيديو</th>
                <th className="p-3 text-right">المقال</th>
                <th className="p-3 text-right">الإعدادات</th>
                <th className="p-3 text-right">التاريخ</th>
                <th className="p-3 text-right">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {videos.map((video) => (
                <tr key={video.id} className="border-t hover:bg-muted/30">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedVideos.includes(video.id)}
                      onChange={() => toggleVideoSelection(video.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="relative w-24 h-14 rounded overflow-hidden bg-muted">
                        <Image
                          src={video.thumbnail}
                          alt={video.title || 'YouTube video'}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <svg
                            className="w-8 h-8 text-white"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                      <div>
                        <div className="font-medium line-clamp-1">
                          {video.title || video.youtubeId}
                        </div>
                        <a
                          href={buildYouTubeWatchUrl(video.youtubeId, video.startTime)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:text-primary"
                        >
                          {video.youtubeId}
                        </a>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="space-y-1">
                      <Link
                        href={`/admin/articles/${video.article.id}/edit`}
                        className="text-sm hover:underline line-clamp-1"
                      >
                        {video.article.title}
                      </Link>
                      <Badge variant={getStatusBadgeVariant(video.article.status)} size="sm">
                        {video.article.status === 'published' && 'منشور'}
                        {video.article.status === 'draft' && 'مسودة'}
                        {video.article.status === 'scheduled' && 'مجدول'}
                        {video.article.status === 'archived' && 'مؤرشف'}
                      </Badge>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {video.privacyMode && (
                        <Badge variant="secondary" size="sm">
                          خصوصية
                        </Badge>
                      )}
                      {video.autoplay && (
                        <Badge variant="secondary" size="sm">
                          تشغيل تلقائي
                        </Badge>
                      )}
                      {video.startTime > 0 && (
                        <Badge variant="secondary" size="sm">
                          يبدأ {formatDuration(video.startTime)}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">
                    {new Date(video.createdAt).toLocaleDateString('ar-SA')}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(video)}
                        title="تعديل"
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
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </Button>
                      <a
                        href={buildYouTubeWatchUrl(video.youtubeId, video.startTime)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-muted rounded-md"
                        title="فتح في YouTube"
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
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </a>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingVideo(video)}
                        title="حذف"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            السابق
          </Button>
          <span className="text-sm text-muted-foreground">
            صفحة {page} من {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            التالي
          </Button>
        </div>
      )}

      {/* Add/Edit Video Modal */}
      <Modal
        isOpen={showAddModal || !!editingVideo}
        onClose={() => {
          setShowAddModal(false);
          setEditingVideo(null);
        }}
        title={editingVideo ? 'تعديل الفيديو' : 'إضافة فيديو جديد'}
      >
        <div className="space-y-4">
          {formError && (
            <Alert type="error" onClose={() => setFormError(null)}>
              {formError}
            </Alert>
          )}

          {/* YouTube URL */}
          <Input
            label="رابط YouTube"
            type="url"
            value={formData.youtubeUrl}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, youtubeUrl: e.target.value }))
            }
            placeholder="https://www.youtube.com/watch?v=..."
            disabled={!!editingVideo}
          />

          {/* Preview */}
          {previewVideoId && (
            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted">
              <Image
                src={getYouTubeThumbnail(previewVideoId, 'high')}
                alt="Video preview"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <svg
                  className="w-16 h-16 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          )}

          {/* Title */}
          <Input
            label="العنوان (اختياري)"
            value={formData.title}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, title: e.target.value }))
            }
            placeholder="عنوان مخصص للفيديو"
          />

          {/* Article */}
          <Select
            label="المقال"
            value={formData.articleId}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, articleId: e.target.value }))
            }
            disabled={!!editingVideo}
            placeholder="اختر مقال"
            options={articles.map((article) => ({
              value: article.id,
              label: article.title,
            }))}
          />

          {/* Start Time */}
          <Input
            label="وقت البدء (بالثواني)"
            type="number"
            min={0}
            value={formData.startTime}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                startTime: parseInt(e.target.value, 10) || 0,
              }))
            }
            placeholder="0"
            helperText={
              formData.startTime > 0
                ? `سيبدأ عند ${formatDuration(formData.startTime)}`
                : ''
            }
          />

          {/* Options */}
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.privacyMode}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    privacyMode: e.target.checked,
                  }))
                }
                className="rounded"
              />
              <span className="text-sm">وضع الخصوصية المحسّن</span>
              <span className="text-xs text-muted-foreground">
                (youtube-nocookie.com)
              </span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.autoplay}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    autoplay: e.target.checked,
                  }))
                }
                className="rounded"
              />
              <span className="text-sm">تشغيل تلقائي</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="secondary"
              onClick={() => {
                setShowAddModal(false);
                setEditingVideo(null);
              }}
            >
              إلغاء
            </Button>
            <Button onClick={saveVideo} disabled={saving}>
              {saving ? (
                <>
                  <LoadingSpinner size="sm" className="ml-2" />
                  جاري الحفظ...
                </>
              ) : editingVideo ? (
                'تحديث'
              ) : (
                'إضافة'
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingVideo}
        onClose={() => setDeletingVideo(null)}
        title="حذف الفيديو"
      >
        <div className="space-y-4">
          <p>
            هل أنت متأكد من حذف الفيديو{' '}
            <strong>{deletingVideo?.title || deletingVideo?.youtubeId}</strong>؟
          </p>
          <p className="text-sm text-muted-foreground">
            سيتم إزالة الفيديو من المقال. لا يمكن التراجع عن هذا الإجراء.
          </p>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="secondary" onClick={() => setDeletingVideo(null)}>
              إلغاء
            </Button>
            <Button variant="danger" onClick={deleteVideo} disabled={saving}>
              {saving ? (
                <>
                  <LoadingSpinner size="sm" className="ml-2" />
                  جاري الحذف...
                </>
              ) : (
                'حذف'
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Delete Confirmation Modal */}
      <Modal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        title="حذف الفيديوهات المحددة"
      >
        <div className="space-y-4">
          <p>
            هل أنت متأكد من حذف <strong>{selectedVideos.length}</strong> فيديو؟
          </p>
          <p className="text-sm text-muted-foreground">
            سيتم إزالة الفيديوهات من المقالات. لا يمكن التراجع عن هذا الإجراء.
          </p>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="secondary"
              onClick={() => setShowBulkDeleteModal(false)}
            >
              إلغاء
            </Button>
            <Button
              variant="danger"
              onClick={bulkDeleteVideos}
              disabled={saving}
            >
              {saving ? (
                <>
                  <LoadingSpinner size="sm" className="ml-2" />
                  جاري الحذف...
                </>
              ) : (
                `حذف ${selectedVideos.length} فيديو`
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
