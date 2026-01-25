# Claude Development Rules & Learnings

This document contains rules, patterns, and learnings for Claude during development of the Arabic Journalist CMS.

---

## Phase Tracking

**Current Phase**: Phase 4 - Database Models (Next)

**Completed Phases**:
- ✅ Phase 1: Project Setup & Foundation
- ✅ Phase 2: Authentication System
- ✅ Phase 3: Admin Dashboard Foundation

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

## Update This File

After each phase:
1. Update "Current Phase" at the top
2. Move completed phase to "Completed Phases"
3. Add new learnings to "Session X Learnings"
4. Update any rules that need refinement
5. Keep "What Went Well" and "Issues Encountered" sections

---

**Last Updated**: Phase 3 Completed
**Next Phase**: Phase 4 - Database Models
