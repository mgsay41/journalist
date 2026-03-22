import Link from 'next/link';
import { LazyImage } from './LazyImage';
import { memo } from 'react';

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
  revealIndex?: number;
}

const ArticleCardMemo = function ArticleCard({ article, size = 'default', revealIndex = 0 }: ArticleCardProps) {
  const formatDate = new Intl.DateTimeFormat('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const isLarge = size === 'large';
  const isSmall = size === 'small';

  const revealClass = revealIndex > 0
    ? `card-reveal card-reveal-${Math.min(revealIndex, 6)}`
    : 'card-reveal';

  return (
    <article className={`group ${isLarge ? 'col-span-full' : ''} ${revealClass}`}>
      <Link href={`/article/${article.slug}`} className="block h-full">
        <div className="h-full flex flex-col border border-border-subtle hover:border-accent/40 transition-all duration-300 overflow-hidden bg-card"
          style={{ boxShadow: 'var(--shadow-sm)' }}
        >
          {/* Featured Image */}
          {article.featuredImage && (
            <div className={`relative overflow-hidden shrink-0 ${
              isSmall ? 'aspect-video' : isLarge ? 'aspect-21/9' : 'aspect-4/3'
            }`}>
              <LazyImage
                src={article.featuredImage}
                alt={article.title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                rootMargin="100px"
              />
              {/* Amber Category Badge */}
              {article.categories && article.categories.length > 0 && (
                <div className="absolute top-3 right-3">
                  <span className="px-3 py-1 bg-accent text-white text-xs font-semibold uppercase tracking-wide"
                    style={{ letterSpacing: '0.06em' }}>
                    {article.categories[0].name}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Content */}
          <div className={`flex flex-col flex-1 ${isSmall ? 'p-3' : isLarge ? 'p-5' : 'p-4'}`}>
            {/* No-image category badge fallback */}
            {!article.featuredImage && article.categories && article.categories.length > 0 && (
              <div className="mb-3">
                <span className="text-xs font-semibold text-accent uppercase tracking-wide"
                  style={{ letterSpacing: '0.07em' }}>
                  {article.categories[0].name}
                </span>
              </div>
            )}

            {/* Date meta */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
              {article.publishedAt && (
                <time dateTime={article.publishedAt.toISOString()}>
                  {formatDate.format(article.publishedAt)}
                </time>
              )}
              {article.readingTime && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{article.readingTime} د قراءة</span>
                </>
              )}
            </div>

            {/* Title — Amiri display font with hover underline */}
            <h3 className={`font-display text-foreground mb-3 line-clamp-2 headline-link inline leading-snug ${
              isLarge ? 'text-2xl md:text-3xl' : isSmall ? 'text-base' : 'text-xl'
            }`}
              style={{ fontWeight: isLarge ? 700 : 600 }}>
              {article.title}
            </h3>

            {/* Excerpt */}
            {!isSmall && article.excerpt && (
              <p className={`text-muted-foreground line-clamp-2 leading-relaxed flex-1 ${isLarge ? 'text-base' : 'text-sm'}`}>
                {article.excerpt}
              </p>
            )}

            {/* Author */}
            {article.author && !isSmall && (
              <div className="mt-auto pt-4 flex items-center gap-2 text-xs text-muted-foreground border-t border-border-subtle">
                <span className="w-5 h-5 rounded-full bg-accent-light flex items-center justify-center text-accent font-bold text-xs shrink-0">
                  {article.author.name.charAt(0)}
                </span>
                <span className="font-medium text-foreground">{article.author.name}</span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
};

// Custom comparison function — only re-render when content changes
function arePropsEqual(prevProps: ArticleCardProps, nextProps: ArticleCardProps): boolean {
  return (
    prevProps.article.id === nextProps.article.id &&
    prevProps.article.slug === nextProps.article.slug &&
    prevProps.article.title === nextProps.article.title &&
    prevProps.article.excerpt === nextProps.article.excerpt &&
    prevProps.article.featuredImage === nextProps.article.featuredImage &&
    prevProps.size === nextProps.size &&
    (!('updatedAt' in prevProps.article) || !('updatedAt' in nextProps.article) ||
     prevProps.article.updatedAt === nextProps.article.updatedAt)
  );
}

export const ArticleCard = memo(ArticleCardMemo, arePropsEqual);

export function ArticleCardSkeleton({ size = 'default' }: { size?: 'default' | 'large' | 'small' }) {
  const isLarge = size === 'large';
  const isSmall = size === 'small';

  return (
    <div className="border border-border-subtle overflow-hidden bg-card" style={{ boxShadow: 'var(--shadow-sm)' }}>
      {/* Image Skeleton */}
      <div className={`animate-shimmer ${isSmall ? 'aspect-video' : isLarge ? 'aspect-21/9' : 'aspect-4/3'}`} />

      {/* Content Skeleton */}
      <div className={isSmall ? 'p-3' : isLarge ? 'p-6' : 'p-5'}>
        {/* Meta */}
        <div className="flex items-center gap-3 mb-3">
          <div className="h-3 w-24 bg-muted animate-pulse rounded" />
          <div className="h-3 w-16 bg-muted animate-pulse rounded" />
        </div>
        {/* Title */}
        <div className={`h-6 bg-muted animate-pulse rounded mb-2 ${isLarge ? 'h-8' : ''}`} />
        <div className="h-5 bg-muted animate-pulse rounded w-3/4 mb-4" />
        {/* Excerpt */}
        {!isSmall && (
          <>
            <div className="h-4 bg-muted animate-pulse rounded mb-1.5" />
            <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
          </>
        )}
      </div>
    </div>
  );
}
