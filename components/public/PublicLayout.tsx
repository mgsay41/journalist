import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';

interface PublicLayoutProps {
  children: React.ReactNode;
  categories?: Array<{ id: string; name: string; slug: string }>;
  popularTags?: Array<{ id: string; name: string; slug: string }>;
}

export async function PublicLayout({ children, categories = [], popularTags = [] }: PublicLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader categories={categories} />
      <main className="flex-1">
        {children}
      </main>
      <PublicFooter categories={categories} popularTags={popularTags} />
    </div>
  );
}
