import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { PublicLayout } from '@/components/public';
import { ArticleContent } from '@/components/public/ArticleContent';
import { SocialShare } from '@/components/public/SocialShare';
import { RelatedArticles } from '@/components/public/RelatedArticles';
import { ArticleViewTracker } from '@/components/public/ArticleViewTracker';
import { ReadingProgress } from '@/components/public/ReadingProgress';
import { TableOfContentsSticky } from '@/components/public/TableOfContents';
import { ReadingSettings } from '@/components/public/FontSizeControls';
import { TextToSpeech } from '@/components/public/TextToSpeech';
import type { Metadata } from 'next';

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
      videos: true,
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

async function getCategories() {
  return prisma.category.findMany({
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
}

async function getPopularTags() {
  return prisma.tag.findMany({
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
}

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

  const whereClause: any = {
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

  const relatedArticles = await getRelatedArticles(article.id, categoryIds, tagIds);

  // Transform related articles to match component props (filter out nulls)
  const formattedRelatedArticles = relatedArticles
    .filter(article => article.publishedAt !== null)
    .map(article => ({
      id: article.id,
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      featuredImage: article.featuredImage?.url ?? null,
      publishedAt: article.publishedAt!,
      readingTime: article.readingTime,
      categories: article.categories,
    }));

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

  // JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
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
        url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${process.env.NEXT_PUBLIC_APP_URL || ''}/article/${slug}`,
    },
  };

  return (
    <PublicLayout categories={categories} popularTags={popularTags}>
      <ReadingProgress contentId="article-content" />
      <ArticleViewTracker slug={slug} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            /* Hide elements that shouldn't print */
            .no-print,
            nav,
            aside,
            #reading-progress,
            [data-reading-settings],
            .social-share,
            .related-articles {
              display: none !important;
            }

            /* Reset page margins */
            @page {
              margin: 2cm;
            }

            body {
              background: white;
              color: black;
              font-size: 12pt;
              line-height: 1.5;
            }

            /* Article container */
            article {
              max-width: 100% !important;
              padding: 0 !important;
              margin: 0 !important;
            }

            /* Article header */
            header h1 {
              font-size: 18pt;
              page-break-after: avoid;
              color: black;
            }

            /* Article metadata */
            header .text-muted-foreground {
              color: #666;
            }

            /* Featured image */
            figure img {
              max-width: 100%;
              height: auto;
              page-break-inside: avoid;
            }

            figcaption {
              font-size: 10pt;
              font-style: italic;
              color: #666;
            }

            /* Article content */
            #article-content {
              font-size: 12pt;
              line-height: 1.6;
            }

            #article-content h1,
            #article-content h2,
            #article-content h3,
            #article-content h4,
            #article-content h5,
            #article-content h6 {
              page-break-after: avoid;
              color: black;
              margin-top: 1.5em;
              margin-bottom: 0.5em;
            }

            #article-content h1 { font-size: 18pt; }
            #article-content h2 { font-size: 16pt; }
            #article-content h3 { font-size: 14pt; }

            #article-content p {
              margin-bottom: 1em;
              orphans: 3;
              widows: 3;
            }

            #article-content img {
              max-width: 100%;
              height: auto;
              page-break-inside: avoid;
            }

            #article-content blockquote {
              page-break-inside: avoid;
              border-left: 3px solid #ccc;
              padding-left: 1em;
              margin: 1.5em 0;
            }

            #article-content pre,
            #article-content code {
              background: #f5f5f5;
              border: 1px solid #ddd;
              page-break-inside: avoid;
            }

            #article-content table {
              page-break-inside: avoid;
              width: 100%;
              border-collapse: collapse;
            }

            #article-content table th,
            #article-content table td {
              border: 1px solid #ddd;
              padding: 0.5em;
            }

            #article-content ul,
            #article-content ol {
              page-break-inside: avoid;
            }

            #article-content a {
              color: #000;
              text-decoration: underline;
            }

            #article-content a[href^="http"]::after {
              content: " (" attr(href) ")";
              font-size: 0.8em;
              word-break: break-all;
            }

            /* Tags */
            .flex.flex-wrap.gap-2 a {
              border: 1px solid #ccc;
              padding: 0.2em 0.5em;
              display: inline-block;
              page-break-inside: avoid;
            }

            /* Page breaks */
            .page-break-before {
              page-break-before: always;
            }

            .page-break-after {
              page-break-after: always;
            }

            .page-break-inside-avoid {
              page-break-inside: avoid;
            }

            /* Article URL at the end */
            #article-content::after {
              content: "مقتبس من: ${process.env.NEXT_PUBLIC_APP_URL || ''}/article/${slug}";
              display: block;
              margin-top: 2em;
              font-size: 10pt;
              color: #666;
              page-break-before: avoid;
            }
          }
        `
      }} />

      {/* Breadcrumb */}
      {article.categories.length > 0 && (
        <nav className="border-b border-border bg-muted/30">
          <div className="container mx-auto px-4 py-3">
            <ol className="flex items-center gap-2 text-sm text-muted-foreground">
              <li>
                <a href="/" className="hover:text-foreground transition-colors">
                  الرئيسية
                </a>
              </li>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <li>
                <a
                  href={`/category/${article.categories[0].slug}`}
                  className="hover:text-foreground transition-colors"
                >
                  {article.categories[0].name}
                </a>
              </li>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <li className="text-foreground line-clamp-1">{article.title}</li>
            </ol>
          </div>
        </nav>
      )}

      {/* Reading Settings - Fixed position controls */}
      <ReadingSettings position="fixed" showLabel={false} />

      <article className="py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
            <div>
              {/* Article Header */}
            <header className="mb-8">
              {/* Categories */}
              {article.categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {article.categories.map((category) => (
                    <a
                      key={category.id}
                      href={`/category/${category.slug}`}
                      className="text-xs px-3 py-1.5 border border-border-subtle rounded-full hover:border-foreground hover:bg-muted transition-colors"
                    >
                      {category.name}
                    </a>
                  ))}
                </div>
              )}

              {/* Title */}
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-foreground leading-tight mb-6">
                {article.title}
              </h1>

              {/* Meta */}
              <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground mb-6">
                <div className="flex flex-wrap items-center gap-4">
                  {article.author && (
                    <div className="flex items-center gap-2">
                      <span>بواسطة</span>
                      <span className="font-medium text-foreground">{article.author.name}</span>
                    </div>
                  )}
                  <span>•</span>
                  <time dateTime={article.publishedAt?.toISOString()}>
                    {formatDate.format(article.publishedAt!)}
                  </time>
                  {article.readingTime && (
                    <>
                      <span>•</span>
                      <span>{article.readingTime} دقيقة قراءة</span>
                    </>
                  )}
                </div>
                <TextToSpeech content={article.content} title={article.title} />
              </div>

              {/* Featured Image */}
              {article.featuredImage && (
                <figure className="mb-8">
                  <img
                    src={article.featuredImage.url}
                    alt={article.featuredImage.altText || article.title}
                    className="w-full h-auto rounded-lg"
                  />
                  {article.featuredImage.caption && (
                    <figcaption className="text-center text-sm text-muted-foreground mt-3">
                      {article.featuredImage.caption}
                    </figcaption>
                  )}
                </figure>
              )}

              {/* Excerpt */}
              {article.excerpt && (
                <p className="text-xl text-muted-foreground leading-relaxed border-l-4 border-foreground pr-4">
                  {article.excerpt}
                </p>
              )}
            </header>

            {/* Share Sidebar (Desktop) - Fixed position */}
            <aside className="hidden lg:block fixed left-8 top-1/2 -translate-y-1/2 z-10">
              <SocialShare title={article.title} url={`/article/${slug}`} />
            </aside>

            {/* Article Content */}
            <div id="article-content" className="prose prose-lg max-w-none">
              <ArticleContent
                content={article.content}
                images={allImages}
                videos={allVideos}
              />
            </div>

            {/* Tags */}
            {article.tags.length > 0 && (
              <div className="mt-8 pt-8 border-t border-border">
                <h3 className="text-sm font-semibold text-foreground mb-4">الوسوم</h3>
                <div className="flex flex-wrap gap-2">
                  {article.tags.map((tag) => (
                    <a
                      key={tag.id}
                      href={`/tag/${tag.slug}`}
                      className="text-xs px-3 py-1.5 border border-border-subtle rounded-full hover:border-foreground hover:bg-muted transition-colors"
                    >
                      #{tag.name}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Share (Mobile) */}
            <div className="mt-8 pt-8 border-t border-border lg:hidden">
              <SocialShare title={article.title} url={`/article/${slug}`} />
            </div>
            </div>

            {/* TOC Sidebar */}
            <div className="hidden lg:block">
              <TableOfContentsSticky contentId="article-content" />
            </div>
          </div>
        </div>
      </article>

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <section className="related-articles border-t border-border bg-muted/30 py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <RelatedArticles articles={formattedRelatedArticles} />
            </div>
          </div>
        </section>
      )}
    </PublicLayout>
  );
}
