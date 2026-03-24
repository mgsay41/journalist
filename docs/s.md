# Fix: "Rewrite with AI" Feature End-to-End

## Context

The "Rewrite with AI" button in the new/edit article pages is broken. Root cause analysis across the full SSE pipeline, editor integration, and mark-application system found 5 bugs. The most critical one (Bug 1) causes the UI to silently get stuck in the 'rewriting' state whenever Gemini returns an error — the error event is thrown inside the very `try/catch` meant for JSON parse errors, so it's caught and silently swallowed. Additional bugs cause generic error messages, a race condition when applying AI edit marks, a stale closure calling re-analyze with old content, and mark application failing for paragraphs with inline formatting (bold, italic, links).

---

## Files to Change

- `components/admin/UnifiedAiPanel.tsx` — 5 changes (Bugs 1, 2, 4, 5, 6)
- `components/admin/RichTextEditor.tsx` — 3 changes (Bug 3)

---

## Bug 1 (CRITICAL) — SSE error events silently swallowed

**Location**: Both `handleAnalyze` and `handleRewrite` in `UnifiedAiPanel.tsx`

**Root cause**: The SSE loop's inner `try` wraps both JSON parsing AND event handling:

```typescript
try {
  const data = JSON.parse(line.slice(6));
  // ...
  else if (data.type === 'error') {
    throw new Error(data.message);  // ← thrown here...
  }
} catch {
  // Skip malformed JSON           // ← ...silently caught here
}
```

When Gemini returns `{ type: 'error', message: '...' }`, the error is eaten, UI stays stuck in `'rewriting'` forever.

**Fix**: Separate JSON parse from event handling in both functions:

```typescript
for (const line of lines) {
  if (!line.startsWith('data: ')) continue;
  let data;
  try {
    data = JSON.parse(line.slice(6));
  } catch {
    continue;  // Only malformed JSON is skipped
  }
  if (data.type === 'step') { ... }
  else if (data.type === 'complete') { ... }
  else if (data.type === 'error') {
    throw new Error(data.message);  // Now properly reaches outer catch
  }
}
```

Apply this same restructure in **both** `handleAnalyze` and `handleRewrite`.

---

## Bug 2 — Generic error message on non-OK HTTP response

**Location**: `handleAnalyze` (~line 288) and `handleRewrite` (~line 422) in `UnifiedAiPanel.tsx`

**Fix**: Read the JSON error body before throwing:

```typescript
// Before:
if (!response.ok) {
  throw new Error("فشل في الاتصال بخدمة إعادة الكتابة");
}

// After:
if (!response.ok) {
  const errorBody = await response.json().catch(() => null);
  throw new Error(errorBody?.error || "فشل في الاتصال بخدمة إعادة الكتابة");
}
```

---

## Bug 3 — `applyAiEditMarks` fails for paragraphs with inline formatting

**Location**: `RichTextEditor.tsx`, `findTextPosition` and `applyAiEditMarks`

**Root cause**: `findTextPosition` searches within individual text nodes (`node.isText`). When the AI output includes `<strong>`, `<em>`, or `<a>` tags, TipTap splits the content into multiple text nodes. Searching for `"Some bold text"` fails because no single node contains the full string.

**Fix**: Add a `findBlockPosition` helper using `node.textContent` (which concatenates ALL child text nodes of a block):

```typescript
const findBlockPosition = useCallback(
  (searchText: string): { from: number; to: number } | null => {
    if (!editor) return null;
    const doc = editor.state.doc;
    let found: { from: number; to: number } | null = null;
    const prefix = searchText.substring(0, 40).trim();

    doc.descendants((node, pos) => {
      if (found) return false;
      if (node.isBlock && !node.isText && node.textContent) {
        if (node.textContent.trim().startsWith(prefix)) {
          found = { from: pos + 1, to: pos + node.nodeSize - 1 };
          return false;
        }
      }
    });

    return found;
  },
  [editor],
);
```

Then in `applyAiEditMarks` (line ~270), change `findTextPosition` → `findBlockPosition`. Also add `findBlockPosition` to the `useImperativeHandle` dep array.

---

## Bug 4 — 100ms timing race condition when applying marks

**Location**: `handleRewrite` complete block, `UnifiedAiPanel.tsx`

**Root cause**:

```typescript
onContentChange(result.rewrittenContent); // Triggers React re-render cycle
// ...
setTimeout(() => editorRef.current?.applyAiEditMarks(marks), 100); // Race!
```

`onContentChange` triggers a re-render → the RichTextEditor `useEffect` calls `editor.commands.setContent()` → this wipes existing marks. The 100ms delay may or may not be enough before marks are applied.

**Fix**: Reorder operations — set content directly into the editor first (synchronous), apply marks immediately, THEN call `onContentChange` for state sync. The RichTextEditor's `useEffect` is guarded by `content !== editor.getHTML()`, so when `onContentChange` eventually updates the prop, the editor already has the matching content and `setContent` won't be called again (marks survive):

```typescript
} else if (data.type === 'complete') {
  const result: RewriteArticleResult = data.data;
  const diffResults = computeParagraphDiff(content, result.rewrittenContent);
  const modified = diffResults.filter((d) => d.type === 'modified');

  // 1. Set content directly into editor (synchronous)
  const editorInstance = editorRef.current?.getEditor();
  if (editorInstance) {
    editorInstance.commands.setContent(result.rewrittenContent);
  }

  // 2. Apply marks immediately (no setTimeout needed)
  if (modified.length > 0) {
    const marks = buildAiEditMarksFromDiff(diffResults, result.rewrittenContent);
    editorRef.current?.applyAiEditMarks(marks);
    setAiEditCount(modified.length);
    const changes: AiChange[] = modified.map((d, i) => ({
      id: `ai-edit-${i}`,
      originalText: d.originalText || '',
      aiText: d.rewrittenText || '',
    }));
    setAiChanges(changes);
    setShowReviewModal(true);
  }

  // 3. Sync React state (won't re-trigger setContent since content already matches)
  if (result.rewrittenTitle) {
    onTitleChange(result.rewrittenTitle);
  }
  setRewriteChanges(result.changesSummary || []);
  setAiIteration(prev => prev + 1);
  setAiPhase('complete');
  setAiMessage('اكتملت إعادة الكتابة');
  onContentChange(result.rewrittenContent);
}
```

---

## Bug 6 — Stale grammar marks persist after AI rewrite

**Location**: `handleRewrite` complete block, `UnifiedAiPanel.tsx`

**Root cause**: When the AI rewrites the article, the content changes completely. Any grammar marks applied from the initial analysis now point to text that no longer exists in the editor. TipTap keeps those marks rendered (yellow/red underlines) on whatever text happens to be at those positions in the new content — which is visually confusing and wrong.

**Fix**: Clear all grammar marks and reset the grammar state when the rewrite completes. Add to step 1 of the reorder block (right after `editorInstance.commands.setContent`):

```typescript
// Clear stale grammar marks — content has completely changed
editorRef.current?.clearAllMarks();
setGrammarMarksActive(false);
```

This reuses the existing `clearAllMarks()` ref method and `setGrammarMarksActive` state already in the component. The user can re-apply grammar check after reviewing the AI rewrite by clicking "تطبيق التدقيق اللغوي" — but that requires running "إعادة التحليل" first to get fresh grammar results for the new content.

---

## Bug 5 — Auto-reanalyze uses stale closure (wrong content)

**Location**: `handleRewrite` complete block, `UnifiedAiPanel.tsx`

**Root cause**:

```typescript
setTimeout(() => {
  handleAnalyze(); // stale closure — analyzes OLD content, not the rewritten content
}, 1000);
```

`handleAnalyze` is captured in `handleRewrite`'s closure before `onContentChange` triggers a re-render with the new content.

**Fix**: Remove the auto-reanalyze entirely. The user can click "إعادة التحليل" manually after reviewing AI changes. Also remove `handleAnalyze` from `handleRewrite`'s `useCallback` dependency array.

---

## Implementation Steps

### Step 1 — `UnifiedAiPanel.tsx`

**1a. Fix `handleAnalyze` non-OK response** (~line 288):

- Replace `throw new Error('فشل...')` with error body read + throw.

**1b. Fix `handleAnalyze` SSE loop** (~lines 303-374):

- Restructure `for` loop: `try{JSON.parse}catch{continue}` then handle events outside the try.

**1c. Fix `handleRewrite` non-OK response** (~line 422):

- Same as 1a for the rewrite endpoint.

**1d. Fix `handleRewrite` SSE loop + complete block + remove auto-reanalyze** (~lines 440-496):

- Restructure try/catch (Bug 1)
- Reorder content-set → mark-apply → state-sync (Bug 4)
- Clear stale grammar marks after `setContent` (Bug 6): call `editorRef.current?.clearAllMarks()` and `setGrammarMarksActive(false)`
- Remove `setTimeout(() => handleAnalyze(), 1000)` (Bug 5)
- Remove `handleAnalyze` from dependency array

### Step 2 — `RichTextEditor.tsx`

**2a.** Add `findBlockPosition` useCallback after `findTextPosition` (~line 194).

**2b.** Change `findTextPosition` to `findBlockPosition` inside `applyAiEditMarks` (~line 270).

**2c.** Add `findBlockPosition` to `useImperativeHandle` deps array (~line 301).

---

## Verification

After making changes, run in order:

```bash
npx tsc --noEmit   # 0 type errors
npm run lint       # 0 lint errors
npm run build      # successful build
```

**Manual test**:

1. Open new article, write 50+ words, add a title
2. Click "تحليل أولي" → wait for completion → focus keyword auto-populated
3. Apply grammar marks if any exist (click "تطبيق التدقيق اللغوي") — verify underlines appear in editor
4. Click "إعادة كتابة بالذكاء الاصطناعي"
5. Verify: spinner shows, then content updates, **grammar underlines are cleared**, diff review modal appears with AI change highlights
6. Accept/reject individual changes, verify editor updates
7. Click "قبول الكل" / "رفض الكل" — verify all AI marks cleared

**Error path test**:

- With invalid GEMINI_API_KEY, verify error message appears (not stuck spinner)
- With rate limit hit (> 5 requests in 60s), verify rate limit message shown
