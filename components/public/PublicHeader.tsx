import { HeaderInteractive } from './HeaderInteractive';

interface PublicHeaderProps {
  categories?: Array<{ id: string; name: string; slug: string }>;
}

// Server component — category filtering and date formatting happen server-side,
// keeping these computations out of the client JS bundle.
export function PublicHeader({ categories = [] }: PublicHeaderProps) {
  const mainCategories = categories.filter(c => !c.slug.includes('/')).slice(0, 5);
  const today = new Intl.DateTimeFormat('ar-SA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  return <HeaderInteractive mainCategories={mainCategories} today={today} />;
}
