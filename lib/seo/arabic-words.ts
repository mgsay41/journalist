/**
 * Arabic Words Module for SEO Analysis
 * Contains power words, sentiment words, and stop words for Arabic content optimization
 */

// ============================================================================
// POWER WORDS - Words that evoke strong emotions and drive action
// ============================================================================

export const ARABIC_POWER_WORDS = {
  // Urgency - كلمات الإلحاح
  urgency: [
    'الآن',
    'فوراً',
    'عاجل',
    'حصري',
    'محدود',
    'اليوم',
    'فقط',
    'قبل فوات الأوان',
    'لا تفوت',
    'آخر فرصة',
    'سارع',
    'بسرعة',
    'حالاً',
    'مباشرة',
    'قريباً',
  ],

  // Value - كلمات القيمة
  value: [
    'مجاني',
    'مجاناً',
    'خصم',
    'تخفيض',
    'أفضل',
    'أقوى',
    'أسرع',
    'أرخص',
    'توفير',
    'قيمة',
    'استثنائي',
    'فريد',
    'نادر',
    'ممتاز',
    'رائع',
  ],

  // Emotion - كلمات المشاعر
  emotion: [
    'مذهل',
    'رائع',
    'صادم',
    'مفاجئ',
    'سري',
    'غامض',
    'مؤثر',
    'ملهم',
    'مدهش',
    'خطير',
    'مثير',
    'عجيب',
    'غريب',
    'لا يصدق',
    'مذهل',
  ],

  // Action - كلمات الفعل
  action: [
    'اكتشف',
    'تعلم',
    'احصل',
    'جرب',
    'شاهد',
    'اقرأ',
    'تعرف',
    'ابدأ',
    'انضم',
    'سجل',
    'حمل',
    'شارك',
    'تابع',
    'استمتع',
    'استفد',
  ],

  // Trust - كلمات الثقة
  trust: [
    'مضمون',
    'موثوق',
    'رسمي',
    'معتمد',
    'آمن',
    'مؤكد',
    'حقيقي',
    'صادق',
    'موثق',
    'مجرب',
    'مثبت',
    'علمي',
    'دقيق',
    'احترافي',
    'خبير',
  ],

  // Superlatives - كلمات التفضيل
  superlatives: [
    'أهم',
    'أبرز',
    'أول',
    'أكبر',
    'أشهر',
    'أقوى',
    'أفضل',
    'أسوأ',
    'أخطر',
    'أغرب',
    'أجمل',
    'أسرع',
    'أحدث',
    'أقدم',
    'أغلى',
  ],

  // Curiosity - كلمات الفضول
  curiosity: [
    'كيف',
    'لماذا',
    'ماذا',
    'متى',
    'أين',
    'من',
    'السبب',
    'الحقيقة',
    'الخفي',
    'المجهول',
    'الغريب',
    'العجيب',
  ],

  // Numbers context - سياق الأرقام
  numbersContext: [
    'طرق',
    'خطوات',
    'أسباب',
    'نصائح',
    'أسرار',
    'حقائق',
    'أخطاء',
    'علامات',
    'فوائد',
    'مميزات',
    'عيوب',
    'أفكار',
  ],
};

// Flatten all power words into a single array for quick lookup
export const ALL_POWER_WORDS = Object.values(ARABIC_POWER_WORDS).flat();

// ============================================================================
// SENTIMENT WORDS - Words indicating emotional tone
// ============================================================================

export const ARABIC_SENTIMENT_WORDS = {
  // Positive sentiment - مشاعر إيجابية
  positive: [
    'رائع',
    'مذهل',
    'ناجح',
    'إيجابي',
    'فرحة',
    'سعادة',
    'نجاح',
    'تفوق',
    'إنجاز',
    'تقدم',
    'تطور',
    'ازدهار',
    'نمو',
    'تحسن',
    'جيد',
    'ممتاز',
    'متميز',
    'مبهر',
    'مشرق',
    'واعد',
    'أمل',
    'تفاؤل',
    'فخر',
    'اعتزاز',
    'إلهام',
    'حماس',
    'شغف',
    'حب',
    'سلام',
    'استقرار',
  ],

  // Negative sentiment - مشاعر سلبية
  negative: [
    'صادم',
    'خطير',
    'كارثي',
    'مؤلم',
    'تحذير',
    'خطر',
    'أزمة',
    'فشل',
    'انهيار',
    'تراجع',
    'سقوط',
    'خسارة',
    'ضرر',
    'مشكلة',
    'معاناة',
    'صعوبة',
    'تهديد',
    'قلق',
    'خوف',
    'حزن',
    'غضب',
    'إحباط',
    'يأس',
    'ألم',
    'معاناة',
    'ظلم',
    'فساد',
    'جريمة',
    'عنف',
    'صراع',
  ],

  // Neutral sentiment - مشاعر محايدة
  neutral: [
    'تحليل',
    'دراسة',
    'تقرير',
    'بحث',
    'مراجعة',
    'إحصائية',
    'بيانات',
    'معلومات',
    'حقائق',
    'أرقام',
    'نتائج',
    'ملخص',
    'مقارنة',
    'تفاصيل',
    'شرح',
    'توضيح',
    'تعريف',
    'وصف',
    'استعراض',
    'نظرة',
  ],
};

// ============================================================================
// STOP WORDS - Common words to exclude from keyword analysis
// ============================================================================

export const ARABIC_STOP_WORDS = [
  // Articles and particles
  'ال',
  'الـ',
  'و',
  'أو',
  'في',
  'من',
  'إلى',
  'على',
  'عن',
  'مع',
  'بين',
  'ذلك',
  'هذا',
  'هذه',
  'تلك',
  'التي',
  'الذي',
  'اللذان',
  'اللتان',
  'الذين',
  'اللاتي',
  'اللواتي',

  // Pronouns
  'هو',
  'هي',
  'هم',
  'هن',
  'أنا',
  'نحن',
  'أنت',
  'أنتم',
  'أنتن',

  // Prepositions
  'لـ',
  'بـ',
  'كـ',
  'فـ',
  'ثم',
  'حتى',
  'منذ',
  'خلال',
  'بعد',
  'قبل',
  'عند',
  'لدى',
  'حول',
  'ضد',
  'نحو',

  // Conjunctions
  'لكن',
  'بل',
  'غير',
  'سوى',
  'إلا',
  'لأن',
  'إذا',
  'إذ',
  'لو',
  'كي',
  'حيث',
  'بينما',
  'عندما',
  'حين',
  'كلما',

  // Common verbs (forms)
  'كان',
  'كانت',
  'كانوا',
  'يكون',
  'تكون',
  'يكونون',
  'قد',
  'لقد',
  'قال',
  'قالت',
  'قالوا',

  // Demonstratives
  'ما',
  'ماذا',
  'كيف',
  'لماذا',
  'متى',
  'أين',
  'كم',
  'أي',
  'أية',

  // Numbers as words
  'واحد',
  'اثنان',
  'ثلاثة',
  'أربعة',
  'خمسة',
  'ستة',
  'سبعة',
  'ثمانية',
  'تسعة',
  'عشرة',

  // Common adjectives
  'كل',
  'جميع',
  'بعض',
  'أخرى',
  'آخر',
  'نفس',
  'ذات',
  'أكثر',
  'أقل',
  'أول',
  'آخر',
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a word is a power word
 */
export function isPowerWord(word: string): boolean {
  const normalizedWord = normalizeArabicWord(word);
  return ALL_POWER_WORDS.some(
    (pw) => normalizeArabicWord(pw) === normalizedWord
  );
}

/**
 * Get power word category
 */
export function getPowerWordCategory(
  word: string
): keyof typeof ARABIC_POWER_WORDS | null {
  const normalizedWord = normalizeArabicWord(word);

  for (const [category, words] of Object.entries(ARABIC_POWER_WORDS)) {
    if (words.some((w) => normalizeArabicWord(w) === normalizedWord)) {
      return category as keyof typeof ARABIC_POWER_WORDS;
    }
  }

  return null;
}

/**
 * Count power words in text
 */
export function countPowerWords(text: string): {
  count: number;
  words: string[];
  categories: Record<string, number>;
} {
  const words = extractArabicWords(text);
  const foundWords: string[] = [];
  const categories: Record<string, number> = {};

  for (const word of words) {
    if (isPowerWord(word)) {
      foundWords.push(word);
      const category = getPowerWordCategory(word);
      if (category) {
        categories[category] = (categories[category] || 0) + 1;
      }
    }
  }

  return {
    count: foundWords.length,
    words: [...new Set(foundWords)], // Unique words
    categories,
  };
}

/**
 * Analyze sentiment of text
 */
export function analyzeSentiment(text: string): {
  score: number; // -1 to 1
  label: 'positive' | 'negative' | 'neutral';
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
} {
  const words = extractArabicWords(text);

  let positiveCount = 0;
  let negativeCount = 0;
  let neutralCount = 0;

  for (const word of words) {
    const normalizedWord = normalizeArabicWord(word);

    if (
      ARABIC_SENTIMENT_WORDS.positive.some(
        (w) => normalizeArabicWord(w) === normalizedWord
      )
    ) {
      positiveCount++;
    } else if (
      ARABIC_SENTIMENT_WORDS.negative.some(
        (w) => normalizeArabicWord(w) === normalizedWord
      )
    ) {
      negativeCount++;
    } else if (
      ARABIC_SENTIMENT_WORDS.neutral.some(
        (w) => normalizeArabicWord(w) === normalizedWord
      )
    ) {
      neutralCount++;
    }
  }

  const total = positiveCount + negativeCount || 1; // Avoid division by zero
  const score = (positiveCount - negativeCount) / total;

  let label: 'positive' | 'negative' | 'neutral' = 'neutral';
  if (score > 0.1) label = 'positive';
  else if (score < -0.1) label = 'negative';

  return {
    score,
    label,
    positiveCount,
    negativeCount,
    neutralCount,
  };
}

/**
 * Check if title has a number
 */
export function hasNumberInTitle(title: string): {
  hasNumber: boolean;
  numbers: string[];
} {
  // Match Arabic numerals and Arabic-Indic numerals
  const arabicNumerals = title.match(/\d+/g) || [];
  const arabicIndicNumerals = title.match(/[٠-٩]+/g) || [];

  const numbers = [...arabicNumerals, ...arabicIndicNumerals];

  return {
    hasNumber: numbers.length > 0,
    numbers,
  };
}

/**
 * Check if title has sentiment (emotional language)
 */
export function hasSentimentInTitle(title: string): {
  hasSentiment: boolean;
  type: 'positive' | 'negative' | 'neutral' | null;
  words: string[];
} {
  const titleWords = extractArabicWords(title);
  const foundWords: string[] = [];
  let type: 'positive' | 'negative' | 'neutral' | null = null;

  for (const word of titleWords) {
    const normalizedWord = normalizeArabicWord(word);

    for (const [sentimentType, words] of Object.entries(
      ARABIC_SENTIMENT_WORDS
    )) {
      if (words.some((w) => normalizeArabicWord(w) === normalizedWord)) {
        foundWords.push(word);
        if (!type || sentimentType !== 'neutral') {
          type = sentimentType as 'positive' | 'negative' | 'neutral';
        }
      }
    }
  }

  return {
    hasSentiment: foundWords.length > 0,
    type,
    words: [...new Set(foundWords)],
  };
}

/**
 * Check if text is a stop word
 */
export function isStopWord(word: string): boolean {
  const normalizedWord = normalizeArabicWord(word);
  return ARABIC_STOP_WORDS.some(
    (sw) => normalizeArabicWord(sw) === normalizedWord
  );
}

/**
 * Remove stop words from text
 */
export function removeStopWords(text: string): string {
  const words = extractArabicWords(text);
  return words.filter((word) => !isStopWord(word)).join(' ');
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Normalize Arabic word by removing diacritics and normalizing forms
 */
function normalizeArabicWord(word: string): string {
  return (
    word
      // Remove Arabic diacritics (tashkeel)
      .replace(/[\u064B-\u065F\u0670]/g, '')
      // Normalize alef forms
      .replace(/[أإآا]/g, 'ا')
      // Normalize taa marbuta
      .replace(/ة/g, 'ه')
      // Normalize yaa forms
      .replace(/[يى]/g, 'ي')
      // Remove tatweel (kashida)
      .replace(/ـ/g, '')
      // To lowercase (for mixed content)
      .toLowerCase()
      .trim()
  );
}

/**
 * Extract Arabic words from text
 */
function extractArabicWords(text: string): string[] {
  // Match Arabic words (Unicode range for Arabic)
  const matches = text.match(/[\u0600-\u06FF\u0750-\u077F]+/g);
  return matches || [];
}

/**
 * Check if keyword appears at the beginning of title (first 50% of characters)
 */
export function isKeywordAtBeginningOfTitle(
  title: string,
  keyword: string
): boolean {
  if (!title || !keyword) return false;

  const halfLength = Math.floor(title.length / 2);
  const firstHalf = title.substring(0, halfLength).toLowerCase();
  const normalizedKeyword = keyword.toLowerCase();

  return firstHalf.includes(normalizedKeyword);
}

/**
 * Detect if content has a Table of Contents
 */
export function hasTableOfContents(content: string): boolean {
  const tocPatterns = [
    /جدول\s*المحتويات/i,
    /فهرس\s*المحتويات/i,
    /محتويات\s*المقال/i,
    /في\s*هذا\s*المقال/i,
    /ما\s*ستتعلمه/i,
    /ما\s*سنتناوله/i,
    /<nav[^>]*class="[^"]*toc[^"]*"/i,
    /id="toc"/i,
    /class="table-of-contents"/i,
  ];

  return tocPatterns.some((pattern) => pattern.test(content));
}

/**
 * Find paragraphs that exceed word limit
 */
export function findLongParagraphs(
  content: string,
  maxWords: number = 120
): { count: number; positions: number[] } {
  // Remove HTML tags for analysis
  const plainText = content.replace(/<[^>]+>/g, '\n');

  // Split by double newlines or paragraph markers
  const paragraphs = plainText.split(/\n\n+|\r\n\r\n+/);

  const longParagraphPositions: number[] = [];
  let position = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i].trim();
    if (!paragraph) continue;

    const wordCount = paragraph.split(/\s+/).filter(Boolean).length;
    if (wordCount > maxWords) {
      longParagraphPositions.push(i);
    }
    position += paragraph.length + 2; // +2 for newlines
  }

  return {
    count: longParagraphPositions.length,
    positions: longParagraphPositions,
  };
}
