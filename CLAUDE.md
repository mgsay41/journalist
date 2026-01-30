# Claude Development Rules & Learnings

This document contains rules, patterns, and learnings for Claude during development of the Arabic Journalist CMS.

---

## Phase Tracking

**Current Phase**: Phase 11 - Publishing & Scheduling System (Next)

**Completed Phases**:
- ✅ Phase 1: Project Setup & Foundation
- ✅ Phase 2: Authentication System
- ✅ Phase 3: Admin Dashboard Foundation
- ✅ Phase 4: Database Models
- ✅ Phase 5: Article Management - CRUD
- ✅ Phase 6: Category & Tag Management
- ✅ Phase 7: Media Management - Images (Cloudinary)
- ✅ Phase 8: Media Management - YouTube Videos
- ✅ Phase 9: SEO Scoring System
- ✅ Phase 10: Google Gemini AI Integration
- ✅ Phase 10.1: AI Usage Tracking (Token counts & costs per user)

---

## General Rules

### 1. Always Read Before Writing
- **Rule**: Never write to a file without reading it first
- **Reason**: Prevents accidental data loss and ensures you understand existing code
- **Command**: Always use `Read` tool before `Edit` or `Write`

### 2. Test Builds Frequently
- **Rule**: Run `npm run build` after completing significant features
- **Reason**: Catch TypeScript errors and build issues early
- **Pattern**: Build after each component or feature completion

### 3. Mark Tasks as Done
- **Rule**: Update Tasks.md and mark completed tasks with `[x]`
- **Reason**: Track progress and avoid redundant work
- **Pattern**: Update task status after testing

### 4. Use TodoWrite for Complex Tasks
- **Rule**: Create todo items for multi-step tasks
- **Reason**: Better tracking and visibility into progress
- **Pattern**: Update todo status as you work (pending → in_progress → completed)

### 5. Never Assume `asChild` Prop Exists
- **Rule**: Don't assume Radix UI patterns exist in custom components
- **Reason**: Build errors from TypeScript mismatches
- **Pattern**: Either implement `asChild` properly or use direct links

---

## Technology-Specific Rules

### Next.js 16 (App Router)

#### Metadata Configuration
```typescript
// ❌ WRONG - 'dir' is not valid in OpenGraph
openGraph: {
  dir: "rtl",  // This causes build error!
}

// ✅ CORRECT - Use only valid properties
openGraph: {
  title: "...",
  description: "...",
  locale: "ar_AR",
}
// dir="rtl" is set in <html> tag, not metadata
```

#### Font Configuration
```typescript
// ✅ CORRECT - Cairo font for Arabic
import { Cairo } from "next/font/google";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
  weight: ["300", "400", "600", "700", "800"],
});
```

#### Client vs Server Components
- Use `'use client'` directive for components with:
  - Event handlers (onClick, onChange, etc.)
  - useState, useEffect, useRef hooks
  - Browser APIs
- Server components are default and preferred

### Prisma 7.x (Breaking Changes from v6)

#### Schema Configuration
```prisma
// ❌ WRONG - Old Prisma v6 syntax
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")  // ❌ No longer supported!
}

// ✅ CORRECT - Prisma v7 syntax
datasource db {
  provider = "postgresql"
  // Database URL is now in prisma.config.ts, not schema.prisma
}
```

#### Configuration File (prisma.config.ts)
```typescript
// Database URL is configured here, not in schema.prisma
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],  // ← URL goes here
  },
});
```

#### Generate Command
```bash
# Must run after any schema changes
npx prisma generate
```

### Tailwind CSS v4

#### New Syntax
```css
/* Old v3 syntax - no longer works */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* New v4 syntax - single import */
@import "tailwindcss";
```

#### Custom Properties
```css
@theme inline {
  --color-primary: var(--primary);
  --font-sans: var(--font-cairo);
}
```

### TypeScript

#### Type Safety
```typescript
// ❌ WRONG - Missing variant in type
interface BadgeProps {
  variant?: 'default' | 'success' | 'warning';  // Missing 'secondary'!
}

// ✅ CORRECT - Include all used variants
interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'secondary';
}

// Also update the implementation object
const variantStyles = {
  default: '...',
  success: '...',
  warning: '...',
  secondary: '...',  // Don't forget this!
};
```

#### Export Types from Components
```typescript
// Good practice - export props types
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}
```

---

## RTL (Right-to-Left) Best Practices

### HTML Structure
```tsx
<html lang="ar" dir="rtl">  {/* Always set both */}
```

### CSS Logical Properties
```css
/* ❌ Physical properties - break in RTL */
margin-left: 1rem;
padding-right: 0.5rem;

/* ✅ Logical properties - adapt to RTL */
margin-inline-start: 1rem;
padding-inline-end: 0.5rem;
```

### Helper Classes Pattern
```css
/* Create RTL-specific utilities when needed */
.rtl-space-x-2 > * + * {
  margin-right: 0.5rem;  /* RTL-aware spacing */
  margin-left: 0;
}
```

### Input and Text Direction
```css
/* Arabic inputs should be RTL */
input, textarea, select {
  direction: rtl;
  text-align: right;
}

/* Code blocks stay LTR even in RTL */
pre, code, kbd {
  direction: ltr;
  text-align: left;
}
```

---

## Component Patterns

### Button Component
```tsx
// Pattern: Basic button with variants
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

// Don't implement asChild unless needed
// Use direct className for links instead
```

### Input Component
```tsx
// Pattern: Input with label, error, helper text
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

// Always generate unique IDs for accessibility
const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
```

### Modal Component
```tsx
// Pattern: Client component with backdrop and keyboard handling
'use client';

// Implement:
// - Escape key to close
// - Focus trap
// - Body scroll lock
// - Backdrop click to close
```

---

## File Organization

```
/components
  /ui          # Generic reusable components
  /admin       # Admin-specific components
  /public      # Public site components
/lib
  auth/        # Authentication logic
  validations/ # Zod schemas
  utils.ts     # Utility functions
  prisma.ts    # Database client
/types         # TypeScript definitions
```

---

## Git Workflow

### Commit Message Format
```
feat: add article scheduling feature
fix: resolve RTL alignment in editor
docs: update README with installation steps
style: improve button spacing in dashboard
refactor: optimize image upload logic
```

### Branch Strategy
- `master` - Main production branch
- Feature branches from master
- Merge back with pull request (if team) or direct merge (solo)

---

## Common Mistakes to Avoid

### 1. Forgetting to Generate Prisma Client
```bash
# After any schema change, ALWAYS run:
npx prisma generate
```

### 2. Type Mismatches in Badge Variants
```typescript
// If you add a new variant to usage, update the type
// Both places need to match:
interface BadgeProps { variant?: ... 'secondary' }
const variantStyles = { ..., secondary: '...' }
```

### 3. Using Wrong Link Pattern
```tsx
// ❌ This fails if asChild isn't implemented
<Button asChild>
  <Link href="/about">About</Link>
</Button>

// ✅ This works
<Link href="/about" className={buttonStyles}>
  About
</Link>
```

### 4. Missing Client Directive for Interactive Components
```tsx
// ❌ Missing 'use client' - onClick won't work
export function Modal() {
  const [isOpen, setIsOpen] = useState(false);  // Error!
}

// ✅ Correct - 'use client' at top
'use client';
export function Modal() {
  const [isOpen, setIsOpen] = useState(false);  // Works!
}
```

---

## Arabic/RTL Specific Learnings

### Font Choice
- **Cairo**: Excellent for Arabic UI text, modern and readable
- **Tajawal**: Good alternative, similar style
- **Noto Sans Arabic**: Comprehensive character coverage

### Text Alignment
- Always `text-align: right` for Arabic content
- Numbers in Arabic context can be tricky - test thoroughly
- Mixed Arabic/English content needs careful spacing

### Date Formatting
```typescript
// Use Arabic locale for dates
new Intl.DateTimeFormat('ar-SA', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
}).format(date);
```

---

## Environment Variables

### Always Create .env.example
```bash
# Include ALL required variables with placeholders
DATABASE_URL="postgresql://..."
GEMINI_API_KEY="your-key-here"
```

### Never Commit .env Files
```gitignore
# Already in .gitignore, but verify:
.env*
.env.local
.env.production
```

---

## Build Verification Checklist

Before considering a phase complete, verify:
- [ ] `npm run build` completes without errors
- [ ] No TypeScript errors
- [ ] `npx prisma generate` has been run (if schema changed)
- [ ] Components render correctly
- [ ] RTL layout works for Arabic text
- [ ] Tasks.md is updated with completed items

---

## Session 1 Learnings (Phase 1)

### What Went Well
- Clean project structure established early
- Prisma schema designed comprehensively
- RTL configuration done from the start
- Utility functions created proactively

### Issues Encountered
1. **Prisma v7 breaking change**: Schema no longer accepts `url` property
   - **Fix**: Moved DATABASE_URL to prisma.config.ts
2. **Next.js metadata error**: `dir` property doesn't exist in OpenGraph type
   - **Fix**: Removed `dir` from metadata, set in HTML tag instead
3. **Badge component type mismatch**: Missing `secondary` variant
   - **Fix**: Added `secondary` to both type and variantStyles object
4. **Button `asChild` pattern**: Not implemented in custom Button component
   - **Fix**: Used direct Link with className instead

### Action Items for Next Phases
1. Always check Prisma version for breaking changes
2. Verify TypeScript types match implementation exactly
3. Test components incrementally, not all at once
4. Run build frequently to catch errors early

---

## Session 2 Learnings (Phase 2 - Authentication)

### What Went Well
- Login throttling implemented with both email and IP tracking
- Clear documentation for admin account creation
- Database schema properly extended with LoginAttempt model
- Build verification caught all TypeScript errors
- Arabic error messages used throughout auth flow

### Issues Encountered
1. **Better Auth adapter import**: `PrismaAdapter` doesn't exist, should be `prismaAdapter`
   - **Fix**: Changed to camelCase import `prismaAdapter`
2. **Better Auth type inference**: `$Infer.User` doesn't exist, only `$Infer.Session`
   - **Fix**: Use `typeof auth.$Infer.Session.user` for User type
3. **Prisma Neon adapter usage**: Constructor expects config object, not Pool instance
   - **Fix**: Pass `{ connectionString }` directly instead of creating `new Pool()`
4. **Ternary operator precedence**: `getDate() + rememberMe ? 30 : 7` evaluates incorrectly
   - **Fix**: Wrap ternary in parentheses: `getDate() + (rememberMe ? 30 : 7)`

### Security Implementation Details
- Login throttling: 5 failed attempts = 15 minute lockout
- Tracks both by email and IP address
- Passwords hashed with bcrypt (12 rounds)
- Session tokens: 32-byte random hex strings
- Session expires: 7 days (30 if "Remember Me" checked)
- httpOnly, secure, sameSite cookies

### Database Schema Changes (Phase 2)
```prisma
// Added LoginAttempt model for throttling
model LoginAttempt {
  id         String   @id @default(cuid())
  identifier String   // IP or email
  success    Boolean  @default(false)
  attemptedAt DateTime @default(now())
  ip         String?

  @@index([identifier, attemptedAt])
}
```

### New Files Created (Phase 2)
- `/lib/login-throttle.ts` - Login attempt throttling logic
- `/docs/ADMIN_SETUP.md` - Admin account creation guide
- `/app/admin/login/page.tsx` - Login page
- `/app/api/auth/login/route.ts` - Login API
- `/app/api/auth/logout/route.ts` - Logout API
- `/middleware.ts` - Protected routes middleware

### Action Items for Next Phases
1. Better Auth API may change - check for breaking updates
2. Always wrap ternary in complex expressions with parentheses
3. Prisma adapter constructors vary - check documentation
4. Document security features (throttling, session management)

---

## Session 3 Learnings (Phase 3 - Admin Dashboard Foundation)

### What Went Well
- Complete admin layout with RTL sidebar navigation implemented
- Navigation system with active route highlighting works correctly
- All required UI components created (Select, Alert, EmptyState, Loading, Modal, Textarea)
- Dashboard page with stats cards and empty states
- Responsive sidebar with mobile hamburger menu
- Build verification passed successfully

### Issues Encountered
1. **EmptyArticles component with onClick in server component**
   - **Problem**: Server components cannot pass event handlers to client components
   - **Fix**: Rendered empty state inline in the server component instead of using the pre-built component

2. **Using headers() to get current path in layout**
   - **Problem**: Next.js App Router doesn't provide a direct way to get current path in server components
   - **Fix**: Used `headers().get('x-pathname')` which Next.js provides for this purpose

### New Files Created (Phase 3)
- `/lib/admin-nav.ts` - Navigation configuration with helper functions
- `/components/admin/AdminSidebar.tsx` - Right-aligned RTL sidebar navigation
- `/components/admin/AdminTopBar.tsx` - Top bar with breadcrumbs and user menu
- `/app/admin/layout.tsx` - Admin layout wrapper
- `/components/ui/Select.tsx` - Select dropdown component
- `/components/ui/Alert.tsx` - Alert and Toast notification components
- `/components/ui/EmptyState.tsx` - Empty state components for common scenarios

### Action Items for Next Phases
1. Server components cannot pass event handlers to client components - render interactive elements inline
2. Use `headers().get('x-pathname')` to get current path in server components
3. Navigation system is extensible for new routes
4. Breadcrumbs work automatically based on path matching

---

## Session 4 Learnings (Phase 5 - Article Management CRUD)

### What Went Well
- Complete article CRUD system implemented with all required features
- TipTap rich text editor integrated with full RTL support
- Comprehensive validation schemas using Zod v4+
- Articles list page with filtering, sorting, and pagination
- Three-column layout for article editor (content, metadata, SEO)
- Auto-save functionality with visual indicators
- Soft delete implementation with confirmation dialog
- Arabic slug generation from text with collision detection

### Issues Encountered

1. **TipTap SSR hydration error**
   - **Problem**: "SSR has been detected, please set `immediatelyRender` explicitly to `false`"
   - **Fix**: Added `immediatelyRender: false` to useEditor configuration
   - **File**: [components/admin/RichTextEditor.tsx:27](components/admin/RichTextEditor.tsx#L27)

2. **Loading component export mismatch**
   - **Problem**: "Export Loading doesn't exist in target module"
   - **Fix**: Added `export { LoadingScreen as Loading };` to Loading.tsx
   - **File**: [components/ui/Loading.tsx:60](components/ui/Loading.tsx#L60)

3. **getServerSession not exported from auth module**
   - **Problem**: No session helper for server-side authentication checks
   - **Fix**: Created `getServerSession()` function using Better Auth API
   - **File**: [lib/auth.ts:63-79](lib/auth.ts#L63-L79)

4. **Button component doesn't accept href prop**
   - **Problem**: "Property 'href' does not exist on type 'ButtonProps'"
   - **Fix**: Replaced all Button components with href prop using Link components
   - **Pattern**: Use Link with className instead of Button with href

5. **Badge variant "outline" doesn't exist**
   - **Problem**: Type error when using `variant="outline"` on Badge
   - **Fix**: Changed to `variant="secondary"` and `size="sm"`
   - **Lesson**: Keep Badge variants in sync between type and implementation

6. **Zod v4 API changes for validation**
   - **Problem**: Old Zod API (`required_error`, `errorMap`) no longer works
   - **Fix**: Updated to new Zod v4 API using `{ message }` objects
   - **Example**:
     ```typescript
     // Old API (Zod v3)
     .min(1, { required_error: 'عنوان المقال مطلوب' })

     // New API (Zod v4)
     .min(1, { message: 'عنوان المقال مطلوب' })
     ```

7. **authorName field doesn't exist in Prisma schema**
   - **Problem**: API routes tried to save authorName but Article model only has authorId
   - **Fix**: Removed all authorName references from API routes
   - **File**: [app/api/admin/articles/route.ts](app/api/admin/articles/route.ts)

8. **headers() function call error in getServerSession**
   - **Problem**: "This expression is not callable" for `headers()`
   - **Fix**: Changed from `headers()` to `headers` (already a Promise)
   - **File**: [lib/auth.ts:65](lib/auth.ts#L65)

9. **Select component multiple prop with string value**
   - **Problem**: "The `value` prop supplied to <select> must be an array if `multiple` is true"
   - **Fix**: Removed `multiple` prop since the pattern used doesn't need native multi-select
   - **Reason**: The pattern uses single-select dropdown to add items to a separate array, not native multi-select behavior
   - **File**: [app/admin/articles/new/page.tsx:322, 357](app/admin/articles/new/page.tsx#L322)

### New Files Created (Phase 5)

#### Components
- `/components/admin/RichTextEditor.tsx` - TipTap-based rich text editor with RTL support
- `/components/admin/DeleteArticleButton.tsx` - Client component for delete confirmation

#### Pages
- `/app/admin/articles/page.tsx` - Articles list with filtering, pagination
- `/app/admin/articles/new/page.tsx` - New article creation page
- `/app/admin/articles/[id]/edit/page.tsx` - Edit existing article page

#### API Routes
- `/app/api/admin/articles/route.ts` - GET (list) and POST (create) endpoints
- `/app/api/admin/articles/[id]/route.ts` - GET, PUT, DELETE endpoints for single article

#### Utilities
- `/lib/validations/article.ts` - Zod validation schemas for article operations
- `/lib/utils/slug.ts` - Arabic to Latin slug generation with collision detection

### Technology Stack Used
- **TipTap** - Rich text editor with RTL support
- **Zod v4+** - Schema validation with updated API format
- **StarterKit, Placeholder, CharacterCount, Link** - TipTap extensions

### Action Items for Next Phases
1. TipTap requires `immediatelyRender: false` when using SSR
2. Zod v4 uses `{ message }` objects instead of `required_error`
3. Better Auth reads from cookies automatically - use `auth.api.getSession({ headers })`
4. When using "dropdown to add items" pattern, don't use native `multiple` on select
5. Always check Prisma schema before adding fields to API routes
6. For Arabic content, use RTL text direction in editor (`direction: rtl; text-align: right`)

---

## Session 5 Learnings (Phase 6 - Category & Tag Management)

### What Went Well
- Complete category CRUD with hierarchical parent-child relationships
- Tag management with merge functionality
- Tag auto-suggest search API ready for article editor integration
- Client components for interactive list management
- Bulk delete unused tags feature

### Issues Encountered

1. **Toast export doesn't exist in Alert component**
   - **Problem**: `Export Toast doesn't exist in target module`
   - **Fix**: Added a simple `Toast` component to Alert.tsx that wraps Alert with fixed positioning and auto-dismiss
   - **File**: [components/ui/Alert.tsx](components/ui/Alert.tsx)

2. **Alert component props mismatch**
   - **Problem**: Alert component uses `variant` and `children` but code used `type` and `message`
   - **Fix**: Extended AlertProps to accept both patterns: `type` as alias for `variant`, `message` as alternative to `children`
   - **Pattern**: Component now accepts `<Alert type="error" message="text">` or `<Alert variant="error">text</Alert>`

3. **Zod v4 error property changed**
   - **Problem**: `validation.error.errors[0].message` doesn't work - `errors` property doesn't exist
   - **Fix**: Changed to `validation.error.issues[0].message` (Zod v4 uses `issues` not `errors`)
   - **Pattern**: Always use `.issues` for Zod v4 error access

### New Files Created (Phase 6)

#### Validation Schemas
- `/lib/validations/category.ts` - Category validation schemas
- `/lib/validations/tag.ts` - Tag validation schemas (including merge schema)

#### API Routes
- `/app/api/admin/categories/route.ts` - GET (list with hierarchy), POST (create)
- `/app/api/admin/categories/[id]/route.ts` - GET, PUT, DELETE with reassignment option
- `/app/api/admin/tags/route.ts` - GET (with search), POST, DELETE (bulk unused)
- `/app/api/admin/tags/[id]/route.ts` - GET, PUT, DELETE
- `/app/api/admin/tags/merge/route.ts` - POST merge multiple tags into target
- `/app/api/admin/tags/search/route.ts` - GET tag auto-suggest search

#### Pages
- `/app/admin/categories/page.tsx` - Categories management page
- `/app/admin/tags/page.tsx` - Tags management page

#### Components
- `/components/admin/CategoriesListClient.tsx` - Interactive categories list with modals
- `/components/admin/TagsListClient.tsx` - Interactive tags list with merge functionality

### Action Items for Next Phases
1. Zod v4 uses `.issues` not `.errors` for validation errors
2. When creating component props, support multiple naming conventions for flexibility (type/variant, message/children)
3. Toast component can be simple - fixed position, auto-dismiss, wraps existing Alert
4. Category deletion should handle children (move to parent) and article reassignment
5. Tag merge is useful for consolidating duplicate/similar tags

---

## Session 6 Learnings (Phase 6 Completion - Tag Auto-Suggest)

### What Went Well
- Created reusable TagAutoSuggest component with debounced search
- Integrated with existing tag search API
- Added max tags validation (10 per article)
- Component handles creating new tags inline
- Build verification passed successfully

### Implementation Details

#### TagAutoSuggest Component Features
- Debounced search (300ms delay) to reduce API calls
- Shows popular tags when focused without query
- Displays article count for each tag suggestion
- Allows creating new tags inline when no exact match found
- Enforces maximum tags limit with visual feedback
- Accessible with keyboard navigation (Escape to close, Enter to create)

#### Validation Schema Update
```typescript
// Added to lib/validations/article.ts
export const MAX_TAGS_PER_ARTICLE = 10;

tagIds: z.array(z.string())
  .max(MAX_TAGS_PER_ARTICLE, { message: `الحد الأقصى للوسوم هو ${MAX_TAGS_PER_ARTICLE} وسوم` })
  .optional(),
```

### New Files Created (Session 6)
- `/components/admin/TagAutoSuggest.tsx` - Reusable tag auto-suggest component

### Component Usage Pattern
```tsx
<TagAutoSuggest
  selectedTags={selectedTags}
  onTagsChange={setSelectedTags}
  tagsData={tagsOptions}
  onTagsDataChange={setTagsOptions}
  maxTags={MAX_TAGS_PER_ARTICLE}
/>
```

### Action Items for Next Phases
1. Auto-suggest pattern can be reused for other fields (e.g., authors)
2. Consider adding keyboard navigation for dropdown items (arrow keys)
3. Phase 6 is now fully complete - all tag features implemented

---

## Session 7 Learnings (Phase 8 - YouTube Videos)

### What Went Well
- YouTube URL parsing utility handles multiple URL formats (watch, short, embed, mobile)
- TipTap extension for YouTube embeds renders correctly in the editor
- Video management page with filtering, pagination, and bulk delete
- VideoPickerModal allows easy video insertion with preview and options
- Privacy-enhanced mode (youtube-nocookie.com) implemented

### Issues Encountered

1. **LoadingSpinner export doesn't exist in Loading component**
   - **Problem**: `Export LoadingSpinner doesn't exist in target module`
   - **Fix**: Added `export { Spinner as LoadingSpinner };` to Loading.tsx
   - **File**: [components/ui/Loading.tsx:63](components/ui/Loading.tsx#L63)

2. **Select component expects options prop, not children**
   - **Problem**: Type error for missing `options` prop when using children pattern
   - **Fix**: Changed from `<Select><option>...</option></Select>` to `<Select options={[...]} />`
   - **Pattern**: Always use the `options` prop with Select component, not children

3. **TipTap NodeViewProps type mismatch**
   - **Problem**: Custom props type incompatible with ReactNodeViewRenderer
   - **Fix**: Used `NodeViewProps` from `@tiptap/react` and cast `node.attrs` to custom type
   - **Example**:
     ```typescript
     // ❌ Wrong
     function YouTubeNodeView({ node }: { node: { attrs: YouTubeAttributes } })

     // ✅ Correct
     function YouTubeNodeView({ node }: NodeViewProps) {
       const attrs = node.attrs as YouTubeAttributes;
     }
     ```

4. **TipTap addCommands type error**
   - **Problem**: Custom command `setYouTubeVideo` not assignable to `Partial<RawCommands>`
   - **Fix**: Removed custom command; using `insertContent` directly in the editor instead
   - **Lesson**: For simple node insertions, `insertContent` is sufficient - no need for custom commands

### New Files Created (Phase 8)

#### Utilities
- `/lib/youtube.ts` - YouTube URL parsing, ID extraction, thumbnail/embed utilities
- `/lib/validations/video.ts` - Video validation schemas with Zod

#### API Routes
- `/app/api/admin/videos/route.ts` - GET (list), POST (create), DELETE (bulk)
- `/app/api/admin/videos/[id]/route.ts` - GET, PUT, DELETE for single video

#### Pages
- `/app/admin/media/videos/page.tsx` - Videos management page with stats

#### Components
- `/components/admin/VideosListClient.tsx` - Interactive video list with CRUD operations
- `/components/admin/YouTubeEmbed.tsx` - TipTap extension + display components for YouTube
- `/components/admin/VideoPickerModal.tsx` - Modal for inserting videos into editor

### Updated Files
- `/components/admin/RichTextEditor.tsx` - Added video button and YouTube extension
- `/components/ui/Loading.tsx` - Added LoadingSpinner export alias

### YouTube Utility Features
```typescript
// URL parsing - supports multiple formats
extractYouTubeId(url)     // Returns video ID from any YouTube URL
isValidYouTubeUrl(url)    // Validates URL format

// Thumbnails - multiple qualities available
getYouTubeThumbnail(videoId, 'high')  // 480x360
getYouTubeThumbnails(videoId)         // All sizes

// Embed URL builder with options
buildYouTubeEmbedUrl(videoId, {
  privacyMode: true,   // youtube-nocookie.com
  autoplay: false,
  startTime: 120,      // seconds
  showRelated: false,
})

// Time parsing and formatting
parseYouTubeStartTime(url)  // Extract ?t=123 or ?start=123
formatDuration(seconds)     // "1:23:45"
```

### Action Items for Next Phases
1. TipTap custom commands require proper type declarations - use `insertContent` for simple cases
2. Select component uses `options` prop, not children - check component interface before using
3. For NodeView props, import `NodeViewProps` from `@tiptap/react` and cast attrs
4. YouTube privacy mode is important for GDPR compliance - always offer the option
5. Phase 8 is complete - all video features implemented

---

## Session 8 Learnings (Phase 9 - SEO Scoring System)

### What Went Well
- Comprehensive SEO scoring algorithm with 13+ criteria checks
- Real-time analysis with 500ms debounce for smooth UX
- Color-coded score display (red/yellow/green) for quick assessment
- Expandable category sections for detailed breakdown
- Focus keyword analysis including density, title, intro, and meta description
- Integrated meta fields directly into SEO panel for convenience
- API endpoint supports both real-time analysis and database persistence

### Implementation Details

#### SEO Criteria Categories
1. **Content**: Title length, meta description, word count, readability
2. **Structure**: H2 headings, H3 headings, URL slug
3. **Media**: Featured image, image alt text
4. **Links**: Internal links, external links
5. **Focus Keyword**: In title, in intro, in meta description, density

#### Scoring Weights (Total: 100+ points)
- Title length: 15 points
- Meta description: 15 points
- Word count: 20 points
- H2 headings: 8 points
- H3 headings: 5 points
- Featured image: 10 points
- Image alt text: 7 points
- Internal links: 5 points
- External links: 5 points
- Readability: 10 points
- Slug: 5 points
- Keyword in title: 8 points
- Keyword in intro: 5 points
- Keyword in meta: 5 points
- Keyword density: 7 points

### Issues Encountered

1. **Prisma Json type compatibility**
   - **Problem**: `Type 'SeoSuggestion[]' is not assignable to type 'JsonNull | InputJsonValue'`
   - **Fix**: Used `JSON.parse(JSON.stringify(...))` to convert arrays to proper JSON values
   - **Pattern**: Always serialize complex types before passing to Prisma Json fields

### New Files Created (Phase 9)

#### SEO Module
- `/lib/seo/types.ts` - SEO types, thresholds, and interfaces
- `/lib/seo/utils.ts` - Utility functions (word count, heading extraction, link counting, etc.)
- `/lib/seo/analyzer.ts` - Main SEO scoring algorithm with 13+ criteria
- `/lib/seo/index.ts` - Module exports

#### Components
- `/components/admin/SeoScorePanel.tsx` - SEO score panel with real-time analysis

#### API Routes
- `/app/api/admin/seo/analyze/route.ts` - SEO analysis API (GET saved, POST analyze)

### Updated Files
- `/app/admin/articles/new/page.tsx` - Integrated SEO score panel
- `/app/admin/articles/[id]/edit/page.tsx` - Integrated SEO score panel

### SEO Analysis Usage
```tsx
<SeoScorePanel
  title={title}
  content={content}
  excerpt={excerpt}
  metaTitle={metaTitle}
  metaDescription={metaDescription}
  focusKeyword={focusKeyword}
  slug={slug}
  hasFeaturedImage={false}
  imageCount={0}
  imagesWithAlt={0}
  onFocusKeywordChange={setFocusKeyword}
  onMetaTitleChange={setMetaTitle}
  onMetaDescriptionChange={setMetaDescription}
/>
```

### Action Items for Next Phases
1. Prisma Json fields require serialization - use `JSON.parse(JSON.stringify())` for complex objects
2. SEO analysis runs client-side for real-time feedback - API saves to DB optionally
3. Score thresholds: 70+ = good (green), 50-69 = needs improvement (yellow), <50 = poor (red)
4. Phase 9 is complete - all SEO features implemented

---

## Session 9 Learnings (Phase 10 - Google Gemini AI Integration)

### What Went Well
- Comprehensive AI integration with 10+ API endpoints
- Gemini 3 Flash model selected for best performance/cost balance
- Rate limiting and caching implemented for API efficiency
- Arabic-optimized prompts for all AI features
- AI panel integrated into article editor with tabbed interface
- Build verification passed successfully

### Model Selection Decision
After researching Gemini API pricing (January 2026):

| Model | Input (1M tokens) | Output (1M tokens) | Selected |
|-------|-------------------|--------------------|----|
| Gemini 2.0 Flash-Lite | $0.075 | $0.30 | No - basic tasks only |
| Gemini 2.5 Flash-Lite | $0.10 | $0.40 | No - budget option |
| Gemini 2.5 Flash | $0.30 | $2.50 | No - previous gen |
| **Gemini 3 Flash** | **$0.50** | **$3.00** | **Yes - best balance** |

**Why Gemini 3 Flash**:
- 15% more accurate than Gemini 2.5 Flash
- 3x faster than Pro models
- Now Google's default model
- Free tier available for development
- Best for Arabic content SEO and generation

### Architecture Implemented

```
lib/
├── gemini.ts          # Core client with rate limiting & caching
└── ai/
    ├── prompts.ts     # Arabic prompt templates
    ├── service.ts     # High-level AI functions
    └── index.ts       # Module exports

app/api/admin/ai/
├── seo-suggestions/   # SEO analysis
├── meta-title/        # Title generation
├── meta-description/  # Description generation
├── keywords/          # Keyword extraction
├── content/           # Content assistance
├── grammar/           # Arabic grammar check
├── alt-text/          # Image alt text
├── related-topics/    # Topic suggestions
└── status/            # API status/config
```

### Key Implementation Details

#### Rate Limiting
```typescript
const RATE_LIMIT = {
  maxRequestsPerMinute: 60,
  maxRequestsPerDay: 1000, // Free tier limit
};
```

#### Response Caching
```typescript
class ResponseCache {
  private readonly ttl: number = 24 * 60 * 60 * 1000; // 24 hours
  // Uses hash of prompt + model as cache key
}
```

#### Arabic System Instruction
```typescript
export const ARABIC_SYSTEM_INSTRUCTION = `أنت مساعد ذكاء اصطناعي متخصص في الكتابة الصحفية العربية وتحسين محركات البحث (SEO).
- اكتب دائماً بالعربية الفصحى الحديثة
- استخدم أسلوباً صحفياً احترافياً
- ركز على الوضوح والدقة
- راعِ قواعد SEO للمحتوى العربي`;
```

### Issues Encountered

1. **@google/genai SDK Import**
   - **Problem**: SDK exports differ from older @google/generative-ai
   - **Fix**: Use `import { GoogleGenAI } from "@google/genai"`
   - **Pattern**: New SDK uses `GoogleGenAI` class, not `GoogleGenerativeAI`

2. **Response Text Access**
   - **Problem**: Response structure differs from documentation examples
   - **Fix**: Use `response.text` directly (SDK handles extraction)
   - **Pattern**: `const text = response.text;` not `response.candidates[0].content.parts[0].text`

3. **JSON Parsing from AI Responses**
   - **Problem**: AI may wrap JSON in markdown code blocks
   - **Fix**: Extract JSON from code blocks before parsing
   ```typescript
   const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
   const jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim();
   ```

### New Files Created (Phase 10)

#### Core AI Module
- `/lib/gemini.ts` - Gemini client with rate limiting and caching
- `/lib/ai/prompts.ts` - Arabic AI prompt templates (12 prompts)
- `/lib/ai/service.ts` - High-level AI service functions
- `/lib/ai/index.ts` - Module exports

#### API Endpoints
- `/app/api/admin/ai/seo-suggestions/route.ts`
- `/app/api/admin/ai/meta-title/route.ts`
- `/app/api/admin/ai/meta-description/route.ts`
- `/app/api/admin/ai/keywords/route.ts`
- `/app/api/admin/ai/content/route.ts`
- `/app/api/admin/ai/grammar/route.ts`
- `/app/api/admin/ai/alt-text/route.ts`
- `/app/api/admin/ai/related-topics/route.ts`
- `/app/api/admin/ai/status/route.ts`

#### Components
- `/components/admin/AiPanel.tsx` - Tabbed AI panel for article editor

### Updated Files
- `/app/admin/articles/new/page.tsx` - Added AI panel
- `/app/admin/articles/[id]/edit/page.tsx` - Added AI panel

### AI Panel Usage
```tsx
<AiPanel
  title={title}
  content={content}
  excerpt={excerpt}
  metaTitle={metaTitle}
  metaDescription={metaDescription}
  focusKeyword={focusKeyword}
  onMetaTitleChange={setMetaTitle}
  onMetaDescriptionChange={setMetaDescription}
  onFocusKeywordChange={setFocusKeyword}
  onContentInsert={(text, position) => { ... }}
  onContentReplace={setContent}
/>
```

### Action Items for Next Phases
1. New @google/genai SDK (v1.37.0) uses different imports than legacy SDK
2. AI responses may include markdown - parse carefully
3. Rate limiting is crucial for free tier (1000 req/day)
4. Cache responses for 24 hours to reduce API calls
5. Phase 10 is complete - all core AI features implemented

---

## Session 10 Learnings (Phase 10.1 - AI Usage Tracking)

### What Went Well
- Complete usage tracking system for all AI API calls
- Token counts and costs tracked per user in database
- Cost calculation based on model pricing (Gemini 3 Flash: $0.50/$3.00 per 1M tokens)
- Cached responses tracked separately (no cost)
- API endpoint for viewing usage statistics with date filtering
- All existing AI routes updated with minimal code changes
- Build verification passed successfully

### Implementation Details

#### Database Model
```prisma
model AiUsage {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  feature      String   // e.g., "seo-suggestions", "meta-title"
  model        String   // e.g., "gemini-3-flash"
  inputTokens  Int      @default(0)
  outputTokens Int      @default(0)
  inputCost    Float    @default(0)  // Cost in USD
  outputCost   Float    @default(0)
  totalCost    Float    @default(0)
  cached       Boolean  @default(false)
  createdAt    DateTime @default(now())

  @@index([userId])
  @@index([feature])
  @@index([createdAt])
  @@index([userId, createdAt])
}
```

#### AI Feature Types
```typescript
type AiFeature =
  | "seo-suggestions"
  | "meta-title"
  | "meta-description"
  | "keywords"
  | "expand-content"
  | "summarize-content"
  | "rewrite-content"
  | "generate-intro"
  | "generate-conclusion"
  | "grammar-check"
  | "alt-text"
  | "related-topics";
```

#### Cost Calculation
```typescript
// Costs are per 1M tokens
const inputCost = (inputTokens / 1_000_000) * modelInfo.inputCost;
const outputCost = (outputTokens / 1_000_000) * modelInfo.outputCost;
// 6 decimal precision for micro-dollar accuracy
```

### Architecture Changes

#### Service Layer Updates
All AI service functions now return `AiResultWithUsage<T>`:
```typescript
interface AiResultWithUsage<T> {
  data: T;
  usage: TokenUsage;
}

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  model: GeminiModelId;
  cached: boolean;
}
```

#### API Route Pattern
```typescript
// Record AI usage after successful call
if (result.usage) {
  await recordAiUsage({
    userId: session.user.id,
    feature: "seo-suggestions",
    model: result.usage.model,
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
    cached: result.usage.cached,
  }).catch(console.error); // Don't fail request if tracking fails
}
```

### New Files Created (Phase 10.1)

#### Usage Tracking
- `/lib/ai/usage.ts` - Usage tracking service with cost calculation

#### API Endpoints
- `/app/api/admin/ai/usage/route.ts` - Usage statistics endpoint

### Updated Files
- `/prisma/schema.prisma` - Added AiUsage model and User relation
- `/lib/ai/service.ts` - All functions return usage info
- `/lib/ai/index.ts` - Export new types and functions
- All AI API routes - Added usage recording

### API Usage Examples

#### Get Current User's Usage
```
GET /api/admin/ai/usage
GET /api/admin/ai/usage?startDate=2026-01-01&endDate=2026-01-31
```

#### Get All Users' Usage (Admin)
```
GET /api/admin/ai/usage?all=true
```

#### Get Recent Usage Records
```
GET /api/admin/ai/usage?recent=true&limit=50
```

#### Response Format
```json
{
  "totalRequests": 150,
  "totalInputTokens": 45000,
  "totalOutputTokens": 12000,
  "totalCost": 0.058500,
  "cachedRequests": 25,
  "byFeature": [
    { "feature": "seo-suggestions", "requests": 50, "cost": 0.02 }
  ],
  "byDay": [
    { "date": "2026-01-30", "requests": 10, "cost": 0.005 }
  ]
}
```

### Key Design Decisions

1. **Non-blocking tracking**: Usage recording uses `.catch(console.error)` to avoid failing the main request if tracking fails
2. **Cached responses**: Tracked with `cached: true` and zero tokens/cost
3. **6 decimal precision**: For accurate micro-dollar calculations
4. **Indexed queries**: Multiple indexes for efficient filtering by user, feature, and date

### Action Items for Future
1. After schema changes, always run `npx prisma db push` or `npx prisma migrate dev`
2. Usage tracking is non-blocking - failures won't affect user experience
3. Consider adding monthly usage limits per user in future
4. Dashboard UI for viewing usage stats could be added to admin panel

---

## Update This File

After each phase:
1. Update "Current Phase" at the top
2. Move completed phase to "Completed Phases"
3. Add new learnings to "Session X Learnings"
4. Update any rules that need refinement
5. Keep "What Went Well" and "Issues Encountered" sections

---

**Last Updated**: Phase 10.1 (AI Usage Tracking) Completed
**Next Phase**: Phase 11 - Publishing & Scheduling System
