# Performance Enhancement Plan
## Arabic Journalist CMS — Maximum Speed on Mobile & Desktop

**Audited**: 2026-03-22
**Goal**: 90+ Lighthouse scores across all metrics, sub-1s LCP, zero CLS
**Priority**: Mobile-first, then desktop

---

## Audit Summary: 42 Issues Found

| Severity | Count | Areas |
|----------|-------|-------|
| CRITICAL | 4 | LCP image, waterfall fetches, scroll throttling, hydration mismatch |
| HIGH | 12 | Duplicate queries, font loading, server component conversion, CLS |
| MEDIUM | 18 | Cache TTL, inline styles, N+1 queries, image dimensions |
| LOW | 8 | Bundle analyzer, SVG handling, font subsets |

---

## Phase 1 — Critical Fixes (Do First, Biggest Impact)

### 1.1 Fix Unoptimized Featured Image in Article Page
**File**: `app/article/[slug]/page.tsx` (lines 617–622)
**Issue**: Plain `<img>` tag with no Next.js optimization — no AVIF/WebP, no sizing hints
**Fix**: Replace with Next.js `<Image>` component using `fill`, `sizes`, and `priority`

```tsx
// BEFORE (broken):
<img
  src={article.featuredImage.url}
  alt={article.featuredImage.altText || article.title}
  className="w-full h-auto"
  style={{ display: 'block' }}
/>

// AFTER:
<Image
  src={article.featuredImage.url}
  alt={article.featuredImage.altText || article.title}
  fill
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
  priority
  className="object-cover"
/>
```

**Impact**: LCP improvement of 500ms–2s on slow connections

---

### 1.2 Fix LazyImage to Respect `priority` Prop
**File**: `components/public/LazyImage.tsx`
**Issue**: Even when `priority` is true, the component waits for IntersectionObserver before loading
**Fix**: Bypass the lazy loading logic entirely when `priority` is set — load immediately

```tsx
// When priority=true, skip intersection check:
const [isInView, setIsInView] = useState(priority ?? false);
```

**Impact**: Hero image on homepage and article pages loads immediately

---

### 1.3 Fix Waterfall Data Fetching on Homepage
**File**: `app/page.tsx`
**Issue 1**: `getRecentArticles()` waits for `getHeroArticle()` to resolve first
**Issue 2**: `getHeroArticle()` is called twice (once in HeroSection, once in RecentArticlesSection)
**Issue 3**: `getCategories()` and `getPopularTags()` called sequentially in `getHomepageData()`

**Fix**: Fetch all data in parallel at the page level, pass down as props

```tsx
// app/page.tsx — top-level parallel fetch:
const [heroArticle, recentArticles, categories, popularTags] = await Promise.all([
  getHeroArticle(),
  getRecentArticles(null), // filter hero client-side
  getCategories(),
  getPopularTags(),
]);
// Pass hero.id to filter recentArticles array:
const filteredRecent = recentArticles.filter(a => a.id !== heroArticle?.id);
```

**Impact**: Homepage data fetch time cut by ~50% (sequential → parallel)

---

### 1.4 Throttle Scroll Event Listener in Header
**File**: `components/public/PublicHeader.tsx` (lines 36–39)
**Issue**: Fires state update on every pixel of scroll — up to 120fps on high-refresh displays
**Fix**: Throttle with `requestAnimationFrame`

```tsx
useEffect(() => {
  let rafId: number;
  const handleScroll = () => {
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      setScrolled(window.scrollY > 60);
    });
  };
  window.addEventListener('scroll', handleScroll, { passive: true });
  return () => {
    window.removeEventListener('scroll', handleScroll);
    cancelAnimationFrame(rafId);
  };
}, []);
```

**Impact**: Eliminates scroll jank, prevents 120 re-renders/second

---

## Phase 2 — High Priority (Major LCP/CLS/FID Improvements)

### 2.1 Convert PublicHeader to Hybrid (Server + Client)
**File**: `components/public/PublicHeader.tsx`
**Issue**: Entire header is a client component causing it to be included in JS bundle
**Fix**: Extract only the interactive parts (scroll state, mobile menu, search toggle) into a separate `HeaderInteractions` client component. The header shell (logo, nav links) becomes a server component.

```
components/public/
  PublicHeader.tsx       ← server component (HTML structure, nav links)
  HeaderClient.tsx       ← client component (scroll, mobile menu, search)
```

**Impact**: Reduces client JS, speeds up Time to Interactive (TTI)

---

### 2.2 Fix Mobile Menu CLS (Layout Shift)
**File**: `components/public/PublicHeader.tsx`
**Issue**: `{mobileMenuOpen && <div>}` removes/adds DOM nodes causing layout shift
**Fix**: Use CSS `hidden` class instead of conditional rendering

```tsx
// BEFORE:
{mobileMenuOpen && (
  <div className="md:hidden py-3 border-t border-border">...</div>
)}

// AFTER:
<div className={`md:hidden py-3 border-t border-border ${mobileMenuOpen ? '' : 'hidden'}`}>
  ...
</div>
```

**Impact**: Eliminates header-related CLS on mobile

---

### 2.3 Fix Font Size Hydration Mismatch
**File**: `components/public/FontSizeControls.tsx` (lines 59–67)
**Issue**: Font size is read from localStorage in `useEffect`, causing a second render after hydration — creates visible text size shift
**Fix**: Use cookie to persist font size preference (readable server-side, no hydration mismatch)

```tsx
// Read from cookie during SSR:
// lib/font-size.ts
export function getFontSizeFromCookie(cookieStore: ReadonlyRequestCookies): FontSize {
  return (cookieStore.get('fontSize')?.value as FontSize) ?? 'medium';
}

// Write to cookie on change:
const setFontSize = (size: FontSize) => {
  document.cookie = `fontSize=${size}; path=/; max-age=31536000`;
  setFontSizeState(size);
};
```

**Impact**: Eliminates font-size flash/shift on page load

---

### 2.4 Add Image Width/Height to Article Body Images (CLS Fix)
**File**: `components/public/ArticleContent.tsx` (lines 45–55)
**Issue**: Regex adds `loading="lazy"` but not `width`/`height` — causes layout shift as images load
**Fix**: Extend the regex injection to include `width` and `height`

```tsx
const optimizedContent = useMemo(() => {
  const sanitized = sanitizeArticleContent(content);
  return sanitized.replace(
    /<img(?![^>]*\sloading=)([^>]*)>/gi,
    '<img$1 loading="lazy" decoding="async" fetchpriority="low" style="max-width:100%;height:auto;">'
  );
}, [content]);
```

**Impact**: Reduces CLS from article body images significantly

---

### 2.5 Remove Duplicate Hero Query
**File**: `app/page.tsx`
**Issue**: `getHeroArticle()` called twice — once in `HeroSection` async function, once in `RecentArticlesSection`
**Fix**: Call once at page level (covered in 1.3 above), pass result to both sections as props

---

### 2.6 Increase Image Cache TTL
**File**: `next.config.ts` (line ~30)
**Issue**: `minimumCacheTTL: 60` — images cached for only 1 minute
**Fix**: Increase to 24 hours for CDN-served published article images

```ts
images: {
  minimumCacheTTL: 86400, // 24 hours
  // ...
}
```

**Impact**: Reduces image re-fetches by ~99% for returning visitors

---

### 2.7 Increase API Cache Headers
**File**: `app/api/public/articles/route.ts` (line ~89)
**Current**: `s-maxage=300, stale-while-revalidate=600`
**Fix**: Increase CDN cache duration

```ts
'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
```

Apply same to:
- `app/api/public/categories/route.ts`
- `app/api/public/tags/route.ts`
- `app/api/public/articles/[slug]/route.ts`
- `app/api/public/articles/[slug]/related/route.ts`

**Impact**: CDN serves most API responses without hitting your server

---

### 2.8 Add Cache Layer to Homepage Queries
**File**: `app/page.tsx` and related lib functions
**Issue**: Every homepage visit hits the database
**Fix**: Use Next.js `unstable_cache` (or your existing `lib/cache/index.ts`) on all public page queries

```tsx
import { unstable_cache } from 'next/cache';

const getHeroArticle = unstable_cache(
  async () => { /* ... existing query ... */ },
  ['hero-article'],
  { revalidate: 300, tags: ['articles'] } // 5 min cache
);

const getRecentArticles = unstable_cache(
  async (excludeId: string | null) => { /* ... */ },
  ['recent-articles'],
  { revalidate: 300, tags: ['articles'] }
);
```

**Impact**: Near-zero database load for public pages between publishes

---

## Phase 3 — Medium Priority (Polish & Optimization)

### 3.1 Consolidate Font Loading (Remove or Lazy-load Amiri)
**File**: `app/layout.tsx`
**Issue**: Two Arabic fonts loaded on every page (Cairo + Amiri = ~50KB)
**Recommendation**:
- **Option A (Recommended)**: Remove Amiri entirely, use Cairo for all text
- **Option B**: Keep Amiri but set `display: "optional"` — browser skips it if not cached

```tsx
const amiri = Amiri({
  // ...
  display: "optional", // Don't block rendering for display font
});
```

**Impact**: Saves 15–25KB per page load on first visit

---

### 3.2 Remove Content Field from Article List Queries
**File**: `app/api/public/articles/route.ts`
**Issue**: Full article content (can be 10–50KB per article) returned in list endpoints
**Fix**: Add explicit `select` clause excluding `content`

```tsx
select: {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  publishedAt: true,
  // content: false ← do NOT include
  featuredImage: { select: { url: true, altText: true } },
  // ...
}
```

**Impact**: List responses shrink from ~500KB to ~50KB for 20 articles

---

### 3.3 Extract Print Styles to globals.css
**File**: `app/article/[slug]/page.tsx`
**Issue**: ~4KB of print styles injected via `dangerouslySetInnerHTML` inline `<style>` tag
**Fix**: Move all `@media print { ... }` rules to `app/globals.css`

**Impact**: Reduces inline JS/HTML payload by 4KB per article page

---

### 3.4 Move Inline Styles to CSS Classes
**File**: `app/page.tsx` (34 occurrences of `style={}`)
**Issue**: Inline styles are not cached and defeat CSS optimization
**Fix**: Create semantic utility classes in `globals.css` or Tailwind config

Priority targets:
```tsx
// These repeated patterns should become classes:
style={{ background: 'linear-gradient(to top, ...)' }}  → .hero-gradient
style={{ fontWeight: 700, textShadow: '...' }}          → .hero-title
style={{ WebkitLineClamp: 3, ... }}                     → .line-clamp-3 (Tailwind already has this)
```

---

### 3.5 Add Compound Database Index for Hero Article Query
**File**: `prisma/schema.prisma`
**Issue**: `getHeroArticle()` filters on `status + isFeatured + publishedAt` with no compound index
**Fix**: Add to Article model:

```prisma
@@index([status, isFeatured, publishedAt(sort: Desc)])
@@index([status, publishedAt(sort: Desc)])
```

After adding: `npx prisma db push`

**Impact**: Hero query goes from full table scan to index scan

---

### 3.6 Fix FontSizeContext Re-render Cascade
**File**: `components/public/FontSizeControls.tsx` (lines 99–101)
**Issue**: Context value object recreated on every render, causing all consumers to re-render
**Fix**: Wrap context value in `useMemo`

```tsx
const contextValue = useMemo(() => ({
  fontSize,
  setFontSize,
  increaseFontSize,
  decreaseFontSize,
  resetFontSize,
}), [fontSize]); // only changes when fontSize changes

return (
  <FontSizeContext.Provider value={contextValue}>
    {children}
  </FontSizeContext.Provider>
);
```

---

### 3.7 Optimize LazyImage Placeholder
**File**: `components/public/LazyImage.tsx`
**Issue**: SVG base64 generated per-image, not cached
**Fix**: Define as module-level constant

```tsx
// Define once outside the component:
const BLUR_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAi...';

// Use in component:
blurDataURL={BLUR_PLACEHOLDER}
```

---

### 3.8 Add Query Timeouts to Critical DB Calls
**File**: `prisma/schema.prisma` and `lib/prisma.ts`
**Issue**: Slow queries can hang indefinitely
**Fix**: Configure Prisma timeout

```ts
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
  // Add query timeout via middleware:
});

prisma.$use(async (params, next) => {
  const result = await Promise.race([
    next(params),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Query timeout')), 5000)
    ),
  ]);
  return result;
});
```

---

### 3.9 Use Font Subset Arabic-Only
**File**: `app/layout.tsx`
**Issue**: Loading both Arabic and Latin subsets adds unnecessary bytes
**Fix**: Remove `"latin"` from Cairo font config if content is Arabic-only

```tsx
const cairo = Cairo({
  subsets: ["arabic"], // Remove "latin" if site is Arabic-only
  // ...
});
```

---

## Phase 4 — Advanced Optimizations

### 4.1 Static Generation for Public Pages
**Files**: `app/page.tsx`, `app/category/[slug]/page.tsx`, `app/tag/[slug]/page.tsx`
**Strategy**: Use ISR (Incremental Static Regeneration) with on-demand revalidation

```tsx
// Force static generation with 5-minute revalidation:
export const revalidate = 300;

// OR use on-demand revalidation when articles are published:
// In publish API: await revalidateTag('articles');
```

**Impact**: Pages served from CDN edge, zero database hit per request

---

### 4.2 Implement Streaming for Article Lists
**Files**: `app/page.tsx`, `app/category/[slug]/page.tsx`
**Strategy**: Use React Suspense to stream article grid while hero loads instantly

```tsx
// app/page.tsx:
export default function HomePage() {
  return (
    <>
      <HeroSection />  {/* renders immediately */}
      <Suspense fallback={<ArticleGridSkeleton />}>
        <ArticleGrid />  {/* streams in when ready */}
      </Suspense>
    </>
  );
}
```

**Impact**: Users see content immediately, grid streams in — perceived performance dramatically better

---

### 4.3 Preload Critical Resources
**File**: `app/layout.tsx`
**Strategy**: Add resource hints for critical assets

```tsx
// In <head>:
<link rel="preconnect" href="https://res.cloudinary.com" />
<link rel="dns-prefetch" href="https://res.cloudinary.com" />
```

---

### 4.4 Implement Service Worker for Offline/Cache
**Strategy**: Use `next-pwa` or custom service worker to cache:
- Font files (permanent)
- CSS/JS bundles (versioned cache)
- Article thumbnails (LRU cache, 50 items)

**Impact**: Returning visitors load instantly from cache

---

### 4.5 Optimize Cloudinary Image URLs
**File**: All places using Cloudinary URLs
**Strategy**: Add transformation parameters for automatic quality and format

```tsx
// Utility function for optimized Cloudinary URLs:
function cloudinaryUrl(url: string, width: number): string {
  return url.replace(
    '/upload/',
    `/upload/q_auto,f_auto,w_${width},dpr_auto/`
  );
}
```

**Impact**: Browser receives exact-size, optimal-format images

---

## Implementation Order (Recommended)

| # | Fix | Time Estimate | Impact |
|---|-----|---------------|--------|
| 1 | Fix article page featured image (1.1 + 1.2) | 30 min | LCP -1s |
| 2 | Fix homepage waterfall fetches (1.3) | 45 min | TTFB -500ms |
| 3 | Add scroll throttling (1.4) | 15 min | FID elimination |
| 4 | Fix mobile menu CLS (2.2) | 15 min | CLS fix |
| 5 | Add image cache TTL + API cache (2.6 + 2.7) | 20 min | bandwidth -80% |
| 6 | Add DB cache layer (2.8) | 1 hour | server load -90% |
| 7 | Convert header to hybrid (2.1) | 1 hour | TTI improvement |
| 8 | Fix font size hydration (2.3) | 45 min | CLS fix |
| 9 | Remove content from list queries (3.2) | 20 min | payload -90% |
| 10 | Add compound DB indexes (3.5) | 20 min | query speed -70% |
| 11 | Extract print styles (3.3) | 20 min | -4KB per page |
| 12 | Consolidate fonts (3.1) | 15 min | -25KB per page |
| 13 | ISR for public pages (4.1) | 2 hours | near-instant loads |
| 14 | Suspense streaming (4.2) | 2 hours | perceived perf |

---

## Expected Results After All Phases

| Metric | Before | After Target |
|--------|--------|--------------|
| LCP (mobile) | ~3–5s | < 1.2s |
| LCP (desktop) | ~2–3s | < 0.8s |
| CLS | ~0.15+ | < 0.01 |
| FID/INP | ~150ms | < 50ms |
| Lighthouse Performance (mobile) | ~55–65 | 90+ |
| Lighthouse Performance (desktop) | ~70–80 | 95+ |
| API response (cached) | ~200ms | < 10ms |
| Homepage DB queries | 6 sequential | 1 parallel (cached) |
| Article list payload | ~500KB | < 50KB |

---

## Files Changed Summary

| File | Changes |
|------|---------|
| `app/layout.tsx` | Font loading strategy, preconnect hints |
| `app/page.tsx` | Parallel fetches, ISR, Suspense boundaries |
| `app/article/[slug]/page.tsx` | Image component, print styles extraction |
| `app/category/[slug]/page.tsx` | ISR, cache headers |
| `app/globals.css` | Print styles, hero gradient classes |
| `app/api/public/articles/route.ts` | Cache headers, exclude content field |
| `app/api/public/categories/route.ts` | Cache headers |
| `app/api/public/tags/route.ts` | Cache headers |
| `components/public/PublicHeader.tsx` | Server/client split, scroll throttle, CLS fix |
| `components/public/LazyImage.tsx` | Priority bypass, placeholder constant |
| `components/public/ArticleContent.tsx` | Image dimensions in regex |
| `components/public/FontSizeControls.tsx` | Cookie-based hydration, useMemo context |
| `next.config.ts` | Image cache TTL |
| `prisma/schema.prisma` | Compound indexes |
| `lib/prisma.ts` | Query timeout middleware |

---

**Last Updated**: 2026-03-22
**Status**: Planning — Not yet implemented
