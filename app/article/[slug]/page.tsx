import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import Image from 'next/image';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { PublicLayout } from '@/components/public';
import { ArticleContent } from '@/components/public/ArticleContent';
import { SocialShare } from '@/components/public/SocialShare';
import { RelatedArticles } from '@/components/public/RelatedArticles';
import { ArticleViewTracker } from '@/components/public/ArticleViewTracker';
import { ReadingProgress } from '@/components/public/ReadingProgress';
// Lazy-loaded via a client-component wrapper (ssr:false requires a Client Component with Turbopack)
import {
  TableOfContentsSticky,
  ReadingSettings,
  TextToSpeech,
} from '@/components/public/ArticleLazyComponents';
import type { Metadata } from 'next';
import { SeriesNavigation } from '@/components/public/SeriesNavigation';
import Link from 'next/link';

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

async function getArticleData(slug: string) {
  const article = await prisma.article.findUnique({
    where: { slug },
    include: {
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
      featuredImage: {
        select: {
          id: true,
          url: true,
          altText: true,
          caption: true,
        },
      },
      author: {
        select: {
          id: true,
          name: true,
          bio: true,
          authorTitle: true,
          image: true,
          twitterUrl: true,
          linkedinUrl: true,
        },
      },
      images: {
        select: {
          id: true,
          url: true,
          altText: true,
          caption: true,
        },
      },
      videos: {
        select: {
          youtubeId: true,
          title: true,
          privacyMode: true,
          startTime: true,
        },
      },
      series: {
        select: {
          title: true,
          slug: true,
          description: true,
          articles: {
            where: { status: 'published', publishedAt: { lte: new Date() } },
            select: { id: true, title: true, slug: true, seriesOrder: true },
          },
        },
      },
    },
  });

  if (!article) {
    return null;
  }

  // Check if article is published
  if (article.status !== 'published' || !article.publishedAt || article.publishedAt > new Date()) {
    return null;
  }

  return article;
}

// Cached for 5 min — same data as the homepage; reused across all article pages
const getCategories = unstable_cache(
  async () => prisma.category.findMany({
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
  ['nav-categories'],
  { revalidate: 300, tags: ['categories'] }
);

const getPopularTags = unstable_cache(
  async () => prisma.tag.findMany({
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
  ['nav-popular-tags'],
  { revalidate: 300, tags: ['tags'] }
);

async function getRelatedArticles(
  articleId: string,
  categoryIds: string[],
  tagIds: string[]
) {
  // Build the where clause dynamically to handle empty arrays
  const orConditions = [];

  if (categoryIds.length > 0) {
    orConditions.push({
      categories: {
        some: {
          id: { in: categoryIds },
        },
      },
    });
  }

  if (tagIds.length > 0) {
    orConditions.push({
      tags: {
        some: {
          id: { in: tagIds },
        },
      },
    });
  }

  // If no categories or tags, return empty array
  if (orConditions.length === 0) {
    return [];
  }

  const whereClause: Record<string, unknown> = {
    id: { not: articleId },
    status: 'published',
    publishedAt: { lte: new Date() },
  };

  if (orConditions.length === 1) {
    whereClause.OR = orConditions;
  } else {
    whereClause.OR = orConditions;
  }

  return prisma.article.findMany({
    where: whereClause,
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
    },
    orderBy: { publishedAt: 'desc' },
    take: 4,
  });
}

// Pre-render all published articles at build time — served instantly from CDN
export async function generateStaticParams() {
  const articles = await prisma.article.findMany({
    where: { status: 'published', publishedAt: { lte: new Date() } },
    select: { slug: true },
  });
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await prisma.article.findUnique({
    where: { slug },
    select: {
      title: true,
      excerpt: true,
      metaTitle: true,
      metaDescription: true,
      featuredImage: true,
      publishedAt: true,
      categories: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!article) {
    return {};
  }

  const title = article.metaTitle || article.title;
  const description = article.metaDescription || article.excerpt || '';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || '';
  const url = `${siteUrl}/article/${slug}`;
  const category = article.categories[0]?.name || '';

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: 'الموقع الصحفي',
      locale: 'ar_AR',
      type: 'article',
      publishedTime: article.publishedAt?.toISOString(),
      section: category,
      tags: article.categories.map(c => c.name),
      images: article.featuredImage
        ? [
            {
              url: article.featuredImage.url,
              width: 1200,
              height: 630,
              alt: article.featuredImage.altText || article.title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: article.featuredImage ? [article.featuredImage.url] : undefined,
    },
  };
}

// Async server component — rendered inside a Suspense boundary so the
// main article body streams to the browser immediately without waiting.
async function RelatedArticlesSection({
  articleId,
  categoryIds,
  tagIds,
}: {
  articleId: string;
  categoryIds: string[];
  tagIds: string[];
}) {
  const relatedArticles = await getRelatedArticles(articleId, categoryIds, tagIds);
  if (relatedArticles.length === 0) return null;

  const formatted = relatedArticles
    .filter((a) => a.publishedAt !== null)
    .map((a) => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
      excerpt: a.excerpt,
      featuredImage: a.featuredImage?.url ?? null,
      publishedAt: a.publishedAt!,
      readingTime: a.readingTime,
      categories: a.categories,
    }));

  if (formatted.length === 0) return null;

  return (
    <section
      className="related-articles py-10 md:py-14"
      style={{ background: 'var(--muted)', borderTop: '2px solid var(--border)' }}
    >
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <RelatedArticles articles={formatted} />
        </div>
      </div>
    </section>
  );
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;

  const [article, categories, popularTags] = await Promise.all([
    getArticleData(slug),
    getCategories(),
    getPopularTags(),
  ]);

  if (!article) {
    notFound();
  }

  const categoryIds = article.categories.map((c) => c.id);
  const tagIds = article.tags.map((t) => t.id);

  // Transform images to match ArticleContent props
  const allImages = article.images.map(img => ({
    url: img.url,
    alt: img.altText ?? undefined,
    caption: img.caption ?? undefined,
  }));

  const allVideos = article.videos.map(video => ({
    videoId: video.youtubeId,
    title: video.title ?? undefined,
    privacyMode: video.privacyMode,
    startTime: video.startTime,
  }));

  const formatDate = new Intl.DateTimeFormat('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || '';
  const articleUrl = `${baseUrl}/article/${slug}`;

  // JSON-LD structured data — Article + BreadcrumbList
  const breadcrumbItems: object[] = [
    { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: baseUrl },
  ];
  if (article.categories.length > 0) {
    breadcrumbItems.push({
      '@type': 'ListItem',
      position: 2,
      name: article.categories[0].name,
      item: `${baseUrl}/category/${article.categories[0].slug}`,
    });
    breadcrumbItems.push({ '@type': 'ListItem', position: 3, name: article.title, item: articleUrl });
  } else {
    breadcrumbItems.push({ '@type': 'ListItem', position: 2, name: article.title, item: articleUrl });
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: article.title,
        description: article.excerpt || article.metaDescription || '',
        image: article.featuredImage?.url || [],
        datePublished: article.publishedAt?.toISOString(),
        dateModified: article.updatedAt.toISOString(),
        author: {
          '@type': 'Person',
          name: article.author?.name || 'المسؤول',
        },
        publisher: {
          '@type': 'Organization',
          name: 'الموقع الصحفي',
          logo: {
            '@type': 'ImageObject',
            url: `${baseUrl}/logo.png`,
          },
        },
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': articleUrl,
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbItems,
      },
    ],
  };

  return (
    <PublicLayout categories={categories} popularTags={popularTags}>
      {/* Preload LCP image — tells browser to fetch it at highest priority before HTML is parsed */}
      {article.featuredImage && (
        <link rel="preload" as="image" href={article.featuredImage.url} fetchPriority="high" />
      )}
      <ReadingProgress contentId="article-content" color="var(--accent)" />
      <ArticleViewTracker slug={slug} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── Breadcrumb ── */}
      {article.categories.length > 0 && (
        <nav aria-label="مسار التنقل" style={{ background: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
          <div className="container mx-auto px-4 py-2.5">
            <ol className="flex items-center gap-1.5 text-xs text-muted-foreground overflow-x-auto">
              <li className="shrink-0">
                <Link href="/" className="hover:text-accent transition-colors font-medium">
                  الرئيسية
                </Link>
              </li>
              <li aria-hidden="true" className="shrink-0">
                <svg className="w-3 h-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </li>
              <li className="shrink-0">
                <a
                  href={`/category/${article.categories[0].slug}`}
                  className="hover:text-accent transition-colors"
                >
                  {article.categories[0].name}
                </a>
              </li>
              <li aria-hidden="true" className="shrink-0">
                <svg className="w-3 h-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </li>
              <li className="text-foreground font-medium truncate min-w-0">{article.title}</li>
            </ol>
          </div>
        </nav>
      )}

      {/* ── Main Article ── */}
      <article className="py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-8 lg:gap-10 items-start">

            {/* ── Main Column ── */}
            <div>
              {/* Article Header */}
              <header className="mb-8">

                {/* Category badges */}
                {article.categories.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-5">
                    {article.categories.map((category) => (
                      <a
                        key={category.id}
                        href={`/category/${category.slug}`}
                        className="inline-block text-xs px-3 py-1 bg-accent text-white font-bold uppercase hover:bg-accent-hover transition-colors"
                        style={{ letterSpacing: '0.06em' }}
                      >
                        {category.name}
                      </a>
                    ))}
                  </div>
                )}

                {/* Title — Amiri display font, fluid sizing */}
                <h1
                  className="font-display text-foreground leading-[1.3] mb-5"
                  style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)', fontWeight: 700 }}
                >
                  {article.title}
                </h1>

                {/* Excerpt — italic lead with amber accent border */}
                {article.excerpt && (
                  <p
                    className="text-base md:text-lg text-muted-foreground leading-relaxed mb-5"
                    style={{
                      borderInlineStart: '3px solid var(--accent)',
                      paddingInlineStart: '1rem',
                    }}
                  >
                    {article.excerpt}
                  </p>
                )}

                {/* Amber rule */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-0.5 bg-accent shrink-0" />
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Meta bar — stacks on mobile, single row on sm+ */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
                    {article.author && (
                      <div className="flex items-center gap-2">
                        <span
                          className="w-8 h-8 rounded-full flex items-center justify-center text-accent font-bold text-sm shrink-0"
                          style={{
                            background: 'var(--accent-light)',
                            border: '1.5px solid var(--accent)',
                          }}
                        >
                          {article.author.name.charAt(0)}
                        </span>
                        <div>
                          <span className="font-semibold text-foreground text-sm leading-tight block">
                            {article.author.name}
                          </span>
                          {article.author.authorTitle && (
                            <span className="text-xs text-muted-foreground leading-tight block">
                              {article.author.authorTitle}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {article.author && (
                      <span aria-hidden="true" className="text-border hidden sm:inline">|</span>
                    )}
                    <div className="flex items-center gap-2 text-xs">
                      <time dateTime={article.publishedAt?.toISOString()}>
                        {formatDate.format(article.publishedAt!)}
                      </time>
                      {article.readingTime && (
                        <>
                          <span aria-hidden="true" className="opacity-40">·</span>
                          <span
                            className="px-2 py-0.5 text-accent font-semibold"
                            style={{ background: 'var(--accent-light)', fontSize: '0.7rem' }}
                          >
                            {article.readingTime} دقيقة قراءة
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <TextToSpeech content={article.content} title={article.title} slug={article.slug} />
                  </div>
                </div>
              </header>

              {/* Featured Image — full-bleed on mobile, contained on desktop */}
              {article.featuredImage && (
                <figure className="-mx-4 sm:mx-0 mb-8">
                  <div
                    className="relative w-full aspect-video overflow-hidden"
                    style={{ boxShadow: '0 4px 32px rgba(26,24,20,0.12)' }}
                  >
                    <Image
                      src={article.featuredImage.url}
                      alt={article.featuredImage.altText || article.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 80vw, 70vw"
                      priority
                      className="object-cover"
                    />
                  </div>
                  {article.featuredImage.caption && (
                    <figcaption
                      className="text-center text-xs text-muted-foreground px-4 sm:px-0"
                      style={{
                        borderTop: '1px solid var(--border)',
                        paddingTop: '0.625rem',
                        marginTop: '0.625rem',
                      }}
                    >
                      {article.featuredImage.caption}
                    </figcaption>
                  )}
                </figure>
              )}

              {/* Article Content */}
              <div id="article-content" className="prose prose-lg max-w-none" data-article-url={articleUrl}>
                <ArticleContent
                  content={article.content}
                  images={allImages}
                  videos={allVideos}
                />
              </div>

              {/* Tags */}
              {article.tags.length > 0 && (
                <div className="mt-10 pt-6 border-t border-border">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-4 bg-accent shrink-0" />
                    <h3
                      className="text-xs font-bold text-foreground uppercase"
                      style={{ letterSpacing: '0.1em' }}
                    >
                      الوسوم
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {article.tags.map((tag) => (
                      <a
                        key={tag.id}
                        href={`/tag/${tag.slug}`}
                        className="text-xs px-3 py-1.5 border border-border hover:border-accent hover:text-accent hover:bg-accent-light transition-all duration-200"
                      >
                        #{tag.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Author Bio */}
              {article.author && article.author.bio && (
                <div className="mt-10 pt-8 border-t border-border">
                  <div
                    className="p-5 sm:p-6"
                    style={{
                      background: 'var(--muted)',
                      borderInlineStart: '3px solid var(--accent)',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-1 h-4 bg-accent shrink-0" />
                      <p
                        className="text-xs font-bold text-accent uppercase"
                        style={{ letterSpacing: '0.1em' }}
                      >
                        عن الكاتب
                      </p>
                    </div>
                    <div className="flex items-start gap-4">
                      {article.author.image ? (
                        <img
                          src={article.author.image}
                          alt={article.author.name}
                          className="w-14 h-14 object-cover shrink-0"
                          style={{ border: '2px solid var(--accent)' }}
                        />
                      ) : (
                        <div
                          className="w-14 h-14 shrink-0 flex items-center justify-center text-xl font-bold text-accent"
                          style={{
                            background: 'var(--accent-light)',
                            border: '2px solid var(--accent)',
                          }}
                        >
                          {article.author.name.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-foreground text-base leading-tight">
                          {article.author.name}
                        </p>
                        {article.author.authorTitle && (
                          <p className="text-sm text-accent mt-0.5 mb-2">
                            {article.author.authorTitle}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {article.author.bio}
                        </p>
                        {(article.author.twitterUrl || article.author.linkedinUrl) && (
                          <div className="flex gap-4 mt-3">
                            {article.author.twitterUrl && (
                              <a
                                href={article.author.twitterUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-accent hover:text-accent-hover font-semibold transition-colors"
                              >
                                X / تويتر ↗
                              </a>
                            )}
                            {article.author.linkedinUrl && (
                              <a
                                href={article.author.linkedinUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-accent hover:text-accent-hover font-semibold transition-colors"
                              >
                                لينكدإن ↗
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Mobile Share — card with header */}
              <div className="mt-8 lg:hidden">
                <div
                  className="border border-border overflow-hidden"
                  style={{ boxShadow: 'var(--shadow-sm)' }}
                >
                  <div
                    className="flex items-center gap-2 px-4 py-3 border-b border-border"
                    style={{ background: 'var(--muted)' }}
                  >
                    <div className="w-1 h-4 bg-accent shrink-0" />
                    <span
                      className="text-xs font-bold text-foreground uppercase"
                      style={{ letterSpacing: '0.08em' }}
                    >
                      مشاركة المقال
                    </span>
                  </div>
                  <div style={{ background: 'var(--card)' }}>
                    <SocialShare title={article.title} url={articleUrl} description={article.excerpt ?? undefined} />
                  </div>
                </div>
              </div>

              {/* Font size controls — sticky within article column only */}
              <ReadingSettings position="sticky" showLabel={false} />
            </div>

            {/* ── Sidebar ── */}
            <div className="hidden lg:flex flex-col gap-5">
              {/* Share Card */}
              <SocialShare title={article.title} url={articleUrl} description={article.excerpt ?? undefined} variant="sidebar" />

              {article.series && article.series.articles.length > 1 && (
                <SeriesNavigation
                  series={article.series}
                  currentArticleId={article.id}
                />
              )}
              <TableOfContentsSticky contentId="article-content" />
            </div>
          </div>
        </div>
      </article>

      {/* Related Articles — streamed after main content; doesn't block article render */}
      <Suspense fallback={null}>
        <RelatedArticlesSection
          articleId={article.id}
          categoryIds={categoryIds}
          tagIds={tagIds}
        />
      </Suspense>
    </PublicLayout>
  );
}
