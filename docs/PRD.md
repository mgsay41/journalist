# Product Requirements Document (PRD)

## Arabic Journalist Content Management System

---

## 1. Executive Summary

### 1.1 Project Overview

A comprehensive Arabic-language Content Management System (CMS) designed specifically for journalists and content creators. The system enables article management, multimedia handling, SEO optimization, and scheduled publishing with AI-powered assistance using Google Gemini.

### 1.2 Target Users

- **Primary**: Individual journalist/content creator (Admin)
- **Secondary**: Website visitors (readers)

### 1.3 Core Objectives

- Provide a modern, RTL-optimized CMS for Arabic content
- Enable efficient article creation with AI assistance
- Offer comprehensive SEO analysis and optimization
- Manage multimedia content (images and YouTube videos)
- Support scheduled publishing and content organization

---

## 2. System Architecture

### 2.1 Technology Stack

- **Frontend**: Next.js 14+ (App Router)
- **Database**: Neon DB (PostgreSQL)
- **ORM**: Prisma
- **Authentication**: Better Auth
- **AI Integration**: Google Gemini API
- **Styling**: Tailwind CSS (RTL configured)
- **Language**: Arabic (100% - no English UI elements)

### 2.2 Key Technical Considerations

- Full RTL (Right-to-Left) layout support
- Arabic typography optimization
- SEO optimization for Arabic content
- Responsive design for all screen sizes
- Performance optimization for media-heavy content

---

## 3. Core Features & Functionality

### 3.1 Authentication System

#### 3.1.1 Admin Access

- **No Public Registration**: System has only one admin account
- **Hidden Login Page**: `/admin/login` (not linked from public pages)
- **Secure Authentication**: Better Auth implementation
- **Session Management**: Persistent login with secure token handling

#### 3.1.2 Login Page Requirements

- Simple, clean RTL interface
- Arabic labels and messaging
- Email and password fields
- "Remember me" option
- Error handling in Arabic
- No "Sign Up" or "Forgot Password" links (handled separately if needed)

---

### 3.2 Article Management System

#### 3.2.1 Article Creation & Editing

**Rich Text Editor**

- Arabic-optimized WYSIWYG editor (TipTap or similar)
- RTL text direction default
- Formatting options:
  - Headers (H1-H6)
  - Bold, italic, underline
  - Lists (ordered/unordered)
  - Quotes
  - Code blocks
  - Links
  - Image insertion
- Auto-save functionality (every 30 seconds)
- Version history (last 10 versions)

**Article Metadata**

- Title (required, 1-200 characters)
- Slug (auto-generated from title, editable)
- Excerpt/Summary (optional, 1-500 characters)
- Featured image (from album)
- Categories (multiple selection)
- Tags (custom tags, comma-separated)
- Author name (default: admin name, editable)
- Publication date (schedule or publish immediately)

**Article Status**

- Draft (مسودة)
- Scheduled (مجدولة)
- Published (منشورة)
- Archived (مؤرشفة)

#### 3.2.2 SEO Optimization Feature

**SEO Score Dashboard**
A dedicated panel showing:

- Overall SEO score (0-100)
- Color-coded status: Red (<50), Yellow (50-79), Green (80+)
- Real-time score updates as content changes

**SEO Criteria Checklist**

1. **Title Optimization**
   - Length: 40-60 characters ✓/✗
   - Contains focus keyword ✓/✗
   - Compelling and descriptive ✓/✗

2. **Meta Description**
   - Length: 120-160 characters ✓/✗
   - Contains focus keyword ✓/✗
   - Call-to-action present ✓/✗

3. **Content Analysis**
   - Word count: Minimum 300 words ✓/✗
   - Keyword density: 1-2% ✓/✗
   - Headers usage (H1, H2, H3) ✓/✗
   - Image alt text presence ✓/✗
   - Internal links: At least 2 ✓/✗
   - External links: At least 1 ✓/✗
   - Readability score (based on sentence length)

4. **Technical SEO**
   - Unique URL slug ✓/✗
   - Featured image set ✓/✗
   - Mobile-friendly content ✓/✗

**AI-Powered SEO Suggestions** (Google Gemini)

- Generate meta descriptions
- Suggest relevant keywords based on content
- Recommend title improvements
- Provide content structure suggestions
- Suggest internal linking opportunities
- Generate alt text for images
- Readability improvement recommendations

**SEO Suggestions Display**

- Sidebar panel with categorized suggestions
- One-click apply for AI-generated meta descriptions
- Copy-paste ready keyword suggestions
- Actionable improvement items with priority levels (High/Medium/Low)

---

### 3.3 Media Management

#### 3.3.1 Image Album System

**Album Structure**

- Single, centralized image library
- Grid view with thumbnails
- Search and filter capabilities
- Upload date sorting
- Category-based organization

**Image Upload**

- Drag-and-drop interface
- Multiple file upload support
- Accepted formats: JPG, PNG, WebP
- Maximum file size: 10MB per image
- Automatic image optimization:
  - Compression
  - Multiple size variants (thumbnail, medium, large, original)
  - WebP conversion for modern browsers

**Image Metadata**

- Automatic: Upload date, file size, dimensions
- Editable:
  - Alt text (for SEO and accessibility)
  - Caption
  - Categories/tags
- Auto-saved when image inserted into article

**Image Integration**

- When an image is inserted into an article, it's automatically added to the album (if not already there)
- Images can be reused across multiple articles
- Delete protection: Warning if image is used in published articles

**Image Management Interface**

- Grid/List view toggle
- Bulk actions: Delete, categorize, download
- Preview modal with metadata editing
- Copy direct URL for external use

#### 3.3.2 YouTube Video Integration

**Video Embedding**

- YouTube URL input field
- Automatic embed code generation
- Responsive video player
- Preview in article editor
- Video management list showing all embedded videos across articles

**Video Metadata**

- YouTube URL (required)
- Custom title (optional, defaults to YouTube title)
- Thumbnail (auto-fetched from YouTube)
- Display position in article

**Video Player Options**

- Responsive embedding
- Privacy-enhanced mode option
- Auto-play toggle
- Show/hide related videos
- Start time configuration

---

### 3.4 AI-Powered Features (Google Gemini)

#### 3.4.1 SEO Enhancement

- **Keyword Research**: Suggest relevant Arabic keywords
- **Meta Generation**: Auto-generate SEO-optimized titles and descriptions
- **Content Gap Analysis**: Identify missing elements for better SEO
- **Readability Analysis**: Simplify complex sentences

---

### 3.5 Content Organization

#### 3.5.1 Categories

- Hierarchical category structure (parent/child)
- Unlimited category depth
- Each article can have multiple categories
- Category management page:
  - Create, edit, delete
  - Reorder categories
  - Set featured categories
- Category archive pages on public site

#### 3.5.2 Tags

- Free-form tagging system
- Auto-suggest existing tags while typing
- Tag management page:
  - View all tags
  - Merge similar tags
  - Delete unused tags
- Tag cloud on public site

#### 3.5.3 Search & Filtering

**Admin Dashboard Search**

- Full-text search across articles (title, content, excerpt)
- Filter by:
  - Status (draft, published, scheduled, archived)
  - Category
  - Tags
  - Date range
  - Author
- Sort by: Date, title, views, alphabetical

**Public Site Search**

- Fast, relevant search results
- Search in: titles, content, tags
- Filter by category
- Sort by relevance or date

---

### 3.6 Publishing System

#### 3.6.1 Scheduling

- Date and time picker (RTL calendar)
- Timezone support (default: Arabic region timezones)
- Scheduled posts queue view
- Automatic publishing via cron job or background service

#### 3.6.2 Publication Workflow

1. Create/edit article
2. Check SEO score and apply suggestions
3. Preview article (desktop/mobile views)
4. Set publication date/time or publish immediately
5. Article becomes live at scheduled time
6. Confirmation notification

---

### 3.7 Analytics & Insights

#### 3.7.1 Article Analytics

- Page views per article
- Time on page (average)
- Bounce rate
- Traffic sources (if integrated with external analytics)
- Most viewed articles dashboard

#### 3.7.2 Content Insights

- Total articles by status
- Publishing frequency chart
- Category distribution
- SEO performance overview (average scores)
- Most used tags

---

## 4. User Interface Design

### 4.1 Design Philosophy

**Minimal Modern Light Mode**

The UI follows a clean, minimal aesthetic with the following core principles:

- **Monochromatic Base**: Primarily black (#18181b) and white with subtle grays
- **Single Primary Accent**: Black as the primary color for strong visual hierarchy
- **Generous Whitespace**: More spacing between elements for better readability
- **Subtle Borders**: Thin, minimal borders (1px) with light gray tones
- **Reduced Visual Weight**: Lighter shadows, thinner lines, minimal iconography
- **Focus on Typography**: Clean, readable Arabic typography (Cairo font)
- **Light Mode Only**: Consistent light theme throughout the application
- **RTL-First**: Every component designed for Arabic reading direction
- **Accessibility**: WCAG 2.1 AA compliance with high contrast ratios
- **Responsive**: Mobile, tablet, desktop optimization
- **Performance**: Fast load times, optimized assets

### 4.2 Color Palette

**Primary Colors**
- `--foreground`: #18181b (near-black) - Primary text and actions
- `--background`: #fafafa - Page background
- `--card`: #ffffff - Card backgrounds

**Neutral/Semantic Colors**
- `--muted`: #f4f4f5 - Subtle backgrounds
- `--muted-foreground`: #71717a - Secondary text
- `--border`: #e4e4e7 - Standard borders
- `--border-subtle`: #f4f4f5 - Very subtle borders
- `--hover-bg`: #f4f4f5 - Hover states

**Status Colors** (minimal usage)
- `--success`: #16a34a - Success states
- `--warning`: #ca8a04 - Warning states
- `--danger`: #dc2626 - Error states

### 4.3 Component Design Guidelines

**Buttons**
- Rounded corners: `rounded-md` (4px)
- Primary: Black background, white text
- Secondary: Light gray background, dark text
- No shadows or heavy gradients
- Subtle hover states (opacity changes)

**Cards**
- White background with minimal border
- `rounded-lg` (8px) corners
- No shadow by default
- Border color changes on hover

**Inputs**
- White background
- Subtle border (1px)
- Minimal focus ring (1px)
- Clean, readable labels

**Typography**
- Cairo font family
- Lighter font weights (500-600 instead of 700-800)
- Tighter letter-spacing for headings (-0.01em)
- Increased line-height for body text (1.75)

### 4.4 Spacing System

- Section padding: 20-24 (80-96px) vertical
- Card padding: 6 (24px)
- Gap between elements: 3-6 (12-24px)
- More whitespace than typical designs

### 4.2 Admin Dashboard Layout

#### 4.2.1 Navigation

**Sidebar (Right-side for RTL)**

- Dashboard (لوحة التحكم)
- Articles (المقالات)
  - All Articles (كل المقالات)
  - Add New (إضافة جديد)
  - Categories (التصنيفات)
  - Tags (الوسوم)
- Media (الوسائط)
  - Image Album (ألبوم الصور)
  - Videos (الفيديوهات)
- Analytics (الإحصائيات)
- Settings (الإعدادات)
- Logout (تسجيل الخروج)

**Top Bar**

- Site title/logo (left for RTL)
- Quick actions: + New Article, View Site
- Admin profile dropdown (right for RTL)

#### 4.2.2 Dashboard Home

- Welcome message with admin name
- Quick stats cards:
  - Total articles
  - Published articles
  - Draft articles
  - Scheduled articles
  - Total images
  - Average SEO score
- Recent articles list (last 10)
- SEO performance chart (last 30 days)
- Scheduled posts queue (next 5)

### 4.3 Article Editor Interface

#### 4.3.1 Layout

**Three-Column Layout (RTL)**

- **Right Panel**: Editor toolbar and metadata
- **Center Panel**: Rich text editor (main content)
- **Left Panel**:
  - SEO score dashboard
  - AI suggestions
  - Preview button

#### 4.3.2 Editor Components

- Floating toolbar for text formatting
- Inline image insertion
- YouTube embed button
- Distraction-free mode toggle
- Word count and reading time display
- Auto-save indicator

### 4.4 Public Website Design

#### 4.4.1 Homepage

- Hero section with latest featured article
- Grid of recent articles (6-9 per page)
- Category navigation
- Search bar
- Tag cloud (optional)
- Footer with: About, Contact, Privacy Policy

#### 4.4.2 Article Page

- Featured image
- Title, author, date, reading time
- Category and tag breadcrumbs
- Article content with formatted text and media
- Social sharing buttons (WhatsApp, Twitter, Facebook, Telegram)
- Related articles section (3-4 articles)
- Comments section (optional integration)

#### 4.4.3 Archive Pages

- Category archive: All articles in category
- Tag archive: All articles with specific tag
- Date archive: Articles by month/year
- Search results page

---

## 5. Database Schema

### 5.1 Core Tables

#### Users Table

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String   // Hashed
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  articles  Article[]
}
```

#### Articles Table

```prisma
model Article {
  id              String    @id @default(cuid())
  title           String
  slug            String    @unique
  content         String    @db.Text
  excerpt         String?
  featuredImageId String?
  featuredImage   Image?    @relation(fields: [featuredImageId], references: [id])
  status          String    @default("draft") // draft, published, scheduled, archived
  publishedAt     DateTime?
  scheduledAt     DateTime?
  authorId        String
  author          User      @relation(fields: [authorId], references: [id])
  views           Int       @default(0)
  seoScore        Int       @default(0)
  metaTitle       String?
  metaDescription String?
  focusKeyword    String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  categories      Category[]
  tags            Tag[]
  images          Image[]
  videos          Video[]
}
```

#### Categories Table

```prisma
model Category {
  id          String     @id @default(cuid())
  name        String     @unique
  slug        String     @unique
  description String?
  parentId    String?
  parent      Category?  @relation("CategoryToCategory", fields: [parentId], references: [id])
  children    Category[] @relation("CategoryToCategory")
  articles    Article[]
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
}
```

#### Tags Table

```prisma
model Tag {
  id        String    @id @default(cuid())
  name      String    @unique
  slug      String    @unique
  articles  Article[]
  createdAt DateTime  @default(now())
}
```

#### Images Table

```prisma
model Image {
  id              String    @id @default(cuid())
  url             String
  thumbnailUrl    String
  mediumUrl       String
  largeUrl        String
  altText         String?
  caption         String?
  filename        String
  fileSize        Int
  width           Int
  height          Int
  mimeType        String
  uploadedAt      DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  articles        Article[]
  featuredInArticles Article[] @relation("FeaturedImage")
}
```

#### Videos Table

```prisma
model Video {
  id          String   @id @default(cuid())
  youtubeUrl  String
  youtubeId   String
  title       String?
  thumbnail   String
  articleId   String
  article     Article  @relation(fields: [articleId], references: [id])
  position    Int      // Order in article
  createdAt   DateTime @default(now())
}
```

#### SEO Analyses Table

```prisma
model SeoAnalysis {
  id          String   @id @default(cuid())
  articleId   String   @unique
  score       Int
  suggestions Json     // Array of suggestion objects
  criteria    Json     // Checklist status
  analyzedAt  DateTime @default(now())
}
```

---

## 6. SEO Requirements

### 6.1 On-Page SEO

- Semantic HTML structure
- Proper heading hierarchy (H1 once, H2-H6 appropriately)
- Meta tags: title, description, keywords
- Open Graph tags for social sharing
- Structured data (JSON-LD):
  - Article schema
  - Breadcrumb schema
  - Organization schema
- Canonical URLs
- XML sitemap (auto-generated)
- Robots.txt

### 6.2 Technical SEO

- Mobile-responsive design
- Fast page load times (<3s)
- Image optimization and lazy loading
- Clean URL structure: `/blog/article-slug`
- 301 redirects for changed URLs
- HTTPS enabled
- Proper caching headers

### 6.3 Arabic SEO Considerations

- Arabic language meta tags: `<html lang="ar" dir="rtl">`
- Arabic character encoding: UTF-8
- Proper Arabic typography and font selection
- Region-specific search engine optimization (Google.ae, etc.)

---

## 7. AI Integration Details (Google Gemini)

### 7.1 API Configuration

- API key storage in environment variables
- Rate limiting management
- Error handling and fallbacks
- Response caching where appropriate

### 7.2 AI Features Implementation

#### 7.2.1 SEO Analysis

**Endpoint**: Article Editor - SEO Panel
**Trigger**: Manual button click or auto-analyze on save
**Process**:

1. Send article content, title, meta description to Gemini
2. Receive SEO score and detailed suggestions
3. Display results in real-time
4. Cache results until content changes significantly

**Gemini Prompt Template**:

```
Analyze this Arabic article for SEO:
Title: [title]
Meta Description: [description]
Content: [content]

Provide:
1. SEO score (0-100)
2. Specific improvement suggestions
3. Missing elements
4. Keyword optimization recommendations
5. Readability assessment

Return as JSON.
```

#### 7.2.2 Meta Generation

**Auto-Generate**:

- SEO title from article title
- Meta description from excerpt or first paragraph
- Alt text for images based on context
- Tags based on content analysis

**User Control**:

- Always editable by user
- Regenerate button for new suggestions
- Accept/reject individual suggestions

---

## 8. Performance Requirements

### 8.1 Speed Targets

- Admin dashboard load: <2s
- Article editor load: <1.5s
- Public article page: <1s
- Image upload processing: <5s per image

### 8.2 Optimization Strategies

- Code splitting and lazy loading
- Image CDN for media delivery
- Database query optimization
- Caching strategy:
  - Static pages: 24 hours
  - Article pages: 1 hour
  - API responses: 5 minutes (as appropriate)
- Minified CSS/JS bundles

---

## 9. Security Requirements

### 9.1 Authentication & Authorization

- Secure password hashing (bcrypt)
- CSRF protection
- XSS prevention
- SQL injection prevention (Prisma handles this)
- Secure session management
- HTTPS only

### 9.2 Data Protection

- Environment variables for sensitive data
- API key encryption
- Regular security audits
- Input validation and sanitization
- File upload restrictions and validation

### 9.3 Admin Protection

- Strong password enforcement (min 12 chars, mixed case, numbers, symbols)
- Failed login attempt throttling
- Optional 2FA for admin account
- Session timeout after inactivity

---

## 10. Deployment & Hosting

### 10.1 Recommended Infrastructure

- **Frontend/Backend**: Vercel or Netlify
- **Database**: Neon DB (PostgreSQL)
- **Media Storage**: Cloudinary or Vercel Blob
- **Domain**: Custom Arabic domain
- **SSL**: Automatic via hosting platform

### 10.2 Environment Configuration

```env
DATABASE_URL=
GEMINI_API_KEY=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
MEDIA_STORAGE_URL=
SITE_URL=
```

---

## 11. Future Enhancements (Phase 2+)

### 11.1 Potential Features

- Multi-author support (additional admin accounts)
- Content collaboration and editorial workflow
- Advanced analytics integration (Google Analytics 4)
- Newsletter system for subscribers
- RSS feed for articles
- Social media auto-posting
- Comment system with moderation
- Arabic voice-to-text for article dictation
- AI-powered article translation (Arabic to English vice versa)
- Content calendar visualization
- Advanced media management (folders, collections)

### 11.2 Integration Possibilities

- Third-party SEO tools (Yoast, SEMrush)
- Social media platforms APIs
- Email marketing services
- External analytics platforms

---

## 12. Success Metrics

### 12.1 Key Performance Indicators

- Article creation time reduction: 30% with AI assistance
- Average SEO score: 75+ across all published articles
- System uptime: 99.9%
- Page load time: <2s on average
- Mobile usability score: 95+ (Google PageSpeed)
- User satisfaction: Measured through feedback forms

### 12.2 Content Quality Metrics

- Articles meeting SEO criteria: 80%+
- Average article word count: 800+ words
- Media usage per article: 2+ images or 1 video
- Publishing consistency: Target frequency met

---

## 13. Development Phases

### Phase 1: Core Foundation (Weeks 1-3)

- Database setup with Prisma
- Authentication system
- Basic article CRUD operations
- RTL-optimized UI framework
- Admin dashboard skeleton

### Phase 2: Content Management (Weeks 4-6)

- Rich text editor integration
- Image album system
- YouTube video integration
- Category and tag management
- Article scheduling system

### Phase 3: SEO & AI Integration (Weeks 7-9)

- SEO scoring algorithm
- Google Gemini API integration
- SEO suggestions panel
- AI content assistance features
- Meta generation automation

### Phase 4: Public Website (Weeks 10-11)

- Public-facing templates
- Article display pages
- Archive and search functionality
- Responsive design refinement
- Social sharing implementation

### Phase 5: Polish & Launch (Week 12)

- Performance optimization
- Security hardening
- User acceptance testing
- Bug fixes and refinements
- Documentation
- Deployment to production

---

## 14. Maintenance & Support

### 14.1 Regular Maintenance

- Weekly database backups
- Monthly security updates
- Quarterly dependency updates
- Performance monitoring and optimization
- Error logging and tracking

### 14.2 Support Considerations

- Admin user documentation in Arabic
- Video tutorials for key features
- Troubleshooting guide
- Contact method for technical issues

---

## 15. Budget Considerations

### 15.1 Recurring Costs

- Hosting: ~$20-50/month (Vercel Pro)
- Database: ~$20/month (Neon DB)
- Media storage: ~$10-30/month (Cloudinary)
- Domain: ~$15/year
- Google Gemini API: Usage-based (~$20-100/month depending on volume)
- SSL Certificate: Free (Let's Encrypt via hosting)

### 15.2 Development Costs

- Design and development time estimate: 12 weeks
- Ongoing maintenance: 5-10 hours/month

---

## 16. Conclusion

This PRD outlines a comprehensive, modern, Arabic-first CMS tailored for journalists and content creators. The system prioritizes SEO optimization, AI-assisted content creation, and efficient media management while maintaining a clean, accessible interface fully in Arabic. The modular architecture allows for future enhancements while delivering a robust MVP in the initial 12-week development cycle.

**Next Steps**:

1. Review and approve PRD
2. Create detailed UI/UX mockups
3. Set up development environment
4. Begin Phase 1 development
5. Establish regular review checkpoints

---

**Document Version**: 1.0  
**Last Updated**: January 2026  
**Status**: Draft for Review
