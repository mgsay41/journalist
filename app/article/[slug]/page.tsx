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
  const url = `${process.env.NEXT_PUBLIC_APP_URL || ''}/article/${slug}`;
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
    <section className="related-articles border-t border-border bg-muted/30 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
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

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
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


      {/* Breadcrumb */}
      {article.categories.length > 0 && (
        <nav className="border-b border-border" style={{ background: 'var(--muted)' }}>
          <div className="container mx-auto px-4 py-3">
            <ol className="flex items-center gap-2 text-xs text-muted-foreground">
              <li>
                <Link href="/" className="hover:text-accent transition-colors">الرئيسية</Link>
              </li>
              <svg className="w-3 h-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <li>
                <a href={`/category/${article.categories[0].slug}`} className="hover:text-accent transition-colors">
                  {article.categories[0].name}
                </a>
              </li>
              <svg className="w-3 h-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <li className="text-foreground line-clamp-1 font-medium">{article.title}</li>
            </ol>
          </div>
        </nav>
      )}

      <article className="py-6 md:py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
            <div>
              {/* Article Header */}
            <header className="mb-6">
              {/* Amber category badges */}
              {article.categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-5">
                  {article.categories.map((category) => (
                    <a
                      key={category.id}
                      href={`/category/${category.slug}`}
                      className="text-xs px-3 py-1 bg-accent text-white font-semibold uppercase hover:bg-accent-hover transition-colors"
                      style={{ letterSpacing: '0.07em' }}
                    >
                      {category.name}
                    </a>
                  ))}
                </div>
              )}

              {/* Title — Amiri display font */}
              <h1 className="font-display text-3xl md:text-4xl lg:text-5xl text-foreground leading-tight mb-4"
                style={{ fontWeight: 700, lineHeight: 1.25 }}>
                {article.title}
              </h1>

              {/* Excerpt — italic lead / deck text */}
              {article.excerpt && (
                <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-4 italic"
                  style={{
                    borderInlineStart: '3px solid var(--accent)',
                    paddingInlineStart: '1rem',
                  }}>
                  {article.excerpt}
                </p>
              )}

              {/* Amber rule */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-0.5 bg-accent" />
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Meta bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
                <div className="flex flex-wrap items-center gap-3">
                  {article.author && (
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-accent-light flex items-center justify-center text-accent font-bold text-xs shrink-0">
                        {article.author.name.charAt(0)}
                      </span>
                      <span className="font-semibold text-foreground">{article.author.name}</span>
                    </div>
                  )}
                  {article.author && <span aria-hidden="true" className="text-border">|</span>}
                  <time dateTime={article.publishedAt?.toISOString()}>
                    {formatDate.format(article.publishedAt!)}
                  </time>
                  {article.readingTime && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{article.readingTime} دقيقة قراءة</span>
                    </>
                  )}
                </div>
                <TextToSpeech content={article.content} title={article.title} slug={article.slug} />
              </div>

              {/* Featured Image — Next.js Image for AVIF/WebP, CDN caching, CLS prevention */}
              {article.featuredImage && (
                <figure className="mt-5 mb-2">
                  <div className="relative w-full aspect-video">
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
                    <figcaption className="text-center text-xs text-muted-foreground mt-3 italic">
                      {article.featuredImage.caption}
                    </figcaption>
                  )}
                </figure>
              )}
            </header>

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
              <div className="mt-8 pt-6 border-t border-border">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-4" style={{ letterSpacing: '0.08em' }}>
                  الوسوم
                </h3>
                <div className="flex flex-wrap gap-2">
                  {article.tags.map((tag) => (
                    <a
                      key={tag.id}
                      href={`/tag/${tag.slug}`}
                      className="text-xs px-3 py-1.5 border border-border hover:border-accent hover:text-accent transition-colors"
                    >
                      #{tag.name}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Author Bio */}
            {article.author && article.author.bio && (
              <div className="mt-8 pt-6 border-t border-border">
                <div className="p-6" style={{ background: 'var(--muted)', borderInlineStart: '3px solid var(--accent)' }}>
                  <p className="text-xs font-semibold text-accent uppercase mb-4" style={{ letterSpacing: '0.08em' }}>عن الكاتب</p>
                  <div className="flex items-start gap-4">
                    {article.author.image ? (
                      <img
                        src={article.author.image}
                        alt={article.author.name}
                        className="w-14 h-14 object-cover shrink-0"
                        style={{ border: '2px solid var(--accent)' }}
                      />
                    ) : (
                      <div className="w-14 h-14 shrink-0 flex items-center justify-center text-xl font-bold text-accent"
                        style={{ background: 'var(--accent-light)', border: '2px solid var(--accent)' }}>
                        {article.author.name.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground text-base">{article.author.name}</p>
                      {article.author.authorTitle && (
                        <p className="text-sm text-accent mb-2">{article.author.authorTitle}</p>
                      )}
                      <p className="text-sm text-muted-foreground leading-relaxed">{article.author.bio}</p>
                      {(article.author.twitterUrl || article.author.linkedinUrl) && (
                        <div className="flex gap-4 mt-3">
                          {article.author.twitterUrl && (
                            <a
                              href={article.author.twitterUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-accent hover:text-accent-hover font-medium transition-colors"
                            >
                              X / تويتر ↗
                            </a>
                          )}
                          {article.author.linkedinUrl && (
                            <a
                              href={article.author.linkedinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-accent hover:text-accent-hover font-medium transition-colors"
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

            {/* Share (Mobile) */}
            <div className="mt-6 pt-6 border-t border-border lg:hidden">
              <SocialShare title={article.title} url={`/article/${slug}`} />
            </div>

            {/* Font size controls — sticky within article column only */}
            <ReadingSettings position="sticky" showLabel={false} />
            </div>

            {/* Sidebar */}
            <div className="hidden lg:flex flex-col gap-4">
              {/* Share Card */}
              <SocialShare title={article.title} url={`/article/${slug}`} variant="sidebar" />

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
