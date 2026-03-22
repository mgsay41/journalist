import Link from 'next/link';
import { PublicLayout } from '@/components/public';
import { ArticleCard } from '@/components/public/ArticleCard';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering to avoid build-time database queries
export const dynamic = 'force-dynamic';

async function getLayoutData() {
  try {
    const [categories, popularTags, recentArticles] = await Promise.all([
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
        select: { id: true, name: true, slug: true },
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
        orderBy: { articles: { _count: 'desc' } },
        take: 9,
        select: { id: true, name: true, slug: true },
      }),
      prisma.article.findMany({
        where: {
          status: 'published',
          publishedAt: { lte: new Date() },
        },
        orderBy: { publishedAt: 'desc' },
        take: 3,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          publishedAt: true,
          readingTime: true,
          featuredImage: { select: { url: true } },
          categories: {
            select: { id: true, name: true, slug: true },
            take: 1,
          },
          author: { select: { name: true } },
        },
      }),
    ]);

    return { categories, popularTags, recentArticles };
  } catch {
    return { categories: [], popularTags: [], recentArticles: [] };
  }
}

export default async function NotFound() {
  const { categories, popularTags, recentArticles } = await getLayoutData();

  return (
    <PublicLayout categories={categories} popularTags={popularTags}>
      {/* Hero 404 block */}
      <div className="container mx-auto px-4 pt-16 pb-12 md:pt-24 md:pb-16">
        <div className="max-w-2xl mx-auto text-center">
          {/* Large Amiri amber numerals */}
          <div
            className="font-display leading-none mb-6 select-none"
            style={{
              fontSize: 'clamp(6rem, 20vw, 12rem)',
              color: 'var(--accent)',
              opacity: 0.9,
              fontWeight: 700,
            }}
            aria-hidden="true"
          >
            ٤٠٤
          </div>

          {/* Gold rule */}
          <div
            className="mx-auto mb-8"
            style={{
              width: '80px',
              height: '3px',
              background: 'linear-gradient(to left, transparent, var(--accent), transparent)',
            }}
          />

          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">
            الصفحة التي تبحث عنها غير موجودة
          </h1>
          <p className="text-base text-muted-foreground mb-10 leading-relaxed max-w-md mx-auto">
            ربما تم نقل هذا المحتوى أو حذفه، أو ربما كتبت الرابط بشكل خاطئ.
          </p>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 font-semibold transition-all duration-200"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--foreground)',
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              العودة إلى الرئيسية
            </Link>
            <Link
              href="/search"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 font-semibold border border-border bg-background hover:bg-muted transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              بحث في الموقع
            </Link>
          </div>
        </div>
      </div>

      {/* Recent articles — only if any exist */}
      {recentArticles.length > 0 && (
        <div className="border-t border-border">
          <div className="container mx-auto px-4 py-12 md:py-16">
            {/* Section heading */}
            <div className="section-heading mb-8">
              <h2 className="font-display text-xl font-bold text-foreground section-heading-accent shrink-0">
                قد تهمك هذه المقالات
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentArticles.map((article, index) => (
                <ArticleCard
                  key={article.id}
                  revealIndex={index + 1}
                  article={{
                    id: article.id,
                    title: article.title,
                    slug: article.slug,
                    excerpt: article.excerpt,
                    featuredImage: article.featuredImage?.url ?? null,
                    publishedAt: article.publishedAt,
                    readingTime: article.readingTime,
                    categories: article.categories,
                    author: article.author,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </PublicLayout>
  );
}
