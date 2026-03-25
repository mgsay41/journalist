# Article Editor End-to-End Flow — Implementation Plan

## Context

The article editor needs a coherent end-to-end flow: write → auto-save → analyze → review issues/suggestions → AI rewrite. Currently there are 7 problems:

1. Scores (SEO 30, GEO 30, Structure 4/10) display with fake values before any content exists
2. Auto-save only writes to the database (30s delay) — no localStorage fallback
3. Analysis results (`completionResults`) are lost on page refresh (React state only)
4. After "تحليل أولي", intro/conclusion are never shown as suggestions for user approval
5. "إعادة كتابة بالذكاء الاصطناعي" only sends SEO+GEO issues — misses structure issues
6. Rewrite rewrites everything including any already-approved intro/conclusion
7. UI/UX of the analysis flow needs polish

## Files to Modify

| File                                        | Change                                                                                             |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `components/admin/UnifiedAiPanel.tsx`       | Core: score suppression, sessionStorage, intro/conclusion suggestions, structure issues in rewrite |
| `app/admin/articles/new/page.tsx`           | localStorage auto-save + recovery banner                                                           |
| `app/admin/articles/[id]/edit/page.tsx`     | localStorage auto-save                                                                             |
| `lib/ai/prompts.ts`                         | Rewrite prompt: add structureTopIssues param + preserve intro/conclusion instruction               |
| `lib/ai/article-completion.ts`              | `rewriteArticle()`: accept structureTopIssues + preserved sections                                 |
| `app/api/admin/ai/rewrite-article/route.ts` | Schema: add `structureTopIssues`, `preservedIntro`, `preservedConclusion`                          |

---

## Change A — Score Suppression When No Content

**File:** `components/admin/UnifiedAiPanel.tsx` (line ~276)

In the debounced `useEffect` that calculates scores:

```ts
if (wordCount < 10) {
  setLiveSeoScore({ score: 0, status: "needs-improvement" });
  setLiveGeoScore({ score: 0, status: "needs-improvement" });
  onScoreChange?.({
    seo: 0,
    geo: 0,
    structure: 0,
    structureTotal: 10,
    grammar: 0,
  });
  return;
}
// existing analysis code follows...
```

The `ArticleEditorHeader.tsx` already shows rings with value from `scores` prop — so setting scores to 0 via `onScoreChange` when content is empty will automatically suppress the scores in the header too. Rings showing "0" looks intentional and is correct.

---

## Change B — localStorage Auto-Save

### New Article Page (`app/admin/articles/new/page.tsx`)

Add two effects:

**Effect 1 — Restore on mount (runs once):**

```ts
const LS_KEY = "article-draft-new";
useEffect(() => {
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) {
      const { title: t, content: c } = JSON.parse(saved);
      if (t || c) {
        // Show a recovery banner. Add state: [showRecovery, setShowRecovery]
        setDraftRecovery({ title: t, content: c });
      }
    }
  } catch {}
}, []);
```

Add state `draftRecovery: { title: string; content: string } | null` and a banner UI:

```
"تم العثور على مسودة غير محفوظة. هل تريد استعادتها؟" [استعادة] [تجاهل]
```

**Effect 2 — Save to localStorage on every change (3-second debounce):**

```ts
useEffect(() => {
  const timer = setTimeout(() => {
    if (!title.trim() && !content.trim()) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ title, content }));
    } catch {}
  }, 3000);
  return () => clearTimeout(timer);
}, [title, content]);
```

**Clear localStorage after DB save:** in `performAutoSave`, after successful save:

```ts
try {
  localStorage.removeItem(LS_KEY);
} catch {}
```

### Edit Article Page (`app/admin/articles/[id]/edit/page.tsx`)

Same 3-second localStorage save pattern, key = `article-draft-${articleId}`.
No recovery banner needed (article loads from DB). Clear after DB save.

---

## Change C — Persist Analysis Results Across Refresh

**File:** `components/admin/UnifiedAiPanel.tsx`

Add at top of component:

```ts
const RESULTS_KEY = `ai-results-${articleId ?? "new"}`;
```

**On mount (restore):**

```ts
useEffect(() => {
  try {
    const stored = sessionStorage.getItem(RESULTS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      setCompletionResults(parsed.results);
      setAiPhase("complete");
      setAiMessage("اكتمل التحليل");
      if (parsed.introSuggestion) setIntroSuggestion(parsed.introSuggestion);
      if (parsed.conclusionSuggestion)
        setConclusionSuggestion(parsed.conclusionSuggestion);
    }
  } catch {}
}, []); // run once on mount
```

**After analysis completes (in `data.type === 'complete'` handler):**

```ts
try {
  sessionStorage.setItem(
    RESULTS_KEY,
    JSON.stringify({
      results: data.data,
      introSuggestion,
      conclusionSuggestion,
    }),
  );
} catch {}
```

Update sessionStorage again after intro/conclusion are fetched.

**On new analysis start:** clear sessionStorage key at the start of `handleAnalyze`.

---

## Change D — Intro/Conclusion Suggestions in Panel

**File:** `components/admin/UnifiedAiPanel.tsx`

### New state:

```ts
const [introSuggestion, setIntroSuggestion] = useState<string | null>(null);
const [conclusionSuggestion, setConclusionSuggestion] = useState<string | null>(
  null,
);
const [introApplied, setIntroApplied] = useState(false);
const [conclusionApplied, setConclusionApplied] = useState(false);
```

### Always fetch after analysis (in `handleAnalyze`, after `setAiPhase('complete')`):

Remove the `if (onIntroGenerated || onConclusionGenerated)` conditional. Always fetch:

```ts
const [introRes, conclusionRes] = await Promise.allSettled([
  fetch("/api/admin/ai/content", {
    method: "POST",
    body: JSON.stringify({ action: "introduction", title, content }),
  }).then((r) => r.json()),
  fetch("/api/admin/ai/content", {
    method: "POST",
    body: JSON.stringify({ action: "conclusion", title, content }),
  }).then((r) => r.json()),
]);
if (
  introRes.status === "fulfilled" &&
  introRes.value?.introductions?.length > 0
) {
  const idx = introRes.value.recommended ?? 0;
  const text =
    introRes.value.introductions[idx]?.text ??
    introRes.value.introductions[0].text;
  setIntroSuggestion(text);
  onIntroGenerated?.(text); // keep callback for backward compat
}
if (
  conclusionRes.status === "fulfilled" &&
  conclusionRes.value?.conclusions?.length > 0
) {
  const idx = conclusionRes.value.recommended ?? 0;
  const text =
    conclusionRes.value.conclusions[idx]?.text ??
    conclusionRes.value.conclusions[0].text;
  setConclusionSuggestion(text);
  onConclusionGenerated?.(text);
}
```

### New collapsible section in panel render — "اقتراحات الكتابة":

Rendered after the "issues" section, only when `aiPhase === 'complete'` and intro or conclusion suggestions exist.

```tsx
<SuggestionCard
  label="مقترح المقدمة"
  text={introSuggestion}
  applied={introApplied}
  onApply={() => {
    const editor = editorRef.current?.getEditor();
    if (editor && introSuggestion) {
      editor.commands.insertContentAt(0, `<p>${introSuggestion}</p>`);
      setIntroApplied(true);
    }
  }}
  onDismiss={() => setIntroSuggestion(null)}
/>
<SuggestionCard
  label="مقترح الخاتمة"
  text={conclusionSuggestion}
  applied={conclusionApplied}
  onApply={() => {
    const editor = editorRef.current?.getEditor();
    if (editor && conclusionSuggestion) {
      const endPos = editor.state.doc.content.size;
      editor.commands.insertContentAt(endPos, `<p>${conclusionSuggestion}</p>`);
      setConclusionApplied(true);
    }
  }}
  onDismiss={() => setConclusionSuggestion(null)}
/>
```

Design for `SuggestionCard`: minimal card with Arabic-right label, truncated preview (2 lines), "تطبيق" (success color) / "رفض" (ghost) action buttons. Show a "✓ مُطبَّق" badge when applied.

---

## Change E — Rewrite: Include Structure Issues + Preserve Intro/Conclusion

### Step 1: `lib/ai/prompts.ts` — Update `buildRewriteArticlePrompt`

Add parameters:

```ts
structureTopIssues: string[];
preservedIntro?: string;
preservedConclusion?: string;
```

Add to prompt body (after GEO issues section):

```
مشاكل هيكل المقال التي يجب معالجتها:
${structureTopIssues.join('\n') || 'لا توجد مشاكل هيكلية'}

${preservedIntro ? `\n⚠️ المقدمة التالية وافق عليها المستخدم — احتفظ بها كما هي في بداية المقال:\n${preservedIntro}` : ''}
${preservedConclusion ? `\n⚠️ الخاتمة التالية وافق عليها المستخدم — احتفظ بها كما هي في نهاية المقال:\n${preservedConclusion}` : ''}
```

### Step 2: `lib/ai/article-completion.ts` — `rewriteArticle()`

Add to function signature:

```ts
structureTopIssues?: string[];
preservedIntro?: string;
preservedConclusion?: string;
```

Pass them to `buildRewriteArticlePrompt`.

### Step 3: `app/api/admin/ai/rewrite-article/route.ts` — schema

```ts
structureTopIssues: z.array(z.string()).default([]),
preservedIntro: z.string().optional(),
preservedConclusion: z.string().optional(),
```

### Step 4: `components/admin/UnifiedAiPanel.tsx` — `handleRewrite`

Compute structure issues:

```ts
const structureChecklist = analyzeStructure(
  title,
  content,
  focusKeyword || undefined,
);
const structureTopIssues = structureChecklist
  .filter((item) => !item.passed)
  .map((item) => item.label || item.description)
  .slice(0, 5);
```

Pass preserved sections:

```ts
preservedIntro: introApplied ? introSuggestion ?? undefined : undefined,
preservedConclusion: conclusionApplied ? conclusionSuggestion ?? undefined : undefined,
```

Include `structureTopIssues` in the fetch body to `/api/admin/ai/rewrite-article`.

---

## Change F — UI/UX Polish

### Loading state in panel (`renderQuickStatsSection`):

Replace the simple spinner with a step-by-step live progress:

```
╔══════════════════════════════╗
║  [●] جاري استخراج الكلمات...  ║
║  ████████░░░░░░ خطوة 2/5      ║
╚══════════════════════════════╝
```

Use a smooth animated progress bar (CSS width transition) derived from `aiStep`:

- 5 steps mapped to 0/20/40/60/80/100%

### Section auto-open after analysis:

After `setAiPhase('complete')`, also set:

```ts
setSectionStates((prev) => ({
  ...prev,
  issues: true,
  meta: true,
  taxonomy: true,
}));
```

### Score ring appearance:

When `wordCount < 10`, show rings with `--` instead of `0` in the center (update `ArticleEditorHeader.tsx`'s `ScoreRing` to accept an `empty` prop that renders `--`).
Pass `empty={wordCount === 0}` from `ArticleEditorHeader` when `wordCount < 10`.

---

## Verification Steps

1. **Score suppression**: Open new article with no content — header should show `--` or `0` in rings. Type 10+ words — rings should start updating.
2. **localStorage recovery**: Type content on new article, refresh page (before 30s DB save) — should see recovery banner.
3. **Analysis persistence**: Click "تحليل أولي", wait for completion, refresh page — results should still be visible (sessionStorage).
4. **Intro/conclusion suggestions**: After analysis, check for new "اقتراحات الكتابة" section. Click "تطبيق" — intro/conclusion should appear in editor.
5. **Rewrite with all issues**: Click "إعادة كتابة بالذكاء الاصطناعي" — check network request includes `structureTopIssues`. If intro was applied, check `preservedIntro` is sent.
6. **TypeScript**: `npx tsc --noEmit` — 0 errors
7. **Lint**: `npm run lint` — 0 errors
8. **Build**: `npm run build` — completes successfully
