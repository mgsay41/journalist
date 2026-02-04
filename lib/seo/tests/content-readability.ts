/**
 * Content Readability Tests
 * Advanced content structure analysis based on RankMath criteria
 */

import { CriterionStatus, SeoCriterion, SEO_THRESHOLDS } from '../types';
import { hasTableOfContents, findLongParagraphs } from '../arabic-words';
import { countWords, stripHtml } from '../utils';

/**
 * Analyze content readability factors
 */
export function analyzeContentReadability(
  content: string,
  imageCount: number = 0,
  videoCount: number = 0
): SeoCriterion[] {
  const criteria: SeoCriterion[] = [];

  // 1. Table of Contents
  criteria.push(analyzeTableOfContents(content));

  // 2. Paragraph length
  criteria.push(analyzeParagraphLength(content));

  // 3. Media presence (images + videos)
  criteria.push(analyzeMediaPresence(content, imageCount, videoCount));

  return criteria;
}

/**
 * Check for Table of Contents in long articles
 */
function analyzeTableOfContents(content: string): SeoCriterion {
  const wordCount = countWords(content);
  const hasToc = hasTableOfContents(content);

  // TOC is only important for longer articles (1000+ words)
  const needsToc = wordCount >= 1000;

  let status: CriterionStatus = 'passed';
  let score = 5;
  const maxScore = 5;

  if (needsToc && !hasToc) {
    status = 'warning';
    score = 2;
  } else if (!needsToc) {
    // Short articles don't need TOC, give full score
    status = 'passed';
    score = maxScore;
  }

  return {
    id: 'table-of-contents',
    name: 'Table of Contents',
    nameAr: 'جدول المحتويات',
    description: 'Long articles should have a table of contents for navigation',
    descriptionAr: 'المقالات الطويلة يجب أن تحتوي على جدول محتويات للتنقل',
    weight: 5,
    status,
    score,
    maxScore,
    value: hasToc ? 'موجود' : needsToc ? 'غير موجود' : 'غير مطلوب',
    recommendation:
      needsToc && !hasToc
        ? 'Add a table of contents to help readers navigate your long article'
        : undefined,
    recommendationAr:
      needsToc && !hasToc
        ? 'أضف جدول محتويات لمساعدة القراء في التنقل في مقالك الطويل'
        : undefined,
  };
}

/**
 * Check for long paragraphs (>120 words)
 */
function analyzeParagraphLength(content: string): SeoCriterion {
  const longParagraphs = findLongParagraphs(content, 120);

  let status: CriterionStatus = 'passed';
  let score = 5;
  const maxScore = 5;

  if (longParagraphs.count > 2) {
    status = 'failed';
    score = 1;
  } else if (longParagraphs.count > 0) {
    status = 'warning';
    score = 3;
  }

  return {
    id: 'paragraph-length',
    name: 'Short Paragraphs',
    nameAr: 'فقرات قصيرة',
    description: 'Keep paragraphs under 120 words for better readability',
    descriptionAr: 'اجعل الفقرات أقل من 120 كلمة لسهولة القراءة',
    weight: 5,
    status,
    score,
    maxScore,
    value:
      longParagraphs.count === 0
        ? 'جميع الفقرات مناسبة'
        : `${longParagraphs.count} فقرة طويلة`,
    recommendation:
      longParagraphs.count > 0
        ? `Break up ${longParagraphs.count} long paragraph(s) into smaller, easier-to-read chunks`
        : undefined,
    recommendationAr:
      longParagraphs.count > 0
        ? `قسّم ${longParagraphs.count} فقرة طويلة إلى أجزاء أصغر سهلة القراءة`
        : undefined,
  };
}

/**
 * Check for sufficient media (images + videos)
 * Minimum: 4 media items for good score
 */
function analyzeMediaPresence(
  content: string,
  imageCount: number,
  videoCount: number
): SeoCriterion {
  // Count images in content HTML
  const contentImages = (content.match(/<img/gi) || []).length;
  // Count embedded videos
  const contentVideos = (
    content.match(/<iframe|<video|youtube|vimeo/gi) || []
  ).length;

  const totalMedia = imageCount + videoCount + contentImages + contentVideos;
  const minMedia = 4;

  let status: CriterionStatus = 'failed';
  let score = 0;
  const maxScore = 5;

  if (totalMedia >= minMedia) {
    status = 'passed';
    score = maxScore;
  } else if (totalMedia >= 2) {
    status = 'warning';
    score = 3;
  } else if (totalMedia >= 1) {
    status = 'warning';
    score = 2;
  }

  return {
    id: 'media-presence',
    name: 'Media Presence',
    nameAr: 'وجود الوسائط',
    description: `Include at least ${minMedia} images or videos in your content`,
    descriptionAr: `أضف ${minMedia} صور أو فيديوهات على الأقل في المحتوى`,
    weight: 5,
    status,
    score,
    maxScore,
    value: `${totalMedia} وسائط (${imageCount + contentImages} صور، ${videoCount + contentVideos} فيديو)`,
    recommendation:
      totalMedia < minMedia
        ? `Add ${minMedia - totalMedia} more images or videos to enhance engagement`
        : undefined,
    recommendationAr:
      totalMedia < minMedia
        ? `أضف ${minMedia - totalMedia} صور أو فيديوهات إضافية لزيادة التفاعل`
        : undefined,
  };
}

/**
 * Analyze keyword in subheadings (H2/H3)
 */
export function analyzeKeywordInSubheadings(
  content: string,
  focusKeyword: string
): SeoCriterion {
  if (!focusKeyword) {
    return {
      id: 'keyword-in-subheadings',
      name: 'Keyword in Subheadings',
      nameAr: 'الكلمة المفتاحية في العناوين الفرعية',
      description: 'Focus keyword should appear in H2 or H3 headings',
      descriptionAr: 'يجب أن تظهر الكلمة المفتاحية في عناوين H2 أو H3',
      weight: 5,
      status: 'warning',
      score: 0,
      maxScore: 5,
      value: 'لا توجد كلمة مفتاحية',
    };
  }

  // Extract H2 and H3 headings
  const h2Matches = content.match(/<h2[^>]*>(.*?)<\/h2>/gi) || [];
  const h3Matches = content.match(/<h3[^>]*>(.*?)<\/h3>/gi) || [];
  const allHeadings = [...h2Matches, ...h3Matches];

  const keywordLower = focusKeyword.toLowerCase();
  const headingsWithKeyword = allHeadings.filter((heading) => {
    const text = stripHtml(heading).toLowerCase();
    return text.includes(keywordLower);
  });

  const hasKeywordInHeadings = headingsWithKeyword.length > 0;

  return {
    id: 'keyword-in-subheadings',
    name: 'Keyword in Subheadings',
    nameAr: 'الكلمة المفتاحية في العناوين الفرعية',
    description: 'Focus keyword should appear in H2 or H3 headings',
    descriptionAr: 'يجب أن تظهر الكلمة المفتاحية في عناوين H2 أو H3',
    weight: 5,
    status: hasKeywordInHeadings ? 'passed' : 'warning',
    score: hasKeywordInHeadings ? 5 : 2,
    maxScore: 5,
    value: hasKeywordInHeadings
      ? `${headingsWithKeyword.length} عناوين`
      : 'لا يوجد',
    recommendation: !hasKeywordInHeadings
      ? 'Add your focus keyword to at least one H2 or H3 heading'
      : undefined,
    recommendationAr: !hasKeywordInHeadings
      ? 'أضف الكلمة المفتاحية لعنوان H2 أو H3 واحد على الأقل'
      : undefined,
  };
}

/**
 * Check URL length (max 75 characters)
 */
export function analyzeUrlLength(slug?: string): SeoCriterion {
  const maxLength = 75;
  const length = slug?.length || 0;

  let status: CriterionStatus = 'passed';
  let score = 3;
  const maxScore = 3;

  if (length > maxLength) {
    status = 'warning';
    score = 1;
  } else if (length === 0) {
    status = 'warning';
    score = 1;
  }

  return {
    id: 'url-length',
    name: 'URL Length',
    nameAr: 'طول الرابط',
    description: `URL should be under ${maxLength} characters`,
    descriptionAr: `يجب أن يكون الرابط أقل من ${maxLength} حرف`,
    weight: 3,
    status,
    score,
    maxScore,
    value: `${length} حرف`,
    recommendation:
      length > maxLength
        ? `Shorten your URL by ${length - maxLength} characters`
        : undefined,
    recommendationAr:
      length > maxLength
        ? `اختصر الرابط بـ ${length - maxLength} حرف`
        : undefined,
  };
}

/**
 * Check keyword density warning (>2.5% is over-optimization)
 */
export function analyzeKeywordDensityWarning(
  content: string,
  focusKeyword: string
): {
  isOverOptimized: boolean;
  density: number;
} {
  if (!focusKeyword || !content) {
    return { isOverOptimized: false, density: 0 };
  }

  const plainText = stripHtml(content).toLowerCase();
  const keywordLower = focusKeyword.toLowerCase();
  const words = plainText.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  if (wordCount === 0) {
    return { isOverOptimized: false, density: 0 };
  }

  // Count keyword occurrences
  const regex = new RegExp(keywordLower, 'gi');
  const matches = plainText.match(regex) || [];
  const keywordCount = matches.length;

  const density = (keywordCount / wordCount) * 100;

  return {
    isOverOptimized: density > 2.5,
    density: Number(density.toFixed(2)),
  };
}

// Total possible score for content readability: 15 points
export const CONTENT_READABILITY_MAX_SCORE = 15;
