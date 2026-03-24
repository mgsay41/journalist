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
  const titleRef = useRef<HTMLTextAreaElement>(null);

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
  const [panelOpen, setPanelOpen] = useState(true);

  // Auto-resize title textarea
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTitle(e.target.value);
    if (titleRef.current) {
      titleRef.current.style.height = 'auto';
      titleRef.current.style.height = titleRef.current.scrollHeight + 'px';
    }
  }, []);

  const handleCategoriesChange = useCallback((ids: string[], names: string[]) => {
    setSelectedCategoryIds(ids);
    setNewCategoryNames(names);
  }, []);

  const handleTagsChange = useCallback((ids: string[], names: string[]) => {
    setSelectedTagIds(ids);
    setNewTagNames(names);
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

  const handlePublish = useCallback(async () => {
    if (!title.trim()) {
      setError('العنوان مطلوب للنشر');
      return;
    }

    setPublishing(true);
    setError(null);

    try {
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
      {/* Minimal top bar */}
      <header className="h-12 shrink-0 border-b border-border bg-card flex items-center gap-2 px-4 z-20">
        <Link
          href="/admin/articles"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
          dir="rtl"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          المقالات
        </Link>

        <div className="w-px h-4 bg-border shrink-0" />

        <span className="flex-1 text-sm text-muted-foreground/50 truncate text-right" dir="rtl">
          {title || 'مقال جديد'}
        </span>

        {/* Save status */}
        <div className="shrink-0 text-xs">
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1 text-amber-500">
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              حفظ...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1 text-green-600">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              محفوظ
            </span>
          )}
          {saveStatus === 'error' && <span className="text-red-500">خطأ في الحفظ</span>}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={performAutoSave}
          disabled={saveStatus === 'saving'}
          className="shrink-0 hidden sm:flex"
        >
          حفظ مسودة
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={handlePublish}
          disabled={publishing || !title.trim()}
          className="shrink-0"
        >
          {publishing ? 'جاري النشر...' : 'نشر'}
        </Button>

        {/* Panel toggle */}
        <button
          onClick={() => setPanelOpen(!panelOpen)}
          className="shrink-0 p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title={panelOpen ? 'إخفاء اللوحة الجانبية' : 'إظهار اللوحة الجانبية'}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
          </svg>
        </button>
      </header>

      {/* Error alert */}
      {error && (
        <div className="px-4 pt-2 shrink-0 z-10">
          <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>
        </div>
      )}

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">

        {/* Editor area — flex-1, scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-8 py-10">
            {/* Large title textarea */}
            <textarea
              ref={titleRef}
              value={title}
              onChange={handleTitleChange}
              placeholder="عنوان المقال..."
              dir="rtl"
              rows={1}
              className="w-full resize-none bg-transparent text-3xl font-bold placeholder:text-muted-foreground/30 outline-none border-none leading-tight mb-8 overflow-hidden"
              style={{ minHeight: '48px' }}
            />

            {/* Subtle separator */}
            <div className="border-t border-border/40 mb-8" />

            {/* Rich text editor */}
            <RichTextEditor
              ref={editorRef}
              content={content}
              onChange={setContent}
              placeholder="ابدأ الكتابة هنا..."
              minHeight="calc(100vh - 260px)"
              enableInlineSuggestions={true}
            />
          </div>
        </div>

        {/* AI Panel sidebar — fixed width, left side */}
        {panelOpen && (
          <aside className="w-80 xl:w-88 shrink-0 border-r border-border bg-card flex flex-col overflow-hidden">
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
          </aside>
        )}
      </div>
    </div>
  );
}
