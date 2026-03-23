'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Alert } from '@/components/ui/Alert';
import { SimplifiedArticleEditor } from '@/components/admin/SimplifiedArticleEditor';
import { fetchWithCsrf } from '@/lib/security/csrf-client';

export default function NewArticlePage() {
  const router = useRouter();

  // Core state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  // UI state
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle article completion - save as draft and redirect to AI analysis page
  const handleComplete = useCallback(async (data: { title: string; content: string; articleId?: string }) => {
    setTitle(data.title);
    setContent(data.content);
    setError(null);
    setIsCreating(true);

    try {
      let articleId = data.articleId;

      // If auto-save already created the article, skip creating a duplicate
      if (!articleId) {
        const response = await fetchWithCsrf('/api/admin/articles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: data.title,
            content: data.content,
            status: 'draft',
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'فشل في إنشاء المقال');
        }

        const article = await response.json();
        articleId = article.id;
      }

      // Clear local draft
      try {
        localStorage.removeItem('article-draft-simplified');
      } catch (e) {
        console.error('Failed to clear draft:', e);
      }

      // Redirect to AI analysis page
      router.push(`/admin/articles/${articleId}/ai-complete`);
    } catch (err) {
      console.error('Create error:', err);
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء إنشاء المقال');
      setIsCreating(false);
    }
  }, [router]);

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
                <span>رجوع</span>
              </Link>
            </div>

            {/* Center - Title */}
            <div className="text-center">
              <h1 className="text-xl font-bold text-foreground">مقال جديد</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                اكتب المحتوى ودع الذكاء الاصطناعي يكمل الباقي
              </p>
            </div>

            {/* Left side - Empty for balance */}
            <div></div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {error && (
          <Alert variant="error" onClose={() => setError(null)} className="mb-6">
            {error}
          </Alert>
        )}
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Creating Overlay */}
        {isCreating && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-card border rounded-xl shadow-xl p-8 max-w-md w-full mx-4">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  جاري إنشاء المقال...
                </h3>
                <p className="text-sm text-muted-foreground">
                  سيتم توجيهك لصفحة تحليل الذكاء الاصطناعي
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Editor */}
        <SimplifiedArticleEditor
          initialTitle={title}
          initialContent={content}
          isCompleting={isCreating}
          onComplete={handleComplete}
        />
      </div>

      {/* Legacy Editor Link */}
      {!isCreating && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div className="text-center py-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              تفضل المحرر التقليدي؟{' '}
              <Link href="/admin/articles/new/classic" className="text-primary hover:underline">
                استخدم المحرر الكلاسيكي
              </Link>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
