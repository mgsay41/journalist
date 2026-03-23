'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-2xl font-semibold text-foreground">حدث خطأ غير متوقع</h1>
        <p className="text-muted-foreground">
          نعتذر عن الإزعاج. يرجى المحاولة مرة أخرى.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <pre className="text-xs text-right bg-muted p-4 rounded-lg overflow-auto max-h-40 whitespace-pre-wrap">
            {error.message}
          </pre>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-foreground text-background font-medium rounded-md hover:bg-foreground/90 transition-colors"
          >
            محاولة مرة أخرى
          </button>
          <Link
            href="/"
            className="px-6 py-3 border border-border bg-background hover:bg-muted font-medium rounded-md transition-colors"
          >
            العودة للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
