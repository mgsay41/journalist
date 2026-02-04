import { Suspense } from 'react';
import { PublicLayout, ArticleCard, ArticleCardSkeleton, LazyImage } from '@/components/public';
import { SkeletonHero } from '@/components/ui/Skeleton';
import { prisma } from '@/lib/prisma';

async function getHomepageData() {
  // Fetch categories for navigation
  const categories = await prisma.category.findMany({
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
  });

  // Fetch popular tags for footer
  const popularTags = await prisma.tag.findMany({
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
  });

  return {
    categories,
    popularTags,
  };
}

async function getHeroArticle() {
  // Fetch featured article
  const featuredArticle = await prisma.article.findFirst({
    where: {
      status: 'published',
      publishedAt: { lte: new Date() },
      isFeatured: true,
    },
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
  });

  // Fallback: if no featured article, get the most recent
  return featuredArticle || await prisma.article.findFirst({
    where: {
      status: 'published',
      publishedAt: { lte: new Date() },
    },
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
  });
}

async function getRecentArticles(excludeId: string | null) {
  // Fetch recent articles (exclude hero article)
  const whereClause: any = {
    status: 'published',
    publishedAt: { lte: new Date() },
  };

  if (excludeId) {
    whereClause.id = { not: excludeId };
  }

  return await prisma.article.findMany({
    where: whereClause,
    orderBy: { publishedAt: 'desc' },
    take: 9,
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
  });
}

async function HeroSection() {
  const heroArticle = await getHeroArticle();

  const formatDate = new Intl.DateTimeFormat('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (!heroArticle) {
    return null;
  }

  return (
    <section className="border-b border-border">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Image */}
          {heroArticle.featuredImage && (
            <div className="relative aspect-[4/3] lg:aspect-[3/2] overflow-hidden rounded-lg">
              <LazyImage
                src={heroArticle.featuredImage.url}
                alt={heroArticle.featuredImage.altText || heroArticle.title}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
                priority // Hero image should load immediately
              />
              {heroArticle.categories.length > 0 && (
                <div className="absolute top-4 right-4">
                  <span className="px-4 py-2 bg-background/90 backdrop-blur-sm text-sm font-medium rounded-md">
                    {heroArticle.categories[0].name}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Content */}
          <div className={`space-y-4 ${!heroArticle.featuredImage ? 'lg:col-span-2' : ''}`}>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {heroArticle.publishedAt && (
                <time dateTime={heroArticle.publishedAt.toISOString()}>
                  {formatDate.format(heroArticle.publishedAt)}
                </time>
              )}
              {heroArticle.readingTime && (
                <>
                  <span>•</span>
                  <span>{heroArticle.readingTime} دقيقة قراءة</span>
                </>
              )}
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-foreground leading-tight">
              <a href={`/article/${heroArticle.slug}`} className="hover:text-foreground/80 transition-colors">
                {heroArticle.title}
              </a>
            </h1>

            {heroArticle.excerpt && (
              <p className="text-lg text-muted-foreground leading-relaxed line-clamp-3">
                {heroArticle.excerpt}
              </p>
            )}

            {heroArticle.author && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>بواسطة</span>
                <span className="font-medium text-foreground">{heroArticle.author.name}</span>
              </div>
            )}

            <a
              href={`/article/${heroArticle.slug}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background font-medium rounded-md hover:bg-foreground/90 transition-colors"
            >
              اقرأ المقال
              <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

async function RecentArticlesSection() {
  // First get hero article to exclude it
  const heroArticle = await getHeroArticle();
  const recentArticles = await getRecentArticles(heroArticle?.id || null);

  return (
    <section className="py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
            أحدث المقالات
          </h2>
          <a
            href="/archive"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            عرض الكل
            <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        </div>

        {recentArticles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentArticles.map((article) => (
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
                  categories: article.categories.map((category) => ({
                    id: category.id,
                    name: category.name,
                    slug: category.slug,
                  })),
                  author: article.author ? {
                    name: article.author.name,
                  } : null,
                }}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">لا توجد مقالات منشورة بعد</p>
          </div>
        )}
      </div>
    </section>
  );
}

function CategoriesSection({ categories }: { categories: Array<{ id: string; name: string; slug: string }> }) {
  if (categories.length === 0) return null;

  return (
    <section className="py-12 border-t border-border bg-muted/30">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-semibold text-foreground text-center mb-8">
          تصفح حسب القسم
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.slice(0, 6).map((category) => (
            <a
              key={category.id}
              href={`/category/${category.slug}`}
              className="p-4 border border-border-subtle rounded-lg text-center hover:border-foreground hover:bg-background transition-all group"
            >
              <span className="text-sm font-medium text-foreground group-hover:text-foreground/80 transition-colors">
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
      {/* Hero Section - Featured Article */}
      <Suspense fallback={<SkeletonHero />}>
        <HeroSection />
      </Suspense>

      {/* Recent Articles Section */}
      <Suspense
        fallback={
          <section className="py-12 md:py-16">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
                  أحدث المقالات
                </h2>
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

      {/* Categories Section */}
      <CategoriesSection categories={data.categories} />
    </PublicLayout>
  );
}
