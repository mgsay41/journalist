import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSiteSettings } from '@/lib/settings/getSiteSettings';

/**
 * GET /feed.xml
 * RSS/Atom feed for all published articles
 */
export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://localhost:3000';

  const [siteSettings, articles] = await Promise.all([
    getSiteSettings(),
    prisma.article.findMany({
      where: {
        status: 'published',
        publishedAt: { lte: new Date() },
      },
      select: {
        title: true,
        slug: true,
        excerpt: true,
        metaDescription: true,
        publishedAt: true,
        updatedAt: true,
        author: { select: { name: true } },
        categories: { select: { name: true } },
        featuredImage: { select: { url: true, altText: true } },
      },
      orderBy: { publishedAt: 'desc' },
      take: 50,
    }),
  ]);

  const siteName = siteSettings.siteName;
  const siteDescription = siteSettings.siteTagline || 'آخر الأخبار والمقالات';
  const buildDate = new Date().toUTCString();

  const items = articles
    .map((article) => {
      const url = `${baseUrl}/article/${article.slug}`;
      const description = article.excerpt || article.metaDescription || '';
      const pubDate = article.publishedAt!.toUTCString();
      const category = article.categories[0]?.name || '';

      return `
    <item>
      <title><![CDATA[${article.title}]]></title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description><![CDATA[${description}]]></description>
      <pubDate>${pubDate}</pubDate>
      <dc:creator><![CDATA[${article.author?.name || ''}]]></dc:creator>
      ${category ? `<category><![CDATA[${category}]]></category>` : ''}
      ${article.featuredImage ? `<enclosure url="${article.featuredImage.url}" type="image/jpeg" length="0"/>` : ''}
    </item>`;
    })
    .join('');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title><![CDATA[${siteName}]]></title>
    <link>${baseUrl}</link>
    <description><![CDATA[${siteDescription}]]></description>
    <language>ar</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${baseUrl}/logo.png</url>
      <title><![CDATA[${siteName}]]></title>
      <link>${baseUrl}</link>
    </image>
    ${items}
  </channel>
</rss>`;

  return new NextResponse(rss, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
