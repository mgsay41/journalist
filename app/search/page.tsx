import { PublicLayout, ArticleCard } from '@/components/public';
import { prisma } from '@/lib/prisma';
import type { Metadata } from 'next';
import Link from 'next/link';

interface SearchPageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

const ARTICLES_PER_PAGE = 12;

async function getSearchResults(query: string, page: number) {
  const skip = (page - 1) * ARTICLES_PER_PAGE;

  const [articles, totalCount, categories, popularTags] = await Promise.all([
    prisma.article.findMany({
      where: {
        status: 'published',
        publishedAt: { lte: new Date() },
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { excerpt: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
        ],
      },
      skip,
      take: ARTICLES_PER_PAGE,
      orderBy: { publishedAt: 'desc' },
      include: {
        categories: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        featuredImage: {
          select: {
            id: true,
            url: true,
            altText: true,
          },
        },
        author: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    prisma.article.count({
      where: {
        status: 'published',
        publishedAt: { lte: new Date() },
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { excerpt: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
        ],
      },
    }),
    prisma.category.findMany({
      where: {
        articles: {
          some: {
            status: 'published',
            publishedAt: { lte: new Date() },
          },
        },
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    }),
    prisma.tag.findMany({
      where: {
        articles: {
          some: {
            status: 'published',
            publishedAt: { lte: new Date() },
          },
        },
      },
      orderBy: {
        articles: { _count: 'desc' },
      },
      take: 9,
      select: {
        id: true,
        name: true,
        slug: true,
      },
    }),
  ]);

  return {
    articles,
    totalCount,
    categories,
    popularTags,
    pagination: {
      page,
      pageSize: ARTICLES_PER_PAGE,
      totalPages: Math.ceil(totalCount / ARTICLES_PER_PAGE),
      hasMore: skip + ARTICLES_PER_PAGE < totalCount,
    },
  };
}

export const metadata: Metadata = {
  title: 'بحث - الموقع الصحفي',
  description: 'ابحث عن المقالات والمحتوى',
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q: query = '', page } = await searchParams;
  const currentPage = parseInt(page || '1');

  const data = query ? await getSearchResults(query, currentPage) : {
    articles: [],
    totalCount: 0,
    categories: await prisma.category.findMany({
      where: {
        articles: {
          some: {
            status: 'published',
            publishedAt: { lte: new Date() },
          },
        },
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    }),
    popularTags: await prisma.tag.findMany({
      where: {
        articles: {
          some: {
            status: 'published',
            publishedAt: { lte: new Date() },
          },
        },
      },
      orderBy: {
        articles: { _count: 'desc' },
      },
      take: 9,
      select: {
        id: true,
        name: true,
        slug: true,
      },
    }),
    pagination: {
      page: 1,
      pageSize: ARTICLES_PER_PAGE,
      totalPages: 1,
      hasMore: false,
    },
  };

  return (
    <PublicLayout categories={data.categories} popularTags={data.popularTags}>
      {/* Header */}
      <div className="border-b border-border bg-muted/30">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <h1 className="text-3xl md:text-4xl font-semibold text-foreground mb-6">
            {query ? `نتائج البحث عن "${query}"` : 'بحث'}
          </h1>

          {/* Search Form */}
          <form action="/search" method="GET" className="max-w-2xl">
            <div className="flex gap-2">
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="ابحث عن مقالات..."
                className="flex-1 px-4 py-3 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-foreground"
                autoFocus
              />
              <button
                type="submit"
                className="px-6 py-3 bg-foreground text-background font-medium rounded-md hover:bg-foreground/90 transition-colors"
              >
                بحث
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Results */}
      <div className="container mx-auto px-4 py-8 md:py-12">
        {!query ? (
          <div className="max-w-2xl mx-auto text-center">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              ابحث عن المقالات
            </h2>
            <p className="text-muted-foreground">
              أدخل كلمات البحث للعثور على المقالات التي تهمك
            </p>
          </div>
        ) : data.articles.length > 0 ? (
          <>
            <p className="text-sm text-muted-foreground mb-6">
            {data.totalCount} نتيجة{data.totalCount !== 1 ? '' : ''}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.articles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={{
                    id: article.id,
                    title: article.title,
                    slug: article.slug,
                    excerpt: article.excerpt,
                    featuredImage: article.featuredImage?.url || null,
                    publishedAt: article.publishedAt,
                    readingTime: article.readingTime,
                    categories: article.categories.map((ac) => ({
                      id: ac.id,
                      name: ac.name,
                      slug: ac.slug,
                    })),
                    author: article.author ? {
                      name: article.author.name,
                    } : null,
                  }}
                />
              ))}
            </div>

            {/* Pagination */}
            {data.pagination.totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-12">
                {data.pagination.page > 1 && (
                  <Link
                    href={`/search?q=${encodeURIComponent(query)}&page=${data.pagination.page - 1}`}
                    className="px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors"
                  >
                    السابق
                  </Link>
                )}

                <div className="flex gap-1">
                  {Array.from({ length: Math.min(data.pagination.totalPages, 5) }, (_, i) => {
                    let pageNum;
                    if (data.pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (data.pagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (data.pagination.page >= data.pagination.totalPages - 2) {
                      pageNum = data.pagination.totalPages - 4 + i;
                    } else {
                      pageNum = data.pagination.page - 2 + i;
                    }

                    return (
                      <Link
                        key={pageNum}
                        href={`/search?q=${encodeURIComponent(query)}&page=${pageNum}`}
                        className={`px-4 py-2 rounded-md transition-colors ${
                          pageNum === data.pagination.page
                            ? 'bg-foreground text-background'
                            : 'border border-border hover:bg-muted'
                        }`}
                      >
                        {pageNum}
                      </Link>
                    );
                  })}
                </div>

                {data.pagination.hasMore && (
                  <Link
                    href={`/search?q=${encodeURIComponent(query)}&page=${data.pagination.page + 1}`}
                    className="px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors"
                  >
                    التالي
                  </Link>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="max-w-2xl mx-auto text-center">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              لم يتم العثور على نتائج
            </h2>
            <p className="text-muted-foreground mb-6">
              جرب البحث بكلمات مختلفة أو تصفح الأقسام
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background font-medium rounded-md hover:bg-foreground/90 transition-colors"
            >
              العودة للرئيسية
            </Link>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
