'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
import { generateSlug } from '@/lib/utils/slug';
import { MAX_TAGS_PER_ARTICLE } from '@/lib/validations/article';

// localStorage key for draft persistence
const DRAFT_STORAGE_KEY = 'article-draft-new';
const LOCAL_SAVE_DELAY = 1000; // 1 second debounce for localStorage
const DB_SAVE_INTERVAL = 30000; // 30 seconds for database auto-save
const SLUG_GENERATION_DELAY = 500; // 500ms debounce for slug generation

interface DraftData {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  status: string;
  publishedAt: string;
  scheduledAt: string;
  metaTitle: string;
  metaDescription: string;
  focusKeyword: string;
  selectedCategories: string[];
  selectedTags: string[];
  savedAt: number;
  articleId?: string; // ID of saved article in database
  slugManuallyEdited?: boolean; // Track if user manually edited slug
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
];

export default function NewArticlePage() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

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
  const [dbSaving, setDbSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [lastDbSaved, setLastDbSaved] = useState<Date | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [articleId, setArticleId] = useState<string | null>(null); // ID of article saved to DB
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false); // Track manual slug edits

  // Dynamic options from database
  const [categoriesOptions, setCategoriesOptions] = useState<CategoryOption[]>([]);
  const [tagsOptions, setTagsOptions] = useState<TagOption[]>([]);

  // Ref for slug check timeout
  const slugCheckRef = useRef<NodeJS.Timeout | null>(null);
  // Ref for auto-save timeout (localStorage)
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);
  // Ref for database auto-save interval
  const dbSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Ref for slug generation timeout
  const slugGenerationRef = useRef<NodeJS.Timeout | null>(null);
  // Track if we've initialized from localStorage
  const initializedRef = useRef(false);
  // Track if content has changed since last DB save
  const hasChangesRef = useRef(false);

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

  // Load draft from localStorage on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    try {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        const draft: DraftData = JSON.parse(savedDraft);
        setHasDraft(true);

        // Auto-restore the draft
        setTitle(draft.title || '');
        setSlug(draft.slug || '');
        setContent(draft.content || '');
        setExcerpt(draft.excerpt || '');
        setStatus(draft.status || 'draft');
        setPublishedAt(draft.publishedAt || '');
        setScheduledAt(draft.scheduledAt || '');
        setMetaTitle(draft.metaTitle || '');
        setMetaDescription(draft.metaDescription || '');
        setFocusKeyword(draft.focusKeyword || '');
        setSelectedCategories(draft.selectedCategories || []);
        setSelectedTags(draft.selectedTags || []);
        setLastSaved(new Date(draft.savedAt));
        setDraftLoaded(true);

        // Restore article ID and slug manual edit flag
        if (draft.articleId) {
          setArticleId(draft.articleId);
          setLastDbSaved(new Date(draft.savedAt));
        }
        if (draft.slugManuallyEdited) {
          setSlugManuallyEdited(true);
        }
      }
    } catch (err) {
      console.error('Failed to load draft:', err);
    }
  }, []);

  // Save draft to localStorage on changes (debounced)
  useEffect(() => {
    // Don't save if we haven't initialized yet
    if (!initializedRef.current) return;

    // Don't save empty drafts
    if (!title && !content && !excerpt) return;

    // Mark that we have changes to save
    hasChangesRef.current = true;

    if (autoSaveRef.current) {
      clearTimeout(autoSaveRef.current);
    }

    setAutoSaving(true);
    autoSaveRef.current = setTimeout(() => {
      try {
        const draft: DraftData = {
          title,
          slug,
          content,
          excerpt,
          status,
          publishedAt,
          scheduledAt,
          metaTitle,
          metaDescription,
          focusKeyword,
          selectedCategories,
          selectedTags,
          savedAt: Date.now(),
          articleId: articleId || undefined,
          slugManuallyEdited,
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
        setLastSaved(new Date());
        setHasDraft(true);
      } catch (err) {
        console.error('Failed to save draft:', err);
      } finally {
        setAutoSaving(false);
      }
    }, LOCAL_SAVE_DELAY);

    return () => {
      if (autoSaveRef.current) {
        clearTimeout(autoSaveRef.current);
      }
    };
  }, [title, slug, content, excerpt, status, publishedAt, scheduledAt, metaTitle, metaDescription, focusKeyword, selectedCategories, selectedTags, articleId, slugManuallyEdited]);

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setHasDraft(false);
      setLastSaved(null);
    } catch (err) {
      console.error('Failed to clear draft:', err);
    }
  }, []);

  // Discard draft and reset form
  const discardDraft = useCallback(() => {
    clearDraft();
    setTitle('');
    setSlug('');
    setContent('');
    setExcerpt('');
    setStatus('draft');
    setPublishedAt('');
    setScheduledAt('');
    setMetaTitle('');
    setMetaDescription('');
    setFocusKeyword('');
    setSelectedCategories([]);
    setSelectedTags([]);
    setDraftLoaded(false);
    setArticleId(null);
    setLastDbSaved(null);
    setSlugManuallyEdited(false);
  }, [clearDraft]);

  // Check slug availability with debounce
  const checkSlugAvailability = useCallback((slugToCheck: string, excludeArticleId?: string | null) => {
    if (slugCheckRef.current) {
      clearTimeout(slugCheckRef.current);
    }

    if (!slugToCheck.trim()) {
      setSlugError(null);
      return;
    }

    setCheckingSlug(true);
    slugCheckRef.current = setTimeout(async () => {
      try {
        let url = `/api/admin/articles/check-slug?slug=${encodeURIComponent(slugToCheck)}`;
        if (excludeArticleId) {
          url += `&excludeId=${encodeURIComponent(excludeArticleId)}`;
        }
        const response = await fetch(url);
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
  }, []);

  // Auto-generate slug from title (with debounce)
  const handleTitleChange = useCallback((value: string) => {
    setTitle(value);

    // Auto-generate slug if not manually edited
    if (!slugManuallyEdited) {
      if (slugGenerationRef.current) {
        clearTimeout(slugGenerationRef.current);
      }

      slugGenerationRef.current = setTimeout(() => {
        const newSlug = generateSlug(value);
        setSlug(newSlug);
        checkSlugAvailability(newSlug, articleId);
      }, SLUG_GENERATION_DELAY);
    }
  }, [slugManuallyEdited, checkSlugAvailability, articleId]);

  // Handle manual slug changes - marks slug as manually edited
  const handleSlugChange = useCallback((value: string) => {
    setSlug(value);
    setSlugManuallyEdited(true); // User is manually editing the slug
    checkSlugAvailability(value, articleId);
  }, [checkSlugAvailability, articleId]);

  // Reset slug to auto-generated from title
  const resetSlugToAuto = useCallback(() => {
    const newSlug = generateSlug(title);
    setSlug(newSlug);
    setSlugManuallyEdited(false);
    checkSlugAvailability(newSlug, articleId);
  }, [title, checkSlugAvailability, articleId]);

  // Auto-save to database (create or update)
  const saveToDatabase = useCallback(async (isAutoSave = false) => {
    // Don't auto-save if there's no title OR no content (both are required)
    if (!title.trim() || !content.trim()) return null;

    // Don't auto-save if no changes since last save
    if (isAutoSave && !hasChangesRef.current) return null;

    setDbSaving(true);

    const payload = {
      title: title.trim() || 'مقال بدون عنوان',
      slug: slug.trim() || generateSlug(title.trim() || 'draft'),
      content: content.trim(),
      excerpt: excerpt.trim() || null,
      status: 'draft', // Auto-save always saves as draft
      publishedAt: publishedAt || null,
      scheduledAt: scheduledAt || null,
      categoryIds: selectedCategories,
      tagIds: selectedTags,
      metaTitle: metaTitle.trim() || null,
      metaDescription: metaDescription.trim() || null,
      focusKeyword: focusKeyword.trim() || null,
    };

    try {
      let response;
      if (articleId) {
        // Update existing article
        response = await fetch(`/api/admin/articles/${articleId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        // Create new article
        response = await fetch('/api/admin/articles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await response.json();

      if (response.ok) {
        // Store the article ID for future updates
        if (!articleId && data.id) {
          setArticleId(data.id);
        }
        setLastDbSaved(new Date());
        hasChangesRef.current = false;

        // Update localStorage with article ID
        try {
          const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
          if (savedDraft) {
            const draft = JSON.parse(savedDraft);
            draft.articleId = data.id || articleId;
            localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
          }
        } catch (err) {
          console.error('Failed to update localStorage with article ID:', err);
        }

        return data;
      } else {
        console.error('Failed to auto-save to database:', data.error);
        return null;
      }
    } catch (err) {
      console.error('Failed to auto-save to database:', err);
      return null;
    } finally {
      setDbSaving(false);
    }
  }, [title, slug, content, excerpt, publishedAt, scheduledAt, selectedCategories, selectedTags, metaTitle, metaDescription, focusKeyword, articleId]);

  // Set up database auto-save interval
  useEffect(() => {
    // Start auto-save interval after initial load
    if (!initializedRef.current) return;

    dbSaveIntervalRef.current = setInterval(() => {
      if (hasChangesRef.current && (title.trim() || content.trim())) {
        saveToDatabase(true);
      }
    }, DB_SAVE_INTERVAL);

    return () => {
      if (dbSaveIntervalRef.current) {
        clearInterval(dbSaveIntervalRef.current);
      }
    };
  }, [saveToDatabase, title, content]);

  // Save article (manual save with status)
  const saveArticle = useCallback(async (saveStatus?: string) => {
    setError(null);
    setSuccess(null);
    setIsPending(true);

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
      let response;
      if (articleId) {
        // Update existing article
        response = await fetch(`/api/admin/articles/${articleId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        // Create new article
        response = await fetch('/api/admin/articles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'فشل حفظ المقال');
        return;
      }

      setSuccess('تم حفظ المقال بنجاح');
      // Clear the localStorage draft after successful save
      clearDraft();
      hasChangesRef.current = false;
      const savedId = data.id || articleId;
      router.push(`/admin/articles/${savedId}/edit`);
    } catch (err) {
      setError('حدث خطأ أثناء حفظ المقال');
    } finally {
      setIsPending(false);
    }
  }, [title, slug, content, excerpt, status, publishedAt, scheduledAt, selectedCategories, selectedTags, metaTitle, metaDescription, focusKeyword, router, clearDraft, articleId]);

  const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
  const readingTime = Math.ceil(wordCount / 200);

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
                <h1 className="text-lg font-semibold">
                  {articleId ? 'تعديل المسودة' : 'مقال جديد'}
                </h1>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  {/* Local save status */}
                  {(autoSaving || dbSaving) ? (
                    <span className="flex items-center gap-1">
                      <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {dbSaving ? 'جاري الحفظ في قاعدة البيانات...' : 'جاري الحفظ المحلي...'}
                    </span>
                  ) : (
                    <>
                      {lastDbSaved && (
                        <span className="flex items-center gap-1 text-success">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          محفوظ: {lastDbSaved.toLocaleTimeString('ar-SA')}
                        </span>
                      )}
                      {lastSaved && !lastDbSaved && (
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          محفوظ محلياً: {lastSaved.toLocaleTimeString('ar-SA')}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {hasDraft && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={discardDraft}
                  className="text-muted-foreground hover:text-danger"
                >
                  تجاهل المسودة
                </Button>
              )}
              <Button
                type="button"
                variant="secondary"
                onClick={() => saveArticle('draft')}
                disabled={isPending}
              >
                {isPending ? 'جاري الحفظ...' : 'حفظ كمسودة'}
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
      {draftLoaded && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <Alert variant="info" onClose={() => setDraftLoaded(false)}>
            تم استعادة المسودة المحفوظة محلياً. آخر تعديل: {lastSaved?.toLocaleString('ar-SA')}
          </Alert>
        </div>
      )}

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
                    <div className="flex items-center justify-between mb-2">
                      <label htmlFor="slug" className="block text-sm font-medium">
                        رابط المقال (Slug)
                      </label>
                      {slugManuallyEdited && (
                        <button
                          type="button"
                          onClick={resetSlugToAuto}
                          className="text-xs text-primary hover:underline"
                        >
                          إعادة التوليد من العنوان
                        </button>
                      )}
                    </div>
                    <Input
                      id="slug"
                      type="text"
                      value={slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      placeholder="رابط-المقال"
                      className={`font-mono text-sm ltr ${slugError ? 'border-danger' : ''}`}
                      dir="ltr"
                    />
                    <div className="mt-1 text-xs text-muted-foreground">
                      {checkingSlug ? (
                        <span>جاري التحقق...</span>
                      ) : slugError ? (
                        <span className="text-danger">{slugError}</span>
                      ) : slugManuallyEdited ? (
                        <span>تم التعديل يدوياً</span>
                      ) : (
                        <span>يتم توليده تلقائياً من العنوان</span>
                      )}
                    </div>
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
                <h3 className="font-semibold text-foreground">النشر</h3>

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

                {/* Article Stats */}
                <div className="pt-4 border-t border-border">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <div className="text-lg font-semibold text-foreground">{wordCount}</div>
                      <div className="text-xs text-muted-foreground">كلمة</div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <div className="text-lg font-semibold text-foreground">{readingTime}</div>
                      <div className="text-xs text-muted-foreground">دقيقة للقراءة</div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Categories */}
            <Card>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">التصنيفات</h3>
                  {selectedCategories.length > 0 && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {selectedCategories.length} مختار
                    </span>
                  )}
                </div>
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
                {selectedCategories.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedCategories.map((catId) => {
                      const category = categoriesOptions.find(c => c.id === catId);
                      return (
                        <span
                          key={catId}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-muted text-sm rounded-md"
                        >
                          {category?.name || catId}
                          <button
                            type="button"
                            onClick={() => setSelectedCategories(selectedCategories.filter(c => c !== catId))}
                            className="text-muted-foreground hover:text-danger transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>

            {/* Tags */}
            <Card>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">الوسوم</h3>
                  <span className="text-xs text-muted-foreground">
                    {selectedTags.length} / {MAX_TAGS_PER_ARTICLE}
                  </span>
                </div>
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
