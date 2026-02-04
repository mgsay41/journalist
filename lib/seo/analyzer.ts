// SEO Analyzer - Main scoring algorithm

import {
  ArticleContent,
  CriterionStatus,
  SCORE_THRESHOLDS,
  SEO_THRESHOLDS,
  SEO_WEIGHTS,
  SeoAnalysisResult,
  SeoCategory,
  SeoCriterion,
  SeoSuggestion,
} from './types';
import {
  calculateKeywordDensity,
  calculateReadabilityScore,
  countHeadings,
  countLinks,
  countWords,
  extractImages,
  getFirstParagraph,
  keywordExists,
  stripHtml,
} from './utils';
import {
  analyzeTitleReadability,
  analyzeContentReadability,
  analyzeKeywordInSubheadings,
  analyzeUrlLength,
} from './tests';

/**
 * Analyze article content and generate SEO score
 */
export function analyzeArticle(article: ArticleContent): SeoAnalysisResult {
  const criteria: SeoCriterion[] = [];
  const suggestions: SeoSuggestion[] = [];

  // 1. Title analysis
  const titleCriteria = analyzeTitleLength(article.title, article.metaTitle);
  criteria.push(titleCriteria);
  if (titleCriteria.status !== 'passed') {
    suggestions.push(generateSuggestion(titleCriteria, 'high'));
  }

  // 2. Meta description analysis
  const metaDescCriteria = analyzeMetaDescription(article.metaDescription || article.excerpt);
  criteria.push(metaDescCriteria);
  if (metaDescCriteria.status !== 'passed') {
    suggestions.push(generateSuggestion(metaDescCriteria, metaDescCriteria.status === 'failed' ? 'high' : 'medium'));
  }

  // 3. Word count analysis
  const wordCountCriteria = analyzeWordCount(article.content);
  criteria.push(wordCountCriteria);
  if (wordCountCriteria.status !== 'passed') {
    suggestions.push(generateSuggestion(wordCountCriteria, 'high'));
  }

  // 4. Heading structure analysis
  const headingCriteria = analyzeHeadings(article.content);
  criteria.push(...headingCriteria);
  headingCriteria.forEach(c => {
    if (c.status !== 'passed') {
      suggestions.push(generateSuggestion(c, 'medium'));
    }
  });

  // 5. Image analysis
  const imageCriteria = analyzeImages(article.content, article.hasFeaturedImage, article.imageCount, article.imagesWithAlt);
  criteria.push(...imageCriteria);
  imageCriteria.forEach(c => {
    if (c.status !== 'passed') {
      suggestions.push(generateSuggestion(c, c.id === 'featured-image' ? 'high' : 'medium'));
    }
  });

  // 6. Link analysis
  const linkCriteria = analyzeLinks(article.content);
  criteria.push(...linkCriteria);
  linkCriteria.forEach(c => {
    if (c.status !== 'passed') {
      suggestions.push(generateSuggestion(c, 'low'));
    }
  });

  // 7. Keyword analysis (if focus keyword provided)
  if (article.focusKeyword) {
    const keywordCriteria = analyzeKeyword(article);
    criteria.push(...keywordCriteria);
    keywordCriteria.forEach(c => {
      if (c.status !== 'passed') {
        suggestions.push(generateSuggestion(c, 'medium'));
      }
    });
  }

  // 8. Readability analysis
  const readabilityCriteria = analyzeReadability(article.content);
  criteria.push(readabilityCriteria);
  if (readabilityCriteria.status !== 'passed') {
    suggestions.push(generateSuggestion(readabilityCriteria, 'low'));
  }

  // 9. Slug analysis
  const slugCriteria = analyzeSlug(article.slug);
  criteria.push(slugCriteria);
  if (slugCriteria.status !== 'passed') {
    suggestions.push(generateSuggestion(slugCriteria, 'medium'));
  }

  // 10. URL length analysis
  const urlLengthCriteria = analyzeUrlLength(article.slug);
  criteria.push(urlLengthCriteria);
  if (urlLengthCriteria.status !== 'passed') {
    suggestions.push(generateSuggestion(urlLengthCriteria, 'low'));
  }

  // 11. Title readability analysis (power words, sentiment, numbers)
  const titleReadabilityCriteria = analyzeTitleReadability(
    article.metaTitle || article.title,
    article.focusKeyword
  );
  criteria.push(...titleReadabilityCriteria);
  titleReadabilityCriteria.forEach(c => {
    if (c.status !== 'passed') {
      suggestions.push(generateSuggestion(c, 'low'));
    }
  });

  // 12. Content readability analysis (TOC, paragraph length, media)
  const contentReadabilityCriteria = analyzeContentReadability(
    article.content,
    article.imageCount,
    0 // video count - can be extended
  );
  criteria.push(...contentReadabilityCriteria);
  contentReadabilityCriteria.forEach(c => {
    if (c.status !== 'passed') {
      suggestions.push(generateSuggestion(c, 'medium'));
    }
  });

  // 13. Keyword in subheadings (if focus keyword provided)
  if (article.focusKeyword) {
    const keywordSubheadingsCriteria = analyzeKeywordInSubheadings(
      article.content,
      article.focusKeyword
    );
    criteria.push(keywordSubheadingsCriteria);
    if (keywordSubheadingsCriteria.status !== 'passed') {
      suggestions.push(generateSuggestion(keywordSubheadingsCriteria, 'medium'));
    }
  }

  // Calculate total score
  const totalScore = criteria.reduce((sum, c) => sum + c.score, 0);
  const maxScore = criteria.reduce((sum, c) => sum + c.maxScore, 0);
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  // Determine overall status
  let status: 'good' | 'needs-improvement' | 'poor' = 'poor';
  if (percentage >= SCORE_THRESHOLDS.good) {
    status = 'good';
  } else if (percentage >= SCORE_THRESHOLDS.needsImprovement) {
    status = 'needs-improvement';
  }

  // Group criteria by category
  const categories = groupCriteriaByCategory(criteria);

  // Sort suggestions by priority
  suggestions.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return {
    score: totalScore,
    maxScore,
    percentage,
    status,
    categories,
    criteria,
    suggestions,
    analyzedAt: new Date(),
  };
}

/**
 * Analyze title length
 * Part of Basic SEO - contributes to content quality assessment
 */
function analyzeTitleLength(title: string, metaTitle?: string): SeoCriterion {
  const titleToCheck = metaTitle || title;
  const length = titleToCheck?.length || 0;
  const { minLength, maxLength, optimalMin, optimalMax } = SEO_THRESHOLDS.title;

  let status: CriterionStatus = 'failed';
  let score = 0;
  // Title length is part of the overall assessment, using 5 points (part of basic SEO)
  const maxScore = 5;

  if (length >= optimalMin && length <= optimalMax) {
    status = 'passed';
    score = maxScore;
  } else if (length >= minLength && length <= maxLength) {
    status = 'warning';
    score = Math.round(maxScore * 0.7);
  } else if (length > 0 && length < minLength) {
    status = 'warning';
    score = Math.round(maxScore * 0.4);
  }

  return {
    id: 'title-length',
    name: 'Title Length',
    nameAr: 'طول العنوان',
    description: `Title should be ${minLength}-${maxLength} characters (optimal: ${optimalMin}-${optimalMax})`,
    descriptionAr: `يجب أن يكون العنوان بين ${minLength}-${maxLength} حرف (الأمثل: ${optimalMin}-${optimalMax})`,
    weight: 15,
    status,
    score,
    maxScore,
    value: length,
    recommendation: length < minLength
      ? 'Add more words to your title to reach the optimal length'
      : length > maxLength
        ? 'Shorten your title for better display in search results'
        : undefined,
    recommendationAr: length < minLength
      ? 'أضف المزيد من الكلمات للعنوان للوصول للطول الأمثل'
      : length > maxLength
        ? 'اختصر العنوان لعرض أفضل في نتائج البحث'
        : undefined,
  };
}

/**
 * Analyze meta description
 * Part of Basic SEO assessment
 */
function analyzeMetaDescription(metaDescription?: string): SeoCriterion {
  const length = metaDescription?.length || 0;
  const { minLength, maxLength, optimalMin, optimalMax } = SEO_THRESHOLDS.metaDescription;

  let status: CriterionStatus = 'failed';
  let score = 0;
  // Meta description quality - 5 points
  const maxScore = 5;

  if (length >= optimalMin && length <= optimalMax) {
    status = 'passed';
    score = maxScore;
  } else if (length >= minLength && length <= maxLength) {
    status = 'warning';
    score = Math.round(maxScore * 0.7);
  } else if (length > 0 && length < minLength) {
    status = 'warning';
    score = Math.round(maxScore * 0.4);
  }

  return {
    id: 'meta-description',
    name: 'Meta Description',
    nameAr: 'الوصف الموجز',
    description: `Meta description should be ${minLength}-${maxLength} characters`,
    descriptionAr: `يجب أن يكون الوصف الموجز بين ${minLength}-${maxLength} حرف`,
    weight: 15,
    status,
    score,
    maxScore,
    value: length,
    recommendation: !metaDescription
      ? 'Add a meta description to improve click-through rates'
      : length < minLength
        ? 'Expand your meta description with more detail'
        : length > maxLength
          ? 'Shorten your meta description to prevent truncation'
          : undefined,
    recommendationAr: !metaDescription
      ? 'أضف وصفاً موجزاً لتحسين معدل النقر'
      : length < minLength
        ? 'أضف تفاصيل أكثر للوصف الموجز'
        : length > maxLength
          ? 'اختصر الوصف الموجز لتجنب القطع'
          : undefined,
  };
}

/**
 * Analyze word count
 * Part of Basic SEO - Content Length: 10 points
 */
function analyzeWordCount(content: string): SeoCriterion {
  const wordCount = countWords(content);
  const { minWords, goodWords, excellentWords } = SEO_THRESHOLDS.content;

  let status: CriterionStatus = 'failed';
  let score = 0;
  const maxScore = SEO_WEIGHTS.basicSeo.contentLength;

  if (wordCount >= excellentWords) {
    status = 'passed';
    score = maxScore;
  } else if (wordCount >= goodWords) {
    status = 'passed';
    score = Math.round(maxScore * 0.85);
  } else if (wordCount >= minWords) {
    status = 'warning';
    score = Math.round(maxScore * 0.6);
  } else if (wordCount > 100) {
    status = 'warning';
    score = Math.round(maxScore * 0.3);
  }

  return {
    id: 'word-count',
    name: 'Content Length',
    nameAr: 'طول المحتوى',
    description: `Content should have at least ${minWords} words (${excellentWords}+ is excellent)`,
    descriptionAr: `يجب أن يحتوي المحتوى على ${minWords} كلمة على الأقل (${excellentWords}+ ممتاز)`,
    weight: 20,
    status,
    score,
    maxScore,
    value: wordCount,
    recommendation: wordCount < minWords
      ? `Add ${minWords - wordCount} more words to reach minimum length`
      : wordCount < excellentWords
        ? `Consider adding more content for comprehensive coverage`
        : undefined,
    recommendationAr: wordCount < minWords
      ? `أضف ${minWords - wordCount} كلمة للوصول للحد الأدنى`
      : wordCount < excellentWords
        ? `فكر في إضافة محتوى أكثر لتغطية شاملة`
        : undefined,
  };
}

/**
 * Analyze heading structure
 */
function analyzeHeadings(content: string): SeoCriterion[] {
  const headings = countHeadings(content);
  const { minH2, minH3 } = SEO_THRESHOLDS.headings;
  const criteria: SeoCriterion[] = [];

  // H2 analysis - Part of structure/content readability
  let h2Status: CriterionStatus = 'failed';
  let h2Score = 0;
  const h2MaxScore = 3; // Reduced to be part of structure (total structure ~8pts)

  if (headings.h2 >= minH2) {
    h2Status = 'passed';
    h2Score = h2MaxScore;
  } else if (headings.h2 === 1) {
    h2Status = 'warning';
    h2Score = Math.round(h2MaxScore * 0.6);
  }

  criteria.push({
    id: 'h2-headings',
    name: 'H2 Headings',
    nameAr: 'عناوين H2',
    description: `Use at least ${minH2} H2 headings to structure your content`,
    descriptionAr: `استخدم ${minH2} عناوين H2 على الأقل لتنظيم المحتوى`,
    weight: 8,
    status: h2Status,
    score: h2Score,
    maxScore: h2MaxScore,
    value: headings.h2,
    recommendation: headings.h2 < minH2 ? 'Add H2 headings to improve content structure' : undefined,
    recommendationAr: headings.h2 < minH2 ? 'أضف عناوين H2 لتحسين هيكل المحتوى' : undefined,
  });

  // H3 analysis - Part of structure
  let h3Status: CriterionStatus = 'failed';
  let h3Score = 0;
  const h3MaxScore = 2; // Reduced to be part of structure

  if (headings.h3 >= minH3) {
    h3Status = 'passed';
    h3Score = h3MaxScore;
  } else if (headings.h2 >= minH2) {
    // If has good H2 structure, H3 is less critical
    h3Status = 'warning';
    h3Score = Math.round(h3MaxScore * 0.5);
  }

  criteria.push({
    id: 'h3-headings',
    name: 'H3 Headings',
    nameAr: 'عناوين H3',
    description: `Use H3 headings for sub-sections`,
    descriptionAr: `استخدم عناوين H3 للأقسام الفرعية`,
    weight: 5,
    status: h3Status,
    score: h3Score,
    maxScore: h3MaxScore,
    value: headings.h3,
    recommendation: headings.h3 < minH3 ? 'Consider adding H3 subheadings for better organization' : undefined,
    recommendationAr: headings.h3 < minH3 ? 'فكر في إضافة عناوين فرعية H3 لتنظيم أفضل' : undefined,
  });

  return criteria;
}

/**
 * Analyze images
 */
function analyzeImages(content: string, hasFeaturedImage: boolean, imageCount: number, imagesWithAlt: number): SeoCriterion[] {
  const contentImages = extractImages(content);
  const totalImages = imageCount + contentImages.length;
  const criteria: SeoCriterion[] = [];

  // Featured image analysis - Part of Media Presence (5 pts total for media)
  let featuredStatus: CriterionStatus = hasFeaturedImage ? 'passed' : 'failed';
  let featuredScore = hasFeaturedImage ? SEO_WEIGHTS.contentReadability.mediaPresence : 0;

  criteria.push({
    id: 'featured-image',
    name: 'Featured Image',
    nameAr: 'الصورة البارزة',
    description: 'Add a featured image for your article',
    descriptionAr: 'أضف صورة بارزة للمقال',
    weight: SEO_WEIGHTS.contentReadability.mediaPresence,
    status: featuredStatus,
    score: featuredScore,
    maxScore: SEO_WEIGHTS.contentReadability.mediaPresence,
    value: hasFeaturedImage ? 1 : 0,
    recommendation: !hasFeaturedImage ? 'Add a featured image to improve engagement' : undefined,
    recommendationAr: !hasFeaturedImage ? 'أضف صورة بارزة لتحسين التفاعل' : undefined,
  });

  // Alt text analysis - Keyword in Image Alt: 5 points
  const contentImagesWithAlt = contentImages.filter(img => img.hasAlt).length;
  const totalImagesWithAlt = imagesWithAlt + contentImagesWithAlt;
  const altTextRatio = totalImages > 0 ? totalImagesWithAlt / totalImages : 1;

  let altStatus: CriterionStatus = 'passed';
  let altScore = SEO_WEIGHTS.additionalSeo.keywordInImageAlt;
  const altMaxScore = SEO_WEIGHTS.additionalSeo.keywordInImageAlt;

  if (altTextRatio < 0.5) {
    altStatus = 'failed';
    altScore = 0;
  } else if (altTextRatio < 1) {
    altStatus = 'warning';
    altScore = Math.round(altMaxScore * altTextRatio);
  }

  criteria.push({
    id: 'image-alt-text',
    name: 'Image Alt Text',
    nameAr: 'نص بديل للصور',
    description: 'All images should have descriptive alt text',
    descriptionAr: 'يجب أن تحتوي جميع الصور على نص بديل وصفي',
    weight: 7,
    status: totalImages === 0 ? 'passed' : altStatus,
    score: totalImages === 0 ? altMaxScore : altScore,
    maxScore: altMaxScore,
    value: `${totalImagesWithAlt}/${totalImages}`,
    recommendation: altTextRatio < 1 && totalImages > 0 ? 'Add alt text to all images for accessibility' : undefined,
    recommendationAr: altTextRatio < 1 && totalImages > 0 ? 'أضف نصاً بديلاً لجميع الصور للوصولية' : undefined,
  });

  return criteria;
}

/**
 * Analyze links
 */
function analyzeLinks(content: string): SeoCriterion[] {
  const links = countLinks(content);
  const { minInternal, minExternal } = SEO_THRESHOLDS.links;
  const criteria: SeoCriterion[] = [];

  // Internal links - 4 points
  const internalMaxScore = SEO_WEIGHTS.additionalSeo.internalLinks;
  let internalStatus: CriterionStatus = links.internal >= minInternal ? 'passed' : 'warning';
  let internalScore = links.internal >= minInternal ? internalMaxScore : Math.round(internalMaxScore * 0.5);

  criteria.push({
    id: 'internal-links',
    name: 'Internal Links',
    nameAr: 'الروابط الداخلية',
    description: `Include at least ${minInternal} internal link to other content`,
    descriptionAr: `أضف رابط داخلي واحد على الأقل لمحتوى آخر`,
    weight: internalMaxScore,
    status: internalStatus,
    score: internalScore,
    maxScore: internalMaxScore,
    value: links.internal,
    recommendation: links.internal < minInternal ? 'Add internal links to related articles' : undefined,
    recommendationAr: links.internal < minInternal ? 'أضف روابط داخلية لمقالات ذات صلة' : undefined,
  });

  // External links - 3 points
  const externalMaxScore = SEO_WEIGHTS.additionalSeo.externalLinks;
  let externalStatus: CriterionStatus = links.external >= minExternal ? 'passed' : 'warning';
  let externalScore = links.external >= minExternal ? externalMaxScore : Math.round(externalMaxScore * 0.5);

  criteria.push({
    id: 'external-links',
    name: 'External Links',
    nameAr: 'الروابط الخارجية',
    description: `Include at least ${minExternal} external link to authoritative sources`,
    descriptionAr: `أضف رابط خارجي واحد على الأقل لمصادر موثوقة`,
    weight: externalMaxScore,
    status: externalStatus,
    score: externalScore,
    maxScore: externalMaxScore,
    value: links.external,
    recommendation: links.external < minExternal ? 'Add external links to credible sources' : undefined,
    recommendationAr: links.external < minExternal ? 'أضف روابط خارجية لمصادر موثوقة' : undefined,
  });

  return criteria;
}

/**
 * Analyze focus keyword usage
 */
function analyzeKeyword(article: ArticleContent): SeoCriterion[] {
  const keyword = article.focusKeyword!;
  const criteria: SeoCriterion[] = [];

  // Keyword in title - 5 points (Basic SEO)
  const keywordInTitleScore = SEO_WEIGHTS.basicSeo.keywordInTitle;
  const inTitle = keywordExists(article.metaTitle || article.title, keyword);
  criteria.push({
    id: 'keyword-in-title',
    name: 'Keyword in Title',
    nameAr: 'الكلمة المفتاحية في العنوان',
    description: 'Focus keyword should appear in the title',
    descriptionAr: 'يجب أن تظهر الكلمة المفتاحية في العنوان',
    weight: keywordInTitleScore,
    status: inTitle ? 'passed' : 'failed',
    score: inTitle ? keywordInTitleScore : 0,
    maxScore: keywordInTitleScore,
    value: inTitle ? 'نعم' : 'لا',
    recommendation: !inTitle ? 'Add your focus keyword to the title' : undefined,
    recommendationAr: !inTitle ? 'أضف الكلمة المفتاحية للعنوان' : undefined,
  });

  // Keyword in first paragraph - 5 points (Basic SEO: keyword at beginning of content)
  const keywordInIntroScore = SEO_WEIGHTS.basicSeo.keywordAtBeginningOfContent;
  const firstParagraph = getFirstParagraph(article.content);
  const inFirstParagraph = keywordExists(firstParagraph, keyword);
  criteria.push({
    id: 'keyword-in-intro',
    name: 'Keyword in Introduction',
    nameAr: 'الكلمة المفتاحية في المقدمة',
    description: 'Focus keyword should appear in the first paragraph',
    descriptionAr: 'يجب أن تظهر الكلمة المفتاحية في الفقرة الأولى',
    weight: keywordInIntroScore,
    status: inFirstParagraph ? 'passed' : 'warning',
    score: inFirstParagraph ? keywordInIntroScore : Math.round(keywordInIntroScore * 0.4),
    maxScore: keywordInIntroScore,
    value: inFirstParagraph ? 'نعم' : 'لا',
    recommendation: !inFirstParagraph ? 'Include your focus keyword in the first paragraph' : undefined,
    recommendationAr: !inFirstParagraph ? 'أضف الكلمة المفتاحية في الفقرة الأولى' : undefined,
  });

  // Keyword in meta description - 5 points (Basic SEO)
  const keywordInMetaScore = SEO_WEIGHTS.basicSeo.keywordInMetaDescription;
  const inMetaDesc = keywordExists(article.metaDescription || article.excerpt || '', keyword);
  criteria.push({
    id: 'keyword-in-meta',
    name: 'Keyword in Meta Description',
    nameAr: 'الكلمة المفتاحية في الوصف',
    description: 'Focus keyword should appear in the meta description',
    descriptionAr: 'يجب أن تظهر الكلمة المفتاحية في الوصف الموجز',
    weight: keywordInMetaScore,
    status: inMetaDesc ? 'passed' : 'warning',
    score: inMetaDesc ? keywordInMetaScore : Math.round(keywordInMetaScore * 0.4),
    maxScore: keywordInMetaScore,
    value: inMetaDesc ? 'نعم' : 'لا',
    recommendation: !inMetaDesc ? 'Include your focus keyword in the meta description' : undefined,
    recommendationAr: !inMetaDesc ? 'أضف الكلمة المفتاحية في الوصف الموجز' : undefined,
  });

  // Keyword density - 5 points (Additional SEO)
  const density = calculateKeywordDensity(article.content, keyword);
  const { minDensity, maxDensity, optimalDensity } = SEO_THRESHOLDS.keyword;

  let densityStatus: CriterionStatus = 'warning';
  const densityMaxScore = SEO_WEIGHTS.additionalSeo.keywordDensity;
  let densityScore = Math.round(densityMaxScore * 0.6);

  if (density >= minDensity && density <= maxDensity) {
    if (Math.abs(density - optimalDensity) < 0.5) {
      densityStatus = 'passed';
      densityScore = densityMaxScore;
    } else {
      densityStatus = 'passed';
      densityScore = Math.round(densityMaxScore * 0.8);
    }
  } else if (density < minDensity) {
    densityScore = Math.round(densityMaxScore * 0.4);
  } else {
    // Over-optimization
    densityStatus = 'warning';
    densityScore = Math.round(densityMaxScore * 0.3);
  }

  criteria.push({
    id: 'keyword-density',
    name: 'Keyword Density',
    nameAr: 'كثافة الكلمة المفتاحية',
    description: `Keyword density should be ${minDensity}%-${maxDensity}% (optimal: ~${optimalDensity}%)`,
    descriptionAr: `يجب أن تكون كثافة الكلمة ${minDensity}%-${maxDensity}% (الأمثل: ~${optimalDensity}%)`,
    weight: 7,
    status: densityStatus,
    score: densityScore,
    maxScore: densityMaxScore,
    value: `${density.toFixed(2)}%`,
    recommendation: density < minDensity
      ? 'Use your focus keyword more frequently in the content'
      : density > maxDensity
        ? 'Reduce keyword usage to avoid over-optimization'
        : undefined,
    recommendationAr: density < minDensity
      ? 'استخدم الكلمة المفتاحية أكثر في المحتوى'
      : density > maxDensity
        ? 'قلل استخدام الكلمة المفتاحية لتجنب الإفراط'
        : undefined,
  });

  return criteria;
}

/**
 * Analyze readability - 5 points (Content Readability)
 */
function analyzeReadability(content: string): SeoCriterion {
  const readabilityScore = calculateReadabilityScore(content);

  let status: CriterionStatus = 'failed';
  let score = 0;
  const maxScore = SEO_WEIGHTS.contentReadability.readabilityScore;

  if (readabilityScore >= 80) {
    status = 'passed';
    score = maxScore;
  } else if (readabilityScore >= 60) {
    status = 'passed';
    score = Math.round(maxScore * 0.8);
  } else if (readabilityScore >= 40) {
    status = 'warning';
    score = Math.round(maxScore * 0.5);
  }

  return {
    id: 'readability',
    name: 'Readability',
    nameAr: 'سهولة القراءة',
    description: 'Content should be easy to read with varied sentence lengths',
    descriptionAr: 'يجب أن يكون المحتوى سهل القراءة بأطوال جمل متنوعة',
    weight: 10,
    status,
    score,
    maxScore,
    value: readabilityScore,
    recommendation: readabilityScore < 60 ? 'Improve readability by varying sentence lengths' : undefined,
    recommendationAr: readabilityScore < 60 ? 'حسّن القراءة بتنويع أطوال الجمل' : undefined,
  };
}

/**
 * Analyze slug - 3 points (URL Length from Additional SEO)
 */
function analyzeSlug(slug?: string): SeoCriterion {
  const hasSlug = Boolean(slug && slug.length > 0);
  const isValidSlug = slug ? /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) : false;
  const isGoodLength = slug ? slug.length >= 3 && slug.length <= 75 : false;

  let status: CriterionStatus = 'failed';
  let score = 0;
  const maxScore = SEO_WEIGHTS.additionalSeo.urlLength;

  if (hasSlug && isValidSlug && isGoodLength) {
    status = 'passed';
    score = maxScore;
  } else if (hasSlug && isValidSlug) {
    status = 'warning';
    score = Math.round(maxScore * 0.7);
  } else if (hasSlug) {
    status = 'warning';
    score = Math.round(maxScore * 0.4);
  }

  return {
    id: 'slug',
    name: 'URL Slug',
    nameAr: 'رابط المقال',
    description: 'URL slug should be short, descriptive, and contain keywords',
    descriptionAr: 'يجب أن يكون الرابط قصيراً ووصفياً ويحتوي على كلمات مفتاحية',
    weight: 5,
    status,
    score,
    maxScore,
    value: slug || '',
    recommendation: !hasSlug
      ? 'Add a URL slug for your article'
      : !isValidSlug
        ? 'Use only lowercase letters, numbers, and hyphens in slug'
        : undefined,
    recommendationAr: !hasSlug
      ? 'أضف رابطاً للمقال'
      : !isValidSlug
        ? 'استخدم أحرف صغيرة وأرقام وشرطات فقط في الرابط'
        : undefined,
  };
}

/**
 * Group criteria by category for display
 */
function groupCriteriaByCategory(criteria: SeoCriterion[]): SeoCategory[] {
  const categories: SeoCategory[] = [
    {
      id: 'content',
      name: 'Content',
      nameAr: 'المحتوى',
      criteria: criteria.filter(c => ['title-length', 'meta-description', 'word-count', 'readability', 'paragraph-length', 'table-of-contents'].includes(c.id)),
      score: 0,
      maxScore: 0,
    },
    {
      id: 'structure',
      name: 'Structure',
      nameAr: 'الهيكل',
      criteria: criteria.filter(c => ['h2-headings', 'h3-headings', 'slug', 'url-length'].includes(c.id)),
      score: 0,
      maxScore: 0,
    },
    {
      id: 'media',
      name: 'Media',
      nameAr: 'الوسائط',
      criteria: criteria.filter(c => ['featured-image', 'image-alt-text', 'media-presence'].includes(c.id)),
      score: 0,
      maxScore: 0,
    },
    {
      id: 'links',
      name: 'Links',
      nameAr: 'الروابط',
      criteria: criteria.filter(c => ['internal-links', 'external-links'].includes(c.id)),
      score: 0,
      maxScore: 0,
    },
    {
      id: 'keyword',
      name: 'Focus Keyword',
      nameAr: 'الكلمة المفتاحية',
      criteria: criteria.filter(c => c.id.startsWith('keyword-')),
      score: 0,
      maxScore: 0,
    },
    {
      id: 'title-readability',
      name: 'Title Readability',
      nameAr: 'قابلية قراءة العنوان',
      criteria: criteria.filter(c => ['title-sentiment', 'title-power-words', 'title-number'].includes(c.id)),
      score: 0,
      maxScore: 0,
    },
  ];

  // Calculate category scores
  categories.forEach(cat => {
    cat.score = cat.criteria.reduce((sum, c) => sum + c.score, 0);
    cat.maxScore = cat.criteria.reduce((sum, c) => sum + c.maxScore, 0);
  });

  // Filter out empty categories
  return categories.filter(cat => cat.criteria.length > 0);
}

/**
 * Generate suggestion from criterion
 */
function generateSuggestion(criterion: SeoCriterion, priority: 'high' | 'medium' | 'low'): SeoSuggestion {
  return {
    id: `suggestion-${criterion.id}`,
    priority,
    criterionId: criterion.id,
    message: criterion.recommendation || criterion.description,
    messageAr: criterion.recommendationAr || criterion.descriptionAr,
    action: criterion.name,
    actionAr: criterion.nameAr,
  };
}

// Export for testing
export {
  analyzeTitleLength,
  analyzeMetaDescription,
  analyzeWordCount,
  analyzeHeadings,
  analyzeImages,
  analyzeLinks,
  analyzeKeyword,
  analyzeReadability,
  analyzeSlug,
};
