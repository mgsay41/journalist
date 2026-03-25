'use client';

import { useState, useCallback, useEffect, useTransition, useRef, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { RichTextEditor, type RichTextEditorRef } from '@/components/admin/RichTextEditor';
import { UnifiedAiPanel } from '@/components/admin/UnifiedAiPanel';
import ImagePickerModal from '@/components/admin/ImagePickerModal';
import { fetchWithCsrf } from '@/lib/security/csrf-client';
import { analyzeArticle, analyzeGeo } from '@/lib/seo';
import { KeyboardShortcuts } from '@/components/admin/KeyboardShortcuts';
import { DistractionMode } from '@/components/admin/DistractionMode';
import { Alert } from '@/components/ui/Alert';
import { Loading } from '@/components/ui/Loading';
import { generateSlug } from '@/lib/utils/slug';

function extractImageInfo(content: string): { imageCount: number; imagesWithAlt: number } {
  if (!content) return { imageCount: 0, imagesWithAlt: 0 };
  const imgRegex = /<img[^>]*>/gi;
  const images = content.match(imgRegex) || [];
  const imageCount = images.length;
  const imagesWithAlt = images.filter(img => {
    const altMatch = img.match(/alt=["']([^"']+)["']/i);
    return altMatch && altMatch[1].trim().length > 0;
  }).length;
  return { imageCount, imagesWithAlt };
}

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  conclusion: string | null;
  featuredImageId: string | null;
  featuredImage: { id: string; url: string; altText: string | null } | null;
  status: string;
  publishedAt: string | null;
  scheduledAt: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  focusKeyword: string | null;
  articleType: string | null;
  views?: number;
  categories: Array<{ id: string; name: string; slug: string }>;
  tags: Array<{ id: string; name: string; slug: string }>;
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
  const [articleType, setArticleType] = useState('article');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newCategoryNames, setNewCategoryNames] = useState<string[]>([]);
  const [newTagNames, setNewTagNames] = useState<string[]>([]);

  const richTextRef = useRef<RichTextEditorRef>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [autoSaving, setAutoSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);

  const [isDistractionMode, setIsDistractionMode] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [conclusion, setConclusion] = useState('');
  const [featuredImageId, setFeaturedImageId] = useState<string | null>(null);
  const [featuredImageUrl, setFeaturedImageUrl] = useState<string | null>(null);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);
  const [generatedIntro, setGeneratedIntro] = useState<string | null>(null);
  const [generatedConclusion, setGeneratedConclusion] = useState<string | null>(null);
  const [showReadinessModal, setShowReadinessModal] = useState(false);
  const [focusSection, setFocusSection] = useState<string | undefined>(undefined);
  const [scores, setScores] = useState({ seo: 0, geo: 0, structure: 0, structureTotal: 10, grammar: 0 });

  const [modalExcerpt, setModalExcerpt] = useState('');
  const [modalMetaTitle, setModalMetaTitle] = useState('');
  const [modalMetaDescription, setModalMetaDescription] = useState('');
  const [modalFocusKeyword, setModalFocusKeyword] = useState('');

  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);
  const slugCheckRef = useRef<NodeJS.Timeout | null>(null);

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
        setTitle(data.title || '');
        setSlug(data.slug || '');
        setContent(data.content || '');
        setExcerpt(data.excerpt || '');
        setStatus(data.status || 'draft');
        setMetaTitle(data.metaTitle || '');
        setMetaDescription(data.metaDescription || '');
        setFocusKeyword(data.focusKeyword || '');
        setArticleType(data.articleType || 'article');
        setConclusion(data.conclusion || '');
        setFeaturedImageId(data.featuredImageId || null);
        setFeaturedImageUrl(data.featuredImage?.url || null);

        if (data.publishedAt) {
          setPublishedAt(new Date(data.publishedAt).toISOString().slice(0, 16));
        }
        if (data.scheduledAt) {
          setScheduledAt(new Date(data.scheduledAt).toISOString().slice(0, 16));
        }

        setSelectedCategories(data.categories?.map((c: { id: string }) => c.id) || []);
        setSelectedTags(data.tags?.map((t: { id: string }) => t.id) || []);
      } catch {
        setError('حدث خطأ أثناء تحميل المقال');
      } finally {
        setLoading(false);
      }
    }

    loadArticle();
  }, [articleId]);

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

  const checkSlugAvailability = useCallback((slugToCheck: string) => {
    if (slugCheckRef.current) clearTimeout(slugCheckRef.current);
    if (!slugToCheck.trim()) { setSlugError(null); return; }
    if (slugToCheck === article?.slug) { setSlugError(null); return; }

    setCheckingSlug(true);
    slugCheckRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/admin/articles/check-slug?slug=${encodeURIComponent(slugToCheck)}&excludeId=${articleId}`);
        const data = await response.json();
        setSlugError(data.available ? null : 'هذا الرابط مستخدم بالفعل');
      } catch {
        console.error('Failed to check slug');
      } finally {
        setCheckingSlug(false);
      }
    }, 500);
  }, [article?.slug, articleId]);

  const handleTitleChange = useCallback((value: string) => {
    setTitle(value);
    if (titleRef.current) {
      titleRef.current.style.height = 'auto';
      titleRef.current.style.height = titleRef.current.scrollHeight + 'px';
    }
    if (!slug || slug === generateSlug(article?.title || '')) {
      const newSlug = generateSlug(value);
      setSlug(newSlug);
      checkSlugAvailability(newSlug);
    }
  }, [slug, article, checkSlugAvailability]);

  const handleSlugChange = useCallback((value: string) => {
    setSlug(value);
    checkSlugAvailability(value);
  }, [checkSlugAvailability]);

  const saveArticle = useCallback(async (saveStatus?: string) => {
    setError(null);
    setSuccess(null);

    const createdCategoryIds: string[] = [];
    for (const name of newCategoryNames) {
      try {
        const res = await fetchWithCsrf('/api/admin/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.id) createdCategoryIds.push(data.id);
        }
      } catch { /* ignore */ }
    }
    if (createdCategoryIds.length > 0) {
      setNewCategoryNames([]);
      setSelectedCategories(prev => [...prev, ...createdCategoryIds]);
    }

    const createdTagIds: string[] = [];
    for (const name of newTagNames) {
      try {
        const res = await fetchWithCsrf('/api/admin/tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.id) createdTagIds.push(data.id);
        }
      } catch { /* ignore */ }
    }
    if (createdTagIds.length > 0) {
      setNewTagNames([]);
      setSelectedTags(prev => [...prev, ...createdTagIds]);
    }

    const allCategoryIds = [...selectedCategories, ...createdCategoryIds];
    const allTagIds = [...selectedTags, ...createdTagIds];

    const payload = {
      title: title.trim(),
      slug: slug.trim(),
      content: content.trim(),
      excerpt: excerpt.trim() || null,
      conclusion: conclusion.trim() || null,
      featuredImageId: featuredImageId || null,
      status: saveStatus || status,
      publishedAt: publishedAt || null,
      scheduledAt: scheduledAt || null,
      categoryIds: allCategoryIds,
      tagIds: allTagIds,
      metaTitle: metaTitle.trim() || null,
      metaDescription: metaDescription.trim() || null,
      focusKeyword: focusKeyword.trim() || null,
      articleType,
    };

    try {
      const response = await fetchWithCsrf(`/api/admin/articles/${articleId}`, {
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

      if (saveStatus && saveStatus !== status) {
        window.location.reload();
      }
    } catch {
      setError('حدث خطأ أثناء حفظ المقال');
    }
  }, [articleId, title, slug, content, excerpt, conclusion, featuredImageId, status, publishedAt, scheduledAt, selectedCategories, selectedTags, newCategoryNames, newTagNames, metaTitle, metaDescription, focusKeyword, articleType]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!article || !hasUnsavedChanges) return;

    const performAutoSave = async () => {
      if (!title && !content) return;
      setAutoSaving(true);
      try {
        const response = await fetchWithCsrf(`/api/admin/articles/${articleId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(), slug: slug.trim(), content: content.trim(),
            excerpt: excerpt.trim() || null, status,
            publishedAt: publishedAt || null, scheduledAt: scheduledAt || null,
            categoryIds: selectedCategories, tagIds: selectedTags,
            metaTitle: metaTitle.trim() || null,
            metaDescription: metaDescription.trim() || null,
            focusKeyword: focusKeyword.trim() || null,
          }),
        });
        if (response.ok) {
          setHasUnsavedChanges(false);
          setLastSavedAt(new Date());
        }
      } catch { /* ignore */ } finally {
        setAutoSaving(false);
      }
    };

    autoSaveRef.current = setInterval(performAutoSave, 30000);
    return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current); };
  }, [article, hasUnsavedChanges, articleId, title, slug, content, excerpt, status, publishedAt, scheduledAt, selectedCategories, selectedTags, metaTitle, metaDescription, focusKeyword]);

  const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
  const readingTime = Math.ceil(wordCount / 200);
  const imageInfo = useMemo(() => extractImageInfo(content), [content]);

  const handleScoreChange = useCallback((newScores: { seo: number; geo: number; structure: number; structureTotal: number; grammar: number }) => {
    setScores(newScores);
  }, []);

  const handleFocusSection = useCallback((section: string) => {
    setFocusSection(section);
    if (!panelOpen) {
      setPanelOpen(true);
    }
  }, [panelOpen]);

  const readinessScores = useMemo(() => {
    const seoResult = analyzeArticle({
      title, content, excerpt, metaTitle, metaDescription, focusKeyword,
      slug, hasFeaturedImage: !!featuredImageId, imageCount: imageInfo.imageCount, imagesWithAlt: imageInfo.imagesWithAlt,
    });
    const geoResult = analyzeGeo(content);
    const missing: string[] = [];
    if (!excerpt.trim() && !modalExcerpt.trim()) missing.push('الوصف الموجز');
    if (!metaTitle.trim() && !modalMetaTitle.trim()) missing.push('العنوان الوصفي (Meta Title)');
    if (!metaDescription.trim() && !modalMetaDescription.trim()) missing.push('الوصف الوصفي (Meta Description)');
    if (!focusKeyword.trim() && !modalFocusKeyword.trim()) missing.push('الكلمة المفتاحية الرئيسية');
    return { seo: seoResult.percentage, seoStatus: seoResult.status, geo: geoResult.percentage, geoStatus: geoResult.status, missing };
  }, [title, content, excerpt, metaTitle, metaDescription, focusKeyword, slug, featuredImageId, imageInfo, modalExcerpt, modalMetaTitle, modalMetaDescription, modalFocusKeyword]);

  const openPublishModal = useCallback(() => {
    setModalExcerpt(excerpt);
    setModalMetaTitle(metaTitle);
    setModalMetaDescription(metaDescription);
    setModalFocusKeyword(focusKeyword);
    setShowReadinessModal(true);
  }, [excerpt, metaTitle, metaDescription, focusKeyword]);

  const handlePublishFromModal = useCallback(() => {
    if (modalExcerpt) setExcerpt(modalExcerpt);
    if (modalMetaTitle) setMetaTitle(modalMetaTitle);
    if (modalMetaDescription) setMetaDescription(modalMetaDescription);
    if (modalFocusKeyword) setFocusKeyword(modalFocusKeyword);
    
    setShowReadinessModal(false);
    startTransition(() => {
      saveArticle('published');
    });
  }, [modalExcerpt, modalMetaTitle, modalMetaDescription, modalFocusKeyword, saveArticle]);

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
        <Alert variant="error">المقال غير موجود</Alert>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <header className="h-14 shrink-0 border-b border-border/60 bg-card/95 backdrop-blur-sm flex items-center gap-3 px-5 z-20">
        <Link
          href="/admin/articles"
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0"
          dir="rtl"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          المقالات
        </Link>

        <div className="w-px h-4 bg-border/60 shrink-0" />

        <div className="shrink-0" dir="rtl">
          {autoSaving && (
            <span className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              حفظ تلقائي...
            </span>
          )}
          {hasUnsavedChanges && !autoSaving && (
            <span className="text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">تغييرات غير محفوظة</span>
          )}
          {lastSavedAt && !hasUnsavedChanges && !autoSaving && (
            <span className="text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">
              محفوظ {lastSavedAt.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        <div className="hidden md:flex items-center gap-3 shrink-0 text-xs" dir="rtl">
          <span className={`font-semibold ${scores.seo >= 70 ? 'text-green-600' : scores.seo >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
            SEO: {scores.seo}
          </span>
          <span className="text-border/60">|</span>
          <span className={`font-semibold ${scores.geo >= 70 ? 'text-green-600' : scores.geo >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
            GEO: {scores.geo}
          </span>
          <span className="text-border/60">|</span>
          <span className={`font-semibold ${scores.structure >= 7 ? 'text-green-600' : scores.structure >= 5 ? 'text-amber-500' : 'text-red-500'}`}>
            هيكل: {scores.structure}/{scores.structureTotal}
          </span>
          <span className="text-border/60">|</span>
          <span className="text-muted-foreground">{wordCount} كلمة</span>
          {scores.grammar > 0 && (
            <>
              <span className="text-border/60">|</span>
              <span className="text-danger font-semibold">⚠ {scores.grammar} أخطاء</span>
            </>
          )}
        </div>

        <div className="flex-1" />

        <button
          onClick={() => setIsDistractionMode(true)}
          className="p-2 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
          title="وضع التركيز (Ctrl+Shift+D)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m4 0h4m0 0v-4" />
          </svg>
        </button>

        <Link
          href={`/article/${article?.slug}`}
          target="_blank"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border/60 hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
          dir="rtl"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          معاينة
        </Link>

        <Button variant="secondary" size="sm" onClick={() => saveArticle('draft')} disabled={isPending}>
          {isPending ? 'جاري الحفظ...' : 'حفظ'}
        </Button>

        <Button
          size="sm"
          onClick={openPublishModal}
          disabled={isPending}
          className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white border-0"
        >
          {isPending ? 'جاري النشر...' : 'نشر'}
        </Button>

        <button
          onClick={() => setPanelOpen(!panelOpen)}
          className="p-2 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
          title={panelOpen ? 'إخفاء اللوحة الجانبية' : 'إظهار اللوحة الجانبية'}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
          </svg>
        </button>
      </header>

      {(error || success) && (
        <div className="px-4 pt-2 shrink-0 z-10">
          {error && <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>}
          {success && <Alert variant="success" onClose={() => setSuccess(null)}>{success}</Alert>}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-8 py-10">

              <div className="mb-6" dir="rtl">
                {featuredImageUrl ? (
                  <div className="relative group rounded-xl overflow-hidden border border-border/40">
                    <img src={featuredImageUrl} alt="الصورة الرئيسية" className="w-full h-48 object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => setShowImagePicker(true)}
                        className="px-3 py-1.5 text-xs font-medium bg-white text-gray-900 rounded-lg hover:bg-gray-100"
                      >
                        تغيير
                      </button>
                      <button
                        type="button"
                        onClick={() => { setFeaturedImageId(null); setFeaturedImageUrl(null); }}
                        className="px-3 py-1.5 text-xs font-medium bg-red-500 text-white rounded-lg hover:bg-red-600"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowImagePicker(true)}
                    className="w-full h-32 rounded-xl border-2 border-dashed border-border/60 hover:border-primary/50 hover:bg-muted/30 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm">إضافة صورة رئيسية</span>
                  </button>
                )}
              </div>

              <textarea
                ref={titleRef}
                value={title}
                onChange={(e) => { handleTitleChange(e.target.value); setTitleSuggestions([]); }}
                placeholder="عنوان المقال..."
                dir="rtl"
                rows={1}
                className="w-full resize-none bg-transparent text-3xl font-bold placeholder:text-muted-foreground/30 outline-none border-none leading-tight mb-2 overflow-hidden"
                style={{ minHeight: '48px' }}
                maxLength={200}
              />

              {titleSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4" dir="rtl">
                  <span className="text-xs text-muted-foreground self-center">اقتراحات:</span>
                  {titleSuggestions.map((suggestion, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => { handleTitleChange(suggestion); setTitleSuggestions([]); }}
                      className="text-xs px-3 py-1 rounded-full bg-muted hover:bg-accent hover:text-accent-foreground border border-border/60 transition-colors text-right truncate max-w-xs"
                      title={suggestion}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-start gap-3 mb-6" dir="rtl">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground shrink-0">رابط:</span>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      placeholder="article-url"
                      dir="ltr"
                      className={`flex-1 text-xs font-mono bg-transparent outline-none border-b border-transparent hover:border-border focus:border-primary transition-colors py-0.5 text-muted-foreground focus:text-foreground ${slugError ? 'border-red-400 text-red-500' : ''}`}
                    />
                    {checkingSlug && <span className="text-xs text-muted-foreground">...</span>}
                    {slugError && <span className="text-xs text-red-500 shrink-0">{slugError}</span>}
                  </div>
                </div>
                <div className="shrink-0">
                  <Select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    options={statusOptions}
                  />
                </div>
              </div>

              {status === 'published' && (
                <div className="mb-4" dir="rtl">
                  <label className="text-xs text-muted-foreground mb-1 block">تاريخ النشر</label>
                  <Input type="datetime-local" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} />
                </div>
              )}
              {status === 'scheduled' && (
                <div className="mb-4" dir="rtl">
                  <label className="text-xs text-muted-foreground mb-1 block">جدولة النشر</label>
                  <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} min={new Date().toISOString().slice(0, 16)} />
                </div>
              )}


              <div className="border-t border-border/40 mb-8" />

              {generatedIntro && (
                <div className="mb-4 p-4 rounded-xl border border-accent/40 bg-accent/5" dir="rtl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-accent">✨ مقدمة مقترحة</span>
                    <button type="button" onClick={() => setGeneratedIntro(null)} className="text-xs text-muted-foreground hover:text-foreground">تجاهل</button>
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed mb-3">{generatedIntro}</p>
                  <button
                    type="button"
                    onClick={() => { setExcerpt(generatedIntro); setGeneratedIntro(null); }}
                    className="text-xs font-medium text-accent hover:underline"
                  >
                    استخدام كمقدمة
                  </button>
                </div>
              )}

              <RichTextEditor
                ref={richTextRef}
                content={content}
                onChange={setContent}
                placeholder="ابدأ الكتابة هنا..."
                minHeight="400px"
                enableInlineSuggestions={true}
              />

              {generatedConclusion && (
                <div className="mt-4 p-4 rounded-xl border border-accent/40 bg-accent/5" dir="rtl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-accent">✨ خاتمة مقترحة</span>
                    <button type="button" onClick={() => setGeneratedConclusion(null)} className="text-xs text-muted-foreground hover:text-foreground">تجاهل</button>
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed mb-3">{generatedConclusion}</p>
                  <button
                    type="button"
                    onClick={() => { setConclusion(generatedConclusion); setGeneratedConclusion(null); }}
                    className="text-xs font-medium text-accent hover:underline"
                  >
                    استخدام كخاتمة
                  </button>
                </div>
              )}

              {conclusion && (
                <div className="mt-6 p-4 rounded-xl border border-border/40 bg-muted/20" dir="rtl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-muted-foreground">الخاتمة</span>
                    <button type="button" onClick={() => setConclusion('')} className="text-xs text-muted-foreground hover:text-foreground">حذف</button>
                  </div>
                  <Textarea
                    value={conclusion}
                    onChange={(e) => setConclusion(e.target.value)}
                    placeholder="خاتمة المقال..."
                    rows={3}
                  />
                </div>
              )}

              <div className="mt-6 pb-10 flex items-center gap-4 text-xs text-muted-foreground/50" dir="rtl">
                <span>{wordCount} كلمة</span>
                <span>·</span>
                <span>وقت القراءة: {readingTime} دقيقة</span>
                {article?.publishedAt && (
                  <>
                    <span>·</span>
                    <span>المشاهدات: {article.views || 0}</span>
                  </>
                )}
              </div>
            </div>
          </div>

        </div>

        {panelOpen && (
          <aside className="w-80 xl:w-88 shrink-0 border-r border-border bg-card flex flex-col overflow-hidden">
            <UnifiedAiPanel
              editorRef={richTextRef}
              title={title}
              content={content}
              articleId={articleId}
              articleType={articleType}
              onTitleChange={(newTitle) => handleTitleChange(newTitle)}
              onContentChange={setContent}
              onArticleTypeChange={setArticleType}
              onSlugChange={setSlug}
              onMetaTitleChange={setMetaTitle}
              onMetaDescriptionChange={setMetaDescription}
              onExcerptChange={setExcerpt}
              onFocusKeywordChange={setFocusKeyword}
              selectedCategoryIds={selectedCategories}
              onCategoriesChange={(ids, names) => {
                setSelectedCategories(ids);
                setNewCategoryNames(names);
              }}
              selectedTagIds={selectedTags}
              onTagsChange={(ids, names) => {
                setSelectedTags(ids);
                setNewTagNames(names);
              }}
              slug={slug}
              metaTitle={metaTitle}
              metaDescription={metaDescription}
              excerpt={excerpt}
              focusKeyword={focusKeyword}
              hasFeaturedImage={!!featuredImageId}
              imageCount={imageInfo.imageCount}
              imagesWithAlt={imageInfo.imagesWithAlt}
              onFocusSection={handleFocusSection}
              focusSection={focusSection}
              onScoreChange={handleScoreChange}
              onTitleSuggestionsReady={setTitleSuggestions}
              onIntroGenerated={setGeneratedIntro}
              onConclusionGenerated={setGeneratedConclusion}
            />
          </aside>
        )}
      </div>

      <KeyboardShortcuts
        onShortcutTriggered={(shortcut) => {
          if (shortcut === 'save') saveArticle('draft');
          if (shortcut === 'publish') saveArticle('published');
        }}
      />

      <DistractionMode
        isOpen={isDistractionMode}
        onClose={() => setIsDistractionMode(false)}
        title={title}
        actions={
          <>
            <Button type="button" variant="secondary" size="sm" onClick={() => saveArticle('draft')} disabled={isPending}>
              {isPending ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
            <Button type="button" size="sm" onClick={openPublishModal} disabled={isPending}>
              {isPending ? 'جاري النشر...' : 'نشر'}
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          <Input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="عنوان المقال..."
            className="text-2xl font-semibold border-0 focus:ring-0 px-0"
            maxLength={200}
          />
          <RichTextEditor
            content={content}
            onChange={setContent}
            placeholder="ابدأ الكتابة هنا..."
            minHeight="calc(100vh - 300px)"
          />
        </div>
      </DistractionMode>

      {showReadinessModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowReadinessModal(false)}>
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} dir="rtl">
            <h2 className="text-lg font-bold mb-4">نشر المقال</h2>

            <div className="flex gap-4 mb-5">
              <div className="flex-1 rounded-lg border border-border p-3 text-center">
                <div className={`text-2xl font-bold ${readinessScores.seoStatus === 'good' ? 'text-green-600' : readinessScores.seoStatus === 'needs-improvement' ? 'text-amber-500' : 'text-red-500'}`}>
                  {readinessScores.seo}
                </div>
                <div className="text-xs text-muted-foreground mt-1">SEO / 100</div>
              </div>
              <div className="flex-1 rounded-lg border border-border p-3 text-center">
                <div className={`text-2xl font-bold ${readinessScores.geoStatus === 'good' ? 'text-green-600' : readinessScores.geoStatus === 'needs-improvement' ? 'text-amber-500' : 'text-red-500'}`}>
                  {readinessScores.geo}
                </div>
                <div className="text-xs text-muted-foreground mt-1">GEO / 100</div>
              </div>
            </div>

            <div className="space-y-4 mb-5">
              <div className={`p-3 rounded-lg border ${modalMetaTitle.trim() ? 'bg-success/5 border-success/20' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{modalMetaTitle.trim() ? '✅' : '⚠'} العنوان الوصفي (Meta Title)</span>
                  <span className={`text-xs ${modalMetaTitle.length >= 50 && modalMetaTitle.length <= 60 ? 'text-success' : 'text-muted-foreground'}`}>
                    {modalMetaTitle.length}/60
                  </span>
                </div>
                <Input
                  value={modalMetaTitle}
                  onChange={(e) => setModalMetaTitle(e.target.value)}
                  placeholder="عنوان الميتا..."
                  maxLength={70}
                />
              </div>

              <div className={`p-3 rounded-lg border ${modalExcerpt.trim() ? 'bg-success/5 border-success/20' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{modalExcerpt.trim() ? '✅' : '⚠'} الوصف الموجز</span>
                  <span className="text-xs text-muted-foreground">
                    {modalExcerpt.length}/500
                  </span>
                </div>
                <Textarea
                  value={modalExcerpt}
                  onChange={(e) => setModalExcerpt(e.target.value)}
                  placeholder="ملخص قصير للمقال..."
                  rows={2}
                  maxLength={500}
                />
              </div>

              <div className={`p-3 rounded-lg border ${modalMetaDescription.trim() ? 'bg-success/5 border-success/20' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{modalMetaDescription.trim() ? '✅' : '⚠'} الوصف الوصفي (Meta Description)</span>
                  <span className={`text-xs ${modalMetaDescription.length >= 140 && modalMetaDescription.length <= 160 ? 'text-success' : 'text-muted-foreground'}`}>
                    {modalMetaDescription.length}/160
                  </span>
                </div>
                <Textarea
                  value={modalMetaDescription}
                  onChange={(e) => setModalMetaDescription(e.target.value)}
                  placeholder="وصف الميتا..."
                  rows={2}
                  maxLength={170}
                />
              </div>

              <div className={`p-3 rounded-lg border ${modalFocusKeyword.trim() ? 'bg-success/5 border-success/20' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium">{modalFocusKeyword.trim() ? '✅' : '⚠'} الكلمة المفتاحية</span>
                </div>
                <Input
                  value={modalFocusKeyword}
                  onChange={(e) => setModalFocusKeyword(e.target.value)}
                  placeholder="الكلمة المفتاحية الرئيسية..."
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="primary" className="flex-1" onClick={handlePublishFromModal} disabled={isPending}>
                {isPending ? 'جاري النشر...' : 'نشر الآن'}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setShowReadinessModal(false)}>
                العودة للمراجعة
              </Button>
            </div>
          </div>
        </div>
      )}

      <ImagePickerModal
        isOpen={showImagePicker}
        onClose={() => setShowImagePicker(false)}
        onSelect={(image) => {
          setFeaturedImageId(image.id);
          setFeaturedImageUrl(image.url);
          setShowImagePicker(false);
        }}
        title="اختر الصورة الرئيسية"
      />
    </div>
  );
}
