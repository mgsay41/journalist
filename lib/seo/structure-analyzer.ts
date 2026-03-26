/**
 * Journalistic Structure Analyzer
 *
 * Scores articles on journalism-specific structural quality:
 * - Inverted pyramid (most important info first)
 * - Proper heading hierarchy
 * - Source attribution frequency
 * - Byline / author presence
 * - Conclusion section
 * - Section balance
 * - Dateline in first paragraph
 *
 * Total: 100 points
 */

import { stripHtml, countWords, getFirstParagraph, extractHeadings, countLinks } from './utils';

export interface StructureCriterionResult {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  score: number;
  maxScore: number;
  status: 'passed' | 'warning' | 'failed';
  value?: string | number;
  recommendation?: string;
  recommendationAr?: string;
}

export interface StructureAnalysisResult {
  score: number;
  percentage: number;
  status: 'good' | 'needs-improvement' | 'poor';
  criteria: StructureCriterionResult[];
}

export const STRUCTURE_THRESHOLDS = {
  good: 70,
  needsImprovement: 40,
};

const ARABIC_DATE_PATTERN =
  /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})|(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})|((اليوم|أمس|الآن|هذا الصباح|هذا المساء|السبت|الأحد|الإثنين|الثلاثاء|الأربعاء|الخميس|الجمعة)(\s+الماضي|\s+القادم)?)|((يناير|فبراير|مارس|أبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر)(\s+\d{1,4})?)|\d{4}/i;

const ARABIC_LOCATION_KEYWORDS = ['في', 'بمدينة', 'بمحافظة', 'بمنطقة', 'في مدينة', 'في محافظة', 'في دولة', 'من'];
const FACTUAL_VERBS = ['أعلن', 'صرح', 'قال', 'أكد', 'أضاف', 'أوضح', 'ذكر', 'أشار', 'أفاد', 'نجح', 'أطلق', 'وقع', 'قرر'];
const CONCLUSION_KEYWORDS = ['خاتمة', 'خلاصة', 'في الختام', 'ماذا بعد', 'الاستنتاج', 'التوصيات', 'توصيات', 'آفاق', 'المستقبل'];
const ATTRIBUTION_WORDS = ['كاتب', 'محرر', 'مراسل', 'خبير', 'مصدر', 'بحسب', 'وفق', 'أفاد', 'قال', 'صرح', 'أعلن', 'أكد'];

export function analyzeStructure(content: string, authorName?: string): StructureAnalysisResult {
  const criteria: StructureCriterionResult[] = [];

  criteria.push(analyzeInvertedPyramid(content));          // 20 pts
  criteria.push(analyzeHeadingHierarchy(content));          // 15 pts
  criteria.push(analyzeSourceAttribution(content));         // 15 pts
  criteria.push(analyzeBylinePresence(content, authorName)); // 10 pts
  criteria.push(analyzeConclusionSection(content));         // 15 pts
  criteria.push(analyzeSectionBalance(content));            // 10 pts
  criteria.push(analyzeDatelinePresence(content));          // 15 pts

  const totalScore = criteria.reduce((sum, c) => sum + c.score, 0);
  const maxScore = criteria.reduce((sum, c) => sum + c.maxScore, 0);
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  let status: 'good' | 'needs-improvement' | 'poor' = 'poor';
  if (percentage >= STRUCTURE_THRESHOLDS.good) {
    status = 'good';
  } else if (percentage >= STRUCTURE_THRESHOLDS.needsImprovement) {
    status = 'needs-improvement';
  }

  return { score: totalScore, percentage, status, criteria };
}

/**
 * Inverted pyramid: first paragraph should answer who/what/when/where/why — 20 pts
 */
function analyzeInvertedPyramid(content: string): StructureCriterionResult {
  const firstParagraph = getFirstParagraph(content);
  let signals = 0;

  // WHO: person/org attribution
  if (/(قال|أعلن|صرح|أكد|أفاد)\s+[أ-ي]{3,}/i.test(firstParagraph)) signals++;
  // WHAT: factual verb + subject
  if (FACTUAL_VERBS.some(v => firstParagraph.includes(v))) signals++;
  // WHEN: date pattern
  if (ARABIC_DATE_PATTERN.test(firstParagraph)) signals++;
  // WHERE: location keyword
  if (ARABIC_LOCATION_KEYWORDS.some(kw => firstParagraph.includes(kw + ' '))) signals++;
  // WHY/HOW: explanatory phrases
  if (/(بسبب|نتيجة|لأن|من أجل|بهدف|إثر|في أعقاب)/i.test(firstParagraph)) signals++;

  const maxScore = 20;
  let score = 0;
  let status: 'passed' | 'warning' | 'failed' = 'failed';

  if (signals >= 4) { score = maxScore; status = 'passed'; }
  else if (signals >= 3) { score = Math.round(maxScore * 0.75); status = 'passed'; }
  else if (signals >= 2) { score = Math.round(maxScore * 0.5); status = 'warning'; }
  else if (signals >= 1) { score = Math.round(maxScore * 0.25); status = 'failed'; }

  return {
    id: 'inverted-pyramid',
    name: 'Inverted Pyramid',
    nameAr: 'الهرم المقلوب',
    description: 'First paragraph should answer who, what, when, where, and why',
    descriptionAr: 'يجب أن تجيب الفقرة الأولى على: من، ماذا، متى، أين، ولماذا',
    score,
    maxScore,
    status,
    value: `${signals}/5 عناصر`,
    recommendation: signals < 4 ? 'Ensure first paragraph includes who/what/when/where and optionally why' : undefined,
    recommendationAr: signals < 4 ? 'احرص على أن تتضمن الفقرة الأولى: من فعل، ماذا فعل، متى، وأين' : undefined,
  };
}

/**
 * Heading hierarchy: no skipped levels (e.g. H2 → H4 without H3) — 15 pts
 */
function analyzeHeadingHierarchy(content: string): StructureCriterionResult {
  const headings = extractHeadings(content);
  const maxScore = 15;

  if (headings.length === 0) {
    return {
      id: 'heading-hierarchy',
      name: 'Heading Hierarchy',
      nameAr: 'تسلسل العناوين',
      description: 'Headings should follow a logical hierarchy without skipping levels',
      descriptionAr: 'يجب أن تتبع العناوين تسلسلاً منطقياً دون تخطي مستويات',
      score: 0,
      maxScore,
      status: 'failed',
      value: 'لا توجد عناوين',
      recommendationAr: 'أضف عناوين H2 و H3 لتنظيم المحتوى',
    };
  }

  let hasSkip = false;
  let prevLevel = 1;

  for (const h of headings) {
    if (h.level > prevLevel + 1) { hasSkip = true; break; }
    prevLevel = h.level;
  }

  const hasH2BeforeH3 = (() => {
    let sawH2 = false;
    for (const h of headings) {
      if (h.level === 2) sawH2 = true;
      if (h.level === 3 && !sawH2) return false;
    }
    return true;
  })();

  const passed = !hasSkip && hasH2BeforeH3;
  const score = passed ? maxScore : hasSkip ? 0 : Math.round(maxScore * 0.6);

  return {
    id: 'heading-hierarchy',
    name: 'Heading Hierarchy',
    nameAr: 'تسلسل العناوين',
    description: 'Headings should follow a logical hierarchy without skipping levels',
    descriptionAr: 'يجب أن تتبع العناوين تسلسلاً منطقياً دون تخطي مستويات',
    score,
    maxScore,
    status: passed ? 'passed' : hasSkip ? 'failed' : 'warning',
    value: hasSkip ? 'يوجد تخطي في المستويات' : 'تسلسل صحيح',
    recommendation: hasSkip ? 'Fix heading hierarchy — do not skip from H2 to H4 without H3' : undefined,
    recommendationAr: hasSkip ? 'صحح تسلسل العناوين — لا تقفز من H2 إلى H4 دون H3' : undefined,
  };
}

/**
 * Source attribution: external links per 400 words — 15 pts
 */
function analyzeSourceAttribution(content: string): StructureCriterionResult {
  const wordCount = countWords(content);
  const links = countLinks(content);
  const requiredLinks = Math.max(1, Math.floor(wordCount / 400));
  const maxScore = 15;

  let score = 0;
  let status: 'passed' | 'warning' | 'failed' = 'failed';

  if (links.external >= requiredLinks) {
    score = maxScore;
    status = 'passed';
  } else if (links.external > 0) {
    score = Math.round(maxScore * (links.external / requiredLinks));
    status = 'warning';
  }

  return {
    id: 'source-attribution',
    name: 'Source Attribution',
    nameAr: 'إسناد المصادر',
    description: `Include at least ${requiredLinks} external link(s) per 400 words`,
    descriptionAr: `أضف رابطاً خارجياً على الأقل لكل 400 كلمة (المطلوب: ${requiredLinks})`,
    score,
    maxScore,
    status,
    value: `${links.external} روابط خارجية`,
    recommendation: links.external < requiredLinks ? 'Add more external links to authoritative sources' : undefined,
    recommendationAr: links.external < requiredLinks ? 'أضف المزيد من الروابط الخارجية لمصادر موثوقة' : undefined,
  };
}

/**
 * Byline / author presence — 10 pts
 */
function analyzeBylinePresence(content: string, authorName?: string): StructureCriterionResult {
  const plainText = stripHtml(content);
  const hasAuthor =
    (Boolean(authorName) && plainText.includes(authorName!)) ||
    ATTRIBUTION_WORDS.some(w => plainText.includes(w));

  const maxScore = 10;
  return {
    id: 'byline-presence',
    name: 'Byline / Author',
    nameAr: 'توقيع الكاتب / المصدر',
    description: 'Content should reference the author or attribute information to sources',
    descriptionAr: 'يجب أن يحتوي المحتوى على توقيع الكاتب أو إسناد المعلومات لمصادر',
    score: hasAuthor ? maxScore : 0,
    maxScore,
    status: hasAuthor ? 'passed' : 'failed',
    value: hasAuthor ? 'نعم' : 'لا',
    recommendation: !hasAuthor ? 'Add author name or attribute information to named sources' : undefined,
    recommendationAr: !hasAuthor ? 'أضف اسم الكاتب أو أسند المعلومات لمصادر مسمّاة' : undefined,
  };
}

/**
 * Conclusion section — 15 pts
 */
function analyzeConclusionSection(content: string): StructureCriterionResult {
  const headings = extractHeadings(content);
  const maxScore = 15;

  // Check last H2 or H3
  const lastH2 = [...headings].reverse().find(h => h.level === 2);
  const hasConclusion =
    lastH2 && CONCLUSION_KEYWORDS.some(kw => lastH2.text.includes(kw));

  return {
    id: 'conclusion-section',
    name: 'Conclusion Section',
    nameAr: 'قسم الخاتمة',
    description: 'Last H2 heading should be a conclusion, summary, or recommendations section',
    descriptionAr: 'يجب أن يكون عنوان H2 الأخير خاتمة أو خلاصة أو توصيات',
    score: hasConclusion ? maxScore : 0,
    maxScore,
    status: hasConclusion ? 'passed' : 'failed',
    value: lastH2?.text || 'لا يوجد',
    recommendation: !hasConclusion ? 'Add a conclusion H2 heading (خاتمة / خلاصة / توصيات)' : undefined,
    recommendationAr: !hasConclusion ? 'أضف عنوان H2 للخاتمة (خاتمة / خلاصة / في الختام)' : undefined,
  };
}

/**
 * Section balance: no single section should contain > 45% of total words — 10 pts
 */
function analyzeSectionBalance(content: string): StructureCriterionResult {
  const headings = extractHeadings(content);
  const maxScore = 10;

  if (headings.length < 2) {
    return {
      id: 'section-balance',
      name: 'Section Balance',
      nameAr: 'توازن الأقسام',
      description: 'No section should contain more than 45% of total words',
      descriptionAr: 'يجب ألا يحتوي قسم واحد على أكثر من 45% من مجموع الكلمات',
      score: 0,
      maxScore,
      status: 'failed',
      value: 'غير كافٍ من العناوين',
      recommendationAr: 'أضف عناوين H2 لتقسيم المحتوى إلى أقسام متوازنة',
    };
  }

  // Split content by H2 headings and measure section sizes
  const h2Regex = /<h2[^>]*>/gi;
  const sections = content.split(h2Regex);
  const sectionWords = sections.map(s => countWords(s));
  const totalWords = sectionWords.reduce((a, b) => a + b, 0);

  if (totalWords === 0) {
    return {
      id: 'section-balance',
      name: 'Section Balance',
      nameAr: 'توازن الأقسام',
      description: 'No section should contain more than 45% of total words',
      descriptionAr: 'يجب ألا يحتوي قسم واحد على أكثر من 45% من مجموع الكلمات',
      score: maxScore,
      maxScore,
      status: 'passed',
      value: 'متوازن',
    };
  }

  const maxSectionPct = Math.max(...sectionWords.map(w => (w / totalWords) * 100));
  const isBalanced = maxSectionPct <= 45;

  return {
    id: 'section-balance',
    name: 'Section Balance',
    nameAr: 'توازن الأقسام',
    description: 'No section should contain more than 45% of total words',
    descriptionAr: 'يجب ألا يحتوي قسم واحد على أكثر من 45% من مجموع الكلمات',
    score: isBalanced ? maxScore : Math.round(maxScore * 0.4),
    maxScore,
    status: isBalanced ? 'passed' : 'warning',
    value: `أكبر قسم: ${Math.round(maxSectionPct)}%`,
    recommendation: !isBalanced ? 'Break up large sections into smaller subsections' : undefined,
    recommendationAr: !isBalanced ? 'قسّم الأقسام الكبيرة إلى أقسام فرعية أصغر' : undefined,
  };
}

/**
 * Dateline presence in first 80 words — 15 pts
 */
function analyzeDatelinePresence(content: string): StructureCriterionResult {
  const plainText = stripHtml(content);
  // Take first ~80 words
  const first80Words = plainText.split(/\s+/).slice(0, 80).join(' ');
  const maxScore = 15;

  const hasDate = ARABIC_DATE_PATTERN.test(first80Words);
  const hasLocation = ARABIC_LOCATION_KEYWORDS.some(kw => first80Words.includes(kw + ' '));
  const hasDateline = hasDate && hasLocation;
  const hasDateOnly = hasDate || hasLocation;

  let score = 0;
  let status: 'passed' | 'warning' | 'failed' = 'failed';

  if (hasDateline) { score = maxScore; status = 'passed'; }
  else if (hasDateOnly) { score = Math.round(maxScore * 0.6); status = 'warning'; }

  return {
    id: 'dateline',
    name: 'Dateline',
    nameAr: 'الوقت والمكان',
    description: 'First paragraph should mention both a date and a location (dateline)',
    descriptionAr: 'يجب أن تذكر الفقرة الأولى تاريخاً ومكاناً (توقيع زمني ومكاني)',
    score,
    maxScore,
    status,
    value: hasDateline ? 'تاريخ + مكان' : hasDate ? 'تاريخ فقط' : hasLocation ? 'مكان فقط' : 'غير موجود',
    recommendation: !hasDateline ? 'Add a dateline to the first paragraph (date and location)' : undefined,
    recommendationAr: !hasDateline ? 'أضف توقيعاً زمنياً ومكانياً في الفقرة الأولى (التاريخ والمكان)' : undefined,
  };
}
