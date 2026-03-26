# Plan: Full Mobile Responsiveness Overhaul

## Context

The journalist website (Arabic RTL, Next.js 16, Tailwind v4) is heavily used on mobile phones, especially the admin dashboard for writing articles. Screenshots confirm real usage on mobile. The site has basic responsive foundations but critical layout-breaking issues on small screens — primarily the article editor, sidebar, and admin navigation. This plan addresses all issues from highest impact to lowest.

---

## Critical Files to Modify (19 files)

### Group 1 — Admin Layout Foundation

- `components/admin/AdminSidebar.tsx`
- `components/admin/AdminLayoutWrapper.tsx`
- `components/admin/AdminTopBar.tsx`

### Group 2 — Article Editor

- `app/admin/articles/new/page.tsx`
- `app/admin/articles/[id]/edit/page.tsx`
- `components/admin/ArticleEditorHeader.tsx`
- `components/admin/RichTextEditor.tsx`

### Group 3 — Bottom Bars & Toolbars

- `components/admin/MobileEditorToolbar.tsx`
- `components/admin/MobileQuickActions.tsx`
- `components/admin/BulkActionsBar.tsx`
- `components/admin/editor/EditorToolbar.tsx`

### Group 4 — Dropdowns & Modals

- `components/admin/NotificationBell.tsx`
- `components/admin/DateRangePicker.tsx`
- `components/ui/Modal.tsx`

### Group 5 — Articles List

- `components/admin/ArticlesListClient.tsx`

### Group 6 — Panel Heights

- `components/admin/AiPanel.tsx`
- `components/admin/UnifiedAiPanel.tsx`

### Group 7 — Public Site

- `app/page.tsx` (categories section touch targets)
- `app/archive/page.tsx` (minor grid fix)

---

## Implementation Steps

### Step 1: AdminSidebar — Slide-in Overlay on Mobile

**Problem**: Sidebar is `fixed right-0` always visible. Below `lg:` (1024px) it permanently covers content since `AdminLayoutWrapper` only applies `lg:ms-56` margin.

**Fix**: Add `translate-x-full lg:translate-x-0` as default state so the sidebar sits off-screen on mobile. When `isMobileOpen` is true, override with `translate-x-0`.

```tsx
// In <aside> className:
'translate-x-full lg:translate-x-0',
isMobileOpen && '!translate-x-0',
```

The `isMobileOpen` backdrop and toggle button already exist — they just need the sidebar to actually move.

---

### Step 2: AdminLayoutWrapper — Mobile Padding

**Fix**: Reduce main content padding on small screens:

- `p-6` → `p-4 lg:p-6`
- The `lg:ms-56/24` margin logic is already correct (sidebar is overlay on mobile, no shift needed)

---

### Step 3: AdminTopBar — Touch Targets & Hamburger Clearance

**Problem**: Hamburger button (`fixed end-4 top-4`) overlaps the breadcrumb area. Action buttons are 36px (below 44px minimum).

**Fixes**:

- `px-6` → `px-4 lg:px-6` on header
- Add `pe-14 lg:pe-0` to the right-side breadcrumb container to clear the hamburger
- `DarkModeToggle` / `NotificationBell` wrappers: add `min-h-[44px] min-w-[44px]`
- User avatar button: `w-9 h-9` → `w-10 h-10`

---

### Step 4: Article Editor Pages — Bottom Sheet Panel

**Problem**: `panelOpen && <aside className="w-80">` renders in a horizontal flex row on ALL screen sizes, squishing the editor on phones.

**Fix**: Split into two renders:

1. **Desktop** (`hidden md:flex`): keep existing `w-80 xl:w-88` aside
2. **Mobile** (`md:hidden`): render as a bottom sheet overlay with backdrop

```tsx
{/* Desktop side panel */}
{panelOpen && (
  <aside className="hidden md:flex w-80 xl:w-88 shrink-0 border-s border-border bg-card flex-col overflow-hidden">
    <UnifiedAiPanel ... />
  </aside>
)}

{/* Mobile bottom sheet */}
{panelOpen && (
  <div className="md:hidden fixed inset-0 z-40 flex flex-col justify-end">
    <div className="absolute inset-0 bg-black/40" onClick={() => setPanelOpen(false)} />
    <div className="relative bg-card border-t border-border rounded-t-2xl max-h-[80vh] flex flex-col overflow-hidden z-50">
      <div className="flex justify-center pt-2 pb-1 shrink-0">
        <div className="w-10 h-1 rounded-full bg-border" />
      </div>
      <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
        <span className="text-sm font-semibold">الإعدادات والتحليل</span>
        <button onClick={() => setPanelOpen(false)} className="p-2 rounded-lg hover:bg-muted min-h-[44px] min-w-[44px] flex items-center justify-center">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <UnifiedAiPanel ... />
      </div>
    </div>
  </div>
)}
```

**Also**: Initialize `panelOpen` based on viewport on first render:

```tsx
const [panelOpen, setPanelOpen] = useState(false);
useEffect(() => {
  if (window.innerWidth >= 768) setPanelOpen(true);
}, []);
```

**Also**: Change editor content padding `px-8` → `px-4 md:px-8`.

Apply identical changes to both `new/page.tsx` and `[id]/edit/page.tsx`.

---

### Step 5: ArticleEditorHeader — Compact Mobile Layout

**Problem**: Long header row with scores, buttons, status pill, publish button all competing for space below 390px.

**Fixes**:

- SEO/word count scores already `hidden md:flex` — correct
- Schedule button already `hidden sm:flex` — correct
- `Dividers` between groups: add `hidden sm:block`
- StatusPill label: `hidden sm:inline` on the text, show only color dot on xs
- Publish button: `h-8 px-4` → `h-10 px-3 text-sm md:h-8 md:px-4`
- Panel toggle & preview buttons: `w-8 h-8` → `min-w-[44px] min-h-[44px]` (center icon inside)
- Schedule modal trigger: add `w-full max-w-xs` to the schedule dialog's date-time picker container

---

### Step 6: RichTextEditor & EditorToolbar — Hide Desktop Toolbar on Mobile

**Problem**: Desktop `EditorToolbar` has `size="sm"` buttons (~30px) — too small for touch. Mobile version (`MobileEditorToolbar`) already exists with proper 44px targets but is not wired up in the editor pages.

**Fix in `RichTextEditor.tsx`**: Wrap `EditorToolbar` in `<div className="hidden md:block">`.

**Fix in `new/page.tsx` and `[id]/edit/page.tsx`**: Add `MobileEditorToolbar` below the editor scroll area, wrapped in `<div className="md:hidden">`, passing the editor instance via `editorRef.current?.getEditor()`.

---

### Step 7: MobileQuickActions — Logical Properties Fix

**Fix**: Replace physical positioning properties with logical equivalents:

- `left-4 right-4` → `inset-x-4`
- `left-0 right-0` → `inset-x-0`

---

### Step 8: BulkActionsBar — Mobile Full-Width Layout

**Problem**: Centered floating pill `fixed bottom-4 left-1/2 -translate-x-1/2` — on mobile the pill can overflow. Inner `flex gap-4` row may wrap badly.

**Fix**:

- Change to `fixed bottom-4 inset-x-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2`
- Inner layout: `flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4`
- Button group inside: `flex flex-wrap gap-1.5`

---

### Step 9: NotificationBell Dropdown

**Fix**: `w-80` → `w-72 sm:w-80 max-w-[calc(100vw-1rem)]`

- `max-h-[360px]` → `max-h-[50vh] sm:max-h-[360px]`

---

### Step 10: DateRangePicker Dropdown

**Fixes**:

- `w-80` → `w-full sm:w-80`
- RTL fix: `left-0`/`right-0` → `start-0`/`end-0` for alignment prop

---

### Step 11: Modal — Responsive Sizing

**Fixes**:

```tsx
const sizeStyles = {
  sm: "max-w-sm sm:max-w-md",
  md: "max-w-full sm:max-w-lg",
  lg: "max-w-full sm:max-w-2xl",
  xl: "max-w-full sm:max-w-4xl",
};
```

- Container: `mx-3 sm:mx-4`
- Header/content padding: `p-4 sm:p-6`
- Max height: `max-h-[95vh] sm:max-h-[90vh]`

---

### Step 12: ArticlesListClient — Hide Columns on Mobile

**Problem**: 8-column table with no responsive adaptation.

**Fix**: Hide low-priority columns using `hidden {breakpoint}:table-cell`:

- Categories `<th>/<td>`: add `hidden md:table-cell`
- Author `<th>/<td>`: add `hidden lg:table-cell`
- Views `<th>/<td>`: add `hidden lg:table-cell`
- Date `<th>/<td>`: add `hidden sm:table-cell`
- Keep: checkbox, title, status badge, actions

Action buttons in the row: change `p-2` to `p-2.5` for larger touch area.

---

### Step 13: AiPanel — Remove Fixed Height

**Fix**: Remove `max-h-[500px]` from the panel content div (the parent bottom sheet already constrains height via `max-h-[80vh]`). On desktop the `flex flex-col overflow-hidden` parent constrains it naturally.

---

### Step 14: Public Site — Minor Fixes

**`app/page.tsx`** — Category cards: add `min-h-[56px]` for better touch targets on the category grid items.

**`app/archive/page.tsx`** — Month archive grid is already `grid-cols-2 sm:grid-cols-3`, which is fine for mobile. No change needed.

---

## RTL Compatibility Rules (Apply Throughout)

All positioning changes must use logical CSS properties:
| Use | Avoid |
|-----|-------|
| `ms-*`, `me-*` | `ml-*`, `mr-*` |
| `ps-*`, `pe-*` | `pl-*`, `pr-*` |
| `start-*`, `end-*` | `left-*`, `right-*` |
| `border-s`, `border-e` | `border-l`, `border-r` |
| `inset-x-*` | `left-* right-*` when same value |
| `text-start`, `text-end` | `text-left`, `text-right` |

---

## Viewport Meta (Check Once)

In `app/layout.tsx`, verify the viewport export includes:

```tsx
export const viewport: Viewport = {
  interactiveWidget: "resizes-visual", // prevents layout shift when keyboard appears
};
```

---

## Verification

1. Test at 375px (iPhone SE), 390px (iPhone 14), 768px (iPad) in browser devtools
2. Confirm admin sidebar slides off-screen and opens via hamburger
3. Confirm article editor is full-width on mobile; panel opens as bottom sheet
4. Confirm all interactive elements are ≥ 44px tall
5. Confirm no horizontal scroll on any admin page
6. Run `npx tsc --noEmit`, `npm run lint`, `npm run build` — must pass with 0 errors
