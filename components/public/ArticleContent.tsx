'use client';

import { useMemo } from 'react';

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

    // Add loading="lazy" and decoding="async" to img tags that don't already have it
    return content.replace(
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
        /* Article content styling */
        .article-content {
          direction: rtl;
          text-align: right;
        }

        .article-content h1 {
          font-size: 2rem;
          font-weight: 700;
          margin-top: 2rem;
          margin-bottom: 1rem;
          line-height: 1.3;
          color: var(--foreground);
        }

        .article-content h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-top: 2rem;
          margin-bottom: 1rem;
          line-height: 1.4;
          color: var(--foreground);
        }

        .article-content h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          line-height: 1.4;
          color: var(--foreground);
        }

        .article-content p {
          margin-bottom: 1rem;
          line-height: 1.8;
          color: var(--muted-foreground);
        }

        .article-content a {
          color: var(--foreground);
          text-decoration: underline;
          text-underline-offset: 2px;
          transition: color 0.2s;
        }

        .article-content a:hover {
          color: var(--foreground/80);
        }

        .article-content ul,
        .article-content ol {
          margin-bottom: 1rem;
          padding-right: 2rem;
        }

        .article-content li {
          margin-bottom: 0.5rem;
          line-height: 1.7;
          color: var(--muted-foreground);
        }

        .article-content blockquote {
          border-right: 4px solid var(--border);
          padding: 1rem 1.5rem;
          margin: 1.5rem 0;
          background-color: var(--muted);
          font-style: italic;
          color: var(--muted-foreground);
        }

        .article-content code {
          background-color: var(--muted);
          padding: 0.2rem 0.4rem;
          border-radius: 0.25rem;
          font-size: 0.875em;
          font-family: monospace;
          direction: ltr;
          display: inline-block;
        }

        .article-content pre {
          background-color: var(--muted);
          padding: 1rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          margin: 1.5rem 0;
          direction: ltr;
          text-align: left;
        }

        .article-content pre code {
          background-color: transparent;
          padding: 0;
        }

        .article-content img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 1.5rem 0;
        }

        .article-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.5rem 0;
        }

        .article-content th,
        .article-content td {
          border: 1px solid var(--border);
          padding: 0.75rem;
          text-align: right;
        }

        .article-content th {
          background-color: var(--muted);
          font-weight: 600;
        }

        .article-content hr {
          border: none;
          border-top: 1px solid var(--border);
          margin: 2rem 0;
        }

        /* YouTube embed styling */
        .article-content .youtube-wrapper {
          position: relative;
          padding-bottom: 56.25%; /* 16:9 aspect ratio */
          height: 0;
          overflow: hidden;
          border-radius: 0.5rem;
          margin: 1.5rem 0;
        }

        .article-content .youtube-wrapper iframe {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: none;
        }

        /* Figure and figcaption styling */
        .article-content figure {
          margin: 1.5rem 0;
        }

        .article-content figcaption {
          text-align: center;
          font-size: 0.875rem;
          color: var(--muted-foreground);
          margin-top: 0.5rem;
        }

        /* Strong and emphasis */
        .article-content strong {
          font-weight: 600;
          color: var(--foreground);
        }

        .article-content em {
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
