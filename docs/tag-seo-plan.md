# Tag SEO Enhancement Plan

## Overview

Improve SEO for tag pages by adding bilingual support (Arabic + English), structured data, enriched metadata, and better admin tooling.

---

## Phase 1 — Database Schema

- [x] **1.1** Add `nameEn String? @unique` field to the `Tag` model in `prisma/schema.prisma`
- [x] **1.2** Add `description String?` field to the `Tag` model
- [x] **1.3** Add `updatedAt DateTime? @updatedAt` field to the `Tag` model
- [x] **1.4** Run `npx prisma db push` to apply schema changes
- [x] **1.5** Run `npx prisma generate` to regenerate the Prisma client

---

## Phase 2 — Tag Creation Flow

- [x] **2.1** Update the AI translation call in `app/api/admin/tags/route.ts` (POST) to also populate `nameEn` from the same AI response — no extra API call needed
- [x] **2.2** Update `app/api/admin/tags/[id]/route.ts` (PUT) to accept and save `nameEn` and `description` fields
- [x] **2.3** Update `lib/validations/tag.ts` — add optional `nameEn` (max 100 chars) and `description` (max 300 chars) to `createTagSchema` and `updateTagSchema`

---

## Phase 3 — Tag Page Metadata

- [x] **3.1** Add `canonical` URL to `generateMetadata` in `app/tag/[slug]/page.tsx`
- [x] **3.2** Add `robots: { index: true, follow: true }` to tag page metadata
- [x] **3.3** Expand `openGraph` block to include `url`, `locale: "ar_AR"`, `type: "website"`, and a fallback `images` array
- [x] **3.4** Add `twitter` card block (`card: "summary"`, title, description)
- [x] **3.5** Update the page `title` to include both names when `nameEn` is available — e.g. `مصر (Egypt) - الموقع الصحفي`
- [x] **3.6** Use `description` field for the meta description when available, falling back to the current generic text

---

## Phase 4 — JSON-LD Structured Data

- [x] **4.1** Add `CollectionPage` JSON-LD to `app/tag/[slug]/page.tsx` with fields: `@id`, `name`, `alternateName` (nameEn), `description`, `url`, `inLanguage`, `numberOfItems`
- [x] **4.2** Add `BreadcrumbList` JSON-LD using the existing `generateBreadcrumbJsonLd()` from `lib/seo/metadata.ts` — already built, just not wired to tag pages

---

## Phase 5 — Sitemap Fix

- [x] **5.1** Update `app/sitemap.ts` — replace `new Date()` with `tag.updatedAt` for tag entries (requires Phase 1.3 to be done first)

---

## Phase 6 — Tag Page UI

- [x] **6.1** Display the `description` field as a paragraph on the tag page, between the header and the articles grid — only renders if description exists
- [x] **6.2** Display `nameEn` as a subtitle or label next to the Arabic tag name in the header (e.g. `مصر · Egypt`)
- [x] **6.3** Add a "Related Tags" section at the bottom of the tag page — query tags that share articles with the current tag, limit to 6

---

## Phase 7 — Admin UI

- [x] **7.1** Add an **English Name** (`nameEn`) input field to the tag create/edit form in `components/admin/TagsListClient.tsx` — pre-filled from AI translation, manually editable
- [x] **7.2** Add a **Description** textarea to the tag create/edit form — optional, Arabic, max 300 chars
- [x] **7.3** Show `nameEn` as a secondary label in the tags list table so editors can see both names at a glance

---

## Verification Checklist

After all phases are complete:

- [x] `npx tsc --noEmit` — no TypeScript errors
- [x] `npm run lint` — 0 errors
- [x] `npm run build` — builds successfully
- [x] Tag page for an Arabic tag shows English name in title
- [x] Tag page has canonical URL in `<head>`
- [x] Tag page JSON-LD is valid (test with Google Rich Results Test)
- [x] Sitemap tag entries show real `lastmod` dates, not today's date
- [x] Admin can set English name and description when creating/editing a tag

---

## Notes

- **hreflang**: Not applicable — this site is Arabic-only. Adding hreflang would require parallel English pages that don't exist.
- **nameEn source**: The AI translation already runs at tag creation time for the slug. Capturing it as `nameEn` costs nothing extra.
- **description**: Optional field — tag pages still work without it, they just fall back to the generic description.
- **Related Tags** (6.3): Query via Prisma — find tags where `articles.some` overlaps with the current tag's articles. Limit to avoid N+1.
