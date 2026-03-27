# Plan: AI Categories/Tags Flow + Structure Analysis + Search-as-you-type Taxonomy

## Context

Three requirements for the article editor taxonomy section and structure analysis:

1. **AI creates categories/tags immediately:** When AI analysis completes, new suggested categories/tags should be created in DB right away (not waiting for article save), so they're available for other articles.

2. **Search-as-you-type for categories/tags:** The current "أضف تصنيفاً جديداً" input just creates new items blindly. Replace with a search dropdown that filters existing items as the user types, and allows creating new ones if no match found.

3. **Structure analysis → AI rewrite:** (Already verified working from previous session. No changes needed.)

**Previous session already implemented:**

- Preloaded categories/tags on mount (`preloadedCategories`, `preloadedTags`)
- `allCategories`/`allTags` use preloaded data as fallback
- Internal links filtered from AI structure issues
- AI prompt improved for title length + paragraph constraints

---

## Change 1 — Create new AI-suggested categories/tags in DB immediately

### Root Cause

New categories/tags from AI analysis are placed in `newCategoryNames`/`newTagNames` state. They're only created in DB on explicit publish/manual-save. Auto-save skips them. If user doesn't explicitly save, they're lost.

### Fix

**File:** [components/admin/UnifiedAiPanel.tsx](components/admin/UnifiedAiPanel.tsx)

**Add import** (top of file):

```typescript
import { fetchWithCsrf } from "@/lib/security/csrf-client";
```

**Add `createNewTaxonomy` helper** (inside component body, near other callbacks):

```typescript
const createNewTaxonomy = useCallback(
  async (
    newCatNames: string[],
    newTagNames_: string[],
    existingCatIds: string[],
    existingTagIds: string[],
  ) => {
    const createdCatIds: string[] = [];
    const failedCatNames: string[] = [];
    for (const name of newCatNames) {
      try {
        const res = await fetchWithCsrf("/api/admin/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.id) createdCatIds.push(data.id);
          else failedCatNames.push(name);
        } else failedCatNames.push(name);
      } catch {
        failedCatNames.push(name);
      }
    }

    const createdTagIds: string[] = [];
    const failedTagNames: string[] = [];
    for (const name of newTagNames_) {
      try {
        const res = await fetchWithCsrf("/api/admin/tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.id) createdTagIds.push(data.id);
          else failedTagNames.push(name);
        } else failedTagNames.push(name);
      } catch {
        failedTagNames.push(name);
      }
    }

    const allCatIds = Array.from(
      new Set([...selectedCategoryIds, ...existingCatIds, ...createdCatIds]),
    );
    onCategoriesChange(allCatIds, failedCatNames);
    setNewCategoryNames(failedCatNames);

    const allTagIds = Array.from(
      new Set([...selectedTagIds, ...existingTagIds, ...createdTagIds]),
    );
    onTagsChange(allTagIds, failedTagNames);
    setNewTagNames(failedTagNames);

    // Refresh preloaded lists to include newly created items
    if (createdCatIds.length > 0 || createdTagIds.length > 0) {
      fetch("/api/admin/categories?flat=true")
        .then((r) => r.json())
        .then((cats) => {
          setPreloadedCategories(
            (cats.categories || []).map((c: { id: string; name: string }) => ({
              id: c.id,
              name: c.name,
            })),
          );
        })
        .catch(() => {});
      fetch("/api/admin/tags?includeCount=false")
        .then((r) => r.json())
        .then((tags) => {
          setPreloadedTags(
            (tags.tags || []).map((t: { id: string; name: string }) => ({
              id: t.id,
              name: t.name,
            })),
          );
        })
        .catch(() => {});
    }
  },
  [selectedCategoryIds, selectedTagIds, onCategoriesChange, onTagsChange],
);
```

**Replace taxonomy assignment in SSE complete handler** (currently ~lines 509-531):

```typescript
// Replace the current existingCatIds / newCats / existingTagIds / newTags blocks with:
const existingCatIds = (r.suggestedCategories || [])
  .filter((c: SuggestedCategory) => c.isExisting && c.id)
  .map((c: SuggestedCategory) => c.id as string);
const newCatNames = (r.suggestedCategories || [])
  .filter((c: SuggestedCategory) => !c.isExisting)
  .map((c: SuggestedCategory) => c.name);
const existingTagIds = (r.suggestedTags || [])
  .filter((t: SuggestedTag) => t.isExisting && t.id)
  .map((t: SuggestedTag) => t.id as string);
const newTagNames_ = (r.suggestedTags || [])
  .filter((t: SuggestedTag) => !t.isExisting)
  .map((t: SuggestedTag) => t.name);

if (
  existingCatIds.length > 0 ||
  newCatNames.length > 0 ||
  existingTagIds.length > 0 ||
  newTagNames_.length > 0
) {
  await createNewTaxonomy(
    newCatNames,
    newTagNames_,
    existingCatIds,
    existingTagIds,
  );
  setSectionStates((prev) => ({ ...prev, taxonomy: true }));
}
```

---

## Change 2 — Search-as-you-type for categories/tags in taxonomy panel

### Current Behavior

Simple text input. On Enter → adds name to `newCategoryNames`/`newTagNames` without checking if it already exists.

### New Behavior

- As user types → filter existing `allCategories`/`allTags` (already preloaded) and show matching dropdown
- Select existing → toggle into selected IDs immediately
- No match found → show "إضافة جديد: [query]" option → create in DB and select
- Dropdown closes on selection or click-outside

### Implementation

**File:** [components/admin/UnifiedAiPanel.tsx](components/admin/UnifiedAiPanel.tsx)

**Add state** (near `newCategoryNames` state):

```typescript
const [catSearchQuery, setCatSearchQuery] = useState("");
const [catSearchOpen, setCatSearchOpen] = useState(false);
const [tagSearchQuery, setTagSearchQuery] = useState("");
const [tagSearchOpen, setTagSearchOpen] = useState(false);
const catSearchRef = useRef<HTMLDivElement>(null);
const tagSearchRef = useRef<HTMLDivElement>(null);
```

**Add click-outside effect** (with other useEffects):

```typescript
useEffect(() => {
  function handleClick(e: MouseEvent) {
    if (
      catSearchRef.current &&
      !catSearchRef.current.contains(e.target as Node)
    )
      setCatSearchOpen(false);
    if (
      tagSearchRef.current &&
      !tagSearchRef.current.contains(e.target as Node)
    )
      setTagSearchOpen(false);
  }
  document.addEventListener("mousedown", handleClick);
  return () => document.removeEventListener("mousedown", handleClick);
}, []);
```

**Add helper: `createAndSelectCategory`** (new categories only — creates in DB + selects):

```typescript
const createAndSelectCategory = useCallback(
  async (name: string) => {
    try {
      const res = await fetchWithCsrf("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.id) {
          onCategoriesChange(
            [...selectedCategoryIds, data.id],
            newCategoryNames,
          );
          setPreloadedCategories((prev) => [
            ...prev,
            { id: data.id, name: data.name },
          ]);
        }
      }
    } catch {}
    setCatSearchQuery("");
    setCatSearchOpen(false);
  },
  [selectedCategoryIds, newCategoryNames, onCategoriesChange],
);
```

**Add helper: `createAndSelectTag`** (same pattern for tags).

**Replace category input** with search+dropdown UI:

```tsx
<div ref={catSearchRef} className="relative mt-2">
  <input
    type="text"
    value={catSearchQuery}
    onChange={e => { setCatSearchQuery(e.target.value); setCatSearchOpen(true); }}
    onFocus={() => setCatSearchOpen(true)}
    placeholder="ابحث عن تصنيف أو أضف جديداً..."
    dir="rtl"
    className="w-full px-3 py-1.5 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
  />
  {catSearchOpen && catSearchQuery.trim() && (
    <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
      {/* Filtered existing categories */}
      {allCategories
        .filter(c => !c.id.startsWith('new-') && !selectedCategoryIds.includes(c.id) && c.name.includes(catSearchQuery.trim()))
        .slice(0, 8)
        .map(cat => (
          <button key={cat.id} onClick={() => {
            onCategoriesChange([...selectedCategoryIds, cat.id], newCategoryNames);
            setCatSearchQuery(''); setCatSearchOpen(false);
          }} className="w-full text-right px-3 py-2 text-sm hover:bg-muted flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-muted-foreground" .../>  {/* tag icon */}
            {cat.name}
          </button>
        ))
      }
      {/* Create new option */}
      {!allCategories.some(c => c.name === catSearchQuery.trim()) && (
        <button onClick={() => createAndSelectCategory(catSearchQuery.trim())}
          className="w-full text-right px-3 py-2 text-sm hover:bg-muted text-primary flex items-center gap-2">
          <svg className="w-3.5 h-3.5" .../> {/* plus icon */}
          إضافة: "{catSearchQuery.trim()}"
        </button>
      )}
      {/* No results */}
      {allCategories.filter(c => !c.id.startsWith('new-') && c.name.includes(catSearchQuery.trim())).length === 0
        && allCategories.some(c => c.name === catSearchQuery.trim()) && (
        <div className="px-3 py-2 text-sm text-muted-foreground">لا توجد نتائج</div>
      )}
    </div>
  )}
</div>
```

**Replace tag input** with same pattern (using `allTags` for filtering).

---

## Files to Modify

- [components/admin/UnifiedAiPanel.tsx](components/admin/UnifiedAiPanel.tsx)
  - Add `fetchWithCsrf` import
  - Add state: `catSearchQuery`, `catSearchOpen`, `tagSearchQuery`, `tagSearchOpen`, refs
  - Add `createNewTaxonomy` callback
  - Add `createAndSelectCategory` + `createAndSelectTag` callbacks
  - Add click-outside useEffect
  - Replace taxonomy assignment in SSE complete handler
  - Replace category + tag simple inputs with search+dropdown UI

---

## Verification

1. Open new article → taxonomy section shows all DB categories/tags immediately (from preload)
2. Type in category search → dropdown shows filtered results
3. Select existing category → chip appears as selected (green) immediately
4. Type something not in DB → "إضافة: ..." option appears → click → category created in DB and selected
5. Run AI analysis → new suggested categories/tags created in DB immediately (check Categories page)
6. Auto-save → article is linked to created categories/tags correctly
7. Run `npx tsc --noEmit` + `npm run lint` + `npm run build`
