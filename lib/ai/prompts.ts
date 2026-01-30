/**
 * AI Prompt Templates for Arabic Content
 *
 * All prompts are designed for Arabic-first journalism CMS
 * with focus on SEO optimization and content quality
 */

// System instruction for all Arabic content tasks
export const ARABIC_SYSTEM_INSTRUCTION = `أنت مساعد ذكاء اصطناعي متخصص في الكتابة الصحفية العربية وتحسين محركات البحث (SEO).
- اكتب دائماً بالعربية الفصحى الحديثة
- استخدم أسلوباً صحفياً احترافياً
- ركز على الوضوح والدقة
- راعِ قواعد SEO للمحتوى العربي
- قدم إجابات مباشرة ومفيدة
- عند طلب JSON، أعد JSON فقط بدون أي نص إضافي أو شرح`;

/**
 * SEO Suggestions Prompt
 */
export function buildSeoSuggestionsPrompt(data: {
  title: string;
  content: string;
  excerpt?: string;
  metaTitle?: string;
  metaDescription?: string;
  focusKeyword?: string;
}): string {
  return `حلل المقال التالي وقدم اقتراحات لتحسين SEO:

العنوان: ${data.title}
${data.focusKeyword ? `الكلمة المفتاحية: ${data.focusKeyword}` : ""}
${data.metaTitle ? `عنوان الميتا: ${data.metaTitle}` : ""}
${data.metaDescription ? `وصف الميتا: ${data.metaDescription}` : ""}
${data.excerpt ? `المقتطف: ${data.excerpt}` : ""}

المحتوى:
${data.content.substring(0, 3000)}${data.content.length > 3000 ? "..." : ""}

أعد JSON فقط بالشكل التالي:
{
  "suggestions": [
    {
      "type": "title|meta|content|keyword|structure",
      "priority": "high|medium|low",
      "issue": "وصف المشكلة",
      "suggestion": "الاقتراح للتحسين"
    }
  ],
  "overallAssessment": "تقييم عام",
  "topPriority": "أهم شيء يجب تحسينه"
}

مهم جداً: أعد JSON صالح ومكتمل فقط، بدون أي نص أو شرح قبله أو بعده.`;
}

/**
 * Meta Title Generation Prompt
 */
export function buildMetaTitlePrompt(data: {
  title: string;
  content: string;
  focusKeyword?: string;
}): string {
  return `اكتب عنوان ميتا (Meta Title) مُحسّن لـ SEO للمقال التالي:

العنوان الأصلي: ${data.title}
${data.focusKeyword ? `الكلمة المفتاحية: ${data.focusKeyword}` : ""}

المحتوى:
${data.content.substring(0, 1500)}

المتطلبات:
- الطول: 50-60 حرف بالضبط
- ابدأ بالكلمة المفتاحية إن أمكن
- اجعله جذاباً للنقر
- تجنب الحشو والكلمات الزائدة

أعد JSON فقط بالشكل التالي:
{
  "suggestions": [
    {
      "title": "عنوان الميتا",
      "length": 55,
      "hasKeyword": true,
      "reason": "سبب الاختيار"
    }
  ],
  "recommended": 0
}

مهم جداً: أعد JSON صالح ومكتمل فقط، بدون أي نص قبله أو بعده.`;
}

/**
 * Meta Description Generation Prompt
 */
export function buildMetaDescriptionPrompt(data: {
  title: string;
  content: string;
  focusKeyword?: string;
}): string {
  return `اكتب وصف ميتا (Meta Description) مُحسّن لـ SEO للمقال التالي:

العنوان: ${data.title}
${data.focusKeyword ? `الكلمة المفتاحية: ${data.focusKeyword}` : ""}

المحتوى:
${data.content.substring(0, 1500)}

المتطلبات:
- الطول: 140-160 حرف بالضبط
- اذكر الكلمة المفتاحية في البداية
- اجعله مُحفزاً للنقر (CTA)
- لخص الفائدة للقارئ

أعد JSON فقط بالشكل التالي:
{
  "suggestions": [
    {
      "description": "وصف الميتا",
      "length": 155,
      "hasKeyword": true,
      "hasCTA": true,
      "reason": "سبب الاختيار"
    }
  ],
  "recommended": 0
}

مهم جداً: أعد JSON صالح ومكتمل فقط، بدون أي نص قبله أو بعده.`;
}

/**
 * Keyword Extraction Prompt
 */
export function buildKeywordExtractionPrompt(data: {
  title: string;
  content: string;
}): string {
  return `استخرج الكلمات المفتاحية من المقال التالي:

العنوان: ${data.title}

المحتوى:
${data.content.substring(0, 3000)}

المتطلبات:
- استخرج 10-15 كلمة مفتاحية
- رتبها حسب الأهمية
- اذكر كثافة كل كلمة (تقريبياً)
- اقترح كلمة مفتاحية رئيسية

أعد JSON فقط بالشكل التالي:
{
  "keywords": [
    {
      "keyword": "الكلمة",
      "relevance": "high|medium|low",
      "density": 2.5,
      "type": "primary|secondary|long-tail"
    }
  ],
  "recommendedFocusKeyword": "الكلمة المفتاحية الرئيسية المقترحة",
  "relatedTopics": ["موضوع 1", "موضوع 2"]
}

مهم جداً: أعد JSON صالح ومكتمل فقط، بدون أي نص قبله أو بعده.`;
}

/**
 * Content Expansion Prompt
 */
export function buildExpandContentPrompt(data: {
  selectedText: string;
  context: string;
  tone?: "formal" | "casual" | "professional";
}): string {
  const toneInstructions = {
    formal: "استخدم أسلوباً رسمياً وأكاديمياً",
    casual: "استخدم أسلوباً بسيطاً وسهل الفهم",
    professional: "استخدم أسلوباً صحفياً احترافياً",
  };

  return `وسّع الفقرة التالية مع الحفاظ على السياق:

النص المحدد:
${data.selectedText}

السياق المحيط:
${data.context.substring(0, 1000)}

التعليمات:
- ${toneInstructions[data.tone || "professional"]}
- أضف تفاصيل وأمثلة مفيدة
- حافظ على تدفق المحتوى
- الطول المطلوب: 2-3 أضعاف النص الأصلي

أعد JSON فقط بالشكل التالي:
{
  "expandedText": "النص الموسّع",
  "addedDetails": ["تفصيل 1", "تفصيل 2"],
  "wordCountOriginal": 50,
  "wordCountExpanded": 150
}

مهم جداً: أعد JSON صالح ومكتمل فقط، بدون أي نص قبله أو بعده.`;
}

/**
 * Content Summarization Prompt
 */
export function buildSummarizeContentPrompt(data: {
  content: string;
  targetLength?: "short" | "medium" | "long";
}): string {
  const lengthInstructions = {
    short: "50-100 كلمة",
    medium: "100-200 كلمة",
    long: "200-300 كلمة",
  };

  return `لخص المحتوى التالي:

${data.content}

المتطلبات:
- الطول المطلوب: ${lengthInstructions[data.targetLength || "medium"]}
- حافظ على النقاط الرئيسية
- استخدم أسلوباً واضحاً ومباشراً

أعد JSON فقط بالشكل التالي:
{
  "summary": "الملخص",
  "keyPoints": ["نقطة 1", "نقطة 2", "نقطة 3"],
  "wordCount": 150
}

مهم جداً: أعد JSON صالح ومكتمل فقط، بدون أي نص قبله أو بعده.`;
}

/**
 * Content Rewriting Prompt
 */
export function buildRewriteContentPrompt(data: {
  content: string;
  tone: "formal" | "casual" | "professional" | "simplified";
  preserveMeaning: boolean;
}): string {
  const toneDescriptions = {
    formal: "رسمي وأكاديمي",
    casual: "بسيط وودود",
    professional: "صحفي احترافي",
    simplified: "مبسط للقراء العاديين",
  };

  return `أعد كتابة النص التالي بأسلوب ${toneDescriptions[data.tone]}:

${data.content}

المتطلبات:
- ${data.preserveMeaning ? "حافظ على المعنى الأصلي بدقة" : "يمكن تعديل المعنى قليلاً للتحسين"}
- حسّن الصياغة والوضوح
- تجنب التكرار

أعد JSON فقط بالشكل التالي:
{
  "rewrittenText": "النص المُعاد كتابته",
  "changesApplied": ["تغيير 1", "تغيير 2"],
  "readabilityImproved": true
}

مهم جداً: أعد JSON صالح ومكتمل فقط، بدون أي نص قبله أو بعده.`;
}

/**
 * Introduction Generation Prompt
 */
export function buildGenerateIntroPrompt(data: {
  title: string;
  content: string;
  focusKeyword?: string;
}): string {
  return `اكتب مقدمة جذابة للمقال التالي:

العنوان: ${data.title}
${data.focusKeyword ? `الكلمة المفتاحية: ${data.focusKeyword}` : ""}

محتوى المقال:
${data.content.substring(0, 2000)}

المتطلبات:
- الطول: 80-120 كلمة
- ابدأ بجملة جاذبة (hook)
- اذكر الكلمة المفتاحية في أول 100 كلمة
- وضّح ما سيستفيده القارئ
- اختم بجملة انتقالية

أعد JSON فقط بالشكل التالي:
{
  "introductions": [
    {
      "text": "نص المقدمة",
      "hook": "الجملة الجاذبة المستخدمة",
      "wordCount": 100,
      "hasKeyword": true
    }
  ],
  "recommended": 0
}

مهم جداً: أعد JSON صالح ومكتمل فقط، بدون أي نص قبله أو بعده.`;
}

/**
 * Conclusion Generation Prompt
 */
export function buildGenerateConclusionPrompt(data: {
  title: string;
  content: string;
  focusKeyword?: string;
}): string {
  return `اكتب خاتمة قوية للمقال التالي:

العنوان: ${data.title}
${data.focusKeyword ? `الكلمة المفتاحية: ${data.focusKeyword}` : ""}

محتوى المقال:
${data.content.substring(0, 2000)}

المتطلبات:
- الطول: 60-100 كلمة
- لخص النقاط الرئيسية
- قدم دعوة للعمل (CTA) إن أمكن
- اترك انطباعاً قوياً

أعد JSON فقط بالشكل التالي:
{
  "conclusions": [
    {
      "text": "نص الخاتمة",
      "hasSummary": true,
      "hasCTA": true,
      "wordCount": 80
    }
  ],
  "recommended": 0
}

مهم جداً: أعد JSON صالح ومكتمل فقط، بدون أي نص قبله أو بعده.`;
}

/**
 * Grammar and Spelling Check Prompt
 */
export function buildGrammarCheckPrompt(data: { content: string }): string {
  return `دقق النص التالي لغوياً وإملائياً:

${data.content}

المتطلبات:
- اكتشف الأخطاء الإملائية
- اكتشف الأخطاء النحوية
- اكتشف أخطاء علامات الترقيم
- اقترح تحسينات أسلوبية

أعد JSON فقط بالشكل التالي:
{
  "errors": [
    {
      "type": "spelling|grammar|punctuation|style",
      "original": "النص الخاطئ",
      "correction": "التصحيح",
      "position": "موقع تقريبي في النص",
      "explanation": "شرح الخطأ"
    }
  ],
  "correctedText": "النص بعد التصحيح",
  "summary": {
    "spellingErrors": 2,
    "grammarErrors": 1,
    "punctuationErrors": 0,
    "styleIssues": 1
  },
  "overallQuality": "excellent|good|needsImprovement"
}

مهم جداً: أعد JSON صالح ومكتمل فقط، بدون أي نص قبله أو بعده.`;
}

/**
 * Image Alt Text Generation Prompt
 */
export function buildAltTextPrompt(data: {
  articleTitle: string;
  articleContext: string;
  imagePosition: "featured" | "inline";
  existingCaption?: string;
}): string {
  return `اكتب نصاً بديلاً (Alt Text) لصورة في مقال:

عنوان المقال: ${data.articleTitle}
موقع الصورة: ${data.imagePosition === "featured" ? "صورة رئيسية" : "صورة داخل المحتوى"}
${data.existingCaption ? `التعليق الحالي: ${data.existingCaption}` : ""}

سياق المقال:
${data.articleContext.substring(0, 1000)}

المتطلبات:
- الطول: 80-125 حرف
- وصف مفيد للمكفوفين
- تضمين الكلمات المفتاحية إن أمكن
- تجنب "صورة" أو "صورة لـ"

أعد JSON فقط بالشكل التالي:
{
  "suggestions": [
    {
      "altText": "النص البديل",
      "length": 100,
      "isDescriptive": true,
      "hasKeywords": true
    }
  ],
  "recommended": 0
}

مهم جداً: أعد JSON صالح ومكتمل فقط، بدون أي نص قبله أو بعده.`;
}

/**
 * Related Topics Suggestion Prompt
 */
export function buildRelatedTopicsPrompt(data: {
  title: string;
  content: string;
  existingCategories?: string[];
  existingTags?: string[];
}): string {
  return `اقترح مواضيع ذات صلة للمقال التالي:

العنوان: ${data.title}
${data.existingCategories?.length ? `التصنيفات الحالية: ${data.existingCategories.join("، ")}` : ""}
${data.existingTags?.length ? `الوسوم الحالية: ${data.existingTags.join("، ")}` : ""}

المحتوى:
${data.content.substring(0, 2000)}

اقترح:
- 5 مواضيع مقالات ذات صلة
- 5 وسوم إضافية مقترحة
- 2 تصنيفات مقترحة

أعد JSON فقط بالشكل التالي:
{
  "relatedArticles": [
    {
      "title": "عنوان مقترح",
      "angle": "الزاوية أو المنظور",
      "relevance": "high|medium"
    }
  ],
  "suggestedTags": ["وسم 1", "وسم 2"],
  "suggestedCategories": ["تصنيف 1", "تصنيف 2"]
}

مهم جداً: أعد JSON صالح ومكتمل فقط، بدون أي نص قبله أو بعده.`;
}
