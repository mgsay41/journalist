# Plan: Unified Article Writing Workflow Rewrite

## Context

The current article creation flow is fragmented across 3 pages (`/new` → `/ai-complete` → `/edit`), forces unnecessary page redirects, has a non-functional AI rewrite loop (AI only suggests, doesn't rewrite), and the grammar/SEO inline marks exist in the editor extensions but are not properly wired to the AI outputs. The user wants a professional journalist-grade workflow: write → SEO score → AI fully rewrites → rescore → repeat, with inline Grammarly-style accept/reject marks for both grammar and SEO. AI image generation must be removed.

---

## Professional Journalism Review — Features to Add/Remove

### What to Add (beyond user's explicit request)

- **Readability grade** shown in the SEO panel (Easy/Medium/Hard) based on sentence length analysis — journalists write for readers, not just bots
- **Journalism structure hint** in the AI rewrite prompt: instruct AI to follow inverted pyramid (most important info first) and strong lead paragraph
- **Article type field** (خبر عاجل / تقرير / تحقيق / رأي) — affects how SEO and readability are evaluated; different article types need different structures
- **Passive voice count** in the grammar panel — professional Arabic journalism favors active voice

### What to Remove

- **AI Image Generation** — entire `AiImageGenerator.tsx` component and `/api/admin/ai/generate-image/route.ts`
- **3-page redirect flow** — `/articles/new/classic` page and `/articles/[id]/ai-complete` page
- **AiPanel bulk grammar replacement** — replace with inline marks, remove the "apply all" bulk text overwrite

---

## User Decisions

- **Edit page scope**: Both `/articles/new` AND `/articles/[id]/edit` get the new AI workflow
- **Article type field**: Yes — adds `articleType` to schema and UI
- **Inline marks trigger**: Manual button click (not automatic) — matches Grammarly behavior

---

## Architecture Decision

**Single-page editor with a fixed right side panel.** No redirects. URL starts as `/admin/articles/new`, then silently updates to `/admin/articles/[id]/edit` via `router.replace()` after auto-save creates the article ID.

Layout:

- **Editor area** (full width, panel overlays on right on desktop)
- **Side panel** (fixed right, ~380px wide, collapsible, 4 tabs)

The journalist writes in the editor. The AI panel guides them through a sequential workflow:

1. Analyze → get initial SEO score, grammar issues, categories, tags, metadata
2. Rewrite → AI rewrites the full article using SEO data
3. Rescore → automatically re-runs SEO after rewrite
4. Iterate → repeat rewrite/rescore as needed
5. Inline marks → apply grammar and SEO marks for inline accept/reject
6. Publish → categories/tags/meta pre-filled, user confirms and publishes

---

## Implementation Steps

### Step 1 — Add article type field to schema

- File: `prisma/schema.prisma`
- Add `articleType String? @default("article")` field to Article model (values: `news`, `report`, `investigation`, `opinion`, `article`)
- Run `npx prisma generate` after change

### Step 2 — Add `buildRewriteArticlePrompt` to prompts

- File: `lib/ai/prompts.ts`
- Add new exported function at the end of the file
- Accepts: `{ title, content, focusKeyword, seoScore, seoTopIssues[], iteration, articleType }`
- Instructs Gemini to: fully rewrite article body as HTML (h2/h3/p tags), embed focus keyword at 1-2% density, fix SEO issues, follow inverted pyramid structure, return JSON:
  ```json
  {
    "rewrittenContent": "<h2>...",
    "rewrittenTitle": "...",
    "changesSummary": ["..."]
  }
  ```
- Note: strip HTML before sending (plain text), ask AI to return proper HTML back

### Step 3 — Add `rewriteArticle()` function

- File: `lib/ai/article-completion.ts` (add at end)
- File: `lib/ai/index.ts` (export it)
- Function accepts: `{ title, content, focusKeyword, seoScore, seoTopIssues, iteration, articleType }`
- Calls `generateContent` with `buildRewriteArticlePrompt`, `temperature: 0.8`, `maxTokens: 16384`
- Returns `AiResultWithUsage<{ rewrittenContent: string; rewrittenTitle?: string; changesSummary: string[] }>`

### Step 4 — Create SSE endpoint for rewrite

- File: `app/api/admin/ai/rewrite-article/route.ts` (new file)
- Pattern: copy structure from `app/api/admin/ai/complete-article/route.ts`
- POST body: `{ articleId, title, content, focusKeyword, seoScore, seoTopIssues, iteration, articleType }`
- Streams 3 steps: "تحليل المحتوى..." → "إعادة الكتابة بالذكاء الاصطناعي..." → "اكتمل"
- Rate limit: `ai:rewrite:${userId}`, 5 per minute (rewrites are heavier than analysis)
- Calls `rewriteArticle()` then `recordAiUsage` with feature `"rewrite-article"`

### Step 5 — Create inline marks conversion utility

- File: `lib/ai/inline-marks.ts` (new file)
- `convertGrammarIssuesToMarks(issues: GrammarIssue[])` — adds `id` field (`grammar-0`, `grammar-1`, etc.)
- `convertSeoSuggestionsToMarks(seoResult: SeoAnalysisResult)` — converts only `autoFixable` SEO suggestions with `fixData.action === 'replace-text'` to editor mark format

### Step 6 — Create `UnifiedAiPanel` component

- File: `components/admin/UnifiedAiPanel.tsx` (new file)
- Props: editor ref, article state, AI state, callbacks
- 4 tabs:

**Tab 1: تحسين AI (default, shown first)**

- Workflow progress indicator: steps 1-6 with current step highlighted
- "تحليل أولي" button → triggers existing `/api/admin/ai/complete-article` SSE, populates all state
- SSE step progress shown inline (reuse existing step display pattern from `ai-complete/page.tsx`)
- After analysis: shows SEO score badge, grammar issue count badge
- "إعادة كتابة بالذكاء الاصطناعي" button → triggers `/api/admin/ai/rewrite-article` SSE, calls `editor.commands.setContent(rewrittenContent)` on completion, increments `aiIteration`, auto-reruns `analyzeArticle()`
- Iteration counter badge: "التحسين #{n}" shown when `aiIteration > 0`
- Warning after iteration 3: "ملاحظة: إعادة الكتابة المتكررة قد تزيل تعديلاتك اليدوية"
- `rewriteChanges[]` list of what AI improved, shown after rewrite
- "تطبيق التدقيق اللغوي المضمّن" button → calls `editorRef.current.applyGrammarMarks(issues)` to show inline wavy underlines
- "مسح جميع العلامات" button (shown when marks active)

**Tab 2: SEO**

- Compact `SeoScorePanel` (or custom display using `analyzeArticle()` output)
- Score circle, status badge, top 3 issues list
- Readability grade: Easy/Medium/Hard derived from `calculateReadabilityScore()`
- "تطبيق اقتراحات SEO مضمّنة" button → calls `editorRef.current.applySeoMarks(convertedSuggestions)`
- Score updates live as user types (debounced 2s)

**Tab 3: ميتا**

- Article type selector (dropdown: خبر / تقرير / تحقيق / رأي / مقال)
- Focus keyword input
- Meta title input (character count indicator, 50-60 green zone)
- Meta description textarea (140-160 green zone)
- Excerpt textarea
- Slug input with validation indicator
- AI alternatives shown as clickable chips (from `completionResults.metaTitles`, `metaDescriptions`)

**Tab 4: التصنيف**

- Categories: existing chips (green) + new AI-suggested chips (amber + "جديد" badge)
- Tags: same pattern
- User unchecks to remove; checked = will be created/linked on publish
- Count badge showing "X تصنيفات، Y وسوم"

### Step 7 — Rewrite `/app/admin/articles/new/page.tsx`

- File: `app/admin/articles/new/page.tsx` (full replacement)
- `'use client'` component
- State: `articleId`, `title`, `content`, `slug`, `excerpt`, `metaTitle`, `metaDescription`, `focusKeyword`, `articleType`, `selectedCategoryIds`, `newCategoryNames`, `selectedTagIds`, `newTagNames`, `aiIteration`, `completionResults`, `rewriteChanges`, `seoAnalysis`, `aiPhase`, `grammarMarksActive`, `seoMarksActive`, `isPanelOpen`
- Layout:
  ```
  Fixed top bar (h-16): back link | title input | save status + publish button
  Main area below (flex row):
    Editor area (flex-1, lg:mr-96 when panel open)
    Side panel (fixed right, w-96, top-16 to bottom-0)
  ```
- `SimplifiedArticleEditor` with `enableInlineSuggestions={true}` and all 4 callback props wired
- Grammar correction callbacks: update `completionResults.grammarIssues` to remove accepted/rejected items
- Auto-save: use existing pattern from `SimplifiedArticleEditor` (already works via `onAutoSave` callback)
- After auto-save creates `articleId`: call `router.replace('/admin/articles/${id}/edit', { scroll: false })`
- Publish flow:
  1. Create new categories (`POST /api/admin/categories`) for each `newCategoryNames` item
  2. Create new tags (`POST /api/admin/tags`) for each `newTagNames` item
  3. `PUT /api/admin/articles/${articleId}` with all fields + `status: 'published'`

### Step 8 — Remove AI image generation

- File: `components/admin/ArticleCompletionResults.tsx`
  - Remove `import { AiImageGenerator, type GeneratedImageData } from './AiImageGenerator'`
  - Remove all `<AiImageGenerator ... />` JSX and related state (`generatedImage`, `setGeneratedImage`)
  - Remove `GeneratedImageData` from any state types
- File: `components/admin/AiImageGenerator.tsx` — delete
- File: `app/api/admin/ai/generate-image/route.ts` — delete
- Search for any other imports of `AiImageGenerator` or `generate-image` across codebase and remove

### Step 9 — Add `UnifiedAiPanel` to existing edit page

- File: `app/admin/articles/[id]/edit/page.tsx`
- Add `UnifiedAiPanel` to the right sidebar (replace or augment the existing `AiPanel` tabs)
- Pass `enableInlineSuggestions={true}` to the `RichTextEditor` already on that page
- Wire the same 4 grammar/SEO callbacks through to the editor ref
- The edit page already has article data loaded — pass it into the panel's initial state

### Step 10 — Delete old pages

- `app/admin/articles/new/classic/page.tsx` — delete
- `app/admin/articles/[id]/ai-complete/page.tsx` — delete (new flow makes it obsolete)
- Remove "استخدم المحرر الكلاسيكي" link from any remaining pages

### Step 11 — Run all 3 checks

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Fix any TypeScript or lint errors before marking complete.

---

## Critical Files

| File                                            | Action                                        |
| ----------------------------------------------- | --------------------------------------------- |
| `lib/ai/prompts.ts`                             | Add `buildRewriteArticlePrompt()`             |
| `lib/ai/article-completion.ts`                  | Add `rewriteArticle()`                        |
| `lib/ai/index.ts`                               | Export `rewriteArticle`                       |
| `lib/ai/inline-marks.ts`                        | **Create new** — conversion utilities         |
| `app/api/admin/ai/rewrite-article/route.ts`     | **Create new** — SSE rewrite endpoint         |
| `components/admin/UnifiedAiPanel.tsx`           | **Create new** — 4-tab AI side panel          |
| `app/admin/articles/new/page.tsx`               | **Full rewrite** — unified single-page editor |
| `components/admin/ArticleCompletionResults.tsx` | Remove AiImageGenerator import/usage          |
| `components/admin/AiImageGenerator.tsx`         | **Delete**                                    |
| `app/api/admin/ai/generate-image/route.ts`      | **Delete**                                    |
| `app/admin/articles/new/classic/page.tsx`       | **Delete**                                    |
| `app/admin/articles/[id]/ai-complete/page.tsx`  | **Delete**                                    |
| `prisma/schema.prisma`                          | Add `articleType` field                       |

## Files Reused As-Is (No Changes)

- `components/admin/editor/GrammarErrorExtension.ts` — already complete
- `components/admin/editor/SeoSuggestionExtension.ts` — already complete
- `components/admin/editor/SuggestionTooltip.tsx` — already complete
- `components/admin/RichTextEditor.tsx` — `applyGrammarMarks`, `applySeoMarks`, `clearAllMarks` already implemented
- `components/admin/SimplifiedArticleEditor.tsx` — already forwards ref with inline suggestion support
- `lib/seo/analyzer.ts` — `analyzeArticle()` runs client-side
- All existing article CRUD API routes

---

## Verification

1. Open `/admin/articles/new` — should see single-page editor with right panel
2. Write a title and 50+ words → auto-save creates article, URL changes to `/articles/[id]/edit`
3. Click "تحليل أولي" → SSE progress shows steps, panel fills with categories/tags/meta
4. Click "إعادة كتابة" → editor content replaced by AI rewrite, SEO score updates
5. Click "إعادة كتابة" again → iteration count increments, different rewrite
6. Click "تطبيق التدقيق اللغوي" → wavy underlines appear on grammar errors
7. Hover underlined text → tooltip appears with accept (Tab) / reject (Esc)
8. Click "تطبيق اقتراحات SEO" → green highlights appear on SEO suggestions
9. Fill meta tab → meta title/description/keyword pre-filled from AI
10. Check category tab → new categories show amber "جديد" badge
11. Click "نشر" → creates new categories/tags, publishes article
12. Verify AI image generation is completely gone (no UI, no API route)
13. Run `npx tsc --noEmit && npm run lint && npm run build` — 0 errors
