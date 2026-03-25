'use client';

import { useMemo, useEffect, useState, useRef } from 'react';

interface ArticleStructurePanelProps {
  title: string;
  content: string;
  focusKeyword?: string;
}

interface ChecklistItem {
  id: string;
  label: string;
  passed: boolean;
  details?: string;
}

const FLUFF_INTRO_PHRASES = [
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
  'ومن الملاحظ',
  'تجدر الإشارة',
  'جدير بالذكر',
  'من الجدير',
  'لا يخفى',
  'مما لا شك',
];

const WHO_WORDS = ['من', 'الشخص', 'المسؤول', 'الرئيس', 'الوزير', 'القائد', 'المدير', 'الناطق', 'المصدر', 'الخبير', 'المحلل', 'الباحث', 'الطبيب', 'الأستاذ', 'السيد', 'السيدة', 'الدكتور', 'المهندس'];
const WHAT_WORDS = ['ما', 'ماذا', 'الحدث', 'القضية', 'الموضوع', 'المشكلة', 'الظاهرة', 'الحالة', 'القرار', 'الاتفاق', 'المشروع', 'الخطة', 'الاستراتيجية', 'النتيجة', 'التقرير'];
const WHEN_WORDS = ['متى', 'اليوم', 'أمس', 'غداً', 'الأسبوع', 'الشهر', 'السنة', 'العام', 'صباح', 'مساء', 'الآن', 'حالياً', 'مؤخراً', 'مؤخرا', 'سابقاً', 'لاحقاً', 'خلال', 'عند', 'قبل', 'بعد'];
const WHERE_WORDS = ['أين', 'في', 'من', 'إلى', 'المدينة', 'البلد', 'الدولة', 'المنطقة', 'المحافظة', 'العاصمة', 'المركز', 'الموقع', 'المكان', 'المقر'];

function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function countWords(text: string): number {
  if (!text) return 0;
  const strippedText = stripHtml(text);
  const words = strippedText.split(/\s+/).filter(word => word.length > 0);
  return words.length;
}

function getFirstParagraph(html: string): string {
  if (!html) return '';
  const match = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  return match ? stripHtml(match[1]) : '';
}

function extractParagraphs(html: string): string[] {
  if (!html) return [];
  const regex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  const paragraphs: string[] = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    paragraphs.push(stripHtml(match[1]));
  }
  return paragraphs;
}

function extractHeadings(html: string): { level: number; text: string }[] {
  if (!html) return [];
  const headings: { level: number; text: string }[] = [];
  const regex = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    headings.push({
      level: parseInt(match[1], 10),
      text: stripHtml(match[2]),
    });
  }
  return headings;
}

function extractLinks(html: string): { href: string; isInternal: boolean }[] {
  if (!html) return [];
  const links: { href: string; isInternal: boolean }[] = [];
  const regex = /<a[^>]*href=["']([^"']*)["'][^>]*>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const href = match[1];
    const isInternal = !href.startsWith('http') || href.startsWith('/') || href.startsWith('#') || href.includes(window?.location?.hostname || '');
    links.push({ href, isInternal });
  }
  return links;
}

function checkHeadlineWithKeyword(title: string, focusKeyword?: string): { passed: boolean; details: string } {
  const length = title.length;
  const inOptimalRange = length >= 50 && length <= 65;
  
  if (!focusKeyword) {
    return {
      passed: inOptimalRange,
      details: inOptimalRange 
        ? `${length} حرف` 
        : length < 50 
          ? `${length} حرف (يحتاج ${50 - length} حرف)`
          : `${length} حرف (يحتاج تقليص ${length - 65} حرف)`
    };
  }
  
  const hasKeyword = title.toLowerCase().includes(focusKeyword.toLowerCase());
  const passed = inOptimalRange && hasKeyword;
  
  let details = '';
  if (!inOptimalRange && !hasKeyword) {
    details = length < 50 
      ? `قصير (${length} حرف) ولا يحتوي الكلمة المفتاحية`
      : `طويل (${length} حرف) ولا يحتوي الكلمة المفتاحية`;
  } else if (!inOptimalRange) {
    details = length < 50 
      ? `${length} حرف (يحتاج ${50 - length} حرف)`
      : `${length} حرف (يحتاج تقليص ${length - 65} حرف)`;
  } else if (!hasKeyword) {
    details = 'لا يحتوي الكلمة المفتاحية';
  } else {
    details = `${length} حرف مع الكلمة المفتاحية`;
  }
  
  return { passed, details };
}

function checkFirstParagraph5W(text: string): { passed: boolean; details: string } {
  const lowerText = text.toLowerCase();
  
  let foundCount = 0;
  const foundElements: string[] = [];
  
  if (WHO_WORDS.some(w => lowerText.includes(w.toLowerCase()))) {
    foundCount++;
    foundElements.push('من');
  }
  if (WHAT_WORDS.some(w => lowerText.includes(w.toLowerCase()))) {
    foundCount++;
    foundElements.push('ماذا');
  }
  if (WHEN_WORDS.some(w => lowerText.includes(w.toLowerCase()))) {
    foundCount++;
    foundElements.push('متى');
  }
  if (WHERE_WORDS.some(w => lowerText.includes(w.toLowerCase()))) {
    foundCount++;
    foundElements.push('أين');
  }
  
  return {
    passed: foundCount >= 2,
    details: foundCount >= 2 
      ? `${foundElements.slice(0, 2).join(' + ')}`
      : `يحتاج ${2 - foundCount} من: من/ماذا/متى/أين`
  };
}

function checkSubheadingsFrequency(content: string): { passed: boolean; details: string } {
  const wordCount = countWords(content);
  const headings = extractHeadings(content);
  const h2Count = headings.filter(h => h.level === 2).length + headings.filter(h => h.level === 3).length;
  
  if (wordCount < 100) {
    return { passed: true, details: 'محتوى قصير' };
  }
  
  const wordsPerHeading = h2Count > 0 ? Math.round(wordCount / h2Count) : wordCount;
  const passed = wordsPerHeading >= 100 && wordsPerHeading <= 150;
  
  if (h2Count === 0) {
    return { passed: false, details: 'لا توجد عناوين فرعية' };
  }
  
  return {
    passed,
    details: passed 
      ? `${h2Count} عنوان لكل ${wordCount} كلمة`
      : wordsPerHeading < 100 
        ? `عناوين كثيرة (${h2Count}) - متوسط ${wordsPerHeading} كلمة/عنوان`
        : `عناوين قليلة (${h2Count}) - متوسط ${wordsPerHeading} كلمة/عنوان`
  };
}

function checkNumbersStatistics(content: string): { passed: boolean; details: string } {
  const strippedContent = stripHtml(content);
  const numbers = strippedContent.match(/\d+(?:[.,]\d+)?%?/g) || [];
  const uniqueNumbers = [...new Set(numbers)];
  
  return {
    passed: uniqueNumbers.length >= 2,
    details: uniqueNumbers.length >= 2 
      ? `${uniqueNumbers.length} رقم/نسبة`
      : uniqueNumbers.length === 1 
        ? 'رقم واحد فقط'
        : 'لا توجد أرقام'
  };
}

function checkBlockquote(content: string): { passed: boolean; details: string } {
  const hasBlockquoteTag = /<blockquote[^>]*>/i.test(content);
  const hasQuotePattern = /«[^»]+»/.test(content);
  const hasQuoteMarks = /"[^"]+"/.test(content);
  
  if (hasBlockquoteTag) {
    return { passed: true, details: 'اقتباس صريح' };
  }
  if (hasQuotePattern || hasQuoteMarks) {
    return { passed: true, details: 'نص بين علامات اقتباس' };
  }
  
  return { passed: false, details: 'لا توجد اقتباسات' };
}

function checkFaqSection(content: string): { passed: boolean; details: string } {
  const headings = extractHeadings(content);
  const faqPatterns = [
    /أسئلة\s*شائعة/i,
    /الأسئلة\s*الشائعة/i,
    /أسئلة\s*متكررة/i,
    /الأسئلة\s*المتكررة/i,
    /الأسئلة\s*الأكثر\s*شيوعاً/i,
    /faq/i,
  ];
  
  const hasFaqHeading = headings.some(h => 
    faqPatterns.some(pattern => pattern.test(h.text))
  );
  
  const hasQuestionHeadings = headings.some(h => 
    h.text.includes('?') || h.text.includes('؟')
  );
  
  if (hasFaqHeading) {
    return { passed: true, details: 'قسم أسئلة شائعة موجود' };
  }
  if (hasQuestionHeadings) {
    return { passed: true, details: 'عناوين على شكل أسئلة' };
  }
  
  return { passed: false, details: 'لا يوجد قسم أسئلة' };
}

function checkInternalLinks(content: string): { passed: boolean; details: string } {
  const links = extractLinks(content);
  const internalLinks = links.filter(l => l.isInternal);
  const count = internalLinks.length;
  
  return {
    passed: count >= 1,
    details: count >= 1 
      ? `${count} رابط داخلي`
      : 'لا توجد روابط داخلية'
  };
}

function checkShortParagraphs(content: string): { passed: boolean; details: string } {
  const paragraphs = extractParagraphs(content).filter(p => p.trim().length > 0);
  
  if (paragraphs.length === 0) {
    return { passed: true, details: 'لا توجد فقرات' };
  }
  
  const wordCounts = paragraphs.map(p => countWords(p));
  const avgWords = wordCounts.reduce((a, b) => a + b, 0) / paragraphs.length;
  
  return {
    passed: avgWords < 40,
    details: avgWords < 40 
      ? `متوسط ${Math.round(avgWords)} كلمة/فقرة`
      : `متوسط طويل: ${Math.round(avgWords)} كلمة/فقرة`
  };
}

function checkNoFluffIntro(content: string): { passed: boolean; details: string } {
  const firstParagraph = getFirstParagraph(content);
  const firstWords = firstParagraph.split(/\s+/).slice(0, 5).join(' ');
  
  const hasFluff = FLUFF_INTRO_PHRASES.some(phrase => 
    firstParagraph.toLowerCase().startsWith(phrase.toLowerCase()) ||
    firstWords.toLowerCase().includes(phrase.toLowerCase())
  );
  
  return {
    passed: !hasFluff,
    details: hasFluff 
      ? 'يبدأ بعبارة حشو'
      : 'بداية مباشرة'
  };
}

function checkKeywordInFirstParagraph(content: string, focusKeyword?: string): { passed: boolean; details: string } {
  if (!focusKeyword) {
    return { passed: true, details: 'لا توجد كلمة مفتاحية' };
  }
  
  const firstParagraph = getFirstParagraph(content);
  const hasKeyword = firstParagraph.toLowerCase().includes(focusKeyword.toLowerCase());
  
  return {
    passed: hasKeyword,
    details: hasKeyword 
      ? 'الكلمة المفتاحية في الفقرة الأولى'
      : 'الكلمة المفتاحية غير موجودة في المقدمة'
  };
}

export function analyzeStructure(title: string, content: string, focusKeyword?: string): ChecklistItem[] {
  return [
    {
      id: 'headline-keyword',
      label: 'عنوان بالكلمة المفتاحية (50-65 حرف)',
      ...checkHeadlineWithKeyword(title, focusKeyword),
    },
    {
      id: 'first-paragraph-5w',
      label: 'الفقرة الأولى تجيب من/ماذا/متى/أين',
      ...checkFirstParagraph5W(getFirstParagraph(content)),
    },
    {
      id: 'subheadings-frequency',
      label: 'عناوين فرعية كل 100-150 كلمة',
      ...checkSubheadingsFrequency(content),
    },
    {
      id: 'numbers-statistics',
      label: 'رقمين/إحصائيات على الأقل',
      ...checkNumbersStatistics(content),
    },
    {
      id: 'blockquote',
      label: 'اقتباس واحد على الأقل',
      ...checkBlockquote(content),
    },
    {
      id: 'faq-section',
      label: 'قسم أسئلة شائعة',
      ...checkFaqSection(content),
    },
    {
      id: 'internal-links',
      label: 'رابط داخلي واحد على الأقل',
      ...checkInternalLinks(content),
    },
    {
      id: 'short-paragraphs',
      label: 'فقرات قصيرة (متوسط <40 كلمة)',
      ...checkShortParagraphs(content),
    },
    {
      id: 'no-fluff-intro',
      label: 'بداية مباشرة بدون حشو',
      ...checkNoFluffIntro(content),
    },
    {
      id: 'keyword-first-paragraph',
      label: 'الكلمة المفتاحية في الفقرة الأولى',
      ...checkKeywordInFirstParagraph(content, focusKeyword),
    },
  ];
}

export function ArticleStructurePanel({ title, content, focusKeyword }: ArticleStructurePanelProps) {
  const [debouncedContent, setDebouncedContent] = useState(content);
  const [debouncedTitle, setDebouncedTitle] = useState(title);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setDebouncedContent(content);
      setDebouncedTitle(title);
    }, 500);
    
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [content, title]);

  const checklist = useMemo(() => {
    return analyzeStructure(debouncedTitle, debouncedContent, focusKeyword);
  }, [debouncedTitle, debouncedContent, focusKeyword]);

  const passedCount = checklist.filter(item => item.passed).length;
  const score = Math.round((passedCount / checklist.length) * 100);
  
  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-success';
    if (score >= 50) return 'text-warning';
    return 'text-danger';
  };
  
  const getScoreStrokeColor = (score: number) => {
    if (score >= 70) return 'text-success';
    if (score >= 50) return 'text-warning';
    return 'text-danger';
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-center p-4">
        <div className="relative w-24 h-24">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="48"
              cy="48"
              r="40"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className="text-muted"
            />
            <circle
              cx="48"
              cy="48"
              r="40"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeDasharray={`${(score / 100) * 251.2} 251.2`}
              className={getScoreStrokeColor(score)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-bold ${getScoreColor(score)}`}>
              {score}
            </span>
            <span className="text-xs text-muted-foreground">من 100</span>
          </div>
        </div>
      </div>

      <div className="text-center text-sm text-muted-foreground mb-2">
        {passedCount}/{checklist.length} معايير محققة
      </div>

      <div className="space-y-2">
        {checklist.map((item) => (
          <div
            key={item.id}
            className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${
              item.passed ? 'bg-success/5' : 'bg-muted/50'
            }`}
          >
            <span className={`text-lg mt-0.5 shrink-0 ${
              item.passed ? 'text-success' : 'text-danger'
            }`}>
              {item.passed ? '✓' : '✗'}
            </span>
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-medium ${
                item.passed ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {item.label}
              </div>
              {item.details && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  {item.details}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ArticleStructurePanel;
