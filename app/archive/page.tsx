import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { PublicLayout } from '@/components/public/PublicLayout';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'الأرشيف',
  description: 'تصفح المقالات حسب التاريخ',
};

// Single SQL aggregation — no in-memory grouping; cached for 5 min
const getArchiveIndex = unstable_cache(
  async () => {
    const rows = await prisma.$queryRaw<Array<{ year: number; month: number; count: bigint }>>`
      SELECT
        EXTRACT(YEAR  FROM "publishedAt")::int AS year,
        EXTRACT(MONTH FROM "publishedAt")::int AS month,
        COUNT(*)                               AS count
      FROM "Article"
      WHERE status = 'published'
        AND "publishedAt" IS NOT NULL
        AND "publishedAt" <= NOW()
      GROUP BY year, month
      ORDER BY year DESC, month DESC
    `;
    return rows.map((r) => ({ year: r.year, month: r.month, count: Number(r.count) }));
  },
  ['archive-index'],
  { revalidate: 300, tags: ['articles'] }
);

// Cached nav data — reuses same cache key as the homepage/article pages
const getLayoutData = unstable_cache(
  async () => {
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
  },
  ['archive-layout'],
  { revalidate: 300, tags: ['categories', 'tags'] }
);

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

export default async function ArchivePage() {
  const [months, { categories, popularTags }] = await Promise.all([
    getArchiveIndex(),
    getLayoutData(),
  ]);

  if (months.length === 0) notFound();

  // Group by year
  const years = new Map<number, typeof months>();
  for (const m of months) {
    if (!years.has(m.year)) years.set(m.year, []);
    years.get(m.year)!.push(m);
  }

  return (
    <PublicLayout categories={categories} popularTags={popularTags}>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-semibold mb-8">أرشيف المقالات</h1>

          <div className="space-y-8">
            {Array.from(years.entries()).map(([year, yearMonths]) => (
              <div key={year}>
                <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">{year}</h2>
                <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {yearMonths.map(({ month, count }) => (
                    <li key={month}>
                      <a
                        href={`/archive/${year}/${month}`}
                        className="flex items-center justify-between px-4 py-3 rounded-lg border border-border hover:border-foreground hover:bg-muted transition-colors text-sm"
                      >
                        <span>{ARABIC_MONTHS[month - 1]}</span>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {count}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
