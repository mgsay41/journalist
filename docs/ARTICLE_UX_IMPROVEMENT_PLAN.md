# Article Creation UX Improvement Plan

## Executive Summary

This document outlines a comprehensive plan to transform the article creation experience from a manual, field-heavy interface to an AI-powered, streamlined workflow where journalists focus only on writing content while AI handles all metadata, SEO optimization, and quality assurance.

---

## Current State vs. Target State

### Current State

- Journalist must manually fill: title, slug, content, excerpt, categories, tags, meta title, meta description, focus keyword
- 3-column layout with many fields visible at once
- SEO and AI features are in separate panels requiring manual interaction
- No inline content suggestions

### Target State

- Journalist only writes: **Title + Content** (with images/videos/links)
- Single "Complete Article" button triggers AI to generate everything else
- Inline content suggestions (grammar/spelling in red, SEO improvements in green)
- AI-generated data shown below content for review/acceptance
- Minimal to zero manual editing after content is written

---

Slug Generation: Arabic vs English
Recommendation: English (Transliterated or Semantic) Slugs
Rationale

Universal Compatibility
English (Latin) slugs are fully supported across all browsers, servers, frameworks, and third-party tools without edge-case issues.

SEO Performance
Search engines index and rank Latin-character URLs more consistently. English slugs reduce crawling, indexing, and canonicalization issues.

URL Readability & Cleanliness
Arabic slugs are URL-encoded into long %XX sequences, making URLs unreadable and harder to debug, log, or share.

Social Media Sharing
English slugs display cleanly on platforms like Twitter, Facebook, and WhatsApp, improving trust and click-through rates.

Analytics & Monitoring
Human-readable slugs simplify interpretation in Google Analytics, logs, error tracking, and dashboards.

Interoperability & APIs
English slugs are safer when used in APIs, webhooks, caches (Redis/CDN), and third-party integrations.

Implementation Strategy

Option 1: Arabic → English Transliteration

Convert Arabic titles to Latin equivalents
Example:
"الذكاء الاصطناعي" → al-thakaa-al-istinaai

Ensures consistency and reversibility

Option 2: AI-Generated Semantic Slugs (Recommended)

Generate short, SEO-friendly English slugs based on content meaning, not literal translation
Example:
"الذكاء الاصطناعي في الصحافة" → ai-in-journalism

Produces cleaner, more marketable URLs

Best Practice (Strong Recommendation)

Store both values:

title_ar (original Arabic title)

slug_en (used in URLs)

Freeze slug after creation to avoid broken links

Enforce uniqueness at the database level

Fallback logic: If AI fails → transliteration

Optional Add-On (If You Want to Be Extra Solid 💪)

Support Arabic display titles while keeping English slugs for routing and SEO — best of both worlds.

---

## SEO Scoring Criteria (Based on RankMath + Enhancements)

### Basic SEO Tests (40 points)

| Test                                  | Points | Description                                |
| ------------------------------------- | ------ | ------------------------------------------ |
| Focus Keyword in SEO Title            | 5      | Keyword appears in first 50 chars of title |
| Focus Keyword in Meta Description     | 5      | Keyword in meta description                |
| Focus Keyword in URL                  | 5      | Keyword in slug                            |
| Focus Keyword at Beginning of Content | 5      | Keyword in first 10% of content            |
| Focus Keyword in Content              | 5      | Keyword appears in body                    |
| Content Length                        | 10     | 2500+ words: 100%, 2000-2500: 70%, etc.    |
| Focus Keyword Uniqueness              | 5      | Not used in other articles                 |

### Additional SEO Tests (25 points)

| Test                        | Points | Description                   |
| --------------------------- | ------ | ----------------------------- |
| Focus Keyword in Subheading | 5      | Keyword in H2/H3 tags         |
| Focus Keyword in Image Alt  | 5      | Alt text contains keyword     |
| Keyword Density             | 5      | 1-1.5% optimal, warning >2.5% |
| URL Length                  | 3      | Max 75 characters             |
| External Links              | 3      | At least 1 external link      |
| Internal Links              | 4      | At least 1 internal link      |

### Title Readability Tests (15 points)

| Test                          | Points | Description                      |
| ----------------------------- | ------ | -------------------------------- |
| Keyword at Beginning of Title | 4      | Keyword in first 50% of title    |
| Sentiment in Title            | 4      | Emotion-evoking language         |
| Power Words in Title          | 4      | Persuasive/compelling words      |
| Number in Title               | 3      | Numeric elements (e.g., "7 طرق") |

### Content Readability Tests (20 points)

| Test              | Points | Description                    |
| ----------------- | ------ | ------------------------------ |
| Table of Contents | 5      | TOC present for long articles  |
| Short Paragraphs  | 5      | No paragraphs >120 words       |
| Media Presence    | 5      | At least 4 images/videos       |
| Readability Score | 5      | Easy to read, varied sentences |

### Score Color Codes

- **Green (81-100)**: Ready to publish
- **Yellow (51-80)**: Needs improvement
- **Red (0-50)**: Poorly optimized

---

## Implementation Phases

---

## Phase 1: Simplified Editor Layout

### Objective

Create a clean, distraction-free writing experience focused only on content creation.

### Changes

#### 1.1 New Editor Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Header: [← رجوع]  [معاينة]  [حفظ]  [إكمال المقال ✨]        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  عنوان المقال                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ أدخل عنوان المقال هنا...                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  محتوى المقال                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [Toolbar: H1 H2 H3 | B I U | • 1. | 🔗 📷 🎬 | ...]│   │
│  ├─────────────────────────────────────────────────────┤   │
│  │                                                     │   │
│  │  ابدأ الكتابة هنا...                                │   │
│  │  اكتب المحتوى، أضف الصور والفيديوهات والروابط      │   │
│  │                                                     │   │
│  │  [Content with inline suggestions appears here]     │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────── AI Results (After "Complete") ──────────── │
│                                                             │
│  [This section appears after clicking "إكمال المقال"]       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 1.2 Remove from Initial View

- Slug field (auto-generated)
- Status dropdown (default to draft)
- Categories select (AI-assigned)
- Tags input (AI-generated)
- Meta title field (AI-generated)
- Meta description field (AI-generated)
- Focus keyword field (AI-extracted)
- SEO panel (shown in results)
- AI panel (integrated into flow)

#### 1.3 Keep in Initial View

- Title input (large, prominent)
- Rich text editor (full-width)
- Toolbar (formatting, images, videos, links)
- Word count / reading time (subtle footer)

### Files to Modify

- `app/admin/articles/new/page.tsx` - Complete redesign
- `components/admin/RichTextEditor.tsx` - May need minor updates

### New Components

- `components/admin/SimplifiedArticleEditor.tsx` - New main editor
- `components/admin/ArticleCompletionResults.tsx` - AI results display

---

## Phase 2: "Complete Article" Button & AI Integration

### Objective

Single button triggers comprehensive AI analysis and generation of all metadata.

### 2.1 "Complete Article" Button Flow

```
User clicks "إكمال المقال ✨"
         │
         ▼
┌─────────────────────────────────────────┐
│  Loading State with Progress Indicators │
│  ┌──────────────────────────────────┐  │
│  │ ✓ تحليل المحتوى...              │  │
│  │ ⏳ استخراج الكلمات المفتاحية...  │  │
│  │ ○ تصنيف المقال...               │  │
│  │ ○ توليد البيانات الوصفية...      │  │
│  │ ○ التدقيق اللغوي...             │  │
│  │ ○ تحليل SEO...                  │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
         │
         ▼
    AI Processing (Parallel where possible)
         │
         ▼
    Results Displayed Below Content
```

### 2.2 AI Tasks (In Order)

1. **Content Analysis** - Extract main topics, tone, target audience
2. **Keyword Extraction** - Primary + secondary keywords
3. **Category Assignment** - Match to existing categories
4. **Tag Generation** - Suggest relevant tags (new + existing)
5. **Slug Generation** - SEO-friendly English transliterated slug
6. **Meta Title Generation** - 3 options to choose from
7. **Meta Description Generation** - 3 options to choose from
8. **Introduction Generation** - If content lacks proper intro
9. **Conclusion Generation** - If content lacks conclusion
10. **Grammar & Spelling Check** - With inline corrections
11. **SEO Analysis** - Full scoring with suggestions

### 2.3 New API Endpoint

```typescript
// POST /api/admin/ai/complete-article
interface CompleteArticleRequest {
  title: string;
  content: string;
}

interface CompleteArticleResponse {
  // Keywords
  focusKeyword: string;
  secondaryKeywords: string[];

  // Classification
  suggestedCategories: Array<{
    id: string;
    name: string;
    confidence: number;
  }>;
  suggestedTags: Array<{
    id?: string; // Existing tag ID
    name: string;
    isNew: boolean; // True if should be created
  }>;

  // SEO
  slug: string;
  metaTitles: Array<{
    title: string;
    length: number;
    score: number;
  }>;
  metaDescriptions: Array<{
    description: string;
    length: number;
    score: number;
  }>;

  // Content Improvements
  introduction?: string; // Only if needed
  conclusion?: string; // Only if needed

  // Grammar
  grammarIssues: Array<{
    type: "spelling" | "grammar" | "punctuation" | "style";
    original: string;
    correction: string;
    position: { start: number; end: number };
    explanation: string;
  }>;

  // SEO Score
  seoScore: {
    total: number;
    maxTotal: number;
    percentage: number;
    status: "good" | "needs-improvement" | "poor";
    categories: SeoCategory[];
    suggestions: SeoSuggestion[];
  };

  // Usage tracking
  tokensUsed: {
    input: number;
    output: number;
    cost: number;
  };
}
```

### Files to Create

- `app/api/admin/ai/complete-article/route.ts` - Main endpoint
- `lib/ai/article-completion.ts` - Completion service

### Files to Modify

- `lib/ai/prompts.ts` - Add new prompts
- `lib/ai/service.ts` - Add completion function

---

## Phase 3: AI Results Display

### Objective

Display all AI-generated data in an organized, actionable format below the content.

### 3.1 Results Layout

```
┌─────────────────────────────────────────────────────────────┐
│  نتائج الذكاء الاصطناعي                          [إعادة] 🔄 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────── SEO Score ───────────┐                        │
│  │      ┌──────┐                   │                        │
│  │      │  78  │  جيد              │                        │
│  │      │ /100 │  يحتاج تحسينات    │                        │
│  │      └──────┘                   │                        │
│  │  [تفاصيل التحليل ▼]             │                        │
│  └─────────────────────────────────┘                        │
│                                                             │
│  ┌─────────── التصنيف والوسوم ─────────┐                    │
│  │  التصنيف: [سياسة ✓] [اقتصاد] [رياضة]                   │
│  │  الوسوم:  [tag1 ✓] [tag2 ✓] [+tag3] [إضافة وسم]        │
│  └─────────────────────────────────────┘                    │
│                                                             │
│  ┌─────────── بيانات SEO ───────────┐                       │
│  │  الرابط: example.com/al-thkaa-al-astnaay [تعديل]        │
│  │                                                         │
│  │  عنوان الميتا (اختر واحداً):                             │
│  │  ○ "عنوان مقترح 1" (55 حرف) ⭐ موصى به                  │
│  │  ○ "عنوان مقترح 2" (48 حرف)                             │
│  │  ○ "عنوان مقترح 3" (52 حرف)                             │
│  │                                                         │
│  │  وصف الميتا (اختر واحداً):                               │
│  │  ○ "وصف مقترح 1..." (150 حرف) ⭐                        │
│  │  ○ "وصف مقترح 2..." (145 حرف)                          │
│  └─────────────────────────────────────┘                    │
│                                                             │
│  ┌─────────── الكلمات المفتاحية ───────────┐                │
│  │  الكلمة الرئيسية: [الذكاء الاصطناعي]                     │
│  │  كلمات ثانوية: [تقنية] [مستقبل] [ابتكار]                │
│  └─────────────────────────────────────────┘                │
│                                                             │
│  ┌─────────── تحسينات المحتوى ───────────┐                  │
│  │  ⚠️ المقال يفتقر لمقدمة قوية                            │
│  │  [مقدمة مقترحة]                         [إضافة]         │
│  │                                                         │
│  │  ⚠️ المقال يفتقر لخاتمة                                 │
│  │  [خاتمة مقترحة]                         [إضافة]         │
│  └─────────────────────────────────────────┘                │
│                                                             │
│  ┌─────────── التدقيق اللغوي ───────────┐                   │
│  │  ✓ لم يتم العثور على أخطاء                              │
│  │  أو                                                     │
│  │  ⚠️ تم العثور على 5 أخطاء [عرض في المحتوى]             │
│  └─────────────────────────────────────────┘                │
│                                                             │
│                    [حفظ ونشر]  [حفظ كمسودة]                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Interaction Patterns

#### Category Selection

- Pre-select AI's top suggestion
- User can select/deselect others
- Confidence score shown as subtle indicator

#### Tag Management

- AI-suggested tags pre-selected
- Badge shows if tag exists vs. will be created
- User can remove or add more

#### Meta Title/Description

- Radio buttons to select preferred option
- Clicking selects it immediately
- "Edit" option to customize

#### Content Improvements

- "Add" button inserts at appropriate position
- Preview on hover
- Can be dismissed if not wanted

### Files to Create

- `components/admin/ArticleCompletionResults.tsx`
- `components/admin/SeoScoreCard.tsx`
- `components/admin/CategoryTagSelector.tsx`
- `components/admin/MetaOptionsSelector.tsx`
- `components/admin/ContentImprovementCard.tsx`

---

## Phase 4: Inline Content Suggestions

### Objective

Show grammar/spelling errors and SEO improvements directly in the editor content.

### 4.1 Grammar & Spelling (Red Underline)

```
Text with [خطأ إملائي]̲̲̲̲̲̲̲̲  ← Red wavy underline
              ↓
         ┌─────────────────────┐
         │ التصحيح: خطأ إملائي │
         │ [تطبيق] [تجاهل]     │
         └─────────────────────┘
```

**Implementation:**

1. Create custom TipTap Mark for spelling errors
2. Store error positions from AI response
3. On hover, show correction tooltip
4. Click "Apply" replaces text
5. Click "Ignore" removes mark

### 4.2 SEO Suggestions (Green Highlight)

```
الجملة الأصلية [with suggested improvement]
                    ↓
            ┌──────────────────────────────────┐
            │ اقتراح SEO:                       │
            │ "نص محسن مع الكلمة المفتاحية"    │
            │ سبب: إضافة الكلمة المفتاحية       │
            │ [قبول] [رفض]                      │
            └──────────────────────────────────┘
```

**Types of SEO Suggestions:**

1. Add focus keyword to intro paragraph
2. Improve heading with keyword
3. Add internal link suggestion
4. Shorten long paragraph
5. Add image alt text suggestion

### 4.3 TipTap Extensions Required

```typescript
// GrammarError mark
const GrammarError = Mark.create({
  name: "grammarError",
  addAttributes() {
    return {
      type: { default: "spelling" },
      correction: { default: "" },
      explanation: { default: "" },
    };
  },
  // Render as red wavy underline
});

// SeoSuggestion mark
const SeoSuggestion = Mark.create({
  name: "seoSuggestion",
  addAttributes() {
    return {
      suggestionId: { default: "" },
      suggestedText: { default: "" },
      reason: { default: "" },
    };
  },
  // Render as green highlight
});
```

### 4.4 Interaction Flow

```
1. AI completes analysis
2. Grammar errors marked in content
3. User hovers over error → tooltip appears
4. User clicks "Apply" → text replaced, mark removed
5. User clicks "Ignore" → mark removed, error dismissed

Same for SEO suggestions with green highlight
```

### Files to Create

- `components/admin/editor/GrammarErrorExtension.ts`
- `components/admin/editor/SeoSuggestionExtension.ts`
- `components/admin/editor/SuggestionTooltip.tsx`

### Files to Modify

- `components/admin/RichTextEditor.tsx` - Add new extensions

---

## Phase 5: Enhanced SEO Scoring System

### Objective

Implement comprehensive SEO scoring based on RankMath criteria with Arabic optimizations.

### 5.1 New Scoring Categories

```typescript
interface SeoScore {
  basicSeo: {
    score: number;
    maxScore: 40;
    tests: BasicSeoTest[];
  };
  additionalSeo: {
    score: number;
    maxScore: 25;
    tests: AdditionalSeoTest[];
  };
  titleReadability: {
    score: number;
    maxScore: 15;
    tests: TitleReadabilityTest[];
  };
  contentReadability: {
    score: number;
    maxScore: 20;
    tests: ContentReadabilityTest[];
  };
  total: number;
  maxTotal: 100;
  percentage: number;
  status: "good" | "needs-improvement" | "poor";
}
```

### 5.2 New Tests to Implement

#### Basic SEO (Not Currently Implemented)

- [ ] Focus keyword in first 50 chars of title
- [ ] Focus keyword in URL slug
- [ ] Focus keyword uniqueness (database check)

#### Additional SEO (Not Currently Implemented)

- [ ] Focus keyword in subheadings (H2/H3)
- [ ] Focus keyword in image alt text
- [ ] Keyword density warning >2.5%
- [ ] URL length check (max 75 chars)

#### Title Readability (NEW)

- [ ] Keyword at beginning of title
- [ ] Sentiment detection (Arabic)
- [ ] Power words detection (Arabic word list)
- [ ] Number in title

#### Content Readability (Partially Implemented)

- [ ] Table of contents detection
- [ ] Long paragraph detection (>120 words)
- [ ] Media count (minimum 4)

### 5.3 Arabic Power Words List

```typescript
const ARABIC_POWER_WORDS = [
  // Urgency
  "الآن",
  "فوراً",
  "عاجل",
  "حصري",
  "محدود",
  // Value
  "مجاني",
  "خصم",
  "أفضل",
  "أقوى",
  "أسرع",
  // Emotion
  "مذهل",
  "رائع",
  "صادم",
  "مفاجئ",
  "سري",
  // Action
  "اكتشف",
  "تعلم",
  "احصل",
  "جرب",
  "شاهد",
  // Trust
  "مضمون",
  "موثوق",
  "رسمي",
  "معتمد",
  "آمن",
  // Numbers
  "أهم",
  "أبرز",
  "أول",
  "أكبر",
  "أشهر",
];
```

### 5.4 Arabic Sentiment Words

```typescript
const ARABIC_SENTIMENT_WORDS = {
  positive: ["رائع", "مذهل", "ناجح", "إيجابي", "فرحة"],
  negative: ["صادم", "خطير", "كارثي", "مؤلم", "تحذير"],
  neutral: ["تحليل", "دراسة", "تقرير", "بحث", "مراجعة"],
};
```

### Files to Create

- `lib/seo/tests/basic-seo.ts`
- `lib/seo/tests/additional-seo.ts`
- `lib/seo/tests/title-readability.ts`
- `lib/seo/tests/content-readability.ts`
- `lib/seo/arabic-words.ts` - Power words, sentiment words

### Files to Modify

- `lib/seo/analyzer.ts` - Integrate new tests
- `lib/seo/types.ts` - Update types

---

## Phase 6: Polish & Edge Cases

### Objective

Handle edge cases, optimize performance, and polish the UX.

### 6.1 Edge Cases to Handle

1. **Very short content**: Warn if <300 words
2. **No internet**: Queue AI requests, process when online
3. **AI failure**: Graceful fallback, allow manual input
4. **Duplicate content**: Warn about similar existing articles
5. **Missing images**: Prompt to add at least one image
6. **Rate limiting**: Queue and batch requests

### 6.2 Performance Optimizations

1. **Parallel AI calls**: Run independent analyses simultaneously
2. **Caching**: Cache AI results for same content hash
3. **Debouncing**: Debounce inline suggestions
4. **Progressive loading**: Show results as they come in

### 6.3 UX Polish

1. **Keyboard shortcuts**:
   - `Ctrl+Enter`: Complete article
   - `Ctrl+S`: Save draft
   - `Tab`: Accept suggestion
   - `Esc`: Dismiss suggestion

2. **Visual feedback**:
   - Progress indicators during AI processing
   - Success animations on completion
   - Subtle transitions for suggestions

3. **Undo/Redo**:
   - Track all AI-applied changes
   - Allow undoing individual suggestions

### 6.4 Accessibility

1. Screen reader support for suggestions
2. Keyboard navigation for all interactions
3. High contrast mode support
4. ARIA labels for all interactive elements

---

## Technical Architecture

### State Management

```typescript
interface ArticleEditorState {
  // Input
  title: string;
  content: string;

  // AI Results
  aiResults: CompletionResults | null;
  aiStatus: "idle" | "processing" | "complete" | "error";
  aiProgress: {
    step: string;
    progress: number;
  };

  // User Selections
  selectedCategory: string | null;
  selectedTags: string[];
  selectedMetaTitle: number;
  selectedMetaDescription: number;

  // Inline Suggestions
  grammarMarks: GrammarMark[];
  seoMarks: SeoMark[];
  dismissedSuggestions: string[];

  // Draft
  draftId: string | null;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
}
```

### API Architecture

```
/api/admin/ai/
├── complete-article/     # Main completion endpoint
│   └── route.ts
├── analyze-content/      # Real-time analysis
│   └── route.ts
├── suggest-categories/   # Category matching
│   └── route.ts
├── generate-slug/        # Slug generation
│   └── route.ts
└── check-grammar/        # Grammar check only
    └── route.ts
```

### Database Changes

```prisma
// Track AI suggestions per article
model AiSuggestion {
  id          String   @id @default(cuid())
  articleId   String
  article     Article  @relation(fields: [articleId], references: [id])
  type        String   // 'grammar', 'seo', 'meta', 'category', 'tag'
  suggestion  Json     // Original suggestion data
  status      String   // 'pending', 'accepted', 'rejected'
  createdAt   DateTime @default(now())

  @@index([articleId])
}
```

---

## Implementation Timeline

| Phase   | Description              | Estimated Effort |
| ------- | ------------------------ | ---------------- |
| Phase 1 | Simplified Editor Layout | Medium           |
| Phase 2 | Complete Article API     | High             |
| Phase 3 | AI Results Display       | Medium           |
| Phase 4 | Inline Suggestions       | High             |
| Phase 5 | Enhanced SEO Scoring     | Medium           |
| Phase 6 | Polish & Edge Cases      | Medium           |

---

## Success Metrics

1. **Time to publish**: Reduce from ~15 min to ~5 min
2. **Manual field edits**: Reduce from 10+ to 2-3
3. **SEO score improvement**: Average score increase by 20%
4. **Grammar errors**: 90% caught and corrected
5. **User satisfaction**: Positive feedback from journalists

---

## Risks & Mitigations

| Risk                | Impact | Mitigation                                 |
| ------------------- | ------ | ------------------------------------------ |
| AI quality varies   | Medium | Allow manual overrides, multiple options   |
| API rate limits     | High   | Implement queuing, caching                 |
| Slow processing     | Medium | Progressive loading, background processing |
| Arabic NLP accuracy | Medium | Test extensively, fallback to manual       |
| Cost overruns       | Medium | Usage tracking, quotas per user            |

---

## Next Steps

1. **Review this document** with stakeholders
2. **Prioritize phases** based on business value
3. **Create detailed tickets** for each phase
4. **Start with Phase 1** (lowest risk, high impact)
5. **Iterate based on feedback** after each phase

---

## Appendix A: Current vs. New Field Mapping

| Field            | Current          | New                               |
| ---------------- | ---------------- | --------------------------------- |
| Title            | Manual           | Manual                            |
| Content          | Manual           | Manual                            |
| Slug             | Auto from title  | AI-generated (English)            |
| Categories       | Manual select    | AI-suggested + confirm            |
| Tags             | Manual/search    | AI-suggested + confirm            |
| Meta Title       | Manual/AI button | AI-generated, select from options |
| Meta Description | Manual/AI button | AI-generated, select from options |
| Focus Keyword    | Manual/AI button | AI-extracted                      |
| Excerpt          | Manual           | AI-generated from content         |
| Introduction     | Part of content  | AI-suggested if missing           |
| Conclusion       | Part of content  | AI-suggested if missing           |
| Grammar          | Manual AI button | Automatic inline                  |
| SEO Score        | Manual analysis  | Automatic with inline suggestions |

---

## Appendix B: Arabic SEO Considerations

1. **Keyword variations**: Handle singular/plural, with/without "ال"
2. **Transliteration**: Consistent Arabic-to-Latin mapping
3. **Stop words**: Arabic stop word list for density calculation
4. **Sentence detection**: Arabic period (.) and semicolon (؛)
5. **Word count**: Handle Arabic compound words

---

_Document Version: 1.0_
_Created: January 2026_
_Last Updated: January 2026_
