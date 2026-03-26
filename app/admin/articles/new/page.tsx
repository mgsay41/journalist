'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { RichTextEditor, type RichTextEditorRef } from '@/components/admin/RichTextEditor';
import { UnifiedAiPanel } from '@/components/admin/UnifiedAiPanel';
import ImagePickerModal from '@/components/admin/ImagePickerModal';
import { Alert } from '@/components/ui/Alert';
import { fetchWithCsrf } from '@/lib/security/csrf-client';
import { analyzeArticle, analyzeGeo } from '@/lib/seo';
import { ArticleEditorHeader } from '@/components/admin/ArticleEditorHeader';

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

  const [featuredImageId, setFeaturedImageId] = useState<string | null>(null);
  const [featuredImageUrl, setFeaturedImageUrl] = useState<string | null>(null);
  const [showImagePicker, setShowImagePicker] = useState(false);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      setPanelOpen(true);
    }
  }, []);
  const [showReadinessModal, setShowReadinessModal] = useState(false);
  const [focusSection, setFocusSection] = useState<string | undefined>(undefined);
  const [scores, setScores] = useState({ seo: 0, geo: 0, structure: 0, structureTotal: 10, grammar: 0 });

  const [modalExcerpt, setModalExcerpt] = useState('');
  const [modalMetaTitle, setModalMetaTitle] = useState('');
  const [modalMetaDescription, setModalMetaDescription] = useState('');
  const [modalFocusKeyword, setModalFocusKeyword] = useState('');

  const [draftRecovery, setDraftRecovery] = useState<{ title: string; content: string } | null>(null);

  const LS_KEY = "article-draft-new";

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

  const handleScoreChange = useCallback((newScores: { seo: number; geo: number; structure: number; structureTotal: number; grammar: number }) => {
    setScores(newScores);
  }, []);

  const handleFocusSection = useCallback((section: string) => {
    setFocusSection(section);
    if (!panelOpen) {
      setPanelOpen(true);
    }
  }, [panelOpen]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const { title: t, content: c } = JSON.parse(saved);
        if (t || c) {
          setDraftRecovery({ title: t, content: c });
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!title.trim() && !content.trim()) return;
      try {
        localStorage.setItem(LS_KEY, JSON.stringify({ title, content }));
      } catch {}
    }, 3000);
    return () => clearTimeout(timer);
  }, [title, content]);

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
          featuredImageId: featuredImageId || undefined,
          focusKeyword: focusKeyword || undefined,
          slug: slug || undefined,
        }),
      });

      if (!res.ok) throw new Error('auto-save failed');

      const data = await res.json();
      if (data.article?.id) {
        articleIdRef.current = data.article.id;
        // Migrate AI analysis results to the new key before navigating
        try {
          const oldKey = 'ai-results-new';
          const newKey = `ai-results-${data.article.id}`;
          const existing = sessionStorage.getItem(oldKey);
          if (existing) {
            sessionStorage.setItem(newKey, existing);
            sessionStorage.removeItem(oldKey);
          }
        } catch {}
        if (!hasReplacedUrlRef.current) {
          hasReplacedUrlRef.current = true;
          router.replace(`/admin/articles/${data.article.id}/edit`, { scroll: false });
        }
      }
      setSaveStatus('saved');
      try {
        localStorage.removeItem(LS_KEY);
      } catch {}
    } catch {
      setSaveStatus('error');
    }
  }, [title, content, excerpt, metaTitle, metaDescription, featuredImageId, focusKeyword, slug, router]);

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

    const finalExcerpt = modalExcerpt || excerpt;
    const finalMetaTitle = modalMetaTitle || metaTitle;
    const finalMetaDescription = modalMetaDescription || metaDescription;
    const finalFocusKeyword = modalFocusKeyword || focusKeyword;

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
      const failedCategories: string[] = [];
      for (const name of newCategoryNames) {
        const res = await fetchWithCsrf('/api/admin/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.id) createdCategoryIds.push(data.id);
        } else {
          failedCategories.push(name);
        }
      }

      const createdTagIds: string[] = [];
      const failedTags: string[] = [];
      for (const name of newTagNames) {
        const res = await fetchWithCsrf('/api/admin/tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.id) createdTagIds.push(data.id);
        } else {
          failedTags.push(name);
        }
      }

      if (failedCategories.length > 0 || failedTags.length > 0) {
        const parts: string[] = [];
        if (failedCategories.length > 0) parts.push(`التصنيفات: ${failedCategories.join('، ')}`);
        if (failedTags.length > 0) parts.push(`الوسوم: ${failedTags.join('، ')}`);
        setError(`فشل إنشاء ${parts.join(' | ')} — تم النشر بدونها`);
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
          excerpt: finalExcerpt || undefined,
          metaTitle: finalMetaTitle || undefined,
          metaDescription: finalMetaDescription || undefined,
          focusKeyword: finalFocusKeyword || undefined,
          featuredImageId: featuredImageId || undefined,
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
    featuredImageId, articleType, selectedCategoryIds, newCategoryNames, selectedTagIds, newTagNames, router,
    modalExcerpt, modalMetaTitle, modalMetaDescription, modalFocusKeyword,
  ]);

  const { imageCount, imagesWithAlt } = extractImageInfo(content);

  const readinessScores = useMemo(() => {
    const seoResult = analyzeArticle({
      title, content, excerpt, metaTitle, metaDescription, focusKeyword,
      slug, hasFeaturedImage: false, imageCount, imagesWithAlt,
    });
    const geoResult = analyzeGeo(content);
    const missing: string[] = [];
    if (!excerpt.trim() && !modalExcerpt.trim()) missing.push('الوصف الموجز');
    if (!metaTitle.trim() && !modalMetaTitle.trim()) missing.push('العنوان الوصفي (Meta Title)');
    if (!metaDescription.trim() && !modalMetaDescription.trim()) missing.push('الوصف الوصفي (Meta Description)');
    if (!focusKeyword.trim() && !modalFocusKeyword.trim()) missing.push('الكلمة المفتاحية الرئيسية');
    return { seo: seoResult.percentage, seoStatus: seoResult.status, geo: geoResult.percentage, geoStatus: geoResult.status, missing };
  }, [title, content, excerpt, metaTitle, metaDescription, focusKeyword, slug, imageCount, imagesWithAlt, modalExcerpt, modalMetaTitle, modalMetaDescription, modalFocusKeyword]);

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
    setTimeout(() => {
      handlePublish();
    }, 0);
  }, [modalExcerpt, modalMetaTitle, modalMetaDescription, modalFocusKeyword, handlePublish]);

  const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).filter(w => w.length > 0).length;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <ArticleEditorHeader
        articleTitle={title}
        saveState={saveStatus === 'saving' ? 'saving' : saveStatus === 'saved' ? 'saved' : saveStatus === 'error' ? 'error' : 'idle'}
        scores={scores}
        wordCount={wordCount}
        onPublish={openPublishModal}
        publishing={publishing}
        panelOpen={panelOpen}
        onTogglePanel={() => setPanelOpen(!panelOpen)}
        onFocusSection={handleFocusSection}
      />

      {draftRecovery && (
        <div className="px-4 pt-2 shrink-0 z-10">
          <div className="flex items-center justify-between gap-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg" dir="rtl">
            <span className="text-sm text-amber-800 dark:text-amber-200">
              تم العثور على مسودة غير محفوظة. هل تريد استعادتها؟
            </span>
            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                onClick={() => {
                  if (draftRecovery) {
                    setTitle(draftRecovery.title);
                    setContent(draftRecovery.content);
                  }
                  setDraftRecovery(null);
                }}
              >
                استعادة
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDraftRecovery(null)}
              >
                تجاهل
              </Button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="px-4 pt-2 shrink-0 z-10">
          <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-4 md:px-8 py-10">
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
                onChange={handleTitleChange}
                placeholder="عنوان المقال..."
                dir="rtl"
                rows={1}
                className="w-full resize-none bg-transparent text-3xl font-bold placeholder:text-muted-foreground/30 outline-none border-none leading-tight mb-8 overflow-hidden"
                style={{ minHeight: '48px' }}
              />

              <div className="border-t border-border/40 mb-8" />

              <RichTextEditor
                ref={editorRef}
                content={content}
                onChange={setContent}
                placeholder="ابدأ الكتابة هنا..."
                minHeight="calc(100vh - 320px)"
                enableInlineSuggestions={true}
              />
            </div>
          </div>
        </div>

        {/* Desktop side panel */}
        {panelOpen && (
          <aside className="hidden md:flex w-80 xl:w-88 shrink-0 border-e border-border bg-card flex-col overflow-hidden">
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
              hasFeaturedImage={!!featuredImageId}
              imageCount={imageCount}
              imagesWithAlt={imagesWithAlt}
              onFocusSection={handleFocusSection}
              focusSection={focusSection}
              onScoreChange={handleScoreChange}
            />
          </aside>
        )}

        {/* Mobile bottom sheet */}
        {panelOpen && (
          <div className="md:hidden fixed inset-0 z-40 flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/40" onClick={() => setPanelOpen(false)} />
            <div className="relative bg-card border-t border-border rounded-t-2xl max-h-[80vh] flex flex-col overflow-hidden z-50">
              <div className="flex justify-center pt-2 pb-1 shrink-0">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>
              <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0" dir="rtl">
                <span className="text-sm font-semibold">الإعدادات والتحليل</span>
                <button onClick={() => setPanelOpen(false)} className="p-2 rounded-lg hover:bg-muted min-h-[44px] min-w-[44px] flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
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
                  hasFeaturedImage={!!featuredImageId}
                  imageCount={imageCount}
                  imagesWithAlt={imagesWithAlt}
                  onFocusSection={handleFocusSection}
                  focusSection={focusSection}
                  onScoreChange={handleScoreChange}
                />
              </div>
            </div>
          </div>
        )}
      </div>

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
              <Button variant="primary" className="flex-1" onClick={handlePublishFromModal} disabled={publishing}>
                {publishing ? 'جاري النشر...' : 'نشر الآن'}
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
