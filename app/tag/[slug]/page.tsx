import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { PublicLayout, ArticleCard } from '@/components/public';
import type { Metadata } from 'next';
import Link from 'next/link';

interface TagPageProps {
  params: Promise<{ slug: string }>;
}

const ARTICLES_PER_PAGE = 12;

async function getTagData(slug: string, page: number) {
  const tag = await prisma.tag.findUnique({
    where: { slug },
  });

  if (!tag) {
    return null;
  }

  const skip = (page - 1) * ARTICLES_PER_PAGE;

  const [articles, totalCount, categories, popularTags] = await Promise.all([
    prisma.article.findMany({
      where: {
        status: 'published',
        publishedAt: { lte: new Date() },
        tags: {
          some: {
            id: tag.id,
          },
        },
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
        tags: {
          some: {
            id: tag.id,
          },
        },
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
    tag,
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

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tag = await prisma.tag.findUnique({
    where: { slug },
  });

  if (!tag) {
    return {};
  }

  return {
    title: `#${tag.name} - الموقع الصحفي`,
    description: `جميع المقالات الموسومة بـ ${tag.name}`,
    openGraph: {
      title: `#${tag.name} - الموقع الصحفي`,
      description: `جميع المقالات الموسومة بـ ${tag.name}`,
    },
  };
}

export default async function TagPage({ params, searchParams }: TagPageProps & { searchParams: Promise<{ page?: string }> }) {
  const { slug } = await params;
  const { page } = await searchParams;
  const currentPage = parseInt(page || '1');

  const data = await getTagData(slug, currentPage);

  if (!data) {
    notFound();
  }

  return (
    <PublicLayout categories={data.categories} popularTags={data.popularTags}>
      {/* Header */}
      <div className="border-b border-border bg-muted/30">
        <div className="container mx-auto px-4 py-8 md:py-12">
          {/* Breadcrumb */}
          <nav className="mb-4">
            <ol className="flex items-center gap-2 text-sm text-muted-foreground">
              <li>
                <Link href="/" className="hover:text-foreground transition-colors">
                  الرئيسية
                </Link>
              </li>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <li className="text-foreground">#{data.tag.name}</li>
            </ol>
          </nav>

          <h1 className="text-3xl md:text-4xl font-semibold text-foreground">
            #{data.tag.name}
          </h1>
        </div>
      </div>

      {/* Articles Grid */}
      <div className="container mx-auto px-4 py-8 md:py-12">
        {data.articles.length > 0 ? (
          <>
            <p className="text-sm text-muted-foreground mb-6">
              {data.totalCount} مقال
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
                    href={`/tag/${slug}?page=${data.pagination.page - 1}`}
                    className="px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors"
                  >
                    السابق
                  </Link>
                )}

                <div className="flex gap-1">
                  {Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <Link
                      key={pageNum}
                      href={`/tag/${slug}?page=${pageNum}`}
                      className={`px-4 py-2 rounded-md transition-colors ${
                        pageNum === data.pagination.page
                          ? 'bg-foreground text-background'
                          : 'border border-border hover:bg-muted'
                      }`}
                    >
                      {pageNum}
                    </Link>
                  ))}
                </div>

                {data.pagination.hasMore && (
                  <Link
                    href={`/tag/${slug}?page=${data.pagination.page + 1}`}
                    className="px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors"
                  >
                    التالي
                  </Link>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">لا توجد مقالات بهذا الوسم بعد</p>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
