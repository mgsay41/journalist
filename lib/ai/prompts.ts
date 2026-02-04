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

// ============================================
// Article Completion Prompts (Phase 2)
// ============================================

/**
 * Complete Article Analysis Prompt
 * This is the main prompt that analyzes the article and generates all metadata
 */
export function buildCompleteArticlePrompt(data: {
  title: string;
  content: string;
  availableCategories: Array<{ id: string; name: string }>;
  availableTags: Array<{ id: string; name: string }>;
}): string {
  // Format categories as a numbered list for clarity
  const categoryList = data.availableCategories.length > 0
    ? data.availableCategories.map((c, i) => `${i + 1}. "${c.name}"`).join("\n")
    : "لا توجد تصنيفات";

  // Format tags as a list
  const tagList = data.availableTags.length > 0
    ? data.availableTags.slice(0, 50).map(t => `"${t.name}"`).join("، ")
    : "لا توجد وسوم";

  return `حلل المقال التالي بشكل شامل وأنشئ جميع البيانات الوصفية المطلوبة:

العنوان: ${data.title}

المحتوى:
${data.content.substring(0, 5000)}${data.content.length > 5000 ? "..." : ""}

=== التصنيفات المتاحة في الموقع (يجب الاختيار منها أولاً) ===
${categoryList}

=== الوسوم المتاحة في الموقع (يجب الاختيار منها أولاً) ===
${tagList}

المطلوب:
1. استخراج الكلمة المفتاحية الرئيسية والكلمات الثانوية
2. اختيار التصنيفات: يجب استخدام الأسماء بالضبط كما هي مكتوبة في القائمة أعلاه. فقط إذا لم يوجد تصنيف مناسب إطلاقاً، اقترح تصنيفاً جديداً
3. اختيار الوسوم: يجب استخدام الأسماء بالضبط كما هي مكتوبة في القائمة أعلاه. فقط إذا لم يوجد وسم مناسب، اقترح وسماً جديداً
4. إنشاء رابط URL باللغة الإنجليزية (slug) - قصير ومعبر
5. تحسين العنوان الرئيسي: اقترح 3 عناوين محسّنة للمقال مع:
   - إضافة كلمات قوية (مذهل، حصري، عاجل، أفضل، إلخ)
   - إضافة أرقام إن أمكن (5 نصائح، 10 طرق، إلخ)
   - وضع الكلمة المفتاحية في البداية إن أمكن
   - جعل العنوان جذاباً للنقر
6. إنشاء 3 خيارات لعنوان الميتا (50-60 حرف)
7. إنشاء 3 خيارات لوصف الميتا (140-160 حرف)
8. إنشاء مقتطف/ملخص للمقال (150-250 حرف)
9. تقييم ما إذا كان المقال يحتاج مقدمة أو خاتمة
10. فحص الأخطاء النحوية والإملائية

أعد JSON فقط بالشكل التالي:
{
  "focusKeyword": "الكلمة المفتاحية الرئيسية",
  "secondaryKeywords": ["كلمة 1", "كلمة 2", "كلمة 3"],

  "suggestedCategories": [
    {
      "name": "اسم التصنيف",
      "isExisting": true,
      "confidence": 0.95,
      "reason": "سبب الاختيار"
    }
  ],

  "suggestedTags": [
    {
      "name": "اسم الوسم",
      "isExisting": true,
      "relevance": "high"
    }
  ],

  "slug": "article-url-in-english",

  "titleSuggestions": [
    {
      "title": "العنوان المحسّن للمقال",
      "improvements": ["إضافة كلمة قوية", "إضافة رقم"],
      "score": 90,
      "hasPowerWords": true,
      "hasNumber": true,
      "hasKeywordAtStart": true
    }
  ],

  "metaTitles": [
    {
      "title": "عنوان الميتا",
      "length": 55,
      "score": 90,
      "hasKeyword": true
    }
  ],

  "metaDescriptions": [
    {
      "description": "وصف الميتا",
      "length": 150,
      "score": 85,
      "hasKeyword": true,
      "hasCTA": true
    }
  ],

  "excerpt": "مقتطف/ملخص المقال",

  "contentAnalysis": {
    "hasStrongIntro": true,
    "hasConclusion": true,
    "suggestedIntro": null,
    "suggestedConclusion": null,
    "tone": "formal|professional|casual",
    "targetAudience": "وصف الجمهور المستهدف"
  },

  "grammarIssues": [
    {
      "type": "spelling|grammar|punctuation|style",
      "original": "النص الخاطئ",
      "correction": "التصحيح",
      "explanation": "شرح الخطأ"
    }
  ],

  "seoAnalysis": {
    "score": 75,
    "status": "good|needs-improvement|poor",
    "topIssues": ["مشكلة 1", "مشكلة 2"]
  }
}

مهم جداً:
- أعد JSON صالح ومكتمل فقط، بدون أي نص قبله أو بعده
- عند اختيار التصنيفات: انسخ الاسم بالضبط من القائمة المتاحة (مثال: إذا كان التصنيف "أخبار مصر" في القائمة، اكتب "أخبار مصر" وليس "اخبار مصر" أو "أخبار في مصر")
- عند اختيار الوسوم: انسخ الاسم بالضبط من القائمة المتاحة
- ضع isExisting: true فقط إذا كان الاسم موجود بالضبط في القائمة المتاحة
- الرابط (slug) يجب أن يكون باللغة الإنجليزية وقصير ومعبر`;
}

/**
 * Generate English Slug from Arabic Title/Content
 */
export function buildSlugGenerationPrompt(data: {
  title: string;
  content: string;
}): string {
  return `أنشئ رابط URL باللغة الإنجليزية (slug) للمقال التالي:

العنوان: ${data.title}

المحتوى (أول 500 حرف):
${data.content.substring(0, 500)}

المتطلبات:
- الرابط يجب أن يكون باللغة الإنجليزية فقط
- استخدم الترجمة الدلالية وليس الحرفية
- الطول: 3-6 كلمات كحد أقصى
- استخدم الشرطات (-) للفصل بين الكلمات
- اختر كلمات تعبر عن معنى المقال وليس ترجمة حرفية
- يجب أن يكون صديقاً لـ SEO

أمثلة:
- "الذكاء الاصطناعي في الصحافة" → "ai-in-journalism"
- "أفضل 10 نصائح للكتابة" → "top-writing-tips"
- "مستقبل التكنولوجيا في 2025" → "tech-future-2025"

أعد JSON فقط بالشكل التالي:
{
  "slug": "english-slug-here",
  "alternatives": ["alt-slug-1", "alt-slug-2"],
  "reasoning": "سبب اختيار هذا الرابط"
}

مهم جداً: أعد JSON صالح ومكتمل فقط، بدون أي نص قبله أو بعده.`;
}

/**
 * Category Assignment Prompt
 */
export function buildCategoryAssignmentPrompt(data: {
  title: string;
  content: string;
  availableCategories: Array<{ id: string; name: string; description?: string }>;
}): string {
  const categoriesInfo = data.availableCategories
    .map(c => `- ${c.name}${c.description ? `: ${c.description}` : ''}`)
    .join("\n");

  return `صنّف المقال التالي إلى التصنيفات المناسبة:

العنوان: ${data.title}

المحتوى:
${data.content.substring(0, 2000)}

التصنيفات المتاحة:
${categoriesInfo || "لا توجد تصنيفات متاحة"}

المطلوب:
- اختر 1-3 تصنيفات من القائمة المتاحة
- إذا لم تجد تصنيفاً مناسباً، اقترح تصنيفاً جديداً
- رتب التصنيفات حسب مدى ملاءمتها

أعد JSON فقط بالشكل التالي:
{
  "assignedCategories": [
    {
      "name": "اسم التصنيف",
      "isExisting": true,
      "confidence": 0.95,
      "reason": "سبب الاختيار"
    }
  ],
  "primaryCategory": "التصنيف الرئيسي",
  "suggestedNewCategories": []
}

مهم جداً: أعد JSON صالح ومكتمل فقط، بدون أي نص قبله أو بعده.`;
}

/**
 * Tag Generation Prompt
 */
export function buildTagGenerationPrompt(data: {
  title: string;
  content: string;
  availableTags: Array<{ name: string }>;
  maxTags?: number;
}): string {
  const existingTags = data.availableTags.slice(0, 100).map(t => t.name).join("، ");
  const maxTags = data.maxTags || 10;

  return `استخرج الوسوم المناسبة للمقال التالي:

العنوان: ${data.title}

المحتوى:
${data.content.substring(0, 2000)}

الوسوم الموجودة في الموقع:
${existingTags || "لا توجد وسوم"}

المطلوب:
- اختر ${maxTags} وسوم كحد أقصى
- استخدم الوسوم الموجودة إذا كانت مناسبة
- اقترح وسوماً جديدة إذا لزم الأمر
- رتب الوسوم حسب الأهمية

أعد JSON فقط بالشكل التالي:
{
  "tags": [
    {
      "name": "اسم الوسم",
      "isExisting": true,
      "relevance": "high|medium|low"
    }
  ],
  "primaryTags": ["وسم رئيسي 1", "وسم رئيسي 2"]
}

مهم جداً: أعد JSON صالح ومكتمل فقط، بدون أي نص قبله أو بعده.`;
}

/**
 * Excerpt/Summary Generation Prompt
 */
export function buildExcerptGenerationPrompt(data: {
  title: string;
  content: string;
  focusKeyword?: string;
}): string {
  return `اكتب مقتطفاً/ملخصاً جذاباً للمقال التالي:

العنوان: ${data.title}
${data.focusKeyword ? `الكلمة المفتاحية: ${data.focusKeyword}` : ""}

المحتوى:
${data.content.substring(0, 2000)}

المتطلبات:
- الطول: 150-250 حرف
- يجب أن يجذب القارئ للنقر
- اذكر الكلمة المفتاحية إن أمكن
- لخص الفائدة الرئيسية للقارئ
- استخدم أسلوباً صحفياً احترافياً

أعد JSON فقط بالشكل التالي:
{
  "excerpts": [
    {
      "text": "نص المقتطف",
      "length": 180,
      "hasKeyword": true,
      "isEngaging": true
    }
  ],
  "recommended": 0
}

مهم جداً: أعد JSON صالح ومكتمل فقط، بدون أي نص قبله أو بعده.`;
}

/**
 * Content Quality Assessment Prompt
 */
export function buildContentQualityPrompt(data: {
  title: string;
  content: string;
}): string {
  return `قيّم جودة المحتوى التالي واقترح تحسينات:

العنوان: ${data.title}

المحتوى:
${data.content.substring(0, 3000)}

المطلوب تقييمه:
1. هل المقدمة قوية وجذابة؟
2. هل هناك خاتمة واضحة؟
3. هل الفقرات منظمة ومتسلسلة؟
4. هل هناك عناوين فرعية كافية؟
5. هل المحتوى شامل ومفيد؟

أعد JSON فقط بالشكل التالي:
{
  "hasStrongIntro": true,
  "hasConclusion": true,
  "hasGoodStructure": true,
  "hasSubheadings": true,
  "isComprehensive": true,

  "suggestedIntro": "مقدمة مقترحة إذا كانت المقدمة ضعيفة أو غير موجودة",
  "suggestedConclusion": "خاتمة مقترحة إذا كانت الخاتمة ضعيفة أو غير موجودة",

  "improvements": [
    {
      "type": "structure|content|style",
      "issue": "وصف المشكلة",
      "suggestion": "الاقتراح للتحسين"
    }
  ],

  "overallScore": 85,
  "overallAssessment": "تقييم عام للمحتوى"
}

مهم جداً: أعد JSON صالح ومكتمل فقط، بدون أي نص قبله أو بعده.`;
}

// ============================================
// AI Outlining Prompts (Phase 17.5.2)
// ============================================

/**
 * Article Outline Generation Prompt
 * Generates a comprehensive outline based on a topic
 */
export function buildOutlineGenerationPrompt(data: {
  topic: string;
  category?: string;
  tone?: "professional" | "casual" | "academic" | "opinion";
  targetLength?: number;
  keyPoints?: string[];
}): string {
  const toneInstructions = {
    professional: "أسلوب صحفي احترافي وموضوعي",
    casual: "أسلوب بسيط وسهل الفهم",
    academic: "أسلوب أكاديمي وبحثي",
    opinion: "أسلوب رأي وتحليل شخصي",
  };

  const targetWords = data.targetLength || 800;

  return `أنشئ مخططاً تفصيلياً لمقال عن الموضوع التالي:

الموضوع: ${data.topic}
${data.category ? `التصنيف: ${data.category}` : ""}
${data.keyPoints?.length ? `النقاط الرئيسية المطلوب تناولها:\n${data.keyPoints.join("\n")}` : ""}
الأسلوب: ${toneInstructions[data.tone || "professional"]}
الطول المستهدف: ${targetWords} كلمة

المطلوب:
1. أنشئ هيكلاً للمقال بأسلوب هرمي مقلوب (الأهم أولاً)
2. قسّم المقال إلى أقسام رئيسية (H2) وقسم فرعي (H3)
3. لكل قسم، اكتب:
   - عنوان واضح وجذاب
   - وصف مختصر للمحتوى (سطرين)
   - النقاط الرئيسية التي يجب تغطيتها
   - عدد الكلمات المقترح للقسم

أعد JSON فقط بالشكل التالي:
{
  "title": "عنوان مقترح للمقال",
  "estimatedReadingTime": 5,
  "outline": [
    {
      "level": 1,
      "title": "عنوان القسم الرئيسي (H2)",
      "description": "وصف مختصر لمحتوى هذا القسم",
      "keyPoints": ["نقطة 1", "نقطة 2", "نقطة 3"],
      "wordCount": 150
    },
    {
      "level": 2,
      "title": "قسم فرعي (H3)",
      "description": "وصف مختصر",
      "keyPoints": ["نقطة 1"],
      "wordCount": 100
    }
  ],
  "introduction": {
    "title": "عنوان المقدمة",
    "suggestedHook": "جملة افتتاحية جاذبة مقترحة",
    "keyPoints": ["النقاط التي يجب تغطيتها في المقدمة"],
    "wordCount": 100
  },
  "conclusion": {
    "title": "عنوان الخاتمة",
    "keyPoints": ["النقاط التي يجب تغطيتها في الخاتمة"],
    "wordCount": 80
  },
  "suggestedTags": ["وسم 1", "وسم 2", "وسم 3"],
  "seoTips": ["نصيحة SEO 1", "نصيحة SEO 2"]
}

مهم جداً: أعد JSON صالح ومكتمل فقط، بدون أي نص قبله أو بعده.`;
}

/**
 * Expand Outline Section Prompt
 * Expands a single outline section into full content
 */
export function buildExpandSectionPrompt(data: {
  sectionTitle: string;
  sectionDescription: string;
  keyPoints: string[];
  targetWordCount: number;
  context?: string;
  tone?: "professional" | "casual" | "academic";
}): string {
  return `وسّع القسم التالي من مخطط المقال إلى محتوى كامل:

عنوان القسم: ${data.sectionTitle}
الوصف: ${data.sectionDescription}
النقاط الرئيسية:
${data.keyPoints.map(p => `- ${p}`).join("\n")}
العدد المستهدف للكلمات: ${data.targetWordCount}
${data.context ? `السياق السابق:\n${data.context.substring(0, 500)}` : ""}

المتطلبات:
- اكتب محتوى كامل وجاهز للنشر
- استخدم فقرات قصيرة ومقروءة
- أضف أمثلة وإحصائيات إن أمكن
- استخدم أسلوباً ${data.tone || "professional"}
- ركز على القيمة والفائدة للقارئ

أعد JSON فقط بالشكل التالي:
{
  "content": "المحتوى الكامل للقسم",
  "wordCount": 250,
  "paragraphs": 5,
  "includesExamples": true,
  "suggestedTransitions": {
    "fromPrevious": "جملة انتقالية من القسم السابق",
    "toNext": "جملة انتقالية للقسم التالي"
  }
}

مهم جداً: أعد JSON صالح ومكتمل فقط، بدون أي نص قبله أو بعده.`;
}

// ============================================
// Inline AI Writing Assistant Prompts (Phase 17.5.2)
// ============================================

/**
 * Auto-complete Sentence Prompt
 * Completes the current sentence being typed
 */
export function buildAutocompletePrompt(data: {
  precedingText: string;
  currentPartial: string;
  context: string;
}): string {
  return `أكمل الجملة الحالية بشكل احترافي:

النص السابق:
${data.precedingText.slice(-200)}

الجملة الحالية (غير مكتملة):
${data.currentPartial}

السياق العام:
${data.context.slice(-500)}

المتطلبات:
- أكمل الجملة بطريقة طبيعية واحترافية
- حافظ على الأسلوب والسياق
- اجعل الإكمال مختصراً (كلمات قليلة)
- استخدم العربية الفصحى

أعد JSON فقط بالشكل التالي:
{
  "completions": [
    {
      "text": "نص الإكمال",
      "confidence": 0.9
    }
  ]
}

مهم جداً: أعد JSON صالح ومكتمل فقط، بدون أي نص قبله أو بعده.`;
}

/**
 * Improve Word Choice Prompt
 * Suggests better word alternatives
 */
export function buildWordChoicePrompt(data: {
  word: string;
  context: string;
  tone?: "professional" | "casual" | "creative";
}): string {
  return `اقترح بدائل أفضل لكلمة "${data.word}":

السياق:
${data.context}

المتطلبات:
- اقترح 3-5 بدائل للكلمة
- كل بديل يجب أن يكون أكثر دقة أو قوة
- وضّح الفرق في المعنى أو النبرة
- تأكد أن البديل يناسب السياق

أعد JSON فقط بالشكل التالي:
{
  "suggestions": [
    {
      "word": "البديل المقترح",
      "reason": "لماذا هذا البديل أفضل",
      "tone": "formal|casual|strong|subtle"
    }
  ]
}

مهم جداً: أعد JSON صالح ومكتمل فقط، بدون أي نص قبله أو بعده.`;
}

/**
 * Passive Voice Detection Prompt
 * Detects and suggests fixes for passive voice
 */
export function buildPassiveVoicePrompt(data: {
  sentence: string;
}): string {
  return `افحص الجملة التالية لاكتشاف صيغة المبني للمجهول:

الجملة: ${data.sentence}

المتطلبات:
- حدد ما إذا كانت الجملة بصيغة المبني للمجهول
- إذا كانت، اقترح البديل بالمبني للمعلوم
- وضّح لماذا البديل أفضل

أعد JSON فقط بالشكل التالي:
{
  "isPassive": true,
  "passiveSegments": [
    {
      "original": "الجزء بصيغة المجهول",
      "active": "البديل بصيغة المعلوم",
      "reason": "لماذا التغيير"
    }
  ],
  "correctedSentence": "الجملة المصححة",
  "improved": true
}

مهم جداً: أعد JSON صالح ومكتمل فقط، بدون أي نص قبله أو بعده.`;
}

/**
 * Transition Words Suggestion Prompt
 * Suggests transition words for better flow
 */
export function buildTransitionWordsPrompt(data: {
  previousSentence: string;
  nextSentence: string;
  relationship?: "addition" | "contrast" | "cause" | "sequence" | "example";
}): string {
  return `اقترح كلمات انتقالية بين الجملتين:

الجملة الأولى:
${data.previousSentence}

الجملة الثانية:
${data.nextSentence}

${data.relationship ? `العلاقة المطلوبة: ${data.relationship}` : "حدد العلاقة المناسبة"}

المتطلبات:
- اقترح 5-10 كلمات انتقالية مناسبة
- كل اقتراح مع شرح موجز
- رتبها حسب الأنسبية

أعد JSON فقط بالشكل التالي:
{
  "relationship": "addition|contrast|cause|sequence|example",
  "suggestions": [
    {
      "word": "كلمة الانتقال",
      "placement": "كيفية وضعها",
      "reason": "لماذا مناسبة"
    }
  ]
}

مهم جداً: أعد JSON صالح ومكتمل فقط، بدون أي نص قبله أو بعده.`;
}

// ============================================
// Headline Optimization Prompts (Phase 17.5.2)
// ============================================

/**
 * Headline Optimization Prompt
 * Analyzes and suggests headline improvements
 */
export function buildHeadlineOptimizationPrompt(data: {
  headline: string;
  content?: string;
  category?: string;
}): string {
  return `حلّل وحقّن العنوان التالي:

العنوان الحالي:
${data.headline}

${data.content ? `محتوى المقال (أول 500 كلمة):\n${data.content.substring(0, 1000)}` : ""}
${data.category ? `التصنيف: ${data.category}` : ""}

المتطلبات:
1. قيّم العنوان الحالي (0-100)
2. اقترح 10 عناوين بديلة محسّنة:
   - 3 عناوين احترافية
   - 3 عناوين جذابة (click-worthy)
   - 2 عنوان بكلمات قوية
   - 2 عنوان بأرقام
3. لكل عنوان، حدد:
   - الدرجة المتوقعة (CTR score)
   - الطول (عدد الأحرف)
   - يحتوي على كلمات قوية؟
   - يحتوي على رقم؟
   - الكلمات المفتاحية المستخدمة

أعد JSON فقط بالشكل التالي:
{
  "currentHeadline": {
    "headline": "العنوان الحالي",
    "score": 65,
    "length": 45,
    "hasPowerWords": false,
    "hasNumber": false,
    "issues": ["مشكلة 1", "مشكلة 2"]
  },
  "suggestions": [
    {
      "headline": "العنوان المقترح",
      "score": 85,
      "length": 48,
      "type": "professional|catchy|power-words|number",
      "hasPowerWords": true,
      "hasNumber": false,
      "improvements": ["تحسين 1", "تحسين 2"]
    }
  ],
  "recommended": 0
}

مهم جداً: أعد JSON صالح ومكتمل فقط، بدون أي نص قبله أو بعده.`;
}

// ============================================
// Smart Auto-Tagging Prompts (Phase 17.5.2)
// ============================================

/**
 * Smart Auto-Tagging Prompt
 * Analyzes content and suggests existing tags
 */
export function buildSmartAutoTaggingPrompt(data: {
  title: string;
  content: string;
  existingTags: Array<{ name: string; count?: number }>;
  maxTags?: number;
}): string {
  const tagList = data.existingTags
    .map(t => `"${t.name}"${t.count ? ` (${t.count})` : ''}`)
    .join('، ');

  return `استخرج الوسوم المناسبة من القائمة المتاحة للمقال التالي:

العنوان: ${data.title}

المحتوى:
${data.content.substring(0, 3000)}

الوسوم المتاحة في الموقع (مع عدد الاستخدام):
${tagList || "لا توجد وسوم"}

المطلوب:
- اختر من 3 إلى ${data.maxTags || 10} وسوم كحد أقصى
- يجب أن تكون جميع الوسوم من القائمة المتاحة أعلاه
- رتّب الوسوم حسب الأهمية
- لكل وسم، حدد مدى ملاءمته (ثقة)

أعد JSON فقط بالشكل التالي:
{
  "selectedTags": [
    {
      "name": "اسم الوسم (كما هو في القائمة)",
      "confidence": 0.95,
      "relevance": "high|medium|low",
      "reason": "سبب الاختيار"
    }
  ],
  "primaryTag": {
    "name": "الوسم الرئيسي",
    "reason": "لماذا هو الأهم"
  }
}

مهم جداً:
- أعد JSON صالح ومكتمل فقط
- انسخ أسماء الوسوم بالضبط من القائمة المتاحة
- لا تقترح وسوماً جديدة`;
}
