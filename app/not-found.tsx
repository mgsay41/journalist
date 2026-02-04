import Link from 'next/link';
import { PublicLayout } from '@/components/public';
import { prisma } from '@/lib/prisma';

async function getLayoutData() {
  const [categories, popularTags] = await Promise.all([
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

  return { categories, popularTags };
}

export default async function NotFound() {
  const layoutData = await getLayoutData();

  return (
    <PublicLayout categories={layoutData.categories} popularTags={layoutData.popularTags}>
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-6xl md:text-8xl font-semibold text-foreground mb-4">
            404
          </h1>
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-4">
            الصفحة غير موجودة
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            عذراً، لم نتمكن من العثور على الصفحة التي تبحث عنها.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-foreground text-background font-medium rounded-md hover:bg-foreground/90 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              العودة للرئيسية
            </Link>
            <Link
              href="/search"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-border bg-background hover:bg-muted font-medium rounded-md transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              بحث في الموقع
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
