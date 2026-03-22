interface SeriesNavigationProps {
  series: {
    title: string;
    slug: string;
    description?: string | null;
    articles: Array<{
      id: string;
      title: string;
      slug: string;
      seriesOrder?: number | null;
    }>;
  };
  currentArticleId: string;
}

export function SeriesNavigation({ series, currentArticleId }: SeriesNavigationProps) {
  const sorted = [...series.articles].sort((a, b) => (a.seriesOrder ?? 0) - (b.seriesOrder ?? 0));
  const currentIndex = sorted.findIndex((a) => a.id === currentArticleId);

  return (
    <div className="border border-border rounded-xl p-5 bg-muted/30">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">سلسلة مقالات</span>
      </div>
      <h4 className="font-semibold text-foreground mb-4">{series.title}</h4>

      <ol className="space-y-2">
        {sorted.map((article, index) => {
          const isCurrent = article.id === currentArticleId;
          return (
            <li key={article.id}>
              <a
                href={isCurrent ? '#' : `/article/${article.slug}`}
                className={`flex items-center gap-3 text-sm py-1.5 rounded transition-colors ${
                  isCurrent
                    ? 'text-foreground font-semibold pointer-events-none'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  isCurrent
                    ? 'bg-foreground text-background'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {index + 1}
                </span>
                <span className="line-clamp-2">{article.title}</span>
              </a>
            </li>
          );
        })}
      </ol>

      {/* Prev/Next navigation */}
      {(currentIndex > 0 || currentIndex < sorted.length - 1) && (
        <div className="flex justify-between mt-5 pt-4 border-t border-border gap-2">
          {currentIndex > 0 ? (
            <a
              href={`/article/${sorted[currentIndex - 1].slug}`}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              السابق
            </a>
          ) : <span />}
          {currentIndex < sorted.length - 1 ? (
            <a
              href={`/article/${sorted[currentIndex + 1].slug}`}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              التالي
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </a>
          ) : <span />}
        </div>
      )}
    </div>
  );
}
