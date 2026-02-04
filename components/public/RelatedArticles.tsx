import Link from 'next/link';
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
    <section className="border-t border-border pt-8 mt-8">
      <h2 className="text-2xl font-semibold text-foreground mb-6">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {articles.map((article) => (
          <ArticleCard
            key={article.id}
            article={article}
            size="small"
          />
        ))}
      </div>
    </section>
  );
}
