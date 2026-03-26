import { countWords, stripHtml, getFirstParagraph, getAverageSentenceLength, extractHeadings } from './utils';

export interface GeoCriterionResult {
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

export interface GeoAnalysisResult {
  score: number;
  percentage: number;
  status: 'good' | 'needs-improvement' | 'poor';
  criteria: GeoCriterionResult[];
}

export const GEO_THRESHOLDS = {
  good: 75,
  needsImprovement: 50,
};

const FLUFF_PHRASES = [
  'هناك',
  'يعتبر',
  'تعد',
  'تشهد',
  'في ظل',
  'في إطار',
  'من المعروف',
  'من المعلوم',
  'لا شك',
  'لا خلاف',
  'كما هو معروف',
  'كما نعلم',
  // Additional fluff phrases
  'من الجدير بالذكر',
  'تجدر الإشارة',
  'من المهم الإشارة',
  'يمكن القول',
  'في هذا الصدد',
  'في هذا السياق',
  'على صعيد آخر',
  'من ناحية أخرى',
];

const ARABIC_LOCATION_KEYWORDS = [
  'في',
  'بمدينة',
  'بمحافظة',
  'بمنطقة',
  'في مدينة',
  'في محافظة',
  'في منطقة',
  'في دولة',
  'بدولة',
  'عبر',
  'من',
];

const FACTUAL_VERBS = [
  'أعلن',
  'صرح',
  'قال',
  'أكد',
  'أضاف',
  'أوضح',
  'ذكر',
  'أشار',
  'أفاد',
  'نجح',
  'حقق',
  'أسهم',
  'شارك',
  'استقبل',
  'عقد',
  'افتتح',
  'أطلق',
  'وقع',
  'وافق',
  'قرر',
];

export function analyzeGeo(content: string): GeoAnalysisResult {
  const criteria: GeoCriterionResult[] = [];
  const plainText = stripHtml(content);
  const wordCount = countWords(content);
  const firstParagraph = getFirstParagraph(content);

  // Existing criteria (weights adjusted to keep total at 100 after adding 30 new pts)
  criteria.push(analyzeFirstParagraphCompleteness(firstParagraph)); // 15 pts (was 20)
  criteria.push(analyzeAnswerFirstWriting(firstParagraph));         // 10 pts (was 15)
  criteria.push(analyzeDataDensity(plainText, wordCount));          // 15 pts
  criteria.push(analyzeListsUsage(content));                        // 10 pts
  criteria.push(analyzeQuotePresence(content));                     // 10 pts
  criteria.push(analyzeFaqSection(content));                        // 10 pts (was 15)
  criteria.push(analyzeShortSentences(content));                    // 10 pts
  criteria.push(analyzeNoFluffIntro(firstParagraph));               //  5 pts (unchanged)
  // New criteria
  criteria.push(analyzeConversationalQueries(content));             // 10 pts
  criteria.push(analyzeNamedEntities(content));                     //  5 pts
  criteria.push(analyzeKeyTakeaways(content));                      // 10 pts (total = 110 → pct normalizes)

  const totalScore = criteria.reduce((sum, c) => sum + c.score, 0);
  const maxScore = criteria.reduce((sum, c) => sum + c.maxScore, 0);
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  let status: 'good' | 'needs-improvement' | 'poor' = 'poor';
  if (percentage >= GEO_THRESHOLDS.good) {
    status = 'good';
  } else if (percentage >= GEO_THRESHOLDS.needsImprovement) {
    status = 'needs-improvement';
  }

  return {
    score: totalScore,
    percentage,
    status,
    criteria,
  };
}

function analyzeFirstParagraphCompleteness(firstParagraph: string): GeoCriterionResult {
  let score = 0;
  const elements: string[] = [];

  const hasDate = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})|(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})|((اليوم|أمس|غداً|السبت|الأحد|الإثنين|الثلاثاء|الأربعاء|الخميس|الجمعة)(\s+الماضي|\s+القادم)?)|((يناير|فبراير|مارس|أبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر)(\s+\d{1,4})?)/i.test(firstParagraph);
  if (hasDate) {
    score += 4;
    elements.push('تاريخ');
  }

  const hasLocation = ARABIC_LOCATION_KEYWORDS.some(kw => firstParagraph.includes(kw));
  if (hasLocation) {
    score += 4;
    elements.push('مكان');
  }

  const hasPersonOrg = /[أ-ي]{3,}(?=\s+(الشركة|المؤسسة|الوزارة|الجامعة|البنك|الاتحاد|النادي|الهيئة|المجلس|الجمعية|الحكومة|الوزير|الرئيس|المدير|الرئيس التنفيذي|المتحدث|المصدر|المسؤول))/i.test(firstParagraph) ||
    /(قال|أعلن|صرح|أكد|أضاف|أوضح|ذكر|أشار|أفاد)\s+[أ-ي]{3,}/i.test(firstParagraph);
  if (hasPersonOrg) {
    score += 4;
    elements.push('شخص/جهة');
  }

  const hasFactualVerb = FACTUAL_VERBS.some(verb => firstParagraph.includes(verb));
  if (hasFactualVerb) {
    score += 3;
    elements.push('فعل واقعي');
  }

  const maxScore = 15;
  let status: 'passed' | 'warning' | 'failed' = 'failed';
  if (score >= 15) {
    status = 'passed';
  } else if (score >= 10) {
    status = 'warning';
  }

  return {
    id: 'first-paragraph-completeness',
    name: 'First Paragraph Completeness',
    nameAr: 'اكتمال الفقرة الأولى',
    description: 'First paragraph should include date, location, person/organization, and factual verb',
    descriptionAr: 'يجب أن تحتوي الفقرة الأولى على تاريخ ومكان وشخص/جهة وفعل واقعي',
    score,
    maxScore,
    status,
    value: elements.join('، ') || 'لا شيء',
    recommendation: score < 15 ? 'أضف المزيد من العناصر للفقرة الأولى (تاريخ، مكان، شخص/جهة، فعل واقعي)' : undefined,
    recommendationAr: score < 15 ? 'أضف المزيد من العناصر للفقرة الأولى (تاريخ، مكان، شخص/جهة، فعل واقعي)' : undefined,
  };
}

function analyzeAnswerFirstWriting(firstParagraph: string): GeoCriterionResult {
  const firstSentence = firstParagraph.split(/[.!?؟]/)[0]?.trim() || '';

  const startsWithFluff = FLUFF_PHRASES.some(phrase =>
    firstSentence.startsWith(phrase) || firstSentence.includes(phrase + ' أن')
  );

  const maxScore = 10;
  const score = startsWithFluff ? 0 : maxScore;
  const status: 'passed' | 'warning' | 'failed' = startsWithFluff ? 'failed' : 'passed';

  return {
    id: 'answer-first-writing',
    name: 'Answer-First Writing',
    nameAr: 'الكتابة بالإجابة أولاً',
    description: 'First sentence should directly answer the question, not start with fluff',
    descriptionAr: 'يجب أن تجيب الجملة الأولى مباشرة على السؤال، دون مقدمات طويلة',
    score,
    maxScore,
    status,
    value: startsWithFluff ? 'يبدأ بمقدمة غير مباشرة' : 'مباشر',
    recommendation: startsWithFluff ? 'ابدأ الجملة الأولى بحقيقة مباشرة تجيب على من/ماذا/متى/أين' : undefined,
    recommendationAr: startsWithFluff ? 'ابدأ الجملة الأولى بحقيقة مباشرة تجيب على من/ماذا/متى/أين' : undefined,
  };
}

function analyzeDataDensity(plainText: string, wordCount: number): GeoCriterionResult {
  if (wordCount === 0) {
    return {
      id: 'data-density',
      name: 'Data Density',
      nameAr: 'كثافة البيانات',
      description: 'Content should include numbers and statistics',
      descriptionAr: 'يجب أن يحتوي المحتوى على أرقام وإحصائيات',
      score: 0,
      maxScore: 15,
      status: 'failed',
      value: '0',
    };
  }

  const numbers = plainText.match(/\d+(?:[.,]\d+)?%?/g) || [];
  const numbersPer100Words = (numbers.length / wordCount) * 100;

  const maxScore = 15;
  let score = 0;
  let status: 'passed' | 'warning' | 'failed' = 'failed';

  if (numbersPer100Words >= 3) {
    score = maxScore;
    status = 'passed';
  } else if (numbersPer100Words >= 1) {
    score = Math.round(maxScore * 0.5);
    status = 'warning';
  }

  return {
    id: 'data-density',
    name: 'Data Density',
    nameAr: 'كثافة البيانات',
    description: 'Include at least 3 numbers/percentages per 100 words',
    descriptionAr: 'أضف 3 أرقام/نسب على الأقل لكل 100 كلمة',
    score,
    maxScore,
    status,
    value: `${numbers.length} رقم`,
    recommendation: score < maxScore ? 'أضف المزيد من الأرقام والإحصائيات لدعم المحتوى' : undefined,
    recommendationAr: score < maxScore ? 'أضف المزيد من الأرقام والإحصائيات لدعم المحتوى' : undefined,
  };
}

function analyzeListsUsage(content: string): GeoCriterionResult {
  const hasUnorderedList = /<ul[^>]*>/i.test(content);
  const hasOrderedList = /<ol[^>]*>/i.test(content);
  const hasList = hasUnorderedList || hasOrderedList;

  const maxScore = 10;
  const score = hasList ? maxScore : 0;
  const status: 'passed' | 'warning' | 'failed' = hasList ? 'passed' : 'failed';

  return {
    id: 'lists-usage',
    name: 'Lists Usage',
    nameAr: 'استخدام القوائم',
    description: 'Use lists to organize information clearly',
    descriptionAr: 'استخدم القوائم لتنظيم المعلومات بوضوح',
    score,
    maxScore,
    status,
    value: hasList ? 'نعم' : 'لا',
    recommendation: !hasList ? 'نظم بعض المعلومات في قوائم (<ul> أو <ol>) لسهولة الاستخراج' : undefined,
    recommendationAr: !hasList ? 'نظم بعض المعلومات في قوائم لسهولة الاستخراج' : undefined,
  };
}

function analyzeQuotePresence(content: string): GeoCriterionResult {
  const hasBlockquote = /<blockquote[^>]*>/i.test(content);
  const hasQuoteMarks = /«[^»]+»/.test(content);
  const hasQuote = hasBlockquote || hasQuoteMarks;

  const maxScore = 10;
  const score = hasQuote ? maxScore : 0;
  const status: 'passed' | 'warning' | 'failed' = hasQuote ? 'passed' : 'failed';

  return {
    id: 'quote-presence',
    name: 'Quote Presence',
    nameAr: 'وجود اقتباس',
    description: 'Include quotes from sources or experts',
    descriptionAr: 'أضف اقتباسات من مصادر أو خبراء',
    score,
    maxScore,
    status,
    value: hasQuote ? 'نعم' : 'لا',
    recommendation: !hasQuote ? 'أضف اقتباسات من مصادر موثوقة لتعزيز المصداقية' : undefined,
    recommendationAr: !hasQuote ? 'أضف اقتباسات من مصادر موثوقة لتعزيز المصداقية' : undefined,
  };
}

function analyzeFaqSection(content: string): GeoCriterionResult {
  const headings = extractHeadings(content);

  const hasFaqHeading = headings.some(h =>
    h.level >= 2 && h.level <= 3 && (
      h.text.includes('?') ||
      h.text.includes('؟') ||
      h.text.includes('أسئلة شائعة') ||
      h.text.includes('الأسئلة المتكررة') ||
      h.text.toLowerCase().includes('faq')
    )
  );

  const maxScore = 10;
  const score = hasFaqHeading ? maxScore : 0;
  const status: 'passed' | 'warning' | 'failed' = hasFaqHeading ? 'passed' : 'failed';

  return {
    id: 'faq-section',
    name: 'FAQ Section',
    nameAr: 'قسم الأسئلة الشائعة',
    description: 'Include a FAQ section with common questions',
    descriptionAr: 'أضف قسم أسئلة شائعة مع إجابات مختصرة',
    score,
    maxScore,
    status,
    value: hasFaqHeading ? 'نعم' : 'لا',
    recommendation: !hasFaqHeading ? 'أضف قسم <h2>أسئلة شائعة</h2> مع إجابات مختصرة' : undefined,
    recommendationAr: !hasFaqHeading ? 'أضف قسم أسئلة شائعة مع إجابات مختصرة' : undefined,
  };
}

function analyzeShortSentences(content: string): GeoCriterionResult {
  const avgSentenceLength = getAverageSentenceLength(content);

  const maxScore = 10;
  let score = 0;
  let status: 'passed' | 'warning' | 'failed' = 'failed';

  if (avgSentenceLength <= 20) {
    score = maxScore;
    status = 'passed';
  } else if (avgSentenceLength <= 25) {
    score = Math.round(maxScore * 0.5);
    status = 'warning';
  }

  return {
    id: 'short-sentences',
    name: 'Short Sentences',
    nameAr: 'جمل قصيرة',
    description: 'Average sentence length should be 15-20 words',
    descriptionAr: 'يجب أن يكون متوسط طول الجملة 15-20 كلمة',
    score,
    maxScore,
    status,
    value: `${avgSentenceLength.toFixed(1)} كلمة/جملة`,
    recommendation: avgSentenceLength > 20 ? 'قصر الجمل لتسهيل الاستخراج من محركات AI' : undefined,
    recommendationAr: avgSentenceLength > 20 ? 'قصر الجمل لتسهيل الاستخراج من محركات AI' : undefined,
  };
}

/**
 * Analyze conversational queries in headings — 10 pts
 * AI engines prefer content that directly answers question-form headings
 */
function analyzeConversationalQueries(content: string): GeoCriterionResult {
  const headings = extractHeadings(content);
  const questionWords = ['كيف', 'لماذا', 'ما هو', 'ما هي', 'متى', 'أين', 'من هو', 'من هي', 'هل', 'ماذا', 'ما هي أسباب', 'ما هي طرق'];

  const questionHeadings = headings.filter(h =>
    h.level >= 2 && h.level <= 3 &&
    questionWords.some(qw => h.text.includes(qw) || h.text.includes('؟') || h.text.includes('?'))
  );

  const maxScore = 10;
  let score = 0;
  let status: 'passed' | 'warning' | 'failed' = 'failed';

  if (questionHeadings.length >= 2) {
    score = maxScore;
    status = 'passed';
  } else if (questionHeadings.length === 1) {
    score = Math.round(maxScore * 0.5);
    status = 'warning';
  }

  return {
    id: 'conversational-queries',
    name: 'Conversational Query Headings',
    nameAr: 'عناوين استفهامية',
    description: 'Use question-form H2/H3 headings (How, Why, What) so AI engines can extract direct answers',
    descriptionAr: 'استخدم عناوين H2/H3 بصيغة أسئلة (كيف، لماذا، ما هو) لتسهيل استخراج الإجابات من محركات الذكاء الاصطناعي',
    score,
    maxScore,
    status,
    value: `${questionHeadings.length} عنوان استفهامي`,
    recommendation: score < maxScore ? 'أضف عناوين بصيغة أسئلة مثل "كيف...؟" و"لماذا...؟" لتحسين الظهور في محركات AI' : undefined,
    recommendationAr: score < maxScore ? 'أضف عناوين بصيغة أسئلة مثل "كيف...؟" و"لماذا...؟" لتحسين الظهور في محركات AI' : undefined,
  };
}

/**
 * Analyze named entity density — 5 pts
 * Named entities (people, organizations, places) make content more factual and extractable by AI
 */
function analyzeNamedEntities(content: string): GeoCriterionResult {
  const plainText = stripHtml(content);
  const entityMarkers = [
    'وزير', 'رئيس', 'مدير', 'مسؤول', 'متحدث', 'خبير', 'مصدر',
    'شركة', 'مؤسسة', 'هيئة', 'وزارة', 'جامعة', 'منظمة', 'اتحاد',
    'مدينة', 'دولة', 'محافظة', 'منطقة', 'عاصمة',
  ];

  // Count occurrences near entity markers
  let entityCount = 0;
  entityMarkers.forEach(marker => {
    const regex = new RegExp(`[أ-ي\\s]{2,15}\\s+${marker}|${marker}\\s+[أ-ي\\s]{2,15}`, 'g');
    const matches = plainText.match(regex) || [];
    entityCount += matches.length;
  });

  const maxScore = 5;
  let score = 0;
  let status: 'passed' | 'warning' | 'failed' = 'failed';

  if (entityCount >= 5) {
    score = maxScore;
    status = 'passed';
  } else if (entityCount >= 2) {
    score = Math.round(maxScore * 0.6);
    status = 'warning';
  }

  return {
    id: 'named-entities',
    name: 'Named Entities',
    nameAr: 'الكيانات المسمّاة',
    description: 'Include named people, organizations, and places to make content more factual',
    descriptionAr: 'اذكر أشخاصاً ومؤسسات وأماكن محددة لجعل المحتوى أكثر واقعية',
    score,
    maxScore,
    status,
    value: `${entityCount} كيان`,
    recommendation: score < maxScore ? 'اذكر أسماء أشخاص ومؤسسات وأماكن محددة لتعزيز مصداقية المحتوى' : undefined,
    recommendationAr: score < maxScore ? 'اذكر أسماء أشخاص ومؤسسات وأماكن محددة لتعزيز مصداقية المحتوى' : undefined,
  };
}

/**
 * Analyze key takeaways section — 10 pts
 * Summary boxes help AI engines extract the most important points quickly
 */
function analyzeKeyTakeaways(content: string): GeoCriterionResult {
  const headings = extractHeadings(content);
  const takeawayKeywords = ['أبرز', 'خلاصة', 'أهم النقاط', 'ما يجب معرفته', 'النقاط الرئيسية', 'ملخص', 'أهم ما جاء'];

  const hasTakeawayHeading = headings.some(h =>
    h.level >= 2 && h.level <= 3 &&
    takeawayKeywords.some(kw => h.text.includes(kw))
  );

  // Also check for a <ul> that follows one of these keywords in the HTML
  const hasTakeawayList = takeawayKeywords.some(kw => {
    const idx = content.indexOf(kw);
    if (idx === -1) return false;
    const following = content.slice(idx, idx + 500);
    return /<ul[^>]*>/i.test(following);
  });

  const hasTakeaways = hasTakeawayHeading || hasTakeawayList;
  const maxScore = 10;
  const score = hasTakeaways ? maxScore : 0;
  const status: 'passed' | 'warning' | 'failed' = hasTakeaways ? 'passed' : 'failed';

  return {
    id: 'key-takeaways',
    name: 'Key Takeaways Section',
    nameAr: 'قسم أبرز النقاط',
    description: 'Include a "key takeaways" or summary section with bullet points for AI extraction',
    descriptionAr: 'أضف قسم "أبرز النقاط" أو خلاصة بنقاط مرقّمة لتسهيل الاستخراج بواسطة محركات AI',
    score,
    maxScore,
    status,
    value: hasTakeaways ? 'نعم' : 'لا',
    recommendation: !hasTakeaways ? 'أضف قسم <h2>أبرز النقاط</h2> مع قائمة نقطية في بداية أو نهاية المقال' : undefined,
    recommendationAr: !hasTakeaways ? 'أضف قسم <h2>أبرز النقاط</h2> مع قائمة نقطية في بداية أو نهاية المقال' : undefined,
  };
}

function analyzeNoFluffIntro(firstParagraph: string): GeoCriterionResult {
  const startsWithFluff = FLUFF_PHRASES.some(phrase =>
    firstParagraph.trim().startsWith(phrase)
  );

  const maxScore = 5;
  const score = startsWithFluff ? 0 : maxScore;
  const status: 'passed' | 'warning' | 'failed' = startsWithFluff ? 'failed' : 'passed';

  return {
    id: 'no-fluff-intro',
    name: 'No Fluff Intro',
    nameAr: 'بدون مقدمات طويلة',
    description: 'First paragraph should not start with filler phrases',
    descriptionAr: 'يجب ألا تبدأ الفقرة الأولى بعبارات حشو',
    score,
    maxScore,
    status,
    value: startsWithFluff ? 'يبدأ بحشو' : 'مباشر',
    recommendation: startsWithFluff ? 'ابدأ الفقرة الأولى مباشرة بالموضوع' : undefined,
    recommendationAr: startsWithFluff ? 'ابدأ الفقرة الأولى مباشرة بالموضوع' : undefined,
  };
}
