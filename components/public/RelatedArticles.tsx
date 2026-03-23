import { ArticleCard } from './ArticleCard';

interface RelatedArticlesProps {
  articles: Array<{
    id: string;
    title: string;
    slug: string;
    excerpt?: string | null;
    featuredImage?: string | null;
    publishedAt: Date;
    readingTime?: number | null;
    categories?: Array<{
      id: string;
      name: string;
      slug: string;
    }>;
  }>;
  title?: string;
}

export function RelatedArticles({ articles, title = 'مقالات ذات صلة' }: RelatedArticlesProps) {
  if (articles.length === 0) {
    return null;
  }

  return (
    <div>
      {/* Editorial section heading with accent bar + horizontal rule */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-1.5 h-7 bg-accent shrink-0" />
        <h2 className="font-display text-2xl font-bold text-foreground">{title}</h2>
        <div className="flex-1 h-px bg-border" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {articles.map((article) => (
          <ArticleCard
            key={article.id}
            article={article}
            size="small"
          />
        ))}
      </div>
    </div>
  );
}
