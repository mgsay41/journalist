'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { DeleteArticleButton } from '@/components/admin/DeleteArticleButton';
import { ArticleActionsButton } from '@/components/admin/ArticleActionsButton';
import { BulkActionsBar } from '@/components/admin/BulkActionsBar';

interface Article {
  id: string;
  title: string;
  slug: string;
  status: string;
  excerpt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  views: number;
  categories: Array<{ id: string; name: string; slug: string }>;
  tags: Array<{ id: string; name: string; slug: string }>;
  author: {
    id: string;
    name: string;
    email: string;
  };
}

interface ArticlesListClientProps {
  articles: Article[];
  categories: Array<{ id: string; name: string; slug: string }>;
  tags: Array<{ id: string; name: string; slug: string }>;
}

function getStatusBadge(status: string) {
  const statusConfig = {
    draft: { label: 'مسودة', variant: 'secondary' as const },
    published: { label: 'منشورة', variant: 'success' as const },
    scheduled: { label: 'مجدولة', variant: 'warning' as const },
    archived: { label: 'مؤرشفة', variant: 'default' as const },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function formatDate(date: string | null) {
  if (!date) return '-';
  return new Intl.DateTimeFormat('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

export function ArticlesListClient({ articles, categories, tags }: ArticlesListClientProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.length === articles.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(articles.map(a => a.id));
    }
  }, [selectedIds, articles]);

  const handleSelectOne = useCallback((id: string) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const isAllSelected = articles.length > 0 && selectedIds.length === articles.length;
  const isSomeSelected = selectedIds.length > 0 && selectedIds.length < articles.length;

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b bg-muted/30">
            <tr>
              <th className="py-3 px-4 w-10">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isSomeSelected;
                  }}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
              </th>
              <th className="text-right py-3 px-4 font-medium text-sm">العنوان</th>
              <th className="text-right py-3 px-4 font-medium text-sm">الحالة</th>
              <th className="text-right py-3 px-4 font-medium text-sm">التصنيفات</th>
              <th className="text-right py-3 px-4 font-medium text-sm">الكاتب</th>
              <th className="text-right py-3 px-4 font-medium text-sm">تاريخ النشر</th>
              <th className="text-right py-3 px-4 font-medium text-sm">المشاهدات</th>
              <th className="text-right py-3 px-4 font-medium text-sm w-32">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {articles.map((article) => (
              <tr
                key={article.id}
                className={`border-b hover:bg-muted/30 ${
                  selectedIds.includes(article.id) ? 'bg-primary/5' : ''
                }`}
              >
                <td className="py-3 px-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(article.id)}
                    onChange={() => handleSelectOne(article.id)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </td>
                <td className="py-3 px-4">
                  <div>
                    <div className="font-medium line-clamp-1">{article.title}</div>
                    {article.excerpt && (
                      <div className="text-sm text-muted-foreground line-clamp-1 mt-1">
                        {article.excerpt}
                      </div>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  {getStatusBadge(article.status)}
                </td>
                <td className="py-3 px-4">
                  <div className="flex flex-wrap gap-1">
                    {article.categories.length > 0 ? (
                      article.categories.map((cat) => (
                        <Badge key={cat.id} variant="secondary" size="sm">
                          {cat.name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 text-sm">
                  {article.author.name}
                </td>
                <td className="py-3 px-4 text-sm">
                  {formatDate(article.publishedAt || article.createdAt)}
                </td>
                <td className="py-3 px-4 text-sm">
                  {article.views.toLocaleString('ar-SA')}
                </td>
                <td className="py-3 px-4">
                  <div className="flex gap-1">
                    <Link
                      href={`/admin/articles/${article.id}/edit`}
                      className="inline-flex items-center justify-center p-2 rounded-md hover:bg-muted-foreground/10 transition-colors"
                      title="تعديل"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </Link>
                    <Link
                      href={`/article/${article.slug}`}
                      target="_blank"
                      className="inline-flex items-center justify-center p-2 rounded-md hover:bg-muted-foreground/10 transition-colors"
                      title="عرض"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </Link>
                    <ArticleActionsButton
                      articleId={article.id}
                      articleTitle={article.title}
                      articleSlug={article.slug}
                    />
                    <DeleteArticleButton articleId={article.id} articleTitle={article.title} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <BulkActionsBar
        selectedIds={selectedIds}
        onClearSelection={handleClearSelection}
        categories={categories}
        tags={tags}
      />
    </>
  );
}
