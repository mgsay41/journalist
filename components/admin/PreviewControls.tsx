'use client';

import Link from 'next/link';

interface PreviewControlsProps {
  articleId: string;
}

export function PreviewControls({ articleId }: PreviewControlsProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 shadow-lg p-4">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="text-sm text-zinc-600">
          <span className="font-medium">وضع المعاينة</span>
          <span className="mx-2">•</span>
          <Link href={`/admin/articles/${articleId}/edit`} className="underline">
            تعديل المقال
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-white border border-zinc-300 rounded-md text-sm font-medium hover:bg-zinc-50 transition-colors"
          >
            طباعة
          </button>
          <Link
            href="/admin"
            className="px-4 py-2 bg-zinc-900 text-white rounded-md text-sm font-medium hover:bg-zinc-800 transition-colors"
          >
            العودة للوحة التحكم
          </Link>
        </div>
      </div>
    </div>
  );
}
