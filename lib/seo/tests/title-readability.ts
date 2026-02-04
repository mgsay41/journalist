/**
 * Title Readability Tests
 * Tests for title optimization based on RankMath criteria
 */

import { CriterionStatus, SeoCriterion } from '../types';
import {
  countPowerWords,
  hasSentimentInTitle,
  hasNumberInTitle,
  isKeywordAtBeginningOfTitle,
} from '../arabic-words';

/**
 * Analyze title readability factors
 */
export function analyzeTitleReadability(
  title: string,
  focusKeyword?: string
): SeoCriterion[] {
  const criteria: SeoCriterion[] = [];

  // 1. Keyword at beginning of title (first 50%)
  if (focusKeyword) {
    criteria.push(analyzeKeywordPosition(title, focusKeyword));
  }

  // 2. Sentiment in title
  criteria.push(analyzeTitleSentiment(title));

  // 3. Power words in title
  criteria.push(analyzeTitlePowerWords(title));

  // 4. Number in title
  criteria.push(analyzeTitleNumber(title));

  return criteria;
}

/**
 * Check if keyword appears at beginning of title
 */
function analyzeKeywordPosition(title: string, keyword: string): SeoCriterion {
  const isAtBeginning = isKeywordAtBeginningOfTitle(title, keyword);

  return {
    id: 'keyword-at-beginning',
    name: 'Keyword at Beginning',
    nameAr: 'الكلمة المفتاحية في البداية',
    description: 'Focus keyword should appear in the first half of the title',
    descriptionAr: 'يجب أن تظهر الكلمة المفتاحية في النصف الأول من العنوان',
    weight: 4,
    status: isAtBeginning ? 'passed' : 'warning',
    score: isAtBeginning ? 4 : 1,
    maxScore: 4,
    value: isAtBeginning ? 'نعم' : 'لا',
    recommendation: !isAtBeginning
      ? 'Move your focus keyword to the beginning of the title'
      : undefined,
    recommendationAr: !isAtBeginning
      ? 'انقل الكلمة المفتاحية إلى بداية العنوان'
      : undefined,
  };
}

/**
 * Check for sentiment/emotional words in title
 */
function analyzeTitleSentiment(title: string): SeoCriterion {
  const sentiment = hasSentimentInTitle(title);

  let status: CriterionStatus = 'warning';
  let score = 1;
  const maxScore = 4;

  if (sentiment.hasSentiment) {
    status = 'passed';
    score = maxScore;
  }

  return {
    id: 'title-sentiment',
    name: 'Sentiment in Title',
    nameAr: 'المشاعر في العنوان',
    description: 'Use emotion-evoking language in your title',
    descriptionAr: 'استخدم لغة تثير المشاعر في العنوان',
    weight: 4,
    status,
    score,
    maxScore,
    value: sentiment.hasSentiment
      ? `${sentiment.type} (${sentiment.words.join(', ')})`
      : 'لا يوجد',
    recommendation: !sentiment.hasSentiment
      ? 'Add emotional or sentiment words to make your title more compelling'
      : undefined,
    recommendationAr: !sentiment.hasSentiment
      ? 'أضف كلمات عاطفية لجعل العنوان أكثر جذباً'
      : undefined,
  };
}

/**
 * Check for power words in title
 */
function analyzeTitlePowerWords(title: string): SeoCriterion {
  const powerWords = countPowerWords(title);

  let status: CriterionStatus = 'warning';
  let score = 1;
  const maxScore = 4;

  if (powerWords.count >= 1) {
    status = 'passed';
    score = maxScore;
  }

  return {
    id: 'title-power-words',
    name: 'Power Words in Title',
    nameAr: 'كلمات القوة في العنوان',
    description: 'Use persuasive power words in your title',
    descriptionAr: 'استخدم كلمات مقنعة وقوية في العنوان',
    weight: 4,
    status,
    score,
    maxScore,
    value: powerWords.count > 0 ? powerWords.words.join(', ') : 'لا يوجد',
    recommendation:
      powerWords.count === 0
        ? 'Add power words like "حصري", "مذهل", "أفضل" to increase engagement'
        : undefined,
    recommendationAr:
      powerWords.count === 0
        ? 'أضف كلمات قوية مثل "حصري"، "مذهل"، "أفضل" لزيادة التفاعل'
        : undefined,
  };
}

/**
 * Check for numbers in title
 */
function analyzeTitleNumber(title: string): SeoCriterion {
  const numberCheck = hasNumberInTitle(title);

  let status: CriterionStatus = 'warning';
  let score = 1;
  const maxScore = 3;

  if (numberCheck.hasNumber) {
    status = 'passed';
    score = maxScore;
  }

  return {
    id: 'title-number',
    name: 'Number in Title',
    nameAr: 'رقم في العنوان',
    description: 'Include a number in your title (e.g., "7 طرق...")',
    descriptionAr: 'أضف رقماً للعنوان (مثال: "7 طرق...")',
    weight: 3,
    status,
    score,
    maxScore,
    value: numberCheck.hasNumber ? numberCheck.numbers.join(', ') : 'لا يوجد',
    recommendation: !numberCheck.hasNumber
      ? 'Consider adding a number to your title for higher click-through rates'
      : undefined,
    recommendationAr: !numberCheck.hasNumber
      ? 'فكر في إضافة رقم للعنوان لزيادة معدل النقر'
      : undefined,
  };
}

// Total possible score for title readability: 15 points
export const TITLE_READABILITY_MAX_SCORE = 15;
