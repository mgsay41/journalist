'use client';

import { useState, useCallback, useEffect, useTransition, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { RichTextEditor } from '@/components/admin/RichTextEditor';
import { TagAutoSuggest } from '@/components/admin/TagAutoSuggest';
import { SeoScorePanel } from '@/components/admin/SeoScorePanel';
import { AiPanel } from '@/components/admin/AiPanel';
import { Alert } from '@/components/ui/Alert';
import { Loading } from '@/components/ui/Loading';
import { generateSlug } from '@/lib/utils/slug';
import { MAX_TAGS_PER_ARTICLE } from '@/lib/validations/article';

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  status: string;
  publishedAt: string | null;
  scheduledAt: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  focusKeyword: string | null;
  views?: number;
  categories: Array<{ id: string; name: string; slug: string }>;
  tags: Array<{ id: string; name: string; slug: string }>;
}

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

interface TagOption {
  id: string;
  name: string;
  slug: string;
}

const statusOptions = [
  { value: 'draft', label: 'مسودة' },
  { value: 'published', label: 'منشورة' },
  { value: 'scheduled', label: 'مجدولة' },
  { value: 'archived', label: 'مؤرشفة' },
];

export default function EditArticlePage() {
  const router = useRouter();
  const params = useParams();
  const articleId = params.id as string;
  const [isPending, startTransition] = useTransition();

  const [loading, setLoading] = useState(true);
  const [article, setArticle] = useState<Article | null>(null);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [status, setStatus] = useState('draft');
  const [publishedAt, setPublishedAt] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [focusKeyword, setFocusKeyword] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [autoSaving, setAutoSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);

  // Dynamic options from database
  const [categoriesOptions, setCategoriesOptions] = useState<CategoryOption[]>([]);
  const [tagsOptions, setTagsOptions] = useState<TagOption[]>([]);

  // Track if auto-save is enabled (disabled initially until article loads)
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);
  const slugCheckRef = useRef<NodeJS.Timeout | null>(null);

  // Load article data
  useEffect(() => {
    async function loadArticle() {
      try {
        const response = await fetch(`/api/admin/articles/${articleId}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'فشل تحميل المقال');
          return;
        }

        setArticle(data);

        // Populate form fields
        setTitle(data.title || '');
        setSlug(data.slug || '');
        setContent(data.content || '');
        setExcerpt(data.excerpt || '');
        setStatus(data.status || 'draft');
        setMetaTitle(data.metaTitle || '');
        setMetaDescription(data.metaDescription || '');
        setFocusKeyword(data.focusKeyword || '');

        // Format dates for input
        if (data.publishedAt) {
          setPublishedAt(new Date(data.publishedAt).toISOString().slice(0, 16));
        }
        if (data.scheduledAt) {
          setScheduledAt(new Date(data.scheduledAt).toISOString().slice(0, 16));
        }

        // Set categories and tags
        setSelectedCategories(data.categories?.map((c: { id: string }) => c.id) || []);
        setSelectedTags(data.tags?.map((t: { id: string }) => t.id) || []);
      } catch (err) {
        setError('حدث خطأ أثناء تحميل المقال');
      } finally {
        setLoading(false);
      }
    }

    loadArticle();
  }, [articleId]);

  // Fetch categories and tags from database
  useEffect(() => {
    async function fetchOptions() {
      try {
        const [categoriesRes, tagsRes] = await Promise.all([
          fetch('/api/admin/categories'),
          fetch('/api/admin/tags'),
        ]);

        if (categoriesRes.ok) {
          const data = await categoriesRes.json();
          // API returns { categories: [...] }
          setCategoriesOptions(Array.isArray(data) ? data : data.categories || []);
        }

        if (tagsRes.ok) {
          const data = await tagsRes.json();
          // API returns { tags: [...] }
          setTagsOptions(Array.isArray(data) ? data : data.tags || []);
        }
      } catch (err) {
        console.error('Failed to fetch options:', err);
      }
    }

    fetchOptions();
  }, []);

  // Track unsaved changes
  useEffect(() => {
    if (article) {
      const changed =
        title !== article.title ||
        slug !== article.slug ||
        content !== article.content ||
        excerpt !== (article.excerpt || '') ||
        status !== article.status ||
        metaTitle !== (article.metaTitle || '') ||
        metaDescription !== (article.metaDescription || '') ||
        focusKeyword !== (article.focusKeyword || '');

      setHasUnsavedChanges(changed);
    }
  }, [title, slug, content, excerpt, status, metaTitle, metaDescription, focusKeyword, article]);

  // Auto-generate slug from title
  const handleTitleChange = useCallback((value: string) => {
    setTitle(value);
    if (!slug || slug === generateSlug(article?.title || '')) {
      const newSlug = generateSlug(value);
      setSlug(newSlug);
      // Check slug availability for auto-generated slug
      checkSlugAvailability(newSlug);
    }
  }, [slug, article]);

  // Check slug availability with debounce
  const checkSlugAvailability = useCallback((slugToCheck: string) => {
    if (slugCheckRef.current) {
      clearTimeout(slugCheckRef.current);
    }

    if (!slugToCheck.trim()) {
      setSlugError(null);
      return;
    }

    // If slug is same as original, it's available
    if (slugToCheck === article?.slug) {
      setSlugError(null);
      return;
    }

    setCheckingSlug(true);
    slugCheckRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/admin/articles/check-slug?slug=${encodeURIComponent(slugToCheck)}&excludeId=${articleId}`);
        const data = await response.json();

        if (!data.available) {
          setSlugError('هذا الرابط مستخدم بالفعل');
        } else {
          setSlugError(null);
        }
      } catch (err) {
        console.error('Failed to check slug:', err);
      } finally {
        setCheckingSlug(false);
      }
    }, 500);
  }, [article?.slug, articleId]);

  // Handle manual slug changes
  const handleSlugChange = useCallback((value: string) => {
    setSlug(value);
    checkSlugAvailability(value);
  }, [checkSlugAvailability]);

  // Save article
  const saveArticle = useCallback(async (saveStatus?: string) => {
    setError(null);
    setSuccess(null);

    const payload = {
      title: title.trim(),
      slug: slug.trim(),
      content: content.trim(),
      excerpt: excerpt.trim() || null,
      status: saveStatus || status,
      publishedAt: publishedAt || null,
      scheduledAt: scheduledAt || null,
      categoryIds: selectedCategories,
      tagIds: selectedTags,
      metaTitle: metaTitle.trim() || null,
      metaDescription: metaDescription.trim() || null,
      focusKeyword: focusKeyword.trim() || null,
    };

    try {
      const response = await fetch(`/api/admin/articles/${articleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'فشل حفظ المقال');
        return;
      }

      setSuccess('تم حفظ المقال بنجاح');
      setHasUnsavedChanges(false);

      // Reload article data after save
      if (saveStatus && saveStatus !== status) {
        window.location.reload();
      }
    } catch (err) {
      setError('حدث خطأ أثناء حفظ المقال');
    }
  }, [articleId, title, slug, content, excerpt, status, publishedAt, scheduledAt, selectedCategories, selectedTags, metaTitle, metaDescription, focusKeyword]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Auto-save every 30 seconds when there are unsaved changes
  useEffect(() => {
    // Only enable auto-save when article is loaded and not already saving
    if (!article || !hasUnsavedChanges) {
      return;
    }

    const performAutoSave = async () => {
      if (!title && !content) return;

      setAutoSaving(true);
      try {
        const payload = {
          title: title.trim(),
          slug: slug.trim(),
          content: content.trim(),
          excerpt: excerpt.trim() || null,
          status: status, // Keep current status, don't change it during auto-save
          publishedAt: publishedAt || null,
          scheduledAt: scheduledAt || null,
          categoryIds: selectedCategories,
          tagIds: selectedTags,
          metaTitle: metaTitle.trim() || null,
          metaDescription: metaDescription.trim() || null,
          focusKeyword: focusKeyword.trim() || null,
        };

        const response = await fetch(`/api/admin/articles/${articleId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          setHasUnsavedChanges(false);
        }
      } catch (err) {
        console.error('Auto-save failed:', err);
      } finally {
        setAutoSaving(false);
      }
    };

    autoSaveRef.current = setInterval(performAutoSave, 30000); // 30 seconds

    return () => {
      if (autoSaveRef.current) {
        clearInterval(autoSaveRef.current);
      }
    };
  }, [article, hasUnsavedChanges, articleId, title, slug, content, excerpt, status, publishedAt, scheduledAt, selectedCategories, selectedTags, metaTitle, metaDescription, focusKeyword]);

  const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
  const readingTime = Math.ceil(wordCount / 200);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loading />
      </div>
    );
  }

  if (!article && !loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert variant="error">
          المقال غير موجود
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/articles"
                className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted-foreground/10 transition-colors"
              >
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                رجوع
              </Link>
              <div>
                <h1 className="text-lg font-semibold">تعديل المقال</h1>
                {autoSaving && (
                  <p className="text-sm text-muted-foreground">جاري الحفظ التلقائي...</p>
                )}
                {hasUnsavedChanges && !autoSaving && (
                  <p className="text-sm text-warning">يوجد تغييرات غير محفوظة</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/article/${article?.slug}`}
                target="_blank"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
              >
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                معاينة
              </Link>
              <Button
                type="button"
                variant="secondary"
                onClick={() => saveArticle('draft')}
                disabled={isPending}
              >
                {isPending ? 'جاري الحفظ...' : 'حفظ'}
              </Button>
              <Button
                type="button"
                onClick={() => saveArticle('published')}
                disabled={isPending}
              >
                {isPending ? 'جاري النشر...' : 'نشر'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        </div>
      )}

      {success && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <Alert variant="success" onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Center Column - Main Editor (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Title */}
            <Card>
              <div className="p-6 space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium mb-2">
                    عنوان المقال <span className="text-danger">*</span>
                  </label>
                  <Input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="أدخل عنوان المقال..."
                    className="text-xl font-semibold"
                    maxLength={200}
                    required
                  />
                  <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                    <span>{title.length} / 200</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="slug" className="block text-sm font-medium mb-2">
                      رابط المقال (Slug)
                    </label>
                    <Input
                      id="slug"
                      type="text"
                      value={slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      placeholder="رابط-المقال"
                      className={`font-mono text-sm ltr ${slugError ? 'border-danger' : ''}`}
                      dir="ltr"
                    />
                    {checkingSlug && (
                      <p className="text-sm text-muted-foreground mt-1">جاري التحقق...</p>
                    )}
                    {slugError && (
                      <p className="text-sm text-danger mt-1">{slugError}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="status" className="block text-sm font-medium mb-2">
                      حالة المقال
                    </label>
                    <Select
                      id="status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      options={statusOptions}
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Rich Text Editor */}
            <Card>
              <div className="p-6">
                <label className="block text-sm font-medium mb-2">
                  محتوى المقال <span className="text-danger">*</span>
                </label>
                <RichTextEditor
                  content={content}
                  onChange={setContent}
                  placeholder="ابدأ الكتابة هنا..."
                  minHeight="500px"
                />
              </div>
            </Card>

            {/* Excerpt */}
            <Card>
              <div className="p-6 space-y-4">
                <div>
                  <label htmlFor="excerpt" className="block text-sm font-medium mb-2">
                    مقدمة المقال
                  </label>
                  <Textarea
                    id="excerpt"
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    placeholder="ملخص قصير للمقال يظهر في قوائم المقالات..."
                    rows={3}
                    maxLength={500}
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    {excerpt.length} / 500
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column - Metadata (3 cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Publishing */}
            <Card>
              <div className="p-6 space-y-4">
                <h3 className="font-semibold">النشر</h3>

                {status === 'published' && (
                  <div>
                    <label htmlFor="publishedAt" className="block text-sm font-medium mb-2">
                      تاريخ النشر
                    </label>
                    <Input
                      id="publishedAt"
                      type="datetime-local"
                      value={publishedAt}
                      onChange={(e) => setPublishedAt(e.target.value)}
                    />
                  </div>
                )}

                {status === 'scheduled' && (
                  <div>
                    <label htmlFor="scheduledAt" className="block text-sm font-medium mb-2">
                      جدولة النشر
                    </label>
                    <Input
                      id="scheduledAt"
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                    />
                  </div>
                )}

                <div className="pt-4 border-t text-sm text-muted-foreground">
                  <p>• {wordCount} كلمة</p>
                  <p>• وقت القراءة: {readingTime} دقيقة</p>
                  {article?.publishedAt && (
                    <>
                      <p>• تاريخ النشر: {new Date(article.publishedAt).toLocaleDateString('ar-SA')}</p>
                      <p>• المشاهدات: {article.views || 0}</p>
                    </>
                  )}
                </div>
              </div>
            </Card>

            {/* Categories */}
            <Card>
              <div className="p-6 space-y-4">
                <h3 className="font-semibold">التصنيفات</h3>
                <Select
                  value=""
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value && !selectedCategories.includes(value)) {
                      setSelectedCategories([...selectedCategories, value]);
                    }
                  }}
                  options={[
                    { value: '', label: 'اختر التصنيفات...' },
                    ...categoriesOptions.map(cat => ({ value: cat.id, label: cat.name }))
                  ]}
                />
                <div className="flex flex-wrap gap-2">
                  {selectedCategories.map((catId) => {
                    const category = categoriesOptions.find(c => c.id === catId);
                    return (
                      <span
                        key={catId}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-sm rounded"
                      >
                        {category?.name || catId}
                        <button
                          type="button"
                          onClick={() => setSelectedCategories(selectedCategories.filter(c => c !== catId))}
                          className="hover:text-danger"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            </Card>

            {/* Tags */}
            <Card>
              <div className="p-6 space-y-4">
                <h3 className="font-semibold">الوسوم</h3>
                <TagAutoSuggest
                  selectedTags={selectedTags}
                  onTagsChange={setSelectedTags}
                  tagsData={tagsOptions}
                  onTagsDataChange={setTagsOptions}
                  maxTags={MAX_TAGS_PER_ARTICLE}
                />
              </div>
            </Card>

            {/* AI Panel */}
            <AiPanel
              title={title}
              content={content}
              excerpt={excerpt}
              metaTitle={metaTitle}
              metaDescription={metaDescription}
              focusKeyword={focusKeyword}
              onMetaTitleChange={setMetaTitle}
              onMetaDescriptionChange={setMetaDescription}
              onFocusKeywordChange={setFocusKeyword}
              onContentInsert={(text, position) => {
                if (position === 'start') {
                  setContent(text + '\n\n' + content);
                } else if (position === 'end') {
                  setContent(content + '\n\n' + text);
                }
              }}
              onContentReplace={setContent}
            />

            {/* SEO Score Panel */}
            <SeoScorePanel
              title={title}
              content={content}
              excerpt={excerpt}
              metaTitle={metaTitle}
              metaDescription={metaDescription}
              focusKeyword={focusKeyword}
              slug={slug}
              hasFeaturedImage={false}
              imageCount={0}
              imagesWithAlt={0}
              onFocusKeywordChange={setFocusKeyword}
              onMetaTitleChange={setMetaTitle}
              onMetaDescriptionChange={setMetaDescription}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
