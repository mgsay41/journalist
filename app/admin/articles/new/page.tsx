'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { RichTextEditor, type RichTextEditorRef } from '@/components/admin/RichTextEditor';
import { UnifiedAiPanel } from '@/components/admin/UnifiedAiPanel';
import { Alert } from '@/components/ui/Alert';
import { fetchWithCsrf } from '@/lib/security/csrf-client';

function extractImageInfo(content: string): { imageCount: number; imagesWithAlt: number } {
  if (!content) return { imageCount: 0, imagesWithAlt: 0 };
  const images = content.match(/<img[^>]*>/gi) || [];
  const imagesWithAlt = images.filter(img => {
    const altMatch = img.match(/alt=["']([^"']+)["']/i);
    return altMatch && altMatch[1].trim().length > 0;
  }).length;
  return { imageCount: images.length, imagesWithAlt };
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function NewArticlePage() {
  const router = useRouter();
  const editorRef = useRef<RichTextEditorRef>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const articleIdRef = useRef<string | undefined>(undefined);
  const hasReplacedUrlRef = useRef(false);

  // Article state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [focusKeyword, setFocusKeyword] = useState('');
  const [articleType, setArticleType] = useState('article');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [newCategoryNames, setNewCategoryNames] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [newTagNames, setNewTagNames] = useState<string[]>([]);

  // UI state
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const handleCategoriesChange = useCallback((ids: string[], newNames: string[]) => {
    setSelectedCategoryIds(ids);
    setNewCategoryNames(newNames);
  }, []);

  const handleTagsChange = useCallback((ids: string[], newNames: string[]) => {
    setSelectedTagIds(ids);
    setNewTagNames(newNames);
  }, []);

  // Auto-save logic
  const performAutoSave = useCallback(async () => {
    if (!title.trim() || !content.trim()) return;
    const wordCount = content.replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < 20) return;

    setSaveStatus('saving');
    try {
      const res = await fetchWithCsrf('/api/admin/articles/auto-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: articleIdRef.current,
          title,
          content,
          excerpt: excerpt || undefined,
          metaTitle: metaTitle || undefined,
          metaDescription: metaDescription || undefined,
        }),
      });

      if (!res.ok) throw new Error('auto-save failed');

      const data = await res.json();
      if (data.article?.id) {
        articleIdRef.current = data.article.id;
        // Silently update the URL to the edit page once we have an ID
        if (!hasReplacedUrlRef.current) {
          hasReplacedUrlRef.current = true;
          router.replace(`/admin/articles/${data.article.id}/edit`, { scroll: false });
        }
      }
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    }
  }, [title, content, excerpt, metaTitle, metaDescription, router]);

  // Schedule auto-save on content/title change
  useEffect(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    if (!title.trim() && !content.trim()) return;

    autoSaveTimerRef.current = setTimeout(() => {
      performAutoSave();
    }, 30000);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [title, content, performAutoSave]);

  // Publish handler
  const handlePublish = useCallback(async () => {
    if (!title.trim()) {
      setError('العنوان مطلوب للنشر');
      return;
    }

    setPublishing(true);
    setError(null);

    try {
      // Ensure we have an article ID (force-save if needed)
      if (!articleIdRef.current) {
        const saveRes = await fetchWithCsrf('/api/admin/articles/auto-save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content, status: 'draft' }),
        });
        if (!saveRes.ok) throw new Error('فشل حفظ المقال');
        const saveData = await saveRes.json();
        articleIdRef.current = saveData.article?.id;
        if (!articleIdRef.current) throw new Error('فشل الحصول على معرّف المقال');
      }

      // Create new categories
      const createdCategoryIds: string[] = [];
      for (const name of newCategoryNames) {
        const res = await fetchWithCsrf('/api/admin/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.id) createdCategoryIds.push(data.id);
        }
      }

      // Create new tags
      const createdTagIds: string[] = [];
      for (const name of newTagNames) {
        const res = await fetchWithCsrf('/api/admin/tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.id) createdTagIds.push(data.id);
        }
      }

      const allCategoryIds = [...selectedCategoryIds, ...createdCategoryIds];
      const allTagIds = [...selectedTagIds, ...createdTagIds];

      const res = await fetchWithCsrf(`/api/admin/articles/${articleIdRef.current}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          slug: slug || undefined,
          excerpt: excerpt || undefined,
          metaTitle: metaTitle || undefined,
          metaDescription: metaDescription || undefined,
          focusKeyword: focusKeyword || undefined,
          articleType,
          categoryIds: allCategoryIds,
          tagIds: allTagIds,
          status: 'published',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'فشل نشر المقال');
      }

      router.push('/admin/articles');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء النشر');
    } finally {
      setPublishing(false);
    }
  }, [
    title, content, slug, excerpt, metaTitle, metaDescription, focusKeyword,
    articleType, selectedCategoryIds, newCategoryNames, selectedTagIds, newTagNames, router,
  ]);

  const { imageCount, imagesWithAlt } = extractImageInfo(content);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top bar */}
      <div className="h-14 shrink-0 border-b bg-card flex items-center gap-3 px-4 z-20">
        <Link
          href="/admin/articles"
          className="flex items-center gap-1 px-2 py-1.5 text-sm rounded-md border border-border hover:bg-muted transition-colors shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="hidden sm:inline">رجوع</span>
        </Link>

        {/* Title input */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="عنوان المقال..."
          className="flex-1 bg-transparent text-base font-semibold placeholder:text-muted-foreground outline-none min-w-0"
          dir="rtl"
        />

        {/* Save status */}
        <div className="shrink-0 text-xs text-muted-foreground">
          {saveStatus === 'saving' && <span className="text-amber-500">جاري الحفظ...</span>}
          {saveStatus === 'saved' && <span className="text-green-600">تم الحفظ</span>}
          {saveStatus === 'error' && <span className="text-red-500">خطأ في الحفظ</span>}
        </div>

        {/* Save draft button */}
        <Button
          variant="outline"
          size="sm"
          onClick={performAutoSave}
          disabled={saveStatus === 'saving'}
          className="shrink-0 hidden sm:flex"
        >
          حفظ مسودة
        </Button>

        {/* Publish button */}
        <Button
          variant="primary"
          size="sm"
          onClick={handlePublish}
          disabled={publishing || !title.trim()}
          className="shrink-0"
        >
          {publishing ? 'جاري النشر...' : 'نشر'}
        </Button>
      </div>

      {/* Error alert */}
      {error && (
        <div className="px-4 pt-2 shrink-0">
          <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6">
            <RichTextEditor
              ref={editorRef}
              content={content}
              onChange={setContent}
              placeholder="ابدأ الكتابة هنا..."
              minHeight="calc(100vh - 120px)"
              enableInlineSuggestions={true}
            />
          </div>
        </div>

        {/* AI Panel */}
        <div className="w-95 shrink-0 overflow-y-auto border-r bg-card">
          <UnifiedAiPanel
            editorRef={editorRef}
            title={title}
            content={content}
            articleId={articleIdRef.current}
            articleType={articleType}
            onTitleChange={setTitle}
            onContentChange={setContent}
            onArticleTypeChange={setArticleType}
            onSlugChange={setSlug}
            onMetaTitleChange={setMetaTitle}
            onMetaDescriptionChange={setMetaDescription}
            onExcerptChange={setExcerpt}
            onFocusKeywordChange={setFocusKeyword}
            selectedCategoryIds={selectedCategoryIds}
            onCategoriesChange={handleCategoriesChange}
            selectedTagIds={selectedTagIds}
            onTagsChange={handleTagsChange}
            slug={slug}
            metaTitle={metaTitle}
            metaDescription={metaDescription}
            excerpt={excerpt}
            focusKeyword={focusKeyword}
            hasFeaturedImage={false}
            imageCount={imageCount}
            imagesWithAlt={imagesWithAlt}
          />
        </div>
      </div>
    </div>
  );
}
