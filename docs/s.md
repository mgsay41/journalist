# Better Article Editor UX Plan

## Context

The current UX has a fundamental problem: **the writer must navigate to information instead of information coming to the writer.** Five tabs hide scores, issues, and tools behind clicks. Grammar marks require a manual "Apply" button. AI rewrites scatter 15+ amber highlights across the article requiring individual hover interactions. The publish flow blocks without guiding.

This plan redesigns the experience around three principles:

1. **Always-visible signals** — critical scores never hidden in a tab
2. **One action, one result** — no multi-step manual chains
3. **Guided review** — bring changes to the writer, not the other way around

---

## What's Wrong With the Current UX (Specific Pain Points)

| Pain Point                                      | Root Cause         | Impact                                                                         |
| ----------------------------------------------- | ------------------ | ------------------------------------------------------------------------------ |
| SEO + GEO scores hidden in SEO tab              | Tab-based sidebar  | Writer doesn't see score degrading as they write                               |
| Grammar marks require "Apply" button            | Manual trigger     | Errors invisible until writer remembers to click                               |
| 5-tab panel requires constant context switching | Tab architecture   | Writer loses flow switching between AI→SEO→Meta→Taxonomy→Structure             |
| AI diff = 15+ scattered amber highlights        | No review mode     | Reviewing 12 changes requires 12 separate hover→click sequences                |
| Pre-publish modal is a blocker, not a helper    | Warning-only modal | Writer sees "meta title missing" but must close modal and search for the field |
| Structure checklist hidden in "هيكل" tab        | Buried in tabs     | Writer finishes article without knowing they missed a FAQ section              |

---

## The Better Approach: 4 Targeted Changes

### Change 1 — Always-Visible Bottom Status Bar

**New file**: `components/admin/EditorStatusBar.tsx`

A slim fixed bar (40px) sits at the bottom of the editor area — not inside the sidebar. Always visible regardless of sidebar state. Shows live:

```
[ ● SEO: 72 ]  [ ● GEO: 58 ]  [ هيكل: 7/10 ]  [ 450 كلمة ]  [ ⚠ 3 أخطاء ]  [ ↑ AI ]
```

- Each metric has a colored dot (green/amber/red) matching score thresholds
- Clicking a metric focuses the sidebar to that section (instead of requiring tab navigation)
- Grammar error count shows if grammar marks are active (`⚠ N أخطاء` in red)
- The `↑ AI` button opens/closes the sidebar from anywhere without looking away from content
- Updates on the same 500ms debounce as existing live scores

**Integration in `new/page.tsx` and `edit/page.tsx`**:

- Place between the editor scroll area and the bottom of the page
- Receives: `seoScore`, `geoScore`, `structureScore`, `wordCount`, `grammarCount`, `onFocus(section)`, `onTogglePanel()`

---

### Change 2 — Single Scrollable Panel (Replace 5 Tabs)

**Modify**: `components/admin/UnifiedAiPanel.tsx`

Replace 5-tab navigation with a **single vertical scrollable panel** with collapsible sections. No more tab switching.

**Panel structure (top to bottom):**

```
┌─────────────────────────────┐
│  QUICK STATS (always open)  │
│  SEO 72  GEO 58  هيكل 7/10 │
│  [تحليل] / [إعادة الكتابة]  │
├─────────────────────────────┤
│  ▾ المشاكل (5)              │  ← collapsible, open by default if issues exist
│  Grammar + SEO + GEO issues │
│  sorted by priority          │
├─────────────────────────────┤
│  ▸ بيانات الميتا             │  ← collapsible, closed by default
│  keyword, meta title, desc,  │
│  excerpt, slug               │
├─────────────────────────────┤
│  ▸ التصنيف                   │  ← collapsible, closed by default
│  Categories + Tags           │
└─────────────────────────────┘
```

**Key decisions:**

- Structure checklist moves INTO the Quick Stats section as a mini progress bar with "See all" expanding it — no separate tab
- "Issues" section consolidates grammar errors + SEO suggestions + GEO missing items into one prioritized list
  - Grammar errors shown as text snippets with "Fix" button inline (no need to hover in editor)
  - One-click fix applies the correction directly: `editor.commands.applyGrammarCorrection(id, correction)`
  - SEO issues shown as actionable items: "Add keyword to first paragraph" with direct "Fix" action where possible
- Section open/close state persisted in `sessionStorage` so re-opening panel keeps state
- `activeSection` state replaces `activeTab` — clicking status bar metric calls `setActiveSection('issues')` etc.

**Remove from panel:**

- The 5-tab `TABS` constant and tab bar
- The `activeTab` state
- `renderAiTab`, `renderSeoTab`, `renderMetaTab`, `renderTaxonomyTab`, `renderStructureTab` → replaced by `renderQuickStats`, `renderIssuesSection`, `renderMetaSection`, `renderTaxonomySection`

**Keep from panel:**

- All AI logic (handleAnalyze, handleRewrite, handleApplyGrammarMarks, handleAcceptAllAiEdits)
- Live score computation (useEffect with analyzeArticle + analyzeGeo)
- All state (completionResults, grammarIssues, aiEditCount, etc.)
- The amber AI edit badge with Accept All / Reject All

---

### Change 3 — AI Change Review Modal (Replace Scattered Amber Highlights)

**New file**: `components/admin/AiChangeReviewModal.tsx`

When AI rewrites content, instead of dumping all amber highlights into the editor, open a **focused review modal** that walks the writer through changes one at a time.

**Modal layout:**

```
┌──────────────────────────────────────────────┐
│  مراجعة تعديلات الذكاء الاصطناعي   3 / 12   │
│  ████████░░░░░░░░░░░░░░   (progress bar)     │
├──────────────────────────────────────────────┤
│  النص الأصلي:                                │
│  ┌──────────────────────────────────────┐    │
│  │ مصر تشهد ارتفاعاً في معدلات التضخم   │    │
│  └──────────────────────────────────────┘    │
│  التعديل المقترح:                            │
│  ┌──────────────────────────────────────┐    │
│  │ ارتفع معدل التضخم في مصر إلى 20%    │    │
│  └──────────────────────────────────────┘    │
├──────────────────────────────────────────────┤
│  [← رفض]  [Skip]  [قبول ←]                  │
│                                              │
│  [قبول الكل]         [رفض الكل]             │
└──────────────────────────────────────────────┘
```

**Behavior:**

- Opens automatically after AI rewrite completes (replaces the scattered amber highlight approach)
- Writer uses:
  - `←` arrow key or "قبول" = accept this change, advance to next
  - `→` arrow key or "رفض" = reject this change, advance to next
  - `Skip` = keep amber in editor, skip for now
  - "قبول الكل" / "رفض الكل" = bulk
- When modal closes, remaining un-reviewed changes stay as amber highlights in editor (existing behavior preserved as fallback)
- Progress bar: `N / total` reviewed

**Props:**

```typescript
interface AiChangeReviewModalProps {
  changes: Array<{ id: string; originalText: string; aiText: string }>;
  isOpen: boolean;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onClose: () => void;
}
```

**Integration in `UnifiedAiPanel.tsx`:**

- When `aiEditCount > 0` after rewrite, instead of just showing the amber badge:
  - Set `showReviewModal = true` to open this modal
  - Pass the `completionResults.diffChanges` to it
  - Modal callbacks call existing `editorRef.current.acceptAiEdit(id)` / `rejectAiEdit(id)`
- The amber badge with "قبول الكل / رفض الكل" stays as secondary option below the modal trigger

**State in UnifiedAiPanel:**

```typescript
const [showReviewModal, setShowReviewModal] = useState(false);
// After rewrite, auto-open:
if (modified.length > 0) {
  setShowReviewModal(true); // opens modal instead of just setting aiEditCount
}
```

---

### Change 4 — Smart Publish Panel (Fill-While-Publishing)

**Modify**: Pre-publish modal in `new/page.tsx` and `edit/page.tsx`

Replace the current "warning + scores" modal with an **action-oriented panel** that lets the writer complete missing fields without closing the modal.

**New modal layout:**

```
┌──────────────────────────────────────────────┐
│  نشر المقال                                  │
├──────────────────────────────────────────────┤
│  [ SEO 72 ●  ] [ GEO 58 ●  ]                │
├──────────────────────────────────────────────┤
│  ✅ العنوان الوصفي  (filled)                  │
│  ⚠ الوصف الموجز    ← [input here directly]  │
│  ⚠ الكلمة المفتاحية ← [input here directly]  │
│  ⚠ الوصف الوصفي    ← [textarea here]        │
├──────────────────────────────────────────────┤
│  [نشر الآن]    [تصدير مسودة]                │
└──────────────────────────────────────────────┘
```

**Key change**: Missing fields are **directly editable inside the modal** — writer fills them without closing. On change:

- The parent state (excerpt, focusKeyword, metaDescription) updates via the existing callbacks
- The ✅/⚠ indicator updates live

**Implementation:**

- Modal has its own local copies of missing fields (initialized from current values)
- On clicking "نشر الآن": call the setter callbacks to sync back to parent, then trigger publish
- This avoids needing to close-and-find-the-Meta-tab workflow

---

### Change 5 — Auto Grammar (No "Apply" Button)

**Modify**: `components/admin/UnifiedAiPanel.tsx` + `app/admin/articles/new/page.tsx`

Grammar marks should appear automatically after AI analysis completes — not require a separate "Apply Grammar Marks" button click.

**Change in `handleAnalyze`**: After phase 3 (grammar) completes, automatically call `handleApplyGrammarMarks()`. Remove the "تطبيق التدقيق اللغوي" button — replace with "مسح الأخطاء النحوية" (Clear Grammar) only.

**Result**: Writer clicks "تحليل أولي" once → grammar marks, SEO score, GEO score, structure all update automatically. Zero additional clicks needed.

---

## Implementation Order

```
1. EditorStatusBar.tsx (NEW) — pure UI component, no logic
2. AiChangeReviewModal.tsx (NEW) — pure UI component
3. UnifiedAiPanel.tsx (MAJOR MODIFY):
   a. Replace tabs with sections
   b. Auto-apply grammar after analysis
   c. Open AiChangeReviewModal after rewrite
   d. Add onFocusSection prop for status bar integration
4. new/page.tsx — add EditorStatusBar, wire section focus, enhance publish modal
5. edit/page.tsx — same as new/page.tsx changes
```

After each file: `npx tsc --noEmit` (fix errors before continuing)
Final: `npm run lint` → `npm run build`

---

## Critical Files

| File                                               | Role                                                                                    |
| -------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `components/admin/UnifiedAiPanel.tsx`              | Core change — remove tabs, add sections, auto grammar, modal trigger                    |
| `components/admin/editor/GrammarErrorExtension.ts` | `applyGrammarCorrection` command used in Issues section inline fix                      |
| `lib/ai/diff-utils.ts`                             | `buildAiEditMarksFromDiff` produces the `changes` array fed to AiChangeReviewModal      |
| `components/admin/editor/AiEditExtension.ts`       | `acceptAiEdit(id)` / `rejectAiEdit(id)` called from modal callbacks                     |
| `components/admin/RichTextEditor.tsx`              | `RichTextEditorRef` — `acceptAllAiEdits`, `rejectAllAiEdits` used in modal bulk actions |
| `app/admin/articles/new/page.tsx`                  | Add EditorStatusBar, enhance publish modal with inline fields                           |
| `app/admin/articles/[id]/edit/page.tsx`            | Same                                                                                    |

---

## What Stays The Same

- All TipTap extensions (GrammarErrorExtension, SeoSuggestionExtension, AiEditExtension) — unchanged
- All AI API routes — unchanged
- All scoring logic (analyzeArticle, analyzeGeo) — unchanged
- All diff utilities — unchanged
- Auto-save logic — unchanged
- Pre-existing keyboard shortcuts — unchanged

---

## Verification

- [ ] Writing in editor → bottom bar updates SEO/GEO/word count live without any click
- [ ] Clicking SEO score in bottom bar → panel opens and scrolls to Issues section
- [ ] Clicking "تحليل أولي" → grammar marks appear automatically (no extra click)
- [ ] AI rewrite completes → AiChangeReviewModal opens with first change shown
- [ ] Arrow key → accept/reject navigates through all changes
- [ ] "قبول الكل" in modal → all amber highlights resolved, modal closes
- [ ] Panel has no tabs — scrolling down reveals Meta then Taxonomy sections
- [ ] Clicking "نشر" → publish modal shows missing fields as inline editable inputs
- [ ] Filling excerpt in publish modal → excerpt state updates without closing modal
- [ ] `npx tsc --noEmit` = 0 errors
- [ ] `npm run build` passes
