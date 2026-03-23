import { notFound } from 'next/navigation';
import { cache } from 'react';
import { prisma } from '@/lib/prisma';
import { PublicLayout, ArticleCard } from '@/components/public';
import { ScrollReveal } from '@/components/public/ScrollReveal';
import type { Metadata } from 'next';
import Link from 'next/link';

// ISR — revalidate every 5 minutes; served from CDN edge between revalidations
export const revalidate = 300;

interface TagPageProps {
  params: Promise<{ slug: string }>;
}

const ARTICLES_PER_PAGE = 12;

// cache() deduplicates this within a single request — shared by generateMetadata and the page
const getTagBySlug = cache((slug: string) =>
  prisma.tag.findUnique({ where: { slug } })
);

async function getTagData(slug: string, page: number) {
  const tag = await getTagBySlug(slug);

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

// Pre-render all tag pages at build time
export async function generateStaticParams() {
  const tags = await prisma.tag.findMany({
    select: { slug: true },
  });
  return tags.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tag = await getTagBySlug(slug);

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
      {/* Editorial Tag Header */}
      <div className="border-b border-border" style={{ backgroundColor: 'var(--muted)' }}>
        <div className="container mx-auto px-4 py-10 md:py-14">
          {/* Breadcrumb */}
          <nav className="mb-6" aria-label="مسار التنقل">
            <ol className="flex items-center gap-2 text-sm text-muted-foreground">
              <li>
                <Link href="/" className="hover:text-accent transition-colors">
                  الرئيسية
                </Link>
              </li>
              <li aria-hidden="true">
                <svg className="w-3.5 h-3.5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </li>
              <li className="text-foreground font-medium">#{data.tag.name}</li>
            </ol>
          </nav>

          {/* Tag label + Amiri title */}
          <div className="flex items-baseline gap-3 mb-4">
            <span
              className="text-xs font-bold tracking-widest px-2 py-1 shrink-0"
              style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
            >
              وسم
            </span>
            <h1
              className="font-display font-bold text-foreground"
              style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)', lineHeight: 1.15 }}
            >
              {data.tag.name}
            </h1>
          </div>

          {/* Gold rule with article count */}
          <div className="flex items-center gap-4">
            <div
              className="flex-1 h-px"
              style={{ background: 'linear-gradient(to left, transparent, var(--accent) 60%, var(--accent))' }}
            />
            <span
              className="shrink-0 text-xs font-bold tracking-widest px-3 py-1"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--foreground)' }}
            >
              {data.totalCount} مقال
            </span>
          </div>
        </div>
      </div>

      {/* Articles Grid */}
      <div className="container mx-auto px-4 py-8 md:py-12">
        {data.articles.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.articles.map((article, index) => (
                <ScrollReveal key={article.id} delay={index * 0.05}>
                  <ArticleCard
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
                </ScrollReveal>
              ))}
            </div>

            {/* Pagination — editorial style */}
            {data.pagination.totalPages > 1 && (
              <div className="flex justify-center items-center gap-3 mt-14">
                {data.pagination.page > 1 && (
                  <Link
                    href={`/tag/${slug}?page=${data.pagination.page - 1}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 border border-border hover:border-accent hover:text-accent transition-colors text-sm font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    الصفحة السابقة
                  </Link>
                )}
                <span className="text-sm text-muted-foreground px-2">
                  {data.pagination.page} / {data.pagination.totalPages}
                </span>
                {data.pagination.hasMore && (
                  <Link
                    href={`/tag/${slug}?page=${data.pagination.page + 1}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 border border-border hover:border-accent hover:text-accent transition-colors text-sm font-medium"
                  >
                    الصفحة التالية
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
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
