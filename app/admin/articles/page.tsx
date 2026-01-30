import { Suspense } from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { Loading } from '@/components/ui/Loading';
import { ArticlesListClient } from '@/components/admin/ArticlesListClient';
import { Prisma } from '@prisma/client';

interface SearchParams {
  page?: string;
  search?: string;
  status?: string;
  categoryId?: string;
  tagId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: string;
}

interface Article {
  id: string;
  title: string;
  slug: string;
  status: string;
  excerpt: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  views: number;
  categories: Array<{ id: string; name: string; slug: string }>;
  tags: Array<{ id: string; name: string; slug: string }>;
  author: {
    id: string;
    name: string;
    email: string;
  };
}

interface ArticlesResponse {
  articles: Article[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface FilterOption {
  id: string;
  name: string;
  slug: string;
}

async function getArticles(searchParams: SearchParams): Promise<ArticlesResponse> {
  const session = await getServerSession();
  if (!session) {
    return { articles: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
  }

  const page = parseInt(searchParams.page || '1');
  const search = searchParams.search;
  const status = searchParams.status;
  const categoryId = searchParams.categoryId;
  const tagId = searchParams.tagId;
  const dateFrom = searchParams.dateFrom;
  const dateTo = searchParams.dateTo;
  const sortBy = searchParams.sortBy || 'updatedAt';
  const sortOrder = searchParams.sortOrder || 'desc';
  const limit = 20;

  const where: Prisma.ArticleWhereInput = {};

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { content: { contains: search, mode: 'insensitive' } },
      { excerpt: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (status) {
    where.status = status;
  }

  // Filter by category
  if (categoryId) {
    where.categories = {
      some: { id: categoryId },
    };
  }

  // Filter by tag
  if (tagId) {
    where.tags = {
      some: { id: tagId },
    };
  }

  // Filter by date range
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) {
      where.createdAt.gte = new Date(dateFrom);
    }
    if (dateTo) {
      // Set to end of day
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      where.createdAt.lte = endDate;
    }
  }

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        categories: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        tags: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    }),
    prisma.article.count({ where }),
  ]);

  return {
    articles,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function getFilterOptions(): Promise<{ categories: FilterOption[]; tags: FilterOption[] }> {
  const [categories, tags] = await Promise.all([
    prisma.category.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    }),
    prisma.tag.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return { categories, tags };
}

function buildFilterUrl(params: SearchParams, updates: Record<string, string | undefined>): string {
  const searchParams = new URLSearchParams();

  const allParams = { ...params, ...updates };

  Object.entries(allParams).forEach(([key, value]) => {
    if (value && value !== '') {
      searchParams.set(key, value);
    }
  });

  const queryString = searchParams.toString();
  return `/admin/articles${queryString ? `?${queryString}` : ''}`;
}

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const [{ articles, pagination }, { categories, tags }] = await Promise.all([
    getArticles(params),
    getFilterOptions(),
  ]);

  const hasFilters = params.search || params.status || params.categoryId || params.tagId || params.dateFrom || params.dateTo;

  // Serialize dates for client component
  const serializedArticles = articles.map(article => ({
    ...article,
    publishedAt: article.publishedAt?.toISOString() || null,
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">المقالات</h1>
          <p className="text-muted-foreground mt-1">
            إدارة وتنظيم جميع المقالات
          </p>
        </div>
        <Link href="/admin/articles/new" className="inline-flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-md hover:bg-foreground/90 transition-colors">
          <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          إضافة مقال جديد
        </Link>
      </div>

      {/* Filters Card */}
      <Card>
        <div className="p-6 space-y-4">
          <form className="space-y-4">
            {/* First Row - Search and Status */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">البحث</label>
                <Input
                  name="search"
                  type="search"
                  placeholder="البحث في المقالات..."
                  defaultValue={params.search}
                  autoComplete="off"
                />
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium mb-1">الحالة</label>
                <Select
                  name="status"
                  defaultValue={params.status || ''}
                  options={[
                    { value: '', label: 'جميع الحالات' },
                    { value: 'draft', label: 'مسودة' },
                    { value: 'published', label: 'منشورة' },
                    { value: 'scheduled', label: 'مجدولة' },
                    { value: 'archived', label: 'مؤرشفة' },
                  ]}
                />
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium mb-1">التصنيف</label>
                <Select
                  name="categoryId"
                  defaultValue={params.categoryId || ''}
                  options={[
                    { value: '', label: 'جميع التصنيفات' },
                    ...categories.map(cat => ({ value: cat.id, label: cat.name })),
                  ]}
                />
              </div>
            </div>

            {/* Second Row - Tag and Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Tag Filter */}
              <div>
                <label className="block text-sm font-medium mb-1">الوسم</label>
                <Select
                  name="tagId"
                  defaultValue={params.tagId || ''}
                  options={[
                    { value: '', label: 'جميع الوسوم' },
                    ...tags.map(tag => ({ value: tag.id, label: tag.name })),
                  ]}
                />
              </div>

              {/* Date From */}
              <div>
                <label className="block text-sm font-medium mb-1">من تاريخ</label>
                <Input
                  name="dateFrom"
                  type="date"
                  defaultValue={params.dateFrom}
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-sm font-medium mb-1">إلى تاريخ</label>
                <Input
                  name="dateTo"
                  type="date"
                  defaultValue={params.dateTo}
                />
              </div>

              {/* Submit Button */}
              <div className="flex items-end gap-2">
                <Button type="submit" variant="secondary" className="flex-1">
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  بحث
                </Button>
                {hasFilters && (
                  <Link
                    href="/admin/articles"
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-md hover:bg-muted-foreground/10 transition-colors border"
                  >
                    مسح الفلاتر
                  </Link>
                )}
              </div>
            </div>
          </form>

          {/* Results Count */}
          <div className="text-sm text-muted-foreground border-t pt-4">
            عرض {pagination.total > 0 ? ((pagination.page - 1) * pagination.limit) + 1 : 0}
            {' '}إلى{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)}
            {' '}من {pagination.total} مقال
          </div>
        </div>
      </Card>

      {/* Articles Table */}
      <Card>
        <Suspense fallback={<Loading />}>
          {articles.length === 0 ? (
            <EmptyState
              title="لا توجد مقالات"
              description={hasFilters
                ? 'لم يتم العثور على مقالات تطابق البحث'
                : 'ابدأ بإضافة مقالك الأول'}
              action={{
                label: 'إضافة مقال جديد',
                onClick: () => {
                  window.location.href = '/admin/articles/new';
                },
              }}
            />
          ) : (
            <ArticlesListClient articles={serializedArticles} />
          )}
        </Suspense>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            الصفحة {pagination.page} من {pagination.totalPages}
          </div>
          <div className="flex gap-2">
            {pagination.page > 1 && (
              <Link
                href={buildFilterUrl(params, { page: String(pagination.page - 1) })}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
              >
                السابق
              </Link>
            )}
            {pagination.page < pagination.totalPages && (
              <Link
                href={buildFilterUrl(params, { page: String(pagination.page + 1) })}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
              >
                التالي
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
