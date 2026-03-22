import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';
import { BreakingNewsBanner } from './BreakingNewsBanner';
import { prisma } from '@/lib/prisma';

interface PublicLayoutProps {
  children: React.ReactNode;
  categories?: Array<{ id: string; name: string; slug: string }>;
  popularTags?: Array<{ id: string; name: string; slug: string }>;
}

async function getBreakingNews() {
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
}

export async function PublicLayout({ children, categories = [], popularTags = [] }: PublicLayoutProps) {
  const breakingNews = await getBreakingNews();

  return (
    <div className="min-h-screen flex flex-col">
      {breakingNews && (
        <BreakingNewsBanner text={breakingNews.text} url={breakingNews.url} />
      )}
      <PublicHeader categories={categories} />
      <main className="flex-1">
        {children}
      </main>
      <PublicFooter categories={categories} popularTags={popularTags} />
    </div>
  );
}
