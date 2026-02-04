# Claude Development Rules & Learnings

Essential rules, patterns, and learnings for developing the Arabic Journalist CMS.

---

## Phase Tracking

**Current Phase**: Complete - All Core Phases Finished (17/17)

**Completed**: Phases 1-17 (Setup, Auth, Dashboard, Database, Articles, Categories/Tags, Media Images, YouTube, SEO, AI Integration, AI Usage, Article UX, Publishing/Scheduling, Public Website, Analytics, Settings & Configuration, Performance Optimization, SEO Technical Implementation, Security Hardening)

---

## General Rules

1. **Always Read Before Writing** - Never write to a file without reading it first
2. **Test Builds Frequently** - Run `npm run build` after completing significant features
3. **Mark Tasks as Done** - Update [Tasks.md](Tasks.md) with `[x]` for completed tasks after each phase
4. **Document Errors & Solutions** - When you solve any error or edit code to fix issues, add the pattern to the "Common Mistakes to Avoid" section
5. **Use TodoWrite for Complex Tasks** - Create todo items for multi-step work
6. **Never Assume `asChild` Prop Exists** - Don't assume Radix UI patterns in custom components

---

## Workflow After Each Phase

1. Run `npm run build` and ensure no errors
2. Mark all completed tasks in [Tasks.md](Tasks.md) with `[x]`
3. Add any new errors encountered and their fixes to the "Common Mistakes to Avoid" section below
4. Update the "Current Phase" at the top of this file

---

## Technology-Specific Rules

### Next.js 16 (App Router)

- **Metadata**: `dir` is not valid in OpenGraph. Set `dir="rtl"` in `<html>` tag instead
- **Font**: Use Cairo for Arabic: `Cairo({ subsets: ["arabic", "latin"], variable: "--font-cairo", display: "swap", weight: ["300", "400", "600", "700", "800"] })`
- **Client Components**: Use `'use client'` for event handlers, hooks, and browser APIs

### Prisma 7.x Breaking Changes

- **Schema**: Remove `url = env("DATABASE_URL")` from schema.prisma
- **Config**: Add to `prisma.config.ts`: `datasource: { url: process.env["DATABASE_URL"] }`
- **After schema changes**: Always run `npx prisma generate`

### Tailwind CSS v4

- Use `@import "tailwindcss";` instead of `@tailwind` directives
- Custom properties in `@theme inline { }`

### TypeScript

- Keep type unions in sync with implementation objects
- Export props types from components

### Zod v4+

- Use `{ message: 'text' }` instead of `{ required_error: 'text' }`
- Access errors via `.issues` not `.errors`

---

## RTL (Right-to-Left) Best Practices

- **HTML**: `<html lang="ar" dir="rtl">`
- **CSS**: Use logical properties (`margin-inline-start`, `padding-inline-end`)
- **Inputs**: `direction: rtl; text-align: right;` for Arabic content
- **Code blocks**: Keep LTR with `direction: ltr; text-align: left;`

---

## Common Mistakes to Avoid

| Mistake | Fix |
|---------|-----|
| Forget `npx prisma generate` after schema changes | Run it immediately after schema changes |
| Type mismatch in Badge variants | Update both interface and variantStyles object |
| Button `asChild` pattern | Use `Link` with className instead |
| Missing `'use client'` directive | Add at top of interactive components |
| TipTap SSR hydration error | Add `immediatelyRender: false` to useEditor config |
| Prisma Json type incompatibility | Use `JSON.parse(JSON.stringify(obj))` |
| headers() call error | Use `headers` not `headers()` (already a Promise) |
| Select component expects options prop | Use `<Select options={[...]} />` not children |

---

## Component Patterns

### Button
```tsx
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}
```

### Input
```tsx
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}
// Generate unique IDs: const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
```

### Modal
- `'use client'` directive
- Escape key to close, focus trap, body scroll lock, backdrop click to close

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
  ai/          # AI service functions
  seo/         # SEO scoring and analysis
  analytics/   # Analytics service
  notifications/ # Notification service
  publishing/  # Publishing/scheduling service
  preview/     # Preview token utilities
```

---

## Git Workflow

**Commit format**: `feat:`, `fix:`, `docs:`, `style:`, `refactor:` descriptions

**Branches**: `master` for production, feature branches from master

---

## Environment Variables

- Create `.env.example` with all required variables
- Never commit `.env` files (already in .gitignore)

---

## Build Verification Checklist

- [ ] `npm run build` completes without errors
- [ ] No TypeScript errors
- [ ] `npx prisma generate` run (if schema changed)
- [ ] Components render correctly
- [ ] RTL layout works for Arabic text
- [ ] Tasks.md updated

---

## Key Technical Learnings by Phase

### Phase 2 - Authentication (Better Auth)
- Import: `prismaAdapter` not `PrismaAdapter`
- User type: `typeof auth.$Infer.Session.user`
- Adapter: Pass `{ connectionString }` directly
- Ternary precedence: Wrap in parentheses `getDate() + (rememberMe ? 30 : 7)`

### Phase 5 - Articles (TipTap + Zod v4)
- TipTap: `immediatelyRender: false` for SSR
- Zod v4: `{ message: 'text' }` format, `.issues` for errors
- Better Auth: `auth.api.getSession({ headers })`
- Select without `multiple` prop for "dropdown to add" pattern

### Phase 8 - YouTube (TipTap Extensions)
- NodeViewProps: Import from `@tiptap/react`, cast `node.attrs`
- Custom commands: Use `insertContent()` for simple cases instead
- Select: Always use `options` prop

### Phase 9 - SEO
- Prisma Json fields: `JSON.parse(JSON.stringify())` for arrays/objects

### Phase 10 - Gemini AI
- SDK: `import { GoogleGenAI } from "@google/genai"`
- Response: `response.text` (not `.candidates[0]...`)
- JSON parsing: Extract from markdown code blocks first
- Model: Gemini 3 Flash ($0.50/$3.00 per 1M tokens)
- Rate limit: 1000 req/day free tier, cache 24 hours

### Phase 11 - Publishing
- Prisma Json: `JSON.parse(JSON.stringify(metadata))`
- Cron: Configure in hosting platform (Vercel, etc.)

---

## Arabic/RTL Specifics

**Fonts**: Cairo (primary), Tajawal (alternative), Noto Sans Arabic (comprehensive)

**Text**: Always `text-align: right` for Arabic content

**Dates**:
```typescript
new Intl.DateTimeFormat('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
```

**SEO Features**: Arabic power words, sentiment analysis, stop words in `/lib/seo/arabic-words.ts`

---

## Session Learnings Summary

| Phase | Key Issues | Key Patterns |
|-------|-----------|--------------|
| 1-3 | Prisma v7 URL config, Next.js metadata `dir`, Badge variants | Project structure, RTL from start |
| 4-5 | TipTap SSR, Zod v4 API, headers(), Select multiple | Article CRUD, TipTap editor |
| 6 | Zod .issues not .errors, Alert props flexibility | Categories/tags, auto-suggest |
| 7 | LoadingSpinner export, Select options prop, NodeViewProps | YouTube integration |
| 8 | Prisma Json serialization | SEO scoring system |
| 9 | GoogleGenAI import, response.text, JSON parsing | Gemini AI integration |
| 10 | AiUsage tracking, cost calculation | AI usage tracking |
| 11 | Article completion workflow, simplified editor | AI-powered article UX |
| 12 | Prisma Json metadata, DateTimePicker imports | Publishing, scheduling, notifications |
| 13 | Prisma v7 content filter, session deduplication | Analytics, view tracking |

---

## Quick Reference

### Critical Commands
```bash
npx prisma generate    # After schema changes
npx prisma db push     # Apply schema to database
npm run build          # Verify build
```

### Critical Imports
```typescript
// Better Auth
import { prismaAdapter } from "better-auth/adapters/prisma"
import { auth } from "@/lib/auth"
const session = await auth.api.getSession({ headers })

// Prisma
import { prisma } from "@/lib/prisma"

// Gemini AI
import { GoogleGenAI } from "@google/genai"

// TipTap
import { NodeViewProps } from "@tiptap/react"

// Zod v4
.parseAsync({ message: 'error text' })
.error.issues[0].message
```

### Critical Patterns
```typescript
// Prisma Json fields
data: JSON.parse(JSON.stringify(complexObject))

// getServerSession
const session = await auth.api.getSession({ headers })

// headers in server components
const pathname = headers().get('x-pathname')

// TipTap SSR
useEditor({ immediatelyRender: false })

// RTL CSS
margin-inline-start: 1rem;
padding-inline-end: 0.5rem;
```

---

## Update This File After Each Phase

1. **Mark tasks done**: Update [Tasks.md](Tasks.md) with `[x]` for completed items
2. **Document new errors**: Add any new errors and fixes to "Common Mistakes to Avoid"
3. **Add new patterns**: If you discover new useful patterns, add to "Quick Reference"
4. **Update phase tracking**: Change "Current Phase" and move completed to "Completed" list

---

**Last Updated**: Phase 17 (Security Hardening) Completed
**Next Phase**: All Core Phases Complete (17/17)
