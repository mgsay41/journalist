import { HeaderInteractive } from './HeaderInteractive';

interface PublicHeaderProps {
  categories?: Array<{ id: string; name: string; slug: string }>;
}

// Server component — category filtering and date formatting happen server-side,
// keeping these computations out of the client JS bundle.
export function PublicHeader({ categories = [] }: PublicHeaderProps) {
  const mainCategories = categories.filter(c => !c.slug.includes('/')).slice(0, 5);

  return <HeaderInteractive mainCategories={mainCategories} />;
}
