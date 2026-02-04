import Link from 'next/link';

interface PublicFooterProps {
  categories?: Array<{ id: string; name: string; slug: string }>;
  popularTags?: Array<{ id: string; name: string; slug: string }>;
}

export function PublicFooter({ categories = [], popularTags = [] }: PublicFooterProps) {
  const currentYear = new Date().getFullYear();

  const mainCategories = categories.filter(c => !c.slug.includes('/')).slice(0, 6);

  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About Section */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">الموقع الصحفي</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              منصة عربية متكاملة للمحتوى الصحفي، توفر مقالات عالية الجودة في مختلف المجالات.
            </p>
          </div>

          {/* Categories */}
          {mainCategories.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">الأقسام</h3>
              <ul className="space-y-2">
                {mainCategories.map((category) => (
                  <li key={category.id}>
                    <Link
                      href={`/category/${category.slug}`}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Popular Tags */}
          {popularTags && popularTags.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">الوسوم الشائعة</h3>
              <div className="flex flex-wrap gap-2">
                {popularTags.slice(0, 9).map((tag) => (
                  <Link
                    key={tag.id}
                    href={`/tag/${tag.slug}`}
                    className="text-xs px-3 py-1.5 border border-border rounded-full text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                  >
                    {tag.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © {currentYear} الموقع الصحفي. جميع الحقوق محفوظة.
            </p>
            <div className="flex gap-6">
              <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                عن الموقع
              </Link>
              <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                اتصل بنا
              </Link>
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                سياسة الخصوصية
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
