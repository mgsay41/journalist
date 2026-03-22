'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { gooeyToast } from 'goey-toast';

interface ArticleActionsButtonProps {
  articleId: string;
  articleTitle: string;
  articleSlug: string;
}

export function ArticleActionsButton({ articleId, articleTitle, articleSlug }: ArticleActionsButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);

  const handleDuplicate = async () => {
    if (isDuplicating) return;

    setIsDuplicating(true);
    try {
      const response = await fetch(`/api/admin/articles/${articleId}/duplicate`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/admin/articles/${data.id}/edit`);
      } else {
        const error = await response.json();
        gooeyToast.error(error.error || 'فشل نسخ المقال');
      }
    } catch (error) {
      console.error('Failed to duplicate article:', error);
      gooeyToast.error('حدث خطأ أثناء نسخ المقال');
    } finally {
      setIsDuplicating(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center p-2 rounded-md hover:bg-muted-foreground/10 transition-colors"
        title="المزيد"
        aria-label="المزيد من الإجراءات"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-card border z-20">
            <div className="py-1" role="menu">
              <button
                type="button"
                onClick={handleDuplicate}
                disabled={isDuplicating}
                className="block w-full text-right px-4 py-2 text-sm hover:bg-muted transition-colors disabled:opacity-50"
                role="menuitem"
              >
                {isDuplicating ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    جاري النسخ...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    نسخ المقال
                  </span>
                )}
              </button>
              <a
                href={`/article/${articleSlug}`}
                target="_blank"
                className="block w-full text-right px-4 py-2 text-sm hover:bg-muted transition-colors"
                role="menuitem"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  فتح في صفحة جديدة
                </span>
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
