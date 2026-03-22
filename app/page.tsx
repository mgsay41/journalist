import { Suspense } from 'react';
import { PublicLayout, ArticleCard, ArticleCardSkeleton, LazyImage } from '@/components/public';
import { SkeletonHero } from '@/components/ui/Skeleton';
import { prisma } from '@/lib/prisma';

// Revalidate every 5 minutes — ISR
export const revalidate = 300;

async function getHomepageData() {
  try {
    const categories = await prisma.category.findMany({
      where: {
        articles: {
          some: { status: 'published', publishedAt: { lte: new Date() } },
        },
      },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true },
    });

    const popularTags = await prisma.tag.findMany({
      where: {
        articles: {
          some: { status: 'published', publishedAt: { lte: new Date() } },
        },
      },
      orderBy: { articles: { _count: 'desc' } },
      take: 9,
      select: { id: true, name: true, slug: true },
    });

    return { categories, popularTags };
  } catch (error) {
    console.error('[Homepage] Failed to fetch layout data:', error);
    return { categories: [], popularTags: [] };
  }
}

async function getHeroArticle() {
  const featuredArticle = await prisma.article.findFirst({
    where: { status: 'published', publishedAt: { lte: new Date() }, isFeatured: true },
    orderBy: { publishedAt: 'desc' },
    include: {
      categories: { select: { id: true, name: true, slug: true } },
      featuredImage: { select: { id: true, url: true, altText: true } },
      author: { select: { id: true, name: true } },
    },
  });

  return featuredArticle || await prisma.article.findFirst({
    where: { status: 'published', publishedAt: { lte: new Date() } },
    orderBy: { publishedAt: 'desc' },
    include: {
      categories: { select: { id: true, name: true, slug: true } },
      featuredImage: { select: { id: true, url: true, altText: true } },
      author: { select: { id: true, name: true } },
    },
  });
}

async function getRecentArticles(excludeId: string | null) {
  const whereClause: any = {
    status: 'published',
    publishedAt: { lte: new Date() },
  };
  if (excludeId) whereClause.id = { not: excludeId };

  return prisma.article.findMany({
    where: whereClause,
    orderBy: { publishedAt: 'desc' },
    take: 9,
    include: {
      categories: { select: { id: true, name: true, slug: true } },
      featuredImage: { select: { id: true, url: true, altText: true } },
      author: { select: { id: true, name: true } },
    },
  });
}

/* ── Hero Section — cinematic full-bleed overlay ── */
async function HeroSection() {
  let heroArticle;
  try {
    heroArticle = await getHeroArticle();
  } catch (error) {
    console.error('[HeroSection] Failed:', error);
    return null;
  }
  if (!heroArticle) return null;

  const formatDate = new Intl.DateTimeFormat('ar-SA', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <section className="border-b border-border">
      <a href={`/article/${heroArticle.slug}`} className="block group">
        <div className="relative overflow-hidden" style={{ minHeight: '420px' }}>
            {/* Full-bleed image */}
            {heroArticle.featuredImage ? (
              <div className="relative w-full h-105 md:h-130">
                <LazyImage
                  src={heroArticle.featuredImage.url}
                  alt={heroArticle.featuredImage.altText || heroArticle.title}
                  fill
                  sizes="100vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                  priority
                />
                {/* Dark gradient overlay — bottom 60% */}
                <div className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(to top, rgba(15,14,12,0.92) 0%, rgba(15,14,12,0.55) 50%, rgba(15,14,12,0.10) 100%)',
                  }}
                />

                {/* Text content over image */}
                <div className="absolute bottom-0 right-0 left-0 p-6 md:p-10">
                  {/* Category */}
                  {heroArticle.categories.length > 0 && (
                    <div className="mb-4">
                      <span className="px-3 py-1 bg-accent text-white text-xs font-semibold uppercase"
                        style={{ letterSpacing: '0.07em' }}>
                        {heroArticle.categories[0].name}
                      </span>
                    </div>
                  )}

                  {/* Title */}
                  <h1 className="font-display text-3xl md:text-4xl lg:text-5xl text-white mb-4 leading-tight max-w-3xl"
                    style={{ fontWeight: 700, textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
                    {heroArticle.title}
                  </h1>

                  {/* Excerpt */}
                  {heroArticle.excerpt && (
                    <p className="text-white/75 text-base md:text-lg leading-relaxed line-clamp-2 max-w-2xl mb-5">
                      {heroArticle.excerpt}
                    </p>
                  )}

                  {/* Meta row */}
                  <div className="flex flex-wrap items-center gap-4 text-white/60 text-sm">
                    {heroArticle.author && (
                      <span className="text-white/80 font-medium">{heroArticle.author.name}</span>
                    )}
                    {heroArticle.publishedAt && (
                      <>
                        <span aria-hidden="true">·</span>
                        <time dateTime={heroArticle.publishedAt.toISOString()}>
                          {formatDate.format(heroArticle.publishedAt)}
                        </time>
                      </>
                    )}
                    {heroArticle.readingTime && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{heroArticle.readingTime} د قراءة</span>
                      </>
                    )}

                    {/* Read CTA */}
                    <span className="mr-auto flex items-center gap-2 text-accent font-semibold group-hover:underline">
                      اقرأ المقال
                      <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* No image fallback */
              <div className="py-16 px-6 bg-muted/30">
                {heroArticle.categories.length > 0 && (
                  <div className="mb-4">
                    <span className="px-3 py-1 bg-accent text-white text-xs font-semibold uppercase">
                      {heroArticle.categories[0].name}
                    </span>
                  </div>
                )}
                <h1 className="font-display text-4xl lg:text-5xl text-foreground leading-tight mb-4" style={{ fontWeight: 700 }}>
                  {heroArticle.title}
                </h1>
                {heroArticle.excerpt && (
                  <p className="text-xl text-muted-foreground leading-relaxed mb-6 max-w-2xl">
                    {heroArticle.excerpt}
                  </p>
                )}
              </div>
            )}
        </div>
      </a>
    </section>
  );
}

/* ── Recent Articles — asymmetric bento grid ── */
async function RecentArticlesSection() {
  let heroArticle;
  let recentArticles: Awaited<ReturnType<typeof getRecentArticles>> = [];

  try {
    heroArticle = await getHeroArticle();
    recentArticles = await getRecentArticles(heroArticle?.id || null);
  } catch (error) {
    console.error('[RecentArticlesSection] Failed:', error);
  }

  return (
    <section className="py-8 md:py-10">
      <div className="container mx-auto px-4">
        {/* Section heading with amber accent and rule */}
        <div className="flex items-center gap-4 mb-6">
          <h2 className="font-display text-2xl md:text-3xl text-foreground whitespace-nowrap" style={{ fontWeight: 700 }}>
            أحدث المقالات
          </h2>
          <div className="flex-1 h-px bg-border" />
          <a
            href="/archive"
            className="whitespace-nowrap text-sm text-accent hover:text-accent-hover transition-colors font-medium flex items-center gap-1"
          >
            عرض الكل
            <svg className="w-3.5 h-3.5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        </div>

        {recentArticles.length > 0 ? (
          <BentoGrid articles={recentArticles} />
        ) : (
          <div className="text-center py-20 border border-border-subtle">
            <p className="font-display text-3xl text-muted-foreground/40 mb-3" style={{ fontWeight: 400 }}>لا مقالات بعد</p>
            <p className="text-sm text-muted-foreground">تحقق لاحقاً للمحتوى الجديد</p>
          </div>
        )}
      </div>
    </section>
  );
}

/* ── Bento Grid — editorial asymmetric layout ── */
function BentoGrid({ articles }: { articles: Awaited<ReturnType<typeof getRecentArticles>> }) {
  const mapped = articles.map((a) => ({
    id: a.id,
    title: a.title,
    slug: a.slug,
    excerpt: a.excerpt,
    featuredImage: a.featuredImage?.url || null,
    publishedAt: a.publishedAt,
    readingTime: a.readingTime,
    categories: a.categories,
    author: a.author ? { name: a.author.name } : null,
  }));

  // Rows:
  //  Row A: [large — col-span-2] [standard — col-span-1]   (articles 0,1)
  //  Row B: [standard x3]                                   (articles 2,3,4)
  //  Row C: [standard — col-span-1] [large — col-span-2]   (articles 5,6)
  //  Row D: [standard x2] — remaining                       (articles 7,8)

  const rowA = mapped.slice(0, 2);
  const rowB = mapped.slice(2, 5);
  const rowC = mapped.slice(5, 7);
  const rowD = mapped.slice(7, 9);

  return (
    <div className="space-y-4">
      {/* Row A: large left + standard right */}
      {rowA.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {rowA[0] && (
            <div className="md:col-span-2">
              <ArticleCard article={rowA[0]} size="default" revealIndex={1} />
            </div>
          )}
          {rowA[1] && (
            <div className="md:col-span-1">
              <ArticleCard article={rowA[1]} size="default" revealIndex={2} />
            </div>
          )}
        </div>
      )}

      {/* Thin amber rule */}
      {rowB.length > 0 && (
        <div className="flex items-center gap-3 py-2">
          <div className="w-6 h-0.5 bg-accent" />
          <div className="flex-1 h-px bg-border-subtle" />
        </div>
      )}

      {/* Row B: 3 equal columns */}
      {rowB.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rowB.map((article, i) => (
            <ArticleCard key={article.id} article={article} size="default" revealIndex={i + 3} />
          ))}
        </div>
      )}

      {/* Row C: standard left + large right */}
      {rowC.length > 0 && (
        <>
          <div className="flex items-center gap-3 py-2">
            <div className="w-6 h-0.5 bg-accent" />
            <div className="flex-1 h-px bg-border-subtle" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {rowC[0] && (
              <div className="md:col-span-1">
                <ArticleCard article={rowC[0]} size="default" revealIndex={1} />
              </div>
            )}
            {rowC[1] && (
              <div className="md:col-span-2">
                <ArticleCard article={rowC[1]} size="default" revealIndex={2} />
              </div>
            )}
          </div>
        </>
      )}

      {/* Row D: remaining */}
      {rowD.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rowD.map((article, i) => (
            <ArticleCard key={article.id} article={article} size="default" revealIndex={i + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Categories Section ── */
function CategoriesSection({ categories }: { categories: Array<{ id: string; name: string; slug: string }> }) {
  if (categories.length === 0) return null;

  return (
    <section className="py-10 border-t border-border" style={{ background: 'var(--muted)' }}>
      <div className="container mx-auto px-4">
        {/* Heading */}
        <div className="flex items-center gap-4 mb-6">
          <h2 className="font-display text-2xl md:text-3xl text-foreground whitespace-nowrap" style={{ fontWeight: 700 }}>
            تصفح حسب القسم
          </h2>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.slice(0, 6).map((category, i) => (
            <a
              key={category.id}
              href={`/category/${category.slug}`}
              className="group relative p-5 border border-border bg-card hover:border-accent transition-all duration-200 text-center overflow-hidden"
              style={{ boxShadow: 'var(--shadow-sm)' }}
            >
              {/* Amber accent line on hover */}
              <div className="absolute bottom-0 right-0 left-0 h-0.5 bg-accent scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-right" />
              <span className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors">
                {category.name}
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export default async function HomePage() {
  const data = await getHomepageData();

  return (
    <PublicLayout categories={data.categories} popularTags={data.popularTags}>
      {/* Hero */}
      <Suspense fallback={<SkeletonHero />}>
        <HeroSection />
      </Suspense>

      {/* Recent Articles */}
      <Suspense
        fallback={
          <section className="py-8 md:py-10">
            <div className="container mx-auto px-4">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-8 w-40 bg-muted animate-pulse rounded" />
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <ArticleCardSkeleton key={i} />
                ))}
              </div>
            </div>
          </section>
        }
      >
        <RecentArticlesSection />
      </Suspense>

      {/* Categories */}
      <CategoriesSection categories={data.categories} />
    </PublicLayout>
  );
}
