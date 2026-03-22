'use client';

import { useMemo } from 'react';
import { sanitizeArticleContent } from '@/lib/security/sanitization';

interface ArticleContentProps {
  content: string;
  images?: Array<{
    url: string;
    alt?: string;
    caption?: string;
  }>;
  videos?: Array<{
    videoId: string;
    title?: string;
    privacyMode?: boolean;
    startTime?: number | null;
  }>;
}

export function ArticleContent({ content, images = [], videos = [] }: ArticleContentProps) {
  // Parse content from TipTap HTML output
  // This component renders the article content with proper styling

  // Create image and video lookup maps
  const imageMap = useMemo(() => {
    const map = new Map<string, typeof images[0]>();
    images.forEach(img => {
      // Extract public_id from Cloudinary URL for matching
      const match = img.url.match(/\/v\d+\/(.+?)(?:\.\w{3,4})(?:$|\?)/);
      if (match) {
        map.set(match[1], img);
      }
    });
    return map;
  }, [images]);

  const videoMap = useMemo(() => {
    const map = new Map<string, typeof videos[0]>();
    videos.forEach(vid => {
      map.set(vid.videoId, vid);
    });
    return map;
  }, [videos]);

  // Optimize HTML by adding loading="lazy" and decoding="async" to images
  const optimizedContent = useMemo(() => {
    if (!content) return content;

    // First, sanitize the content to prevent XSS attacks
    // This removes dangerous tags/scripts while preserving safe HTML and YouTube embeds
    const sanitized = sanitizeArticleContent(content);

    // Then add loading="lazy" and decoding="async" to img tags that don't already have it
    return sanitized.replace(
      /<img(?![^>]*\sloading=)([^>]*)>/gi,
      '<img$1 loading="lazy" decoding="async" fetchpriority="low">'
    );
  }, [content]);

  return (
    <div className="article-content prose prose-lg max-w-none">
      {/* Render HTML content with proper styling */}
      <div
        dangerouslySetInnerHTML={{ __html: optimizedContent }}
        className="space-y-6"
      />

      <style jsx global>{`
        /* ═══════════════════════════════════
           ARTICLE BODY — Editorial Styles
           ═══════════════════════════════════ */

        .article-content {
          direction: rtl;
          text-align: right;
        }

        /* ── Drop cap on first paragraph ── */
        .article-content > div > p:first-of-type::first-letter {
          font-family: var(--font-amiri), 'Times New Roman', serif;
          font-size: 4.2em;
          font-weight: 700;
          color: var(--accent);
          float: right;
          line-height: 0.78;
          margin-inline-end: 0.1em;
          margin-top: 0.08em;
          padding-inline-start: 0.04em;
        }

        /* ── Headings ── */
        .article-content h1 {
          font-family: var(--font-amiri), 'Times New Roman', serif;
          font-size: 2rem;
          font-weight: 700;
          margin-top: 2.5rem;
          margin-bottom: 1rem;
          line-height: 1.3;
          color: var(--foreground);
        }

        .article-content h2 {
          font-family: var(--font-amiri), 'Times New Roman', serif;
          font-size: 1.55rem;
          font-weight: 700;
          margin-top: 2.5rem;
          margin-bottom: 1rem;
          padding-top: 1rem;
          border-top: 2px solid var(--accent-light);
          line-height: 1.35;
          color: var(--foreground);
        }

        .article-content h3 {
          font-family: var(--font-amiri), 'Times New Roman', serif;
          font-size: 1.3rem;
          font-weight: 700;
          margin-top: 2rem;
          margin-bottom: 0.75rem;
          line-height: 1.4;
          color: var(--foreground);
        }

        /* ── Body text ── */
        .article-content p {
          margin-bottom: 1.25rem;
          line-height: 1.9;
          color: var(--foreground);
          opacity: 0.88;
        }

        /* ── Links — amber underline ── */
        .article-content a {
          color: var(--accent);
          text-decoration: underline;
          text-decoration-color: color-mix(in srgb, var(--accent) 40%, transparent);
          text-underline-offset: 3px;
          text-decoration-thickness: 1px;
          transition: text-decoration-color 0.2s, color 0.2s;
        }

        .article-content a:hover {
          color: var(--accent-hover);
          text-decoration-color: var(--accent);
        }

        /* ── Lists ── */
        .article-content ul,
        .article-content ol {
          margin-bottom: 1.25rem;
          padding-inline-start: 1.75rem;
        }

        .article-content li {
          margin-bottom: 0.5rem;
          line-height: 1.8;
          color: var(--foreground);
          opacity: 0.85;
        }

        /* ── Blockquote — amber editorial pull ── */
        .article-content blockquote {
          border-inline-end: 4px solid var(--accent);
          border-inline-start: none;
          padding: 1rem 1.25rem 1rem 1rem;
          padding-inline-end: 1.25rem;
          margin: 2rem 0;
          background: var(--accent-light);
          font-style: italic;
          font-size: 1.1rem;
          line-height: 1.7;
          color: var(--foreground);
          position: relative;
        }

        .article-content blockquote::before {
          content: '❝';
          position: absolute;
          top: -0.1em;
          right: -0.05em;
          font-size: 3rem;
          color: var(--accent);
          opacity: 0.25;
          font-style: normal;
          line-height: 1;
          font-family: Georgia, serif;
        }

        /* ── Inline code ── */
        .article-content code {
          background-color: var(--muted);
          padding: 0.15rem 0.4rem;
          font-size: 0.875em;
          font-family: 'Courier New', monospace;
          direction: ltr;
          display: inline-block;
          border: 1px solid var(--border);
        }

        /* ── Code block ── */
        .article-content pre {
          background-color: var(--foreground);
          color: var(--background);
          padding: 1.25rem;
          overflow-x: auto;
          margin: 2rem 0;
          direction: ltr;
          text-align: left;
          font-size: 0.875rem;
          line-height: 1.6;
        }

        .article-content pre code {
          background-color: transparent;
          padding: 0;
          border: none;
          color: inherit;
        }

        /* ── Images — no border-radius, editorial ── */
        .article-content img {
          max-width: 100%;
          height: auto;
          margin: 2rem 0;
          display: block;
        }

        /* ── Tables ── */
        .article-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 2rem 0;
        }

        .article-content th,
        .article-content td {
          border: 1px solid var(--border);
          padding: 0.75rem;
          text-align: right;
        }

        .article-content th {
          background-color: var(--muted);
          font-weight: 700;
          color: var(--foreground);
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        /* ── Horizontal rule ── */
        .article-content hr {
          border: none;
          margin: 2.5rem 0;
          text-align: center;
          color: var(--accent);
          opacity: 0.5;
        }

        .article-content hr::after {
          content: '· · ·';
          font-size: 1.25rem;
          letter-spacing: 0.4em;
        }

        /* ── YouTube embeds ── */
        .article-content .youtube-wrapper {
          position: relative;
          padding-bottom: 56.25%;
          height: 0;
          overflow: hidden;
          margin: 2rem 0;
        }

        .article-content .youtube-wrapper iframe {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: none;
        }

        /* ── Figures ── */
        .article-content figure {
          margin: 2rem 0;
        }

        .article-content figcaption {
          text-align: center;
          font-size: 0.8rem;
          color: var(--muted-foreground);
          margin-top: 0.6rem;
          font-style: italic;
        }

        /* ── Strong / em ── */
        .article-content strong {
          font-weight: 700;
          color: var(--foreground);
        }

        .article-content em {
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
