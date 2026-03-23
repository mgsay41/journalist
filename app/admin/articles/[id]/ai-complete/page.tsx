'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Loading';
import { ArticleCompletionResults, CompletionResults } from '@/components/admin/ArticleCompletionResults';
import { fetchWithCsrf } from '@/lib/security/csrf-client';

// Progress steps for the AI completion process
const COMPLETION_STEPS = [
  { id: 'analyzing', label: 'تحليل المحتوى...' },
  { id: 'keywords', label: 'استخراج الكلمات المفتاحية...' },
  { id: 'categories', label: 'تصنيف المقال...' },
  { id: 'meta', label: 'توليد وصف المقال...' },
  { id: 'grammar', label: 'التدقيق اللغوي...' },
  { id: 'seo', label: 'تحليل SEO...' },
];

interface Article {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  slug: string;
  status: string;
  metaTitle: string | null;
  metaDescription: string | null;
  focusKeyword: string | null;
  aiCompletionData: CompletionResults | null;
  categories: Array<{ id: string; name: string }>;
  tags: Array<{ id: string; name: string }>;
}

export default function AiCompletePage() {
  const router = useRouter();
  const params = useParams();
  const articleId = params.id as string;

  // State
  const [article, setArticle] = useState<Article | null>(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionStep, setCompletionStep] = useState(0);
  const [completionResults, setCompletionResults] = useState<CompletionResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch article on mount
  useEffect(() => {
    async function fetchArticle() {
      try {
        const response = await fetch(`/api/admin/articles/${articleId}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError('المقال غير موجود');
          } else {
            throw new Error('فشل في جلب المقال');
          }
          return;
        }

        const data = await response.json();
        setArticle(data);
        setContent(data.content);
        setTitle(data.title);

        // If AI completion data exists, use it
        if (data.aiCompletionData) {
          setCompletionResults(data.aiCompletionData as CompletionResults);
        }
      } catch (err) {
        console.error('Error fetching article:', err);
        setError(err instanceof Error ? err.message : 'حدث خطأ أثناء جلب المقال');
      } finally {
        setIsLoading(false);
      }
    }

    fetchArticle();
  }, [articleId]);

  // Run AI completion
  const runAiCompletion = useCallback(async () => {
    if (!article) return;

    setError(null);
    setIsCompleting(true);
    setCompletionStep(0);

    try {
      // Simulate step progress
      const stepInterval = setInterval(() => {
        setCompletionStep(prev => {
          if (prev < COMPLETION_STEPS.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, 800);

      // Call the API
      const response = await fetch('/api/admin/ai/complete-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: article.title,
          content: content,
        }),
      });

      clearInterval(stepInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'فشل في تحليل المقال');
      }

      const results = await response.json();
      setCompletionResults(results);
      setCompletionStep(COMPLETION_STEPS.length);

      // Save AI completion data to the article
      await saveAiCompletionData(results);
    } catch (err) {
      console.error('Completion error:', err);
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء تحليل المقال');
    } finally {
      setIsCompleting(false);
    }
  }, [article, content]);

  // Save AI completion data to the article
  const saveAiCompletionData = async (results: CompletionResults) => {
    try {
      await fetchWithCsrf(`/api/admin/articles/${articleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiCompletionData: results,
        }),
      });
    } catch (err) {
      console.error('Error saving AI completion data:', err);
    }
  };

  // Handle title change
  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
  }, []);

  // Handle save as draft
  const handleSaveDraft = useCallback(async (saveData: {
    title: string;
    slug: string;
    focusKeyword: string;
    metaTitle: string;
    metaDescription: string;
    excerpt: string;
    categoryIds: string[];
    tagIds: string[];
    newTagNames: string[];
    newCategoryNames: string[];
  }) => {
    if (!article) return;

    setError(null);
    setIsSaving(true);

    try {
      // First, create any new categories
      const newCategoryIds: string[] = [];
      for (const categoryName of saveData.newCategoryNames) {
        const categoryResponse = await fetch('/api/admin/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: categoryName }),
        });

        if (categoryResponse.ok) {
          const newCategory = await categoryResponse.json();
          newCategoryIds.push(newCategory.id);
        }
      }

      // Then, create any new tags
      const newTagIds: string[] = [];
      for (const tagName of saveData.newTagNames) {
        const tagResponse = await fetch('/api/admin/tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: tagName }),
        });

        if (tagResponse.ok) {
          const newTag = await tagResponse.json();
          newTagIds.push(newTag.id);
        }
      }

      // Update the article as draft
      const response = await fetchWithCsrf(`/api/admin/articles/${articleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: saveData.title,
          slug: saveData.slug,
          content: content,
          excerpt: saveData.excerpt || null,
          status: 'draft',
          categoryIds: [...saveData.categoryIds, ...newCategoryIds],
          tagIds: [...saveData.tagIds, ...newTagIds],
          metaTitle: saveData.metaTitle || null,
          metaDescription: saveData.metaDescription || null,
          focusKeyword: saveData.focusKeyword || null,
          aiCompletionData: null, // Clear AI data after saving
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'فشل في حفظ المسودة');
      }

      setSuccess('تم حفظ المسودة بنجاح');

      // Redirect to edit page
      setTimeout(() => {
        router.push(`/admin/articles/${articleId}/edit`);
      }, 1000);
    } catch (err) {
      console.error('Save draft error:', err);
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء حفظ المسودة');
    } finally {
      setIsSaving(false);
    }
  }, [article, content, articleId, router]);

  // Handle regenerate
  const handleRegenerate = useCallback(() => {
    runAiCompletion();
  }, [runAiCompletion]);

  // Handle content change from ContentImprovementCard
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
  }, []);

  // Start AI completion automatically if no results exist
  useEffect(() => {
    if (article && !completionResults && !isCompleting && !error) {
      runAiCompletion();
    }
  }, [article, completionResults, isCompleting, error, runAiCompletion]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-muted-foreground">جاري تحميل المقال...</p>
        </div>
      </div>
    );
  }

  // Error state - article not found
  if (!article) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">المقال غير موجود</h2>
          <p className="text-muted-foreground mb-6">{error || 'لم يتم العثور على المقال المطلوب'}</p>
          <Link
            href="/admin/articles"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            العودة للمقالات
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-3 items-center gap-4">
            {/* Right side - Back button */}
            <div className="flex items-center justify-start">
              <Link
                href="/admin/articles"
                className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg border border-border hover:bg-muted transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span>المقالات</span>
              </Link>
            </div>

            {/* Center - Title */}
            <div className="text-center">
              <h1 className="text-xl font-bold text-foreground">تحليل الذكاء الاصطناعي</h1>
              <p className="text-sm text-muted-foreground mt-0.5 truncate max-w-xs mx-auto" title={article.title}>
                {article.title}
              </p>
            </div>

            {/* Left side - Skip to edit */}
            <div className="flex items-center justify-end">
              <Link
                href={`/admin/articles/${articleId}/edit`}
                className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>تخطي للتحرير</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {error && !isCompleting && (
          <Alert variant="error" onClose={() => setError(null)} className="mb-6">
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success" onClose={() => setSuccess(null)} className="mb-6">
            {success}
          </Alert>
        )}
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Loading/Progress State */}
        {isCompleting && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-card border rounded-xl shadow-xl p-8 max-w-md w-full mx-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  جاري تحليل المقال...
                </h3>
                <p className="text-sm text-muted-foreground">
                  يقوم الذكاء الاصطناعي بتحليل المحتوى وإعداد وصف المقال
                </p>
              </div>

              {/* Progress Steps */}
              <div className="space-y-3">
                {COMPLETION_STEPS.map((step, index) => (
                  <div
                    key={step.id}
                    className={`flex items-center gap-3 ${
                      index <= completionStep ? 'text-foreground' : 'text-muted-foreground/50'
                    }`}
                  >
                    <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                      index < completionStep
                        ? 'bg-success text-white'
                        : index === completionStep
                          ? 'bg-primary text-white'
                          : 'bg-muted'
                    }`}>
                      {index < completionStep ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : index === completionStep ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : (
                        <span className="text-xs">{index + 1}</span>
                      )}
                    </div>
                    <span className="text-sm">{step.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Results or Start Analysis */}
        {completionResults ? (
          <ArticleCompletionResults
            results={completionResults}
            onContentChange={handleContentChange}
            currentContent={content}
            currentTitle={title}
            onTitleChange={handleTitleChange}
            onSaveDraft={handleSaveDraft}
            onRegenerate={handleRegenerate}
            isSaving={isSaving}
            error={error}
            onClearError={() => setError(null)}
            draftOnly={true}
          />
        ) : !isCompleting && (
          <div className="text-center py-12">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">تحليل المقال بالذكاء الاصطناعي</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              سيقوم الذكاء الاصطناعي بتحليل المقال واقتراح الكلمات المفتاحية والتصنيفات ووصف المقال المناسب
            </p>
            <Button onClick={runAiCompletion} size="lg" className="gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              بدء التحليل
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
