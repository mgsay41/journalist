import { prisma } from '@/lib/prisma';
import { PublicLayout } from '@/components/public/PublicLayout';
import { ArticleCard } from '@/components/public/ArticleCard';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';

interface ArchiveMonthPageProps {
  params: Promise<{ year: string; month: string }>;
}

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

export async function generateMetadata({ params }: ArchiveMonthPageProps): Promise<Metadata> {
  const { year, month } = await params;
  const monthName = ARABIC_MONTHS[parseInt(month) - 1] || '';
  return {
    title: `أرشيف ${monthName} ${year}`,
    description: `مقالات شهر ${monthName} ${year}`,
  };
}

async function getLayoutData() {
  const [categories, popularTags] = await Promise.all([
    prisma.category.findMany({
      where: { articles: { some: { status: 'published', publishedAt: { lte: new Date() } } } },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true },
    }),
    prisma.tag.findMany({
      where: { articles: { some: { status: 'published', publishedAt: { lte: new Date() } } } },
      orderBy: { articles: { _count: 'desc' } },
      take: 9,
      select: { id: true, name: true, slug: true },
    }),
  ]);
  return { categories, popularTags };
}

export default async function ArchiveMonthPage({ params }: ArchiveMonthPageProps) {
  const { year, month } = await params;

  const yearNum = parseInt(year);
  const monthNum = parseInt(month);

  if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    notFound();
  }

  const startDate = new Date(yearNum, monthNum - 1, 1);
  const endDate = new Date(yearNum, monthNum, 1);

  const [articles, { categories, popularTags }] = await Promise.all([
    prisma.article.findMany({
      where: {
        status: 'published',
        publishedAt: { gte: startDate, lt: endDate },
      },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        publishedAt: true,
        readingTime: true,
        categories: { select: { id: true, name: true, slug: true } },
        featuredImage: { select: { url: true, altText: true } },
        author: { select: { name: true } },
      },
      orderBy: { publishedAt: 'desc' },
    }),
    getLayoutData(),
  ]);

  if (articles.length === 0) notFound();

  const monthName = ARABIC_MONTHS[monthNum - 1];

  return (
    <PublicLayout categories={categories} popularTags={popularTags}>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
            <Link href="/" className="hover:text-foreground transition-colors">الرئيسية</Link>
            <span>›</span>
            <Link href="/archive" className="hover:text-foreground transition-colors">الأرشيف</Link>
            <span>›</span>
            <span className="text-foreground">{monthName} {yearNum}</span>
          </nav>

          <h1 className="text-3xl font-semibold mb-2">
            {monthName} {yearNum}
          </h1>
          <p className="text-muted-foreground mb-8">
            {articles.length} مقال
          </p>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <ArticleCard
                key={article.id}
                article={{
                  ...article,
                  featuredImage: article.featuredImage?.url ?? null,
                  author: article.author ?? undefined,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
