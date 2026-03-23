/**
 * SEO Metadata Generation Utilities
 *
 * Provides utilities for generating:
 * - Meta tags
 * - Open Graph tags
 * - Twitter Card tags
 * - Canonical URLs
 */

interface MetadataProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  siteName?: string;
  locale?: string;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  tags?: string[];
}

/**
 * Generate full metadata object for Next.js metadata API
 */
export function generateMetadata({
  title,
  description,
  image,
  url,
  type = 'website',
  siteName = 'موقعي',
  locale = 'ar_SA',
  author,
  publishedTime,
  modifiedTime,
  section,
  tags,
}: MetadataProps) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://localhost:3000';
  const defaultTitle = 'موقعي - مدونة إخبارية';
  const defaultDescription = 'مدونة إخبارية باللغة العربية تغطي أحدث الأحداث';

  const fullTitle = title ? `${title} | ${siteName}` : defaultTitle;
  const fullUrl = url ? `${baseUrl}${url}` : baseUrl;
  const fullImage = image ? `${baseUrl}${image}` : `${baseUrl}/og-image.jpg`;

  const metadata: Record<string, unknown> = {
    title: fullTitle,
    description: description || defaultDescription,

    // Canonical URL
    alternates: {
      canonical: fullUrl,
    },

    // Open Graph
    openGraph: {
      type,
      locale,
      url: fullUrl,
      title: fullTitle,
      description: description || defaultDescription,
      siteName,
      images: [
        {
          url: fullImage,
          width: 1200,
          height: 630,
          alt: title || siteName,
        },
      ],
    },

    // Twitter Card
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: description || defaultDescription,
      images: [fullImage],
    },

    // Additional meta tags
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };

  // Article-specific metadata
  if (type === 'article') {
    const og = metadata.openGraph as Record<string, unknown>;
    og.publishedTime = publishedTime;
    og.modifiedTime = modifiedTime;
    og.authors = author ? [author] : undefined;
    og.section = section;
    og.tags = tags;

    metadata.article = {
      publishedTime,
      modifiedTime,
      authors: author ? [author] : undefined,
      section,
      tags,
    };
  }

  // Author meta tag
  if (author) {
    metadata.authors = [author];
  }

  return metadata;
}

/**
 * Generate JSON-LD structured data for Article
 */
export function generateArticleJsonLd({
  title,
  description,
  image,
  url,
  authorName,
  publishedTime,
  modifiedTime,
  section,
  siteName = 'موقعي',
}: {
  title: string;
  description?: string;
  image?: string;
  url: string;
  authorName: string;
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  siteName?: string;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://localhost:3000';
  const fullUrl = `${baseUrl}${url}`;
  const fullImage = image ? `${baseUrl}${image}` : `${baseUrl}/og-image.jpg`;

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: description || title,
    image: fullImage,
    url: fullUrl,
    datePublished: publishedTime || new Date().toISOString(),
    dateModified: modifiedTime || new Date().toISOString(),
    author: {
      '@type': 'Person',
      name: authorName,
    },
    publisher: {
      '@type': 'Organization',
      name: siteName,
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': fullUrl,
    },
  };

  if (section) {
    jsonLd.articleSection = section;
  }

  return JSON.stringify(jsonLd);
}

/**
 * Generate JSON-LD structured data for Breadcrumb
 */
export function generateBreadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://localhost:3000';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${baseUrl}${item.url}`,
    })),
  };

  return JSON.stringify(jsonLd);
}

/**
 * Generate JSON-LD structured data for Organization
 */
export function generateOrganizationJsonLd({
  name,
  url,
  logo,
  description,
  sameAs,
}: {
  name: string;
  url?: string;
  logo?: string;
  description?: string;
  sameAs?: string[];
}) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://localhost:3000';
  const fullUrl = url || baseUrl;
  const fullLogo = logo || `${baseUrl}/logo.png`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    url: fullUrl,
    logo: fullLogo,
    description,
    sameAs: sameAs || [],
  };

  return JSON.stringify(jsonLd);
}

/**
 * Generate JSON-LD structured data for Person (Author)
 */
export function generatePersonJsonLd({
  name,
  url,
  image,
  description,
  sameAs,
}: {
  name: string;
  url?: string;
  image?: string;
  description?: string;
  sameAs?: string[];
}) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://localhost:3000';
  const fullUrl = url ? `${baseUrl}${url}` : baseUrl;
  const fullImage = image || `${baseUrl}/author-avatar.jpg`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    url: fullUrl,
    image: fullImage,
    description,
    sameAs: sameAs || [],
  };

  return JSON.stringify(jsonLd);
}

/**
 * Generate JSON-LD structured data for WebSite
 */
export function generateWebSiteJsonLd({
  name,
  url,
  description,
}: {
  name: string;
  url?: string;
  description?: string;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://localhost:3000';
  const fullUrl = url || baseUrl;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name,
    url: fullUrl,
    description,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${baseUrl}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  return JSON.stringify(jsonLd);
}

/**
 * Get absolute URL for a path
 */
export function getAbsoluteUrl(path: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://localhost:3000';
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Truncate text for meta descriptions
 */
export function truncateForMeta(text: string, maxLength: number = 160): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3).trim() + '...';
}

/**
 * Format date for ISO 8601
 */
export function formatDateForISO(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toISOString();
}
