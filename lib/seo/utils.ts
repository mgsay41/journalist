// SEO Utility Functions

/**
 * Count words in text (supports Arabic and English)
 */
export function countWords(text: string): number {
  if (!text) return 0;

  // Remove HTML tags
  const strippedText = stripHtml(text);

  // Split by whitespace and filter empty strings
  const words = strippedText.split(/\s+/).filter(word => word.length > 0);

  return words.length;
}

/**
 * Strip HTML tags from text
 */
export function stripHtml(html: string): string {
  if (!html) return '';

  return html
    .replace(/<[^>]*>/g, ' ') // Remove HTML tags
    .replace(/&nbsp;/g, ' ')  // Replace &nbsp;
    .replace(/&[a-z]+;/gi, ' ') // Replace other HTML entities
    .replace(/\s+/g, ' ')     // Normalize whitespace
    .trim();
}

/**
 * Count sentences in text
 */
export function countSentences(text: string): number {
  if (!text) return 0;

  const strippedText = stripHtml(text);

  // Match sentence endings (., !, ?, Arabic question mark ؟)
  const sentences = strippedText.split(/[.!?؟]+/).filter(s => s.trim().length > 0);

  return sentences.length;
}

/**
 * Count paragraphs in HTML content
 */
export function countParagraphs(html: string): number {
  if (!html) return 0;

  // Count <p> tags
  const matches = html.match(/<p[^>]*>/gi);
  return matches ? matches.length : 0;
}

/**
 * Extract headings from HTML content
 */
export function extractHeadings(html: string): { level: number; text: string }[] {
  if (!html) return [];

  const headings: { level: number; text: string }[] = [];
  const regex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gi;

  let match;
  while ((match = regex.exec(html)) !== null) {
    headings.push({
      level: parseInt(match[1], 10),
      text: stripHtml(match[2]),
    });
  }

  return headings;
}

/**
 * Count heading tags by level
 */
export function countHeadings(html: string): Record<string, number> {
  const headings = extractHeadings(html);

  const counts: Record<string, number> = {
    h1: 0,
    h2: 0,
    h3: 0,
    h4: 0,
    h5: 0,
    h6: 0,
  };

  headings.forEach(h => {
    counts[`h${h.level}`]++;
  });

  return counts;
}

/**
 * Extract links from HTML content
 */
export function extractLinks(html: string, baseUrl?: string): { href: string; text: string; isInternal: boolean }[] {
  if (!html) return [];

  const links: { href: string; text: string; isInternal: boolean }[] = [];
  const regex = /<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi;

  let match;
  while ((match = regex.exec(html)) !== null) {
    const href = match[1];
    const text = stripHtml(match[2]);

    // Determine if link is internal or external
    const isInternal = !href.startsWith('http') ||
      (baseUrl && href.startsWith(baseUrl)) ||
      href.startsWith('/') ||
      href.startsWith('#');

    links.push({ href, text, isInternal });
  }

  return links;
}

/**
 * Count internal and external links
 */
export function countLinks(html: string, baseUrl?: string): { internal: number; external: number } {
  const links = extractLinks(html, baseUrl);

  return {
    internal: links.filter(l => l.isInternal).length,
    external: links.filter(l => !l.isInternal).length,
  };
}

/**
 * Extract images from HTML content
 */
export function extractImages(html: string): { src: string; alt: string; hasAlt: boolean }[] {
  if (!html) return [];

  const images: { src: string; alt: string; hasAlt: boolean }[] = [];
  const regex = /<img[^>]*src=["']([^"']*)["'][^>]*(?:alt=["']([^"']*)["'])?[^>]*>/gi;

  let match;
  while ((match = regex.exec(html)) !== null) {
    const src = match[1];
    const alt = match[2] || '';

    images.push({
      src,
      alt,
      hasAlt: alt.trim().length > 0,
    });
  }

  // Also check for alt before src pattern
  const regex2 = /<img[^>]*alt=["']([^"']*)["'][^>]*src=["']([^"']*)["'][^>]*>/gi;
  while ((match = regex2.exec(html)) !== null) {
    const alt = match[1] || '';
    const src = match[2];

    // Skip if already found
    if (!images.some(img => img.src === src)) {
      images.push({
        src,
        alt,
        hasAlt: alt.trim().length > 0,
      });
    }
  }

  return images;
}

/**
 * Calculate keyword density
 */
export function calculateKeywordDensity(text: string, keyword: string): number {
  if (!text || !keyword) return 0;

  const strippedText = stripHtml(text).toLowerCase();
  const keywordLower = keyword.toLowerCase().trim();

  const wordCount = countWords(strippedText);
  if (wordCount === 0) return 0;

  // Count keyword occurrences
  const regex = new RegExp(keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  const matches = strippedText.match(regex);
  const keywordCount = matches ? matches.length : 0;

  // Calculate density as percentage
  return (keywordCount / wordCount) * 100;
}

/**
 * Check if keyword appears in text
 */
export function keywordExists(text: string, keyword: string): boolean {
  if (!text || !keyword) return false;

  const strippedText = stripHtml(text).toLowerCase();
  const keywordLower = keyword.toLowerCase().trim();

  return strippedText.includes(keywordLower);
}

/**
 * Get first paragraph text
 */
export function getFirstParagraph(html: string): string {
  if (!html) return '';

  const match = html.match(/<p[^>]*>(.*?)<\/p>/i);
  return match ? stripHtml(match[1]) : '';
}

/**
 * Calculate average sentence length
 */
export function getAverageSentenceLength(text: string): number {
  const strippedText = stripHtml(text);
  const wordCount = countWords(strippedText);
  const sentenceCount = countSentences(strippedText);

  if (sentenceCount === 0) return 0;

  return wordCount / sentenceCount;
}

/**
 * Calculate readability score (simplified)
 * Returns a score from 0-100 where higher is more readable
 */
export function calculateReadabilityScore(text: string): number {
  const strippedText = stripHtml(text);
  const wordCount = countWords(strippedText);
  const sentenceCount = countSentences(strippedText);

  if (wordCount === 0 || sentenceCount === 0) return 0;

  const avgSentenceLength = wordCount / sentenceCount;

  // Penalize very long or very short sentences
  let score = 100;

  // Ideal average sentence length is 15-20 words
  if (avgSentenceLength < 10) {
    score -= (10 - avgSentenceLength) * 3;
  } else if (avgSentenceLength > 25) {
    score -= (avgSentenceLength - 25) * 4;
  } else if (avgSentenceLength > 20) {
    score -= (avgSentenceLength - 20) * 2;
  }

  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Generate slug recommendation from title
 */
export function generateSlugRecommendation(title: string): string {
  if (!title) return '';

  return title
    .toLowerCase()
    .trim()
    // Convert Arabic characters to transliterated form (simplified)
    .replace(/[\u0600-\u06FF]/g, char => {
      const arabicToLatin: Record<string, string> = {
        'ا': 'a', 'أ': 'a', 'إ': 'e', 'آ': 'a',
        'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j',
        'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'th',
        'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sh',
        'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z',
        'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'q',
        'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n',
        'ه': 'h', 'و': 'w', 'ي': 'y', 'ى': 'a',
        'ة': 'h', 'ء': '', 'ئ': 'e', 'ؤ': 'o',
      };
      return arabicToLatin[char] || char;
    })
    .replace(/[^\w\s-]/g, '') // Remove non-word chars
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/-+/g, '-')      // Replace multiple hyphens
    .replace(/^-|-$/g, '');   // Trim hyphens from ends
}
