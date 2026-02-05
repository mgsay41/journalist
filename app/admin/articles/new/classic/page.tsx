'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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
import { AiOutliner } from '@/components/admin/AiOutliner';
import { HeadlineOptimizer } from '@/components/admin/HeadlineOptimizer';
import { Alert } from '@/components/ui/Alert';
import { generateSlug } from '@/lib/utils/slug';
import { MAX_TAGS_PER_ARTICLE } from '@/lib/validations/article';

// Helper function to extract image information from content
function extractImageInfo(content: string): { imageCount: number; imagesWithAlt: number } {
  if (!content) return { imageCount: 0, imagesWithAlt: 0 };

  // Match all img tags
  const imgRegex = /<img[^>]*>/gi;
  const images = content.match(imgRegex) || [];
  const imageCount = images.length;

  // Count images with non-empty alt text
  const imagesWithAlt = images.filter(img => {
    const altMatch = img.match(/alt=["']([^"']+)["']/i);
    return altMatch && altMatch[1].trim().length > 0;
  }).length;

  return { imageCount, imagesWithAlt };
}

// localStorage key for draft persistence
const DRAFT_STORAGE_KEY = 'article-draft-classic';
const LOCAL_SAVE_DELAY = 1000;

interface DraftData {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  status: string;
  metaTitle: string;
  metaDescription: string;
  focusKeyword: string;
  selectedCategories: string[];
  selectedTags: string[];
  savedAt: number;
  slugManuallyEdited?: boolean;
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
];

export default function ClassicNewArticlePage() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [status, setStatus] = useState('draft');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [focusKeyword, setFocusKeyword] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // AI Tools state
  const [showAiTools, setShowAiTools] = useState(false);
  const [selectedCategoryName, setSelectedCategoryName] = useState('');

  const [categoriesOptions, setCategoriesOptions] = useState<CategoryOption[]>([]);
  const [tagsOptions, setTagsOptions] = useState<TagOption[]>([]);

  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);
  const slugGenerationRef = useRef<NodeJS.Timeout | null>(null);
  const initializedRef = useRef(false);

  // Fetch categories and tags
  useEffect(() => {
    async function fetchOptions() {
      try {
        const [categoriesRes, tagsRes] = await Promise.all([
          fetch('/api/admin/categories'),
          fetch('/api/admin/tags'),
        ]);

        if (categoriesRes.ok) {
          const data = await categoriesRes.json();
          setCategoriesOptions(Array.isArray(data) ? data : data.categories || []);
        }

        if (tagsRes.ok) {
          const data = await tagsRes.json();
          setTagsOptions(Array.isArray(data) ? data : data.tags || []);
        }
      } catch (err) {
        console.error('Failed to fetch options:', err);
      }
    }

    fetchOptions();
  }, []);

  // Load draft
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    try {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        const draft: DraftData = JSON.parse(savedDraft);
        setHasDraft(true);
        setTitle(draft.title || '');
        setSlug(draft.slug || '');
        setContent(draft.content || '');
        setExcerpt(draft.excerpt || '');
        setStatus(draft.status || 'draft');
        setMetaTitle(draft.metaTitle || '');
        setMetaDescription(draft.metaDescription || '');
        setFocusKeyword(draft.focusKeyword || '');
        setSelectedCategories(draft.selectedCategories || []);
        setSelectedTags(draft.selectedTags || []);
        setLastSaved(new Date(draft.savedAt));
        setDraftLoaded(true);
        if (draft.slugManuallyEdited) {
          setSlugManuallyEdited(true);
        }
      }
    } catch (err) {
      console.error('Failed to load draft:', err);
    }
  }, []);

  // Auto-save
  useEffect(() => {
    if (!initializedRef.current) return;
    if (!title && !content && !excerpt) return;

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
          metaTitle,
          metaDescription,
          focusKeyword,
          selectedCategories,
          selectedTags,
          savedAt: Date.now(),
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
  }, [title, slug, content, excerpt, status, metaTitle, metaDescription, focusKeyword, selectedCategories, selectedTags, slugManuallyEdited]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setHasDraft(false);
      setLastSaved(null);
    } catch (err) {
      console.error('Failed to clear draft:', err);
    }
  }, []);

  const discardDraft = useCallback(() => {
    clearDraft();
    setTitle('');
    setSlug('');
    setContent('');
    setExcerpt('');
    setStatus('draft');
    setMetaTitle('');
    setMetaDescription('');
    setFocusKeyword('');
    setSelectedCategories([]);
    setSelectedTags([]);
    setDraftLoaded(false);
    setSlugManuallyEdited(false);
  }, [clearDraft]);

  const handleTitleChange = useCallback((value: string) => {
    setTitle(value);
    if (!slugManuallyEdited) {
      if (slugGenerationRef.current) {
        clearTimeout(slugGenerationRef.current);
      }
      slugGenerationRef.current = setTimeout(() => {
        setSlug(generateSlug(value));
      }, 500);
    }
  }, [slugManuallyEdited]);

  const handleSlugChange = useCallback((value: string) => {
    setSlug(value);
    setSlugManuallyEdited(true);
  }, []);

  const saveArticle = useCallback(async (saveStatus?: string) => {
    setError(null);
    setSuccess(null);
    setIsPending(true);

    const payload = {
      title: title.trim(),
      slug: slug.trim() || generateSlug(title.trim()),
      content: content.trim(),
      excerpt: excerpt.trim() || null,
      status: saveStatus || status,
      categoryIds: selectedCategories,
      tagIds: selectedTags,
      metaTitle: metaTitle.trim() || null,
      metaDescription: metaDescription.trim() || null,
      focusKeyword: focusKeyword.trim() || null,
    };

    try {
      const response = await fetch('/api/admin/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'فشل حفظ المقال');
        return;
      }

      setSuccess('تم حفظ المقال بنجاح');
      clearDraft();
      router.push(`/admin/articles/${data.id}/edit`);
    } catch (err) {
      setError('حدث خطأ أثناء حفظ المقال');
    } finally {
      setIsPending(false);
    }
  }, [title, slug, content, excerpt, status, selectedCategories, selectedTags, metaTitle, metaDescription, focusKeyword, router, clearDraft]);

  const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).filter(word => word.length > 0).length;
  const readingTime = Math.ceil(wordCount / 200);

  // Extract image information from content for SEO analysis
  const imageInfo = useMemo(() => extractImageInfo(content), [content]);

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
                <h1 className="text-lg font-semibold">مقال جديد (المحرر الكلاسيكي)</h1>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  {autoSaving ? (
                    <span className="flex items-center gap-1">
                      <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      جاري الحفظ...
                    </span>
                  ) : lastSaved ? (
                    <span className="flex items-center gap-1 text-success">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      محفوظ: {lastSaved.toLocaleTimeString('ar-SA')}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/admin/articles/new"
                className="text-sm text-primary hover:underline ml-4"
              >
                جرب المحرر الجديد
              </Link>
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
                حفظ كمسودة
              </Button>
              <Button
                type="button"
                onClick={() => saveArticle('published')}
                disabled={isPending}
              >
                نشر
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {draftLoaded && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <Alert variant="info" onClose={() => setDraftLoaded(false)}>
            تم استعادة المسودة المحفوظة. آخر تعديل: {lastSaved?.toLocaleString('ar-SA')}
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
          {/* Center Column - Main Editor */}
          <div className="lg:col-span-8 space-y-6">
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
                    <button
                      type="button"
                      onClick={() => setShowAiTools(!showAiTools)}
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      أدوات الذكاء الاصطناعي
                    </button>
                  </div>
                </div>

                {/* Headline Optimizer */}
                {title && (
                  <div className="border-t pt-4">
                    <HeadlineOptimizer
                      headline={title}
                      content={content}
                      category={selectedCategoryName}
                      onHeadlineSelect={(newHeadline) => setTitle(newHeadline)}
                      autoAnalyze={true}
                    />
                  </div>
                )}

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
                      className="font-mono text-sm ltr"
                      dir="ltr"
                    />
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

            {/* AI Tools Panel */}
            {showAiTools && (
              <Card className="border-primary/20">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      أدوات الذكاء الاصطناعي
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowAiTools(false)}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <AiOutliner
                    onContentInsert={(insertedContent) => {
                      setContent(content + '\n\n' + insertedContent);
                    }}
                  />
                </div>
              </Card>
            )}

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

            <Card>
              <div className="p-6">
                <label htmlFor="excerpt" className="block text-sm font-medium mb-2">
                  مقدمة المقال
                </label>
                <Textarea
                  id="excerpt"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="ملخص قصير للمقال..."
                  rows={3}
                  maxLength={500}
                />
                <div className="text-xs text-muted-foreground mt-1">
                  {excerpt.length} / 500
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column - Metadata */}
          <div className="lg:col-span-4 space-y-6">
            <Card>
              <div className="p-6 space-y-4">
                <h3 className="font-semibold text-foreground">إحصائيات</h3>
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
            </Card>

            <Card>
              <div className="p-6 space-y-4">
                <h3 className="font-semibold text-foreground">التصنيفات</h3>
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

            <Card>
              <div className="p-6 space-y-4">
                <h3 className="font-semibold text-foreground">الوسوم</h3>
                <TagAutoSuggest
                  selectedTags={selectedTags}
                  onTagsChange={setSelectedTags}
                  tagsData={tagsOptions}
                  onTagsDataChange={setTagsOptions}
                  maxTags={MAX_TAGS_PER_ARTICLE}
                  articleTitle={title}
                  articleContent={content}
                  enableAiSuggestions={true}
                />
              </div>
            </Card>

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

            <SeoScorePanel
              title={title}
              content={content}
              excerpt={excerpt}
              metaTitle={metaTitle}
              metaDescription={metaDescription}
              focusKeyword={focusKeyword}
              slug={slug}
              hasFeaturedImage={imageInfo.imageCount > 0}
              imageCount={imageInfo.imageCount}
              imagesWithAlt={imageInfo.imagesWithAlt}
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
