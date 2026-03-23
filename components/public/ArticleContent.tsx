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
      '<img$1 loading="lazy" decoding="async" fetchpriority="low" style="max-width:100%;height:auto;">'
    );
  }, [content]);

  return (
    <div className="article-content prose prose-lg max-w-none">
      {/* Render HTML content with proper styling */}
      <div
        dangerouslySetInnerHTML={{ __html: optimizedContent }}
        className="space-y-6"
      />
    </div>
  );
}
