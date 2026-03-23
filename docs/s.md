# Plan: Deep Admin Review & UI Enhancement

## Context

A comprehensive review of the admin panel and backend revealed several issues across three categories:

1. **Design system breaks** — several pages/components use hardcoded zinc/white Tailwind classes instead of the established CSS variable system
2. **Functional bugs** — articles page has a server-component crash risk and inconsistent use of existing UI components
3. **Missing UI features** — TopBar lacks notification bell and dark mode toggle; sidebar has no brand identity

The backend (APIs, auth, CSRF, rate limiting, error handling) is solid — no structural changes needed there.

The `frontend-design` skill will be invoked during implementation for the NotificationBell dropdown and DashboardQuickActions visual redesign.

---

## Phase 1 — Fix Design System Breaks (priority: critical)

These are mechanical find-and-replace with zero logic changes. Must run before visual enhancements.

### 1.1 `components/admin/AnalyticsStatsCard.tsx`

Replace all hardcoded color classes:

- `bg-white border border-zinc-200` → `bg-card border border-border`
- `text-zinc-600` (label) → `text-muted-foreground`
- `text-zinc-900` (value) → `text-foreground`
- `text-green-600` (positive) → `text-success`
- `text-red-600` (negative) → `text-danger`
- `text-zinc-500` (neutral) → `text-muted-foreground`
- `ml-4 text-zinc-400` (icon) → `ms-4 text-muted-foreground/40` (fix RTL `ml-4` → `ms-4`)

### 1.2 `app/admin/analytics/page.tsx`

Replace all zinc/white classes throughout every section:

- Page header border: `border-zinc-200` → `border-border`; `text-zinc-900` → `text-foreground`; `text-zinc-600` → `text-muted-foreground`
- Export toolbar: `border-zinc-300` → `border-border`; `hover:bg-zinc-50` → `hover:bg-muted`
- Section headings `h2`: `text-zinc-900` → `text-foreground`
- Table wrapper: `bg-white border-zinc-200` → `bg-card border-border`
- Table head: `bg-zinc-50` → `bg-muted`; `text-zinc-700` → `text-muted-foreground`
- Table rows: `hover:bg-zinc-50` → `hover:bg-muted/50`; `divide-zinc-200` → `divide-y divide-border`
- Table cells: `text-zinc-900` → `text-foreground`; `text-zinc-600` → `text-muted-foreground`; `text-zinc-500` → `text-muted-foreground`
- View link: `text-zinc-600 hover:text-zinc-900` → `text-muted-foreground hover:text-foreground`
- Status/Category section cards: `bg-white border-zinc-200` → `bg-card border-border`
- Category bar track: `bg-zinc-100` → `bg-muted`; bar fill: `bg-zinc-900` → `bg-accent`
- Additional stats row cards: same `bg-white border-zinc-200` → `bg-card border-border`
- Remove `border-b border-zinc-200 pb-4` wrapper from page header (align with categories/settings pattern)

### 1.3 `app/admin/scheduled/page.tsx`

Replace all zinc classes with CSS variable equivalents (same pattern as above). Keep amber-colored "ready to publish" alert as-is (intentional).

### 1.4 `app/admin/dashboard/page.tsx`

- Replace inline status badge `bg-blue-50 text-blue-600` (lines ~416, ~468) with `<ArticleStatusBadge status={article.status} />` from `components/ui/Badge.tsx` — already handles all 4 statuses with correct CSS variables
- In `StatsCard` color map: `info: 'text-blue-600'` → `info: 'text-accent'`

---

## Phase 2 — Bug Fixes (priority: high)

### 2.1 `components/ui/EmptyState.tsx`

Add optional `href` to action prop (prerequisite for articles page fix):

```ts
action?: {
  label: string;
  onClick?: () => void;  // becomes optional
  href?: string;
};
```

Inside the component: when `action.href` is present, render `<Link href={action.href}>` (styled identically). Existing callsites all pass `onClick` — no breakage.

### 2.2 `app/admin/articles/page.tsx`

Three fixes:

1. **EmptyState crash** — change `action={{ label: '...', onClick: () => { window.location.href = '...' } }}` to `action={{ label: '...', href: '/admin/articles/new' }}`
2. **CTA button** — replace raw `<Link className="...">` with `<Link href="/admin/articles/new"><Button variant="primary" size="sm">...</Button></Link>` (matching dashboard pattern); fix `ml-2` → `ms-2` on icon
3. **Pagination** — replace the raw prev/next `<Link>` block with `<PaginationLink>` from `components/ui/PaginationLink.tsx`, passing `getPageUrl={(page) => buildFilterUrl(params, { page: String(page) })}`

---

## Phase 3 — UI Enhancement (priority: medium, use frontend-design skill)

### 3.1 New: `components/admin/DarkModeToggle.tsx` (`'use client'`)

- State: `useState<'light' | 'dark' | null>(null)` — null prevents hydration mismatch
- `useEffect`: read from `localStorage`, apply to `document.documentElement.classList`
- On toggle: flip class and persist to `localStorage`
- Sun icon (dark mode active) / Moon icon (light mode active); return `null` until hydrated
- Style: `p-2 rounded-lg hover:bg-muted transition-colors`

### 3.2 New: `components/admin/NotificationBell.tsx` (`'use client'`) — use `frontend-design` skill

- On mount + every 60s: fetch `/api/admin/notifications?stats=true&recent=5`
- Shows bell icon; if `unread > 0`, red dot badge with count (capped at "9+")
- Click → dropdown panel opens (controlled `useState`, not hover-only for accessibility)
- Dropdown (RTL aware, `end-0`): list of recent notifications with title, truncated message, time-ago in Arabic; `<Link>` if `actionUrl` present
- Footer: "تحديد الكل كمقروء" button (PATCH `/api/admin/notifications` `{ action: 'markAllRead' }`) + "مشاهدة الكل" link
- After mark-read: re-fetch stats

### 3.3 `components/admin/AdminTopBar.tsx`

Import and add `<DarkModeToggle />` and `<NotificationBell />` to the left-side actions area, before the user avatar:

```tsx
<DarkModeToggle />
<NotificationBell />
{actions}
{/* existing user avatar block */}
```

### 3.4 `app/admin/dashboard/page.tsx` — use `frontend-design` skill

Elevate the Quick Actions card from plain full-width buttons to icon-card style:

- Each action: icon in `bg-accent/10 rounded-xl` square + bold label + subtitle description line
- Renders as a 3-col grid; collapses to 1-col on mobile
- No new components needed; restructure existing `<Link><Button>` pattern inline

### 3.5 `components/admin/AdminSidebar.tsx`

- Change logo square: `bg-foreground` → `bg-accent` (editorial amber identity)
- When `!isCollapsed`, add site name text next to logo: `<span className="text-sm font-bold text-foreground ms-2">صحيفتي</span>`
- Add `siteName?: string` prop (with default `"صحيفتي"`) threaded from `AdminLayoutWrapper`

---

## Verification

After each phase, run:

```bash
npx tsc --noEmit   # must pass with 0 errors
npm run lint       # must pass with 0 errors
npm run build      # must complete successfully
```

**Visual checks:**

- Analytics page: should match the dark/light card style of the dashboard
- Dashboard: status badges should use consistent colors; Quick Actions should look editorial
- TopBar: notification bell badge visible when unread; dark mode toggle persists across refresh
- Sidebar: amber logo square visible

**TypeScript risks:**

- `EmptyState` action prop: `onClick` becomes optional — verify no TS errors at callsites
- `NotificationBell`: type the API response; import or inline the notification type from `/lib/notifications/`
- `DarkModeToggle`: `null` initial state avoids SSR mismatch; no TS issues expected

---

## Critical Files

| File                                      | Change                                     |
| ----------------------------------------- | ------------------------------------------ |
| `components/admin/AnalyticsStatsCard.tsx` | Fix zinc → CSS vars, ml-4 → ms-4           |
| `app/admin/analytics/page.tsx`            | Full zinc/white replacement                |
| `app/admin/scheduled/page.tsx`            | Zinc replacement                           |
| `app/admin/dashboard/page.tsx`            | Blue→accent badges, enhanced quick actions |
| `components/ui/EmptyState.tsx`            | Add `href` to action prop                  |
| `app/admin/articles/page.tsx`             | Fix 3 bugs (crash, button, pagination)     |
| `components/admin/AdminTopBar.tsx`        | Wire NotificationBell + DarkModeToggle     |
| `components/admin/AdminSidebar.tsx`       | Amber logo + site name                     |
| `components/admin/NotificationBell.tsx`   | **New file**                               |
| `components/admin/DarkModeToggle.tsx`     | **New file**                               |
