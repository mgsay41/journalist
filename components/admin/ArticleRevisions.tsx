'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { sanitizeArticleContent } from '@/lib/security/sanitization';
import { gooeyToast } from 'goey-toast';

interface RevisionAuthor {
  id: string;
  name: string;
  email: string;
}

interface ArticleRevision {
  id: string;
  articleId: string;
  authorId: string;
  author: RevisionAuthor;
  title: string;
  content: string;
  excerpt: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  changeNote: string | null;
  isAutoSave: boolean;
  createdAt: string;
}

interface ArticleRevisionsProps {
  articleId: string;
  isOpen: boolean;
  onClose: () => void;
  onRestore?: (revision: ArticleRevision) => void;
}

export function ArticleRevisions({
  articleId,
  isOpen,
  onClose,
  onRestore,
}: ArticleRevisionsProps) {
  const [revisions, setRevisions] = useState<ArticleRevision[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRevision, setSelectedRevision] = useState<ArticleRevision | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const fetchRevisions = useCallback(async () => {
    if (!articleId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/articles/${articleId}/revisions`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch revisions');
      }

      setRevisions(data.revisions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch revisions');
    } finally {
      setLoading(false);
    }
  }, [articleId]);

  useEffect(() => {
    if (isOpen) {
      fetchRevisions();
    }
  }, [isOpen, fetchRevisions]);

  const handleRestore = async (revision: ArticleRevision) => {
    if (!confirm('هل أنت متأكد من استعادة هذه النسخة؟ سيتم حفظ النسخة الحالية تلقائياً قبل الاستعادة.')) {
      return;
    }

    setRestoring(true);

    try {
      const response = await fetch(
        `/api/admin/articles/${articleId}/revisions/${revision.id}/restore`,
        { method: 'POST' }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to restore revision');
      }

      // Refresh the page to show restored content
      window.location.reload();
    } catch (err) {
      gooeyToast.error(err instanceof Error ? err.message : 'Failed to restore revision');
    } finally {
      setRestoring(false);
    }
  };

  const handlePreview = (revision: ArticleRevision) => {
    setSelectedRevision(revision);
    setPreviewOpen(true);
  };

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr));
  };

  const getRevisionLabel = (revision: ArticleRevision) => {
    if (revision.changeNote) return revision.changeNote;
    if (revision.isAutoSave) return 'حفظ تلقائي';
    return 'نسخة محفوظة';
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="سجل التعديلات" size="xl">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
            {error}
          </div>
        ) : revisions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <svg
              className="w-16 h-16 mx-auto mb-4 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p>لا يوجد سجل للتعديلات بعد</p>
          </div>
        ) : (
          <div className="space-y-3">
            {revisions.map((revision) => (
              <div
                key={revision.id}
                className={`border rounded-lg p-4 transition-colors ${
                  selectedRevision?.id === revision.id
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-muted/30'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-foreground truncate">
                        {revision.title}
                      </h4>
                      {revision.isAutoSave && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          تلقائي
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground mb-2">
                      {getRevisionLabel(revision)}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>بواسطة {revision.author.name}</span>
                      <span>{formatDate(revision.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePreview(revision)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      معاينة
                    </Button>

                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => handleRestore(revision)}
                      disabled={restoring}
                    >
                      {restoring ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current ml-1" />
                          جاري الاستعادة...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          استعادة
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Preview Modal */}
      {selectedRevision && (
        <Modal
          isOpen={previewOpen}
          onClose={() => {
            setPreviewOpen(false);
            setSelectedRevision(null);
          }}
          title={`معاينة: ${selectedRevision.title}`}
          size="xl"
        >
          <div className="prose prose-sm max-w-none">
            <div
              dangerouslySetInnerHTML={{ __html: sanitizeArticleContent(selectedRevision.content) }}
            />
          </div>
        </Modal>
      )}
    </>
  );
}

/**
 * Hook to create article revisions automatically
 * Call this when saving articles to track changes
 */
export function useCreateRevision(articleId: string | undefined) {
  const createRevision = useCallback(
    async (changeNote?: string, isAutoSave: boolean = false) => {
      if (!articleId) return null;

      try {
        const response = await fetch(`/api/admin/articles/${articleId}/revisions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ changeNote, isAutoSave }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create revision');
        }

        return data.revision;
      } catch (error) {
        console.error('Failed to create revision:', error);
        return null;
      }
    },
    [articleId]
  );

  return { createRevision };
}
