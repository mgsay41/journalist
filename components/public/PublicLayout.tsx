import { unstable_cache } from 'next/cache';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';
import { BreakingNewsBanner } from './BreakingNewsBanner';
import { prisma } from '@/lib/prisma';
import { getSiteSettings } from '@/lib/settings/getSiteSettings';

interface PublicLayoutProps {
  children: React.ReactNode;
  categories?: Array<{ id: string; name: string; slug: string }>;
  popularTags?: Array<{ id: string; name: string; slug: string }>;
}

// Cache for 1 hour — breaking news rarely changes; invalidated when settings are saved
const getBreakingNews = unstable_cache(
  async () => {
    try {
      const settings = await prisma.settings.findFirst({
        select: {
          breakingNewsEnabled: true,
          breakingNewsText: true,
          breakingNewsUrl: true,
        },
      });
      if (settings?.breakingNewsEnabled && settings.breakingNewsText) {
        return { text: settings.breakingNewsText, url: settings.breakingNewsUrl };
      }
      return null;
    } catch {
      return null;
    }
  },
  ['breaking-news'],
  { revalidate: 3600, tags: ['settings'] }
);

export async function PublicLayout({ children, categories = [], popularTags = [] }: PublicLayoutProps) {
  const [breakingNews, siteSettings] = await Promise.all([
    getBreakingNews(),
    getSiteSettings(),
  ]);

  return (
    <div className="min-h-screen flex flex-col">
      {breakingNews && (
        <BreakingNewsBanner text={breakingNews.text} url={breakingNews.url} />
      )}
      <PublicHeader
        categories={categories}
        siteName={siteSettings.siteName}
        siteTagline={siteSettings.siteTagline}
      />
      <main className="flex-1">
        {children}
      </main>
      <PublicFooter
        categories={categories}
        popularTags={popularTags}
        siteName={siteSettings.siteName}
      />
    </div>
  );
}
