# AI Article Flow Enhancement Plan

## Context

The article creation workflow has three confirmed bugs between the AI analysis page (`ai-complete`) and the edit page:

1. **Loading screen gets stuck** — fake step animation caps at the last step and spins indefinitely
2. **AI parsing fails in edit page** — `HeadlineOptimizer` auto-triggers on load but the API route uses bare `JSON.parse`, which fails when Gemini wraps JSON in markdown code blocks
3. **SEO scores differ** — AI page shows a subjective AI-estimated score; edit page shows a deterministic algorithmic score; even the "good" threshold is different (>= 70 vs >= 81)

---

## Issue 1: AI Loading Screen Fix

**Root cause**: `setInterval` in `runAiCompletion` caps at step 5 (`COMPLETION_STEPS.length - 1 = 5`) and stays stuck in "spinning" state while waiting for the API (which can take 10–30s). Also: old results aren't cleared on regenerate; dismissed errors re-trigger auto-analysis.

**File**: `app/admin/articles/[id]/ai-complete/page.tsx`

**Changes**:

### 1a — Clear stale results on regenerate

Add at top of `runAiCompletion` (after `if (!article) return`):

```typescript
setCompletionResults(null); // Clear old results before new analysis starts
```

### 1b — Fix the stuck interval animation

Replace the capped interval logic:

```typescript
// BEFORE — gets stuck at step 5
const stepInterval = setInterval(() => {
  setCompletionStep((prev) => {
    if (prev < COMPLETION_STEPS.length - 1) return prev + 1;
    return prev; // stuck forever
  });
}, 800);
```

With a cycling loop that re-uses steps 0–4 (step 5 is reserved for "done"):

```typescript
// AFTER — cycles through steps 0-4 while waiting
let stepCount = 0;
const stepInterval = setInterval(() => {
  stepCount += 1;
  setCompletionStep(stepCount % (COMPLETION_STEPS.length - 1));
}, 1000);
```

### 1c — Add completion animation + remove finally block

Replace `finally { setIsCompleting(false) }` with explicit try/catch branches so a short delay shows "all steps done":

```typescript
try {
  // ... API call ...
  clearInterval(stepInterval);
  setCompletionStep(COMPLETION_STEPS.length); // All steps lit up
  await new Promise((resolve) => setTimeout(resolve, 600)); // Brief "done" flash
  setCompletionResults(results);
  await saveAiCompletionData(results);
  setIsCompleting(false);
} catch (err) {
  clearInterval(stepInterval);
  setError(err instanceof Error ? err.message : "حدث خطأ أثناء تحليل المقال");
  setIsCompleting(false);
}
// Remove finally block
```

### 1d — Fix auto-restart on error dismiss

Add a `useRef` flag so the auto-trigger `useEffect` only fires once:

```typescript
const hasAttemptedRef = useRef(false);
```

Update the `useEffect` (line 256–260):

```typescript
// BEFORE
useEffect(() => {
  if (article && !completionResults && !isCompleting && !error) {
    runAiCompletion();
  }
}, [article, completionResults, isCompleting, error, runAiCompletion]);

// AFTER
useEffect(() => {
  if (
    article &&
    !completionResults &&
    !isCompleting &&
    !hasAttemptedRef.current
  ) {
    hasAttemptedRef.current = true;
    runAiCompletion();
  }
}, [article, completionResults, isCompleting, runAiCompletion]);
```

`hasAttemptedRef` is a ref (not state) to avoid extra renders. Manual "Regenerate" button still works because it calls `runAiCompletion()` directly, bypassing the ref check.

---

## Issue 2: Fix AI Parsing in optimize-headline Route

**Root cause**: `app/api/admin/ai/optimize-headline/route.ts` (line 112) uses `JSON.parse(result.text)` — fails when Gemini wraps JSON in ` ```json ``` ` code blocks.

**Solution**: Export the robust `parseJsonResponse` function from `lib/ai/service.ts` (where it already exists at line 65 but is not exported) and use it in the route.

### 2a — Export from `lib/ai/service.ts`

```typescript
// Change line 65 from:
function parseJsonResponse<T>(text: string): T {
// To:
export function parseJsonResponse<T>(text: string): T {
```

### 2b — Re-export from `lib/ai/index.ts`

Add to the `export { ... } from "./service"` block (line 9–27):

```typescript
parseJsonResponse,
```

### 2c — Use in `optimize-headline/route.ts`

Update import:

```typescript
import { recordAiUsage, isGeminiConfigured, parseJsonResponse } from "@/lib/ai";
```

Replace lines 110–118:

```typescript
// BEFORE
let analysis;
try {
  analysis = JSON.parse(result.text);
} catch {
  return NextResponse.json(
    { error: "Failed to parse AI response" },
    { status: 500 },
  );
}

// AFTER
let analysis;
try {
  analysis = parseJsonResponse<{
    currentHeadline: object;
    suggestions: object[];
    recommended: number;
  }>(result.text);
} catch {
  return NextResponse.json(
    { error: "Failed to parse AI response" },
    { status: 500 },
  );
}
```

---

## Issue 3: Consistent SEO Scores

**Root cause**: Two separate systems produce different scores:

- AI page uses `results.seoAnalysis.score` — subjective AI estimate
- Edit page uses `analyzeArticle()` — deterministic algorithm with `>= 81` threshold for "good"
- `SeoScoreCard` hardcodes `>= 70` as "good" threshold instead of matching the analyzer's `>= 81`

### 3a — Fix thresholds in `SeoScoreCard.tsx`

Update all comparisons from `>= 70 / >= 50` to `>= 81 / >= 51` in `components/admin/SeoScoreCard.tsx` (affects `getScoreColor`, `getScoreBackground`, SVG stroke color, and descriptive text — 4 places total).

### 3b — Live SEO score in `ArticleCompletionResults.tsx`

The component already has all needed state: `focusKeyword` (line 199), `getCurrentTitle()`, `getCurrentMetaTitle()`, `getCurrentMetaDescription()`, `getCurrentSlug()`.

Add import at top of `components/admin/ArticleCompletionResults.tsx`:

```typescript
import { analyzeArticle } from "@/lib/seo";
import type { ArticleContent } from "@/lib/seo";
```

Add `useMemo` hook after the existing `getCurrentSlug` callback (around line 237):

```typescript
// Compute live SEO score using same algorithm as edit page
const liveSeoScore = useMemo(() => {
  const currentMetaTitle = getCurrentMetaTitle();
  const currentMetaDescription = getCurrentMetaDescription();
  const currentSlug = getCurrentSlug();
  const currentTitleValue = getCurrentTitle();

  const articleContent: ArticleContent = {
    title: currentTitleValue,
    content: currentContent,
    metaTitle: currentMetaTitle || undefined,
    metaDescription: currentMetaDescription || undefined,
    focusKeyword: focusKeyword || undefined,
    slug: currentSlug || undefined,
    hasFeaturedImage: false, // not available at this stage
    imageCount: 0,
    imagesWithAlt: 0,
  };

  const result = analyzeArticle(articleContent);
  return {
    score: result.percentage,
    status: result.status,
    topIssues: result.suggestions.slice(0, 3).map((s) => s.messageAr),
  };
}, [
  focusKeyword,
  currentContent,
  getCurrentTitle,
  getCurrentMetaTitle,
  getCurrentMetaDescription,
  getCurrentSlug,
]);
```

Replace `SeoScoreCard` usage at line 564–568:

```typescript
// BEFORE
<SeoScoreCard
  score={results.seoAnalysis.score}
  status={results.seoAnalysis.status}
  topIssues={results.seoAnalysis.topIssues}
/>

// AFTER
<SeoScoreCard
  score={liveSeoScore.score}
  status={liveSeoScore.status}
  topIssues={liveSeoScore.topIssues}
/>
```

---

## Critical Files

| File                                            | Change                                         |
| ----------------------------------------------- | ---------------------------------------------- |
| `app/admin/articles/[id]/ai-complete/page.tsx`  | Issues 1a–1d (loading screen + auto-restart)   |
| `lib/ai/service.ts`                             | Issue 2a (export `parseJsonResponse`)          |
| `lib/ai/index.ts`                               | Issue 2b (re-export `parseJsonResponse`)       |
| `app/api/admin/ai/optimize-headline/route.ts`   | Issue 2c (use robust parser)                   |
| `components/admin/SeoScoreCard.tsx`             | Issue 3a (fix score thresholds)                |
| `components/admin/ArticleCompletionResults.tsx` | Issue 3b (live SEO score via `analyzeArticle`) |

## Implementation Order

1. Issues 2a → 2b → 2c (export chain — each depends on the previous)
2. Issues 1a–1d together (all in same file, all independent)
3. Issue 3a (threshold fix in SeoScoreCard)
4. Issue 3b (live score in ArticleCompletionResults — depends on 3a for correct colors)

## Verification

- Run `npx tsc --noEmit` + `npm run lint` + `npm run build` after all changes
- **Issue 1**: Create new article → observe loading overlay: steps should cycle, not get stuck; overlay closes with brief "all done" flash; error → dismiss → no auto-restart
- **Issue 2**: Open any article in edit mode → HeadlineOptimizer should load suggestions without error (check browser Network tab for `/api/admin/ai/optimize-headline` — should return 200)
- **Issue 3**: On AI analysis page, change focus keyword → SEO score circle should update immediately; score on AI page should be close to (same algorithm as) the edit page score
