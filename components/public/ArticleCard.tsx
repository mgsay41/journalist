import Link from 'next/link';
import { LazyImage } from './LazyImage';

interface ArticleCardProps {
  article: {
    id: string;
    title: string;
    slug: string;
    excerpt?: string | null;
    featuredImage?: string | null;
    publishedAt: Date | null;
    readingTime?: number | null;
    categories?: Array<{ id: string; name: string; slug: string }>;
    author?: {
      name: string;
    } | null;
  };
  size?: 'default' | 'large' | 'small';
}

export function ArticleCard({ article, size = 'default' }: ArticleCardProps) {
  const formatDate = new Intl.DateTimeFormat('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const isLarge = size === 'large';
  const isSmall = size === 'small';

  return (
    <article className={`group ${isLarge ? 'col-span-full' : ''}`}>
      <Link href={`/article/${article.slug}`} className="block">
        <div className="border border-border-subtle hover:border-border transition-all duration-200 rounded-lg overflow-hidden bg-card">
          {/* Featured Image */}
          {article.featuredImage && (
            <div className={`relative overflow-hidden ${isSmall ? 'aspect-video' : isLarge ? 'aspect-[21/9]' : 'aspect-[4/3]'}`}>
              <LazyImage
                src={article.featuredImage}
                alt={article.title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                rootMargin="100px" // Load images 100px before entering viewport
              />
              {/* Category Badge */}
              {article.categories && article.categories.length > 0 && (
                <div className="absolute top-3 right-3">
                  <span className="px-3 py-1.5 bg-background/90 backdrop-blur-sm text-xs font-medium rounded-md">
                    {article.categories[0].name}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Content */}
          <div className={`p-4 ${isSmall ? 'p-3' : isLarge ? 'p-6' : 'p-5'}`}>
            {/* Meta */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
              {article.publishedAt && (
                <time dateTime={article.publishedAt.toISOString()}>
                  {formatDate.format(article.publishedAt)}
                </time>
              )}
              {article.readingTime && (
                <>
                  <span>•</span>
                  <span>{article.readingTime} دقيقة قراءة</span>
                </>
              )}
            </div>

            {/* Title */}
            <h3 className={`font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-foreground/80 transition-colors ${isLarge ? 'text-2xl md:text-3xl' : isSmall ? 'text-base' : 'text-lg'}`}>
              {article.title}
            </h3>

            {/* Excerpt */}
            {!isSmall && article.excerpt && (
              <p className={`text-muted-foreground line-clamp-2 ${isLarge ? 'text-base' : 'text-sm'}`}>
                {article.excerpt}
              </p>
            )}

            {/* Author */}
            {article.author && !isSmall && (
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <span>بواسطة</span>
                <span className="font-medium text-foreground">{article.author.name}</span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}

export function ArticleCardSkeleton({ size = 'default' }: { size?: 'default' | 'large' | 'small' }) {
  const isLarge = size === 'large';
  const isSmall = size === 'small';

  return (
    <div className={`border border-border-subtle rounded-lg overflow-hidden bg-card`}>
      {/* Image Skeleton */}
      <div className={`bg-muted animate-pulse ${isSmall ? 'aspect-video' : isLarge ? 'aspect-[21/9]' : 'aspect-[4/3]'}`} />

      {/* Content Skeleton */}
      <div className={`p-4 ${isSmall ? 'p-3' : isLarge ? 'p-6' : 'p-5'}`}>
        {/* Meta Skeleton */}
        <div className="flex items-center gap-3 mb-2">
          <div className="h-3 w-24 bg-muted animate-pulse rounded" />
          <div className="h-3 w-20 bg-muted animate-pulse rounded" />
        </div>

        {/* Title Skeleton */}
        <div className={`h-5 bg-muted animate-pulse rounded mb-2 ${isLarge ? 'h-8 w-full' : ''}`} />

        {/* Excerpt Skeleton */}
        {!isSmall && (
          <>
            <div className="h-4 bg-muted animate-pulse rounded mb-1" />
            <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
          </>
        )}
      </div>
    </div>
  );
}
