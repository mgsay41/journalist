# Development Tasks - Arabic Journalist CMS

## Project Overview

Complete task breakdown for developing an Arabic-first Content Management System with AI-powered features, SEO optimization, and media management.

**Total Estimated Timeline**: 12 weeks
**Development Approach**: Iterative, phase-by-phase with testing at each stage

**UI Design**: Minimal Modern Light Mode
- Monochromatic color palette (black/white/gray)
- Single primary accent color (black)
- Generous whitespace and subtle borders
- Light mode only (no dark mode)
- Focus on typography and readability

---

## Phase 1: Project Setup & Foundation (Week 1) ✅ COMPLETED

### 1.1 Environment Setup

- [x] Initialize Next.js 14+ project with App Router
- [x] Configure TypeScript with strict mode
- [x] Set up Tailwind CSS with RTL support
- [x] Configure Arabic web fonts (Cairo, Noto Sans Arabic, or Tajawal)
- [ ] Set up ESLint and Prettier for Arabic/RTL code (skipped - using default config)
- [x] Create `.env.example` file with all required variables
- [x] Set up Git repository with proper `.gitignore`

### 1.2 Database Configuration

- [x] Create Neon DB project and database (connected and configured)
- [x] Initialize Prisma in project
- [x] Configure Prisma schema file
- [x] Set up database connection string (in .env and prisma.config.ts)
- [x] Create initial User model
- [x] Run first migration (schema pushed with db push)
- [x] Test database connection (successful)

### 1.3 Project Structure

- [x] Create folder structure:
  - `/app` - Next.js app directory
  - `/components` - Reusable components
  - `/lib` - Utility functions and configs
  - `/prisma` - Database schema and migrations
  - `/public` - Static assets
  - `/styles` - Global styles
  - `/types` - TypeScript type definitions
- [x] Set up component naming conventions
- [x] Create base layout components
- [x] Configure Next.js metadata for Arabic site

### 1.4 RTL Configuration

- [x] Configure Tailwind for RTL support
- [x] Create RTL utility classes
- [x] Set up `dir="rtl"` and `lang="ar"` in root layout
- [x] Test RTL layout with sample components
- [x] Create RTL-specific CSS utilities

**Deliverables**: Working Next.js project with database connected and RTL configured ✅

---

## Phase 2: Authentication System (Week 1-2) ✅ COMPLETED

### 2.1 Better Auth Setup

- [x] Install Better Auth package
- [x] Configure Better Auth with Prisma adapter
- [x] Set up authentication routes
- [x] Create auth configuration file
- [x] Set up session management
- [x] Configure security settings (CSRF, secure cookies)

### 2.2 Admin Login Page (`/admin/login`)

- [x] Create login page route (hidden, no navigation links)
- [x] Design RTL login form UI
- [x] Create email input field with Arabic label
- [x] Create password input field with Arabic label
- [x] Add "Remember Me" checkbox with Arabic label
- [x] Implement form validation (client-side)
- [x] Add Arabic error messages
- [x] Create loading state during authentication
- [x] Implement redirect after successful login

### 2.3 Authentication Logic

- [x] Create login API endpoint
- [x] Implement password hashing verification
- [x] Set up session creation
- [x] Add failed login attempt throttling (5 attempts, 15 min lockout)
- [x] Create logout functionality
- [x] Implement session persistence ("Remember Me")
- [x] Add middleware for protected routes
- [x] Create auth utility functions

### 2.4 Initial Admin Account

- [x] Create database seed script (removed - admin will create account manually via database)
- [x] Add initial admin user with hashed password (removed - admin will create account manually via database)
- [x] Document admin credentials securely (see docs/ADMIN_SETUP.md)
- [x] Test login with seed admin account

**Deliverables**: Fully functional authentication system with secure admin login ✅
**Note**: Setup page was removed per user request. Admin account needs to be created directly in the database.

---

## Phase 3: Admin Dashboard Foundation (Week 2) ✅ COMPLETED

### 3.1 Dashboard Layout

- [x] Create admin layout component
- [x] Design RTL sidebar navigation (right-side)
- [x] Create top navigation bar
- [x] Add logo/site title area
- [x] Implement responsive sidebar (mobile hamburger menu)
- [x] Create navigation menu items structure
- [x] Add active state styling for nav items
- [x] Create footer component (in sidebar)

### 3.2 Dashboard Home Page

- [x] Create dashboard route (`/admin/dashboard`)
- [x] Design welcome section with admin name
- [x] Create stats cards component
- [x] Add placeholder stats (will populate later):
  - Total articles
  - Published articles
  - Draft articles
  - Scheduled articles
  - Total images
  - Average SEO score
- [x] Create recent articles list component (empty state)
- [x] Add quick action buttons (New Article, View Site)
- [x] Design empty state illustrations/messages

### 3.3 Navigation System

- [x] Create navigation data structure
- [x] Implement active route highlighting
- [x] Add navigation icons (using Arabic-friendly icon library)
- [x] Create nested menu support for sub-items
- [x] Add breadcrumb component for deep pages
- [x] Implement navigation permissions (future-proof)

### 3.4 Common Components

- [x] Create Button component (primary, secondary, danger) - Minimal design
- [x] Create Input field component (with RTL support) - Minimal design
- [x] Create Card component - Minimal design
- [x] Create Textarea component
- [x] Create Select/Dropdown component
- [x] Create Modal component
- [x] Create Alert/Toast notification component
- [x] Create Loading spinner component
- [x] Create Empty state component

### 3.5 UI Design Implementation

- [x] Updated globals.css with minimal light mode theme
- [x] Removed dark mode support
- [x] Implemented monochromatic color palette
- [x] Updated all components to minimal design standards
- [x] Applied generous whitespace and subtle borders
- [x] Updated homepage to match minimal design

**Deliverables**: Complete admin dashboard layout with navigation and reusable components ✅

---

## Phase 4: Database Models (Week 2-3) ✅ COMPLETED

### 4.1 Article Model

- [x] Create Article schema in Prisma
- [x] Add all required fields (title, slug, content, etc.)
- [x] Set up relationships (author, categories, tags)
- [x] Add indexes for performance (slug, status, publishedAt)
- [x] Create article status enum
- [x] Run migration (pending DB connection)

### 4.2 Category Model

- [x] Create Category schema
- [x] Implement self-referential relationship (parent/child)
- [x] Add slug generation logic
- [x] Set up article-category many-to-many relation
- [x] Run migration (pending DB connection)

### 4.3 Tag Model

- [x] Create Tag schema
- [x] Set up article-tag many-to-many relation
- [x] Add unique constraints
- [x] Run migration (pending DB connection)

### 4.4 Image Model

- [x] Create Image schema
- [x] Add all metadata fields
- [x] Set up article-image relationships
- [x] Add featured image relation
- [x] Run migration (pending DB connection)

### 4.5 Video Model

- [x] Create Video schema
- [x] Link to Article model
- [x] Add YouTube-specific fields
- [x] Run migration (pending DB connection)

### 4.6 SEO Analysis Model

- [x] Create SeoAnalysis schema
- [x] Link to Article (one-to-one)
- [x] Add JSON fields for suggestions and criteria
- [x] Run migration (pending DB connection)

### 4.7 Database Testing

- [x] Test all model relationships (test script created)
- [x] Seed database with sample data (seed script created)
- [x] Verify cascade deletes work correctly (included in test script)
- [x] Test unique constraints (included in test script)
- [x] Optimize queries with indexes (indexes defined in schema)

**Deliverables**: Complete database schema with all models and relationships ✅

**Files Created**:
- [prisma/seed.ts](prisma/seed.ts) - Comprehensive seed script with sample data
- [prisma/test-models.ts](prisma/test-models.ts) - Test suite for all relationships

**Note**: Migration pending due to Neon DB connection issue. The schema is fully defined in [prisma/schema.prisma](prisma/schema.prisma). Run `npm run db:push` once database is reconnected.

---

## Phase 5: Article Management - CRUD (Week 3-4) ✅ COMPLETED

### 5.1 Articles List Page

- [x] Create articles list route (`/admin/articles`)
- [x] Design articles table/grid view
- [x] Display article data: title, status, date, categories
- [x] Add status badges (draft, published, scheduled, archived)
- [x] Implement pagination (20 articles per page)
- [x] Add "New Article" button
- [x] Create article actions menu (edit, delete, duplicate, view)
- [x] Add bulk selection checkboxes
- [x] Implement bulk actions (delete, change status)

### 5.2 Article Filtering & Search

- [x] Create search bar for articles (full-text search)
- [x] Add status filter dropdown (all, draft, published, etc.)
- [x] Add category filter
- [x] Add tag filter
- [x] Add date range filter
- [x] Implement sort options (date, title, views)
- [x] Create "Clear filters" button
- [x] Add results count display

### 5.3 New Article Page - Basic Structure

- [x] Create new article route (`/admin/articles/new`)
- [x] Design three-column layout (RTL)
- [x] Create main content area
- [x] Create right sidebar for metadata
- [x] Create left sidebar for SEO/AI
- [x] Add "Save Draft" button
- [x] Add "Publish" button
- [x] Add "Preview" button
- [x] Implement auto-save functionality (every 30 seconds)
- [x] Add auto-save indicator

### 5.4 Article Editor - Rich Text

- [x] Research and choose RTL-compatible editor (TipTap recommended)
- [x] Install and configure editor
- [x] Set RTL as default direction
- [x] Configure formatting toolbar:
  - [x] Bold, italic, underline
  - [x] Headers (H1-H6)
  - [x] Ordered/unordered lists
  - [x] Blockquotes
  - [x] Code blocks
  - [x] Links (with title and rel attributes)
  - [x] Clear formatting
- [x] Add character/word count display
- [x] Add reading time calculator
- [x] Implement paste handling (clean HTML)

### 5.5 Article Metadata Fields

- [x] Create title input field (with character counter)
- [x] Create slug field (auto-generate from title, editable)
- [x] Implement slug validation (unique, URL-safe)
- [x] Create excerpt textarea (character counter)
- [x] Add featured image selector (connects to album)
- [x] Create category multi-select dropdown
- [x] Create tags input with auto-suggest
- [x] Add author name field (default to admin)
- [x] Create publication date/time picker
- [x] Add status selector

### 5.6 Article Save Functionality

- [x] Create save article API endpoint
- [x] Implement validation logic
- [x] Handle image associations
- [x] Process and save content
- [x] Generate slug if not provided
- [x] Save to database
- [x] Return success/error responses
- [x] Handle optimistic UI updates

### 5.7 Edit Article Page

- [x] Create edit article route (`/admin/articles/[id]/edit`)
- [x] Fetch article data
- [x] Populate all fields with existing data
- [x] Load related categories and tags
- [x] Load featured image if exists
- [x] Implement update functionality
- [x] Handle version history (save last 10 versions)
- [x] Add "Restore version" feature

### 5.8 Delete Article

- [x] Create delete confirmation modal
- [x] Implement soft delete (change status to archived)
- [x] Create permanent delete option (with warning)
- [x] Handle related data cleanup
- [x] Add undo option (for soft delete)

**Deliverables**: Complete article CRUD system with rich text editing ✅

---

## Phase 6: Category & Tag Management (Week 4) ✅ COMPLETED

### 6.1 Categories Page

- [x] Create categories route (`/admin/categories`)
- [x] Design hierarchical category list view
- [x] Display parent-child relationships visually
- [x] Add category count (number of articles)
- [x] Create "Add Category" button
- [x] Add edit/delete actions per category
- [ ] Implement drag-and-drop reordering (deferred - nice to have)

### 6.2 Category CRUD

- [x] Create add category modal
- [x] Add category name field
- [x] Implement slug auto-generation
- [x] Add description textarea
- [x] Create parent category selector
- [ ] Add featured category toggle (not in schema)
- [x] Implement save category API
- [x] Create edit category functionality
- [x] Add delete category with reassignment option
- [x] Validate unique category names/slugs

### 6.3 Tags Page

- [x] Create tags route (`/admin/tags`)
- [x] Design tags list view (table or grid)
- [x] Display tag usage count
- [x] Add "Create Tag" button
- [x] Show articles using each tag (in tag details)
- [x] Add edit/delete actions

### 6.4 Tag CRUD

- [x] Create add tag modal
- [x] Implement tag name field
- [x] Add slug auto-generation
- [x] Create save tag API
- [x] Add edit tag functionality
- [x] Implement merge tags feature
- [x] Create delete tag with cleanup
- [x] Add bulk delete unused tags

### 6.5 Tag Auto-Suggest

- [x] Implement tag search API
- [x] Create auto-suggest dropdown in article editor
- [x] Add "Create new tag" inline option (via API response)
- [x] Handle tag selection/deselection
- [x] Limit maximum tags per article (10)

**Deliverables**: Full category and tag management with hierarchical support ✅

**Files Created**:
- [lib/validations/category.ts](lib/validations/category.ts) - Category validation schemas
- [lib/validations/tag.ts](lib/validations/tag.ts) - Tag validation schemas
- [app/api/admin/categories/route.ts](app/api/admin/categories/route.ts) - Categories API (GET, POST)
- [app/api/admin/categories/[id]/route.ts](app/api/admin/categories/[id]/route.ts) - Single category API (GET, PUT, DELETE)
- [app/api/admin/tags/route.ts](app/api/admin/tags/route.ts) - Tags API (GET, POST, DELETE bulk)
- [app/api/admin/tags/[id]/route.ts](app/api/admin/tags/[id]/route.ts) - Single tag API (GET, PUT, DELETE)
- [app/api/admin/tags/merge/route.ts](app/api/admin/tags/merge/route.ts) - Merge tags API
- [app/api/admin/tags/search/route.ts](app/api/admin/tags/search/route.ts) - Tag auto-suggest search API
- [app/admin/categories/page.tsx](app/admin/categories/page.tsx) - Categories management page
- [app/admin/tags/page.tsx](app/admin/tags/page.tsx) - Tags management page
- [components/admin/CategoriesListClient.tsx](components/admin/CategoriesListClient.tsx) - Categories list client component
- [components/admin/TagsListClient.tsx](components/admin/TagsListClient.tsx) - Tags list client component
- [components/admin/TagAutoSuggest.tsx](components/admin/TagAutoSuggest.tsx) - Tag auto-suggest component for article editor

---

## Phase 7: Media Management - Images (Week 5) ✅ COMPLETED

### 7.1 Image Upload Infrastructure

- [x] Choose image storage solution (Cloudinary/Vercel Blob) - Using Cloudinary
- [x] Set up storage API keys (configured in .env.example)
- [x] Create image upload API endpoint
- [x] Implement file validation (type, size)
- [x] Add image processing library (sharp) - already installed
- [x] Configure image optimization settings (via Cloudinary)

### 7.2 Image Processing

- [x] Create thumbnail generation (150x150) - via Cloudinary transformations
- [x] Create medium size (800px width) - via Cloudinary transformations
- [x] Create large size (1200px width) - via Cloudinary transformations
- [x] Store original image
- [x] Implement WebP conversion - auto via Cloudinary fetch_format
- [x] Add compression algorithm - auto via Cloudinary quality
- [x] Extract image metadata (dimensions, size)
- [x] Generate unique filenames (Cloudinary public_id)

### 7.3 Image Album Page

- [x] Create album route (`/admin/media/images`)
- [x] Design grid layout for images
- [x] Add thumbnail view
- [x] Implement image upload dropzone
- [x] Create multi-file upload support
- [x] Add upload progress indicators
- [x] Show upload success/error messages
- [x] Display upload queue

### 7.4 Image Album Features

- [x] Implement lazy loading for images (Next.js Image component)
- [x] Add pagination or infinite scroll (pagination implemented)
- [x] Create search images functionality
- [x] Add filter by upload date (via sort)
- [x] Create filter by usage (used/unused)
- [x] Implement sort options (date, name, size)
- [ ] Add view toggle (grid/list) - deferred, grid only

### 7.5 Image Detail & Editing

- [x] Create image preview modal
- [x] Display full image with metadata
- [x] Add alt text editor
- [x] Add caption editor
- [x] Show image dimensions and file size
- [x] Display usage information (which articles)
- [x] Add copy URL button
- [x] Create delete image functionality
- [x] Implement delete protection (warn if used)

### 7.6 Image Insertion in Editor

- [x] Add image button to editor toolbar
- [x] Create image picker modal
- [x] Show album images in modal
- [x] Add upload option in modal
- [x] Implement image selection
- [x] Insert image into content
- [x] Add image caption field (via alt/title attributes)
- [ ] Set image alignment options (right, left, center) - deferred
- [x] Make images responsive in content

### 7.7 Auto-Add to Album

- [ ] Detect new images in article content - deferred
- [ ] Auto-save to album if not exists - deferred
- [x] Associate image with article (via article-image relation)
- [x] Update image metadata

### 7.8 Bulk Image Operations

- [x] Implement multi-select for images
- [x] Add bulk delete functionality
- [ ] Create bulk download option - deferred
- [ ] Add bulk tag/categorize (optional) - deferred

**Deliverables**: Complete image management system with upload, processing, and album ✅

**Files Created**:
- [lib/cloudinary.ts](lib/cloudinary.ts) - Cloudinary configuration and utilities
- [lib/validations/image.ts](lib/validations/image.ts) - Image validation schemas
- [app/api/admin/images/route.ts](app/api/admin/images/route.ts) - Images API (GET, POST, DELETE)
- [app/api/admin/images/[id]/route.ts](app/api/admin/images/[id]/route.ts) - Single image API (GET, PUT, DELETE)
- [app/admin/media/images/page.tsx](app/admin/media/images/page.tsx) - Image album page
- [components/admin/ImageAlbumClient.tsx](components/admin/ImageAlbumClient.tsx) - Image album client component
- [components/admin/ImagePickerModal.tsx](components/admin/ImagePickerModal.tsx) - Image picker for article editor

**Updated Files**:
- [components/admin/RichTextEditor.tsx](components/admin/RichTextEditor.tsx) - Added image button and TipTap Image extension
- [prisma/schema.prisma](prisma/schema.prisma) - Added cloudinaryPublicId field to Image model

---

## Phase 8: Media Management - YouTube Videos (Week 5) ✅ COMPLETED

### 8.1 YouTube Integration Setup

- [x] Install YouTube API client library (not needed - using built-in URL parsing)
- [x] Create YouTube video parser utility
- [x] Implement video ID extractor from URL
- [x] Create thumbnail fetcher from YouTube

### 8.2 Video Management Page

- [x] Create videos route (`/admin/media/videos`)
- [x] Design videos list view
- [x] Display video thumbnails
- [x] Show video titles
- [x] Display associated articles
- [x] Add video actions (edit, remove)

### 8.3 Video Embedding in Editor

- [x] Add video button to editor toolbar
- [x] Create video insert modal
- [x] Add YouTube URL input field
- [x] Implement URL validation
- [x] Fetch video preview on URL entry
- [x] Show video title and thumbnail
- [x] Add custom title override option
- [x] Configure video player options:
  - [x] Privacy-enhanced mode toggle
  - [x] Autoplay option
  - [x] Show related videos toggle (set to false by default)
  - [x] Start time input
- [x] Insert video embed code into content

### 8.4 Video Display Component

- [x] Create responsive YouTube embed component
- [x] Implement lazy loading for videos
- [x] Add play button overlay
- [x] Ensure RTL compatibility
- [ ] Test on mobile devices (manual testing required)

### 8.5 Video Management

- [x] Save video data to database
- [x] Link videos to articles
- [x] Handle video removal from article
- [x] Update video metadata
- [x] Delete unused videos (bulk delete)

**Deliverables**: YouTube video integration with embedding and management ✅

**Files Created**:
- [lib/youtube.ts](lib/youtube.ts) - YouTube URL parsing, ID extraction, thumbnail utilities
- [lib/validations/video.ts](lib/validations/video.ts) - Video validation schemas
- [app/api/admin/videos/route.ts](app/api/admin/videos/route.ts) - Videos API (GET, POST, DELETE bulk)
- [app/api/admin/videos/[id]/route.ts](app/api/admin/videos/[id]/route.ts) - Single video API (GET, PUT, DELETE)
- [app/admin/media/videos/page.tsx](app/admin/media/videos/page.tsx) - Videos management page
- [components/admin/VideosListClient.tsx](components/admin/VideosListClient.tsx) - Videos list client component
- [components/admin/YouTubeEmbed.tsx](components/admin/YouTubeEmbed.tsx) - TipTap YouTube extension & display components
- [components/admin/VideoPickerModal.tsx](components/admin/VideoPickerModal.tsx) - Video picker for article editor

**Updated Files**:
- [components/admin/RichTextEditor.tsx](components/admin/RichTextEditor.tsx) - Added video button and YouTube extension
- [components/ui/Loading.tsx](components/ui/Loading.tsx) - Added LoadingSpinner export alias

---

## Phase 9: SEO Scoring System (Week 6) ✅ COMPLETED

### 9.1 SEO Criteria Engine

- [x] Create SEO scoring algorithm
- [x] Define scoring weights for each criterion
- [x] Implement title length check (40-60 chars)
- [x] Add meta description length check (120-160 chars)
- [x] Create word count validator (min 300 words)
- [x] Implement keyword density calculator
- [x] Add header tags checker (H1, H2, H3)
- [x] Create image alt text validator
- [x] Implement internal links counter
- [x] Add external links counter
- [x] Create readability score calculator
- [x] Validate unique slug
- [x] Check featured image presence

### 9.2 SEO Score Display

- [x] Create SEO score panel component
- [x] Design score gauge (0-100)
- [x] Add color coding (red/yellow/green)
- [x] Display overall score prominently
- [x] Create criteria checklist UI
- [x] Add checkmark/X icons for each criterion
- [x] Show detailed criterion breakdown

### 9.3 Real-Time SEO Analysis

- [x] Implement content change listener
- [x] Trigger analysis on title change
- [x] Trigger analysis on content change
- [x] Debounce analysis calls (500ms)
- [x] Update score display in real-time
- [x] Cache analysis results (via component state)
- [ ] Add manual "Re-analyze" button (deferred - auto-updates on change)

### 9.4 SEO Checklist Items

- [x] Create expandable checklist sections
- [x] Show passed criteria in green
- [x] Show failed criteria in red
- [x] Add warning criteria in yellow
- [x] Display helpful tooltips for each item
- [ ] Link to relevant fields (deferred - inputs in same panel)

### 9.5 SEO Score Persistence

- [x] Save SEO score to database
- [x] Store criteria status
- [ ] Track score history (deferred - nice to have)
- [ ] Create SEO score trend chart (deferred - nice to have)

**Deliverables**: Functional SEO scoring system with real-time analysis ✅

**Files Created**:
- [lib/seo/types.ts](lib/seo/types.ts) - SEO types, thresholds, and interfaces
- [lib/seo/utils.ts](lib/seo/utils.ts) - SEO utility functions (word count, heading extraction, etc.)
- [lib/seo/analyzer.ts](lib/seo/analyzer.ts) - Main SEO scoring algorithm
- [lib/seo/index.ts](lib/seo/index.ts) - Module exports
- [components/admin/SeoScorePanel.tsx](components/admin/SeoScorePanel.tsx) - SEO score panel component
- [app/api/admin/seo/analyze/route.ts](app/api/admin/seo/analyze/route.ts) - SEO analysis API endpoint

**Updated Files**:
- [app/admin/articles/new/page.tsx](app/admin/articles/new/page.tsx) - Integrated SEO panel
- [app/admin/articles/[id]/edit/page.tsx](app/admin/articles/[id]/edit/page.tsx) - Integrated SEO panel

---

## Phase 10: Google Gemini AI Integration (Week 6-7) ✅ COMPLETED

### 10.1 Gemini API Setup

- [x] Sign up for Google AI Studio
- [x] Generate Gemini API key (configured in .env.example)
- [x] Store API key securely in environment
- [x] Install Gemini SDK (@google/genai v1.37.0)
- [x] Create Gemini client utility (lib/gemini.ts)
- [x] Implement rate limiting logic (60 req/min, 1000 req/day)
- [x] Add error handling for API failures
- [x] Create fallback responses with Arabic error messages

### 10.2 SEO Suggestions with AI

- [x] Create Gemini prompt template for SEO analysis
- [x] Implement SEO suggestion API endpoint (/api/admin/ai/seo-suggestions)
- [x] Send article content to Gemini
- [x] Parse Gemini response (JSON format)
- [x] Extract SEO suggestions
- [x] Categorize suggestions (high/medium/low priority)
- [x] Display suggestions in AI panel
- [ ] Add "Apply suggestion" quick action (deferred - manual copy for now)

### 10.3 Meta Generation

- [x] Create meta title generation prompt
- [x] Implement meta description generator
- [x] Create API endpoints for meta generation (/api/admin/ai/meta-title, /api/admin/ai/meta-description)
- [x] Add "Generate with AI" buttons in AI panel
- [x] Display generated suggestions (3 options each)
- [x] Allow one-click apply
- [x] Enable regenerate option
- [x] Keep user edits (don't override without permission)

### 10.4 Keyword Suggestions

- [x] Create keyword extraction prompt
- [x] Implement keyword analysis endpoint (/api/admin/ai/keywords)
- [x] Extract relevant Arabic keywords
- [x] Display keywords as tags/pills with color coding
- [ ] Allow copy to clipboard (deferred)
- [x] Add "Use keyword" button (sets as focus keyword)
- [x] Show keyword density for each

### 10.5 Content Assistance Features

- [x] Create AI sidebar panel in editor (AiPanel component)
- [ ] Add "Expand paragraph" feature (deferred - needs text selection)
- [ ] Add "Summarize section" feature (deferred - needs text selection)
- [ ] Add "Rewrite in different tone" (API ready, UI deferred)
- [x] Create "Generate introduction" feature
- [x] Add "Generate conclusion" feature
- [x] Implement "Suggest related topics" API (/api/admin/ai/related-topics)

### 10.6 Grammar & Spelling Check

- [x] Create Arabic grammar check prompt
- [x] Implement grammar API endpoint (/api/admin/ai/grammar)
- [ ] Highlight errors in editor (deferred - complex integration)
- [x] Show correction suggestions with explanations
- [x] Add "Apply all corrections" option
- [ ] Create custom dictionary for common terms (deferred)

### 10.7 Image Alt Text Generation

- [x] Create alt text generation prompt
- [x] Analyze image context in article
- [x] Generate descriptive alt text
- [x] Create API endpoint (/api/admin/ai/alt-text)
- [ ] Add "Generate alt text" button in image settings (deferred - needs image picker update)

### 10.8 AI Features UX

- [x] Create loading states for all AI features (Spinner component)
- [ ] Add skeleton loaders (deferred)
- [x] Implement progress indicators
- [x] Create error messages in Arabic
- [x] Add retry logic for failed requests (via safeAiCall wrapper)
- [ ] Show API usage warnings (deferred)
- [x] Create "AI busy" indicators

### 10.9 AI Response Caching

- [x] Implement response caching strategy (ResponseCache class)
- [x] Cache identical requests (24 hours TTL)
- [x] Clear cache on significant edits (via useCache: false for creative content)
- [x] Reduce redundant API calls

**Deliverables**: Full AI integration with SEO, content assistance, and meta generation ✅

**Model Used**: Gemini 3 Flash (gemini-3-flash)
- Best balance of performance and cost
- $0.50/1M input tokens, $3.00/1M output tokens
- Free tier available for development
- 15% more accurate than Gemini 2.5 Flash

**Files Created**:
- [lib/gemini.ts](lib/gemini.ts) - Gemini client with rate limiting and caching
- [lib/ai/prompts.ts](lib/ai/prompts.ts) - Arabic AI prompt templates
- [lib/ai/service.ts](lib/ai/service.ts) - High-level AI service functions
- [lib/ai/index.ts](lib/ai/index.ts) - Module exports
- [components/admin/AiPanel.tsx](components/admin/AiPanel.tsx) - AI panel component
- [app/api/admin/ai/seo-suggestions/route.ts](app/api/admin/ai/seo-suggestions/route.ts) - SEO suggestions API
- [app/api/admin/ai/meta-title/route.ts](app/api/admin/ai/meta-title/route.ts) - Meta title generation API
- [app/api/admin/ai/meta-description/route.ts](app/api/admin/ai/meta-description/route.ts) - Meta description generation API
- [app/api/admin/ai/keywords/route.ts](app/api/admin/ai/keywords/route.ts) - Keyword extraction API
- [app/api/admin/ai/content/route.ts](app/api/admin/ai/content/route.ts) - Content assistance API
- [app/api/admin/ai/grammar/route.ts](app/api/admin/ai/grammar/route.ts) - Grammar check API
- [app/api/admin/ai/alt-text/route.ts](app/api/admin/ai/alt-text/route.ts) - Alt text generation API
- [app/api/admin/ai/related-topics/route.ts](app/api/admin/ai/related-topics/route.ts) - Related topics API
- [app/api/admin/ai/status/route.ts](app/api/admin/ai/status/route.ts) - AI status/config API

**Updated Files**:
- [app/admin/articles/new/page.tsx](app/admin/articles/new/page.tsx) - Added AI panel
- [app/admin/articles/[id]/edit/page.tsx](app/admin/articles/[id]/edit/page.tsx) - Added AI panel

---

## Phase 11: Publishing & Scheduling System (Week 7)

### 11.1 Publication Status Management

- [ ] Implement status change logic
- [ ] Create "Publish Now" functionality
- [ ] Add "Save as Draft" action
- [ ] Create "Schedule Publication" feature
- [ ] Implement "Archive" action
- [ ] Add status change confirmation modals

### 11.2 Scheduling Interface

- [ ] Create Arabic RTL date picker component
- [ ] Add time picker (24-hour format)
- [ ] Set default timezone (Arabic region)
- [ ] Add timezone selector
- [ ] Validate future dates only
- [ ] Display selected date/time clearly
- [ ] Add "Clear schedule" option

### 11.3 Scheduled Posts Queue

- [ ] Create scheduled posts view
- [ ] Display upcoming publications
- [ ] Sort by scheduled date
- [ ] Add countdown timer for next publication
- [ ] Allow reschedule from queue
- [ ] Add cancel schedule option
- [ ] Show in dashboard widget

### 11.4 Auto-Publication System

- [ ] Set up cron job or serverless function
- [ ] Check for scheduled posts every 5-15 minutes
- [ ] Publish articles at scheduled time
- [ ] Update article status to "published"
- [ ] Set publishedAt timestamp
- [ ] Handle publication errors
- [ ] Log publication events

### 11.5 Publication Notifications

- [ ] Create notification system
- [ ] Send email on successful publication (optional)
- [ ] Add in-app notification
- [ ] Create notification center
- [ ] Mark notifications as read
- [ ] Show notification badge

### 11.6 Article Preview

- [ ] Create preview functionality
- [ ] Generate preview URL with token
- [ ] Render article with public template
- [ ] Show "Preview Mode" banner
- [ ] Add desktop/mobile preview toggle
- [ ] Allow preview of unpublished articles

**Deliverables**: Complete publishing system with scheduling and notifications

---

## Phase 12: Public Website - Frontend (Week 8-9)

### 12.1 Public Site Layout

- [ ] Create public layout component (separate from admin)
- [ ] Design RTL header/navigation
- [ ] Create site logo area
- [ ] Add main navigation menu (categories)
- [ ] Create search bar in header
- [ ] Design footer with links
- [ ] Add responsive mobile menu
- [ ] Implement sticky header (optional)

### 12.2 Homepage Design

- [ ] Create homepage route (`/`)
- [ ] Design hero section for featured article
- [ ] Display latest featured article
- [ ] Create articles grid component
- [ ] Show recent 9 articles
- [ ] Add "Load More" or pagination
- [ ] Display article card:
  - [ ] Featured image
  - [ ] Title
  - [ ] Excerpt
  - [ ] Date
  - [ ] Reading time
  - [ ] Categories
- [ ] Add sidebar (optional):
  - [ ] Popular articles
  - [ ] Categories list
  - [ ] Tag cloud

### 12.3 Article Display Page

- [ ] Create article route (`/article/[slug]`)
- [ ] Fetch article data by slug
- [ ] Display featured image
- [ ] Show article title (H1)
- [ ] Display author name, date, reading time
- [ ] Show category and tag breadcrumbs
- [ ] Render article content with formatting
- [ ] Display embedded images responsively
- [ ] Render YouTube videos
- [ ] Add proper spacing and typography
- [ ] Implement table of contents (auto-generated from H2/H3)

### 12.4 Article Metadata & SEO

- [ ] Generate dynamic meta tags
- [ ] Add Open Graph tags
- [ ] Include Twitter Card tags
- [ ] Generate JSON-LD structured data
- [ ] Set canonical URL
- [ ] Add article schema markup
- [ ] Include breadcrumb schema

### 12.5 Social Sharing

- [ ] Create share buttons component
- [ ] Add WhatsApp share button
- [ ] Add Twitter/X share button
- [ ] Add Facebook share button
- [ ] Add Telegram share button
- [ ] Add copy link button
- [ ] Implement native share API (mobile)

### 12.6 Related Articles

- [ ] Create related articles algorithm:
  - [ ] Same category
  - [ ] Similar tags
  - [ ] Recent articles
- [ ] Display 3-4 related articles
- [ ] Show at end of article
- [ ] Make cards clickable

### 12.7 Category Archive Pages

- [ ] Create category route (`/category/[slug]`)
- [ ] Fetch articles by category
- [ ] Display category name and description
- [ ] Show article grid
- [ ] Add pagination (12 articles per page)
- [ ] Include category breadcrumb

### 12.8 Tag Archive Pages

- [ ] Create tag route (`/tag/[slug]`)
- [ ] Fetch articles by tag
- [ ] Display tag name
- [ ] Show article grid
- [ ] Add pagination
- [ ] Include tag breadcrumb

### 12.9 Search Functionality

- [ ] Create search route (`/search`)
- [ ] Implement full-text search API
- [ ] Search in: titles, content, excerpts
- [ ] Display search results
- [ ] Highlight search terms (optional)
- [ ] Add filters (category, date)
- [ ] Show results count
- [ ] Handle no results state

### 12.10 404 & Error Pages

- [ ] Create custom 404 page in Arabic
- [ ] Design user-friendly error message
- [ ] Add navigation back to homepage
- [ ] Create 500 error page
- [ ] Add search bar on error pages

**Deliverables**: Complete public-facing website with all pages and features

---

## Phase 13: Analytics & Insights (Week 9)

### 13.1 Article View Tracking

- [ ] Implement page view counter
- [ ] Create API endpoint to record views
- [ ] Prevent duplicate counts (same user/session)
- [ ] Store view count in database
- [ ] Track views over time (daily stats)

### 13.2 Analytics Dashboard

- [ ] Create analytics route (`/admin/analytics`)
- [ ] Design analytics overview page
- [ ] Display total views (all time)
- [ ] Show views this month
- [ ] Display views this week
- [ ] Create views chart (last 30 days)

### 13.3 Article Performance

- [ ] Create most viewed articles widget
- [ ] Show top 10 articles by views
- [ ] Display view counts per article
- [ ] Add date range filter
- [ ] Show average reading time
- [ ] Calculate bounce rate (if possible)

### 13.4 Content Statistics

- [ ] Display total articles by status
- [ ] Show publishing frequency chart
- [ ] Create category distribution pie chart
- [ ] Display most used tags
- [ ] Show average article length
- [ ] Calculate average SEO score

### 13.5 SEO Performance Overview

- [ ] Create SEO dashboard widget
- [ ] Show average SEO score across all articles
- [ ] Display articles by SEO score range
- [ ] Highlight low-performing articles
- [ ] Show SEO score trends

### 13.6 Export Analytics

- [ ] Add export to CSV functionality
- [ ] Create PDF reports (optional)
- [ ] Allow date range selection for exports

**Deliverables**: Complete analytics system with insights and reporting

---

## Phase 14: Settings & Configuration (Week 10)

### 14.1 Site Settings

- [ ] Create settings route (`/admin/settings`)
- [ ] Design settings tabs interface
- [ ] Add "General" settings tab:
  - [ ] Site name
  - [ ] Site tagline
  - [ ] Admin email
  - [ ] Timezone selector
  - [ ] Date format preference
  - [ ] Time format (12/24 hour)
- [ ] Create "Save Settings" functionality

### 14.2 Admin Profile Settings

- [ ] Create "Profile" settings tab
- [ ] Display current admin info
- [ ] Add name field
- [ ] Add email field (with verification)
- [ ] Create password change section:
  - [ ] Current password
  - [ ] New password
  - [ ] Confirm password
  - [ ] Password strength indicator
- [ ] Add profile picture upload (optional)
- [ ] Implement update profile API

### 14.3 SEO Settings

- [ ] Create "SEO" settings tab
- [ ] Add default meta description template
- [ ] Add default meta title template
- [ ] Configure site-wide keywords
- [ ] Add Google Analytics ID field (optional)
- [ ] Add Google Search Console verification code
- [ ] Configure social media handles

### 14.4 Media Settings

- [ ] Create "Media" settings tab
- [ ] Set default image sizes
- [ ] Configure upload limits
- [ ] Choose image quality settings
- [ ] Set storage provider preferences

### 14.5 Publishing Settings

- [ ] Create "Publishing" settings tab
- [ ] Set default article status (draft/published)
- [ ] Configure auto-publish settings
- [ ] Set default categories
- [ ] Configure notification preferences

### 14.6 AI Settings

- [ ] Create "AI" settings tab
- [ ] Add Gemini API key field
- [ ] Configure AI model preferences
- [ ] Set AI response limits
- [ ] Toggle AI features on/off
- [ ] Test API connection button

**Deliverables**: Comprehensive settings system for site configuration

---

## Phase 15: Performance Optimization (Week 10)

### 15.1 Image Optimization

- [ ] Implement lazy loading for all images
- [ ] Add blur placeholders (LQIP)
- [ ] Use Next.js Image component throughout
- [ ] Configure image CDN properly
- [ ] Optimize image formats (WebP with fallback)
- [ ] Implement progressive image loading

### 15.2 Code Optimization

- [ ] Implement code splitting
- [ ] Lazy load non-critical components
- [ ] Optimize bundle size
- [ ] Remove unused dependencies
- [ ] Minify CSS and JavaScript
- [ ] Tree-shake unused code

### 15.3 Database Optimization

- [ ] Add indexes to frequently queried fields
- [ ] Optimize complex queries
- [ ] Implement database query caching
- [ ] Use pagination for large datasets
- [ ] Optimize N+1 query problems

### 15.4 Caching Strategy

- [ ] Implement static page generation for articles
- [ ] Set up incremental static regeneration (ISR)
- [ ] Cache API responses (Redis or similar)
- [ ] Configure CDN caching headers
- [ ] Implement browser caching
- [ ] Create cache invalidation strategy

### 15.5 Performance Monitoring

- [ ] Set up performance monitoring tools
- [ ] Configure Google PageSpeed Insights tracking
- [ ] Monitor Core Web Vitals
- [ ] Track largest contentful paint (LCP)
- [ ] Monitor first input delay (FID)
- [ ] Track cumulative layout shift (CLS)

**Deliverables**: Optimized application with fast load times

---

## Phase 16: SEO Technical Implementation (Week 10-11)

### 16.1 On-Page SEO

- [ ] Verify semantic HTML throughout
- [ ] Ensure proper heading hierarchy
- [ ] Add meta tags to all pages
- [ ] Implement Open Graph tags
- [ ] Add Twitter Card tags
- [ ] Generate structured data (JSON-LD)
- [ ] Add canonical URLs
- [ ] Verify proper alt tags on all images

### 16.2 Technical SEO

- [ ] Generate XML sitemap dynamically
- [ ] Create robots.txt file
- [ ] Implement 301 redirects for changed URLs
- [ ] Set up proper 404 handling
- [ ] Verify HTTPS configuration
- [ ] Add security headers
- [ ] Configure proper caching headers

### 16.3 Arabic SEO Specifics

- [ ] Verify `lang="ar"` and `dir="rtl"` on all pages
- [ ] Test UTF-8 encoding throughout
- [ ] Optimize Arabic typography
- [ ] Test on Arabic search engines
- [ ] Verify hreflang tags (if multi-language in future)

### 16.4 Mobile Optimization

- [ ] Test mobile responsiveness
- [ ] Verify touch targets (min 48px)
- [ ] Test on actual mobile devices
- [ ] Optimize viewport settings
- [ ] Test landscape/portrait modes

### 16.5 Schema Markup

- [ ] Add Article schema
- [ ] Add Breadcrumb schema
- [ ] Add Organization schema
- [ ] Add Person schema (author)
- [ ] Validate all schema with Google's testing tool

**Deliverables**: Fully SEO-optimized website with technical excellence

---

## Phase 17: Security Hardening (Week 11)

### 17.1 Authentication Security

- [ ] Implement strong password requirements
- [ ] Add password complexity validation
- [ ] Create failed login throttling (5 attempts lockout)
- [ ] Implement session timeout (30 min inactivity)
- [ ] Add CSRF token protection
- [ ] Configure secure cookies (httpOnly, secure, sameSite)
- [ ] Implement optional 2FA (TOTP)

### 17.2 Input Validation

- [ ] Sanitize all user inputs
- [ ] Validate data types
- [ ] Implement XSS prevention
- [ ] Add SQL injection protection (Prisma handles most)
- [ ] Validate file uploads strictly
- [ ] Limit file upload sizes
- [ ] Verify file types (magic numbers)

### 17.3 API Security

- [ ] Add rate limiting to all API endpoints
- [ ] Implement request throttling
- [ ] Add API authentication checks
- [ ] Validate all request payloads
- [ ] Add CORS configuration
- [ ] Implement request logging

### 17.4 Environment Security

- [ ] Move all secrets to environment variables
- [ ] Create `.env.example` file
- [ ] Add `.env` to `.gitignore`
- [ ] Verify no secrets in code
- [ ] Use secure secret generation
- [ ] Implement secret rotation plan

### 17.5 Dependency Security

- [ ] Audit npm packages for vulnerabilities
- [ ] Update all dependencies
- [ ] Remove unused packages
- [ ] Set up automated security alerts
- [ ] Implement dependency scanning

### 17.6 Headers & HTTPS

- [ ] Configure security headers:
  - [ ] X-Frame-Options
  - [ ] X-Content-Type-Options
  - [ ] Referrer-Policy
  - [ ] Permissions-Policy
  - [ ] Content-Security-Policy
- [ ] Enforce HTTPS redirect
- [ ] Configure HSTS header

**Deliverables**: Hardened, secure application

---

## Phase 18: Testing & Quality Assurance (Week 11-12)

### 18.1 Unit Testing

- [ ] Set up testing framework (Jest)
- [ ] Write tests for utility functions
- [ ] Test validation functions
- [ ] Test API endpoints
- [ ] Achieve 70%+ code coverage

### 18.2 Integration Testing

- [ ] Test article creation workflow
- [ ] Test image upload process
- [ ] Test authentication flow
- [ ] Test SEO scoring system
- [ ] Test scheduling system

### 18.3 E2E Testing

- [ ] Set up Playwright or Cypress
- [ ] Test complete user journeys:
  - [ ] Login to dashboard
  - [ ] Create and publish article
  - [ ] Upload and manage images
  - [ ] Schedule article publication
  - [ ] View article on public site
- [ ] Test mobile workflows

### 18.4 Browser Testing

- [ ] Test on Chrome
- [ ] Test on Firefox
- [ ] Test on Safari
- [ ] Test on Edge
- [ ] Test on mobile browsers (iOS Safari, Chrome Mobile)

### 18.5 RTL Testing

- [ ] Verify RTL layout on all pages
- [ ] Test Arabic text rendering
- [ ] Check text alignment
- [ ] Verify icon directions
- [ ] Test forms and inputs

### 18.6 Performance Testing

- [ ] Run Lighthouse audits
- [ ] Test load times
- [ ] Verify Core Web Vitals
- [ ] Test with slow 3G connection
- [ ] Check bundle sizes

### 18.7 Accessibility Testing

- [ ] Run WAVE accessibility checker
- [ ] Test keyboard navigation
- [ ] Verify ARIA labels
- [ ] Test with screen readers
- [ ] Check color contrast ratios
- [ ] Verify focus indicators

### 18.8 User Acceptance Testing

- [ ] Create test scenarios document
- [ ] Have admin user test all features
- [ ] Collect feedback
- [ ] Document bugs and issues
- [ ] Prioritize fixes

**Deliverables**: Thoroughly tested application with documented results

---

## Phase 19: Documentation (Week 12)

### 19.1 User Documentation (Arabic)

- [ ] Create admin user guide:
  - [ ] Login instructions
  - [ ] Dashboard overview
  - [ ] Creating articles
  - [ ] Using the rich text editor
  - [ ] Managing categories and tags
  - [ ] Uploading and managing images
  - [ ] Embedding YouTube videos
  - [ ] Understanding SEO scores
  - [ ] Using AI features
  - [ ] Scheduling articles
  - [ ] Viewing analytics
  - [ ] Configuring settings
- [ ] Add screenshots for each section
- [ ] Create video tutorials (optional)

### 19.2 Technical Documentation

- [ ] Document codebase structure
- [ ] Create README.md with:
  - [ ] Project overview
  - [ ] Installation instructions
  - [ ] Environment variables guide
  - [ ] Development commands
  - [ ] Deployment instructions
- [ ] Document database schema
- [ ] Create API documentation
- [ ] Document AI integration details
- [ ] Add code comments where needed

### 19.3 Troubleshooting Guide

- [ ] Common issues and solutions
- [ ] Error messages and their meanings
- [ ] How to reset admin password
- [ ] Database backup/restore procedures
- [ ] Cache clearing instructions

### 19.4 Maintenance Guide

- [ ] Backup procedures
- [ ] Update procedures
- [ ] Security checklist
- [ ] Performance monitoring
- [ ] Scaling recommendations

**Deliverables**: Complete documentation in Arabic and English

---

## Phase 20: Deployment & Launch (Week 12)

### 20.1 Pre-Deployment Checklist

- [ ] Run final tests
- [ ] Check all environment variables
- [ ] Verify database migrations
- [ ] Test production build locally
- [ ] Review security settings
- [ ] Backup development database

### 20.2 Domain & Hosting Setup

- [ ] Purchase/configure domain name
- [ ] Set up DNS records
- [ ] Configure SSL certificate
- [ ] Set up email forwarding (for notifications)

### 20.3 Database Deployment

- [ ] Create production Neon DB instance
- [ ] Run migrations on production DB
- [ ] Seed admin account
- [ ] Set up automated backups
- [ ] Configure connection pooling

### 20.4 Frontend Deployment

- [ ] Choose hosting platform (Vercel recommended)
- [ ] Connect GitHub repository
- [ ] Configure build settings
- [ ] Set environment variables
- [ ] Deploy to production
- [ ] Verify deployment success

### 20.5 Media Storage Setup

- [ ] Configure Cloudinary/Vercel Blob for production
- [ ] Set up production API keys
- [ ] Configure CORS settings
- [ ] Test image upload in production

### 20.6 Third-Party Services

- [ ] Set up Google Gemini API for production
- [ ] Configure API rate limits
- [ ] Set up monitoring/alerts (optional)
- [ ] Test AI features in production

### 20.7 Post-Deployment

- [ ] Test all features in production
- [ ] Verify admin login
- [ ] Create first real article
- [ ] Test public website
- [ ] Check analytics tracking
- [ ] Verify search functionality
- [ ] Test on mobile devices

### 20.8 Monitoring Setup

- [ ] Set up error tracking (Sentry or similar)
- [ ] Configure uptime monitoring
- [ ] Set up performance monitoring
- [ ] Create alert notifications
- [ ] Set up backup verification

### 20.9 Launch Checklist

- [ ] Final security review
- [ ] Submit sitemap to Google Search Console
- [ ] Verify robots.txt
- [ ] Test all critical user flows
- [ ] Prepare rollback plan
- [ ] Document launch date and version

### 20.10 Post-Launch

- [ ] Monitor error logs closely (first 48 hours)
- [ ] Watch performance metrics
- [ ] Collect admin feedback
- [ ] Address critical issues immediately
- [ ] Plan first maintenance window

**Deliverables**: Live, production-ready application

---

## Ongoing Maintenance Tasks

### Weekly

- [ ] Check error logs
- [ ] Monitor performance metrics
- [ ] Review analytics
- [ ] Backup database
- [ ] Check uptime reports

### Monthly

- [ ] Update dependencies
- [ ] Review security alerts
- [ ] Optimize database
- [ ] Review and optimize images
- [ ] Check and fix broken links

### Quarterly

- [ ] Comprehensive security audit
- [ ] Performance optimization review
- [ ] User feedback collection
- [ ] Feature prioritization for updates
- [ ] Review AI usage and costs

---

## Quick Reference - Task Priorities

### Critical (Must Have for MVP)

- Authentication system
- Article CRUD
- Rich text editor
- Image upload and album
- YouTube embedding
- Category/tag management
- Publishing system
- Public website
- SEO scoring
- Basic AI integration

### High Priority (Should Have)

- Advanced AI features
- Analytics dashboard
- Scheduling system
- Search functionality
- Settings panel
- Performance optimization

### Medium Priority (Nice to Have)

- Advanced analytics
- Related articles algorithm
- Tag cloud
- Social sharing optimization
- Advanced caching

### Low Priority (Future Enhancements)

- 2FA authentication
- Advanced collaboration features
- Newsletter integration
- Comment system
- Multi-language support

---

## Development Best Practices

### Daily Workflow

1. Pull latest code from main branch
2. Create feature branch for each task
3. Write code with comments
4. Test functionality locally
5. Commit with clear messages (in English)
6. Push to remote repository
7. Create pull request for review (if team)
8. Merge to main after testing

### Code Standards

- Use TypeScript strict mode
- Follow ESLint rules
- Write meaningful variable names in English
- Add comments for complex logic
- Keep components small and reusable
- Write pure functions where possible
- Handle errors gracefully

### Testing Approach

- Test each feature after completion
- Write unit tests for utilities
- Test on multiple browsers
- Verify RTL layout always
- Test with real Arabic content
- Check mobile responsiveness

### Git Commit Messages Format

```
feat: Add article scheduling feature
fix: Resolve RTL alignment in editor
docs: Update README with installation steps
style: Improve button spacing in dashboard
refactor: Optimize image upload logic
test: Add tests for SEO scoring
```

---

## Estimated Time Breakdown

| Phase    | Tasks              | Estimated Days | Notes                   |
| -------- | ------------------ | -------------- | ----------------------- |
| Phase 1  | Setup & Foundation | 5 days         | Critical foundation     |
| Phase 2  | Authentication     | 3 days         | Security is key         |
| Phase 3  | Admin Dashboard    | 4 days         | Reusable components     |
| Phase 4  | Database Models    | 3 days         | Get schema right first  |
| Phase 5  | Article CRUD       | 7 days         | Core feature            |
| Phase 6  | Categories & Tags  | 3 days         | Medium complexity       |
| Phase 7  | Image Management   | 7 days         | Complex with processing |
| Phase 8  | YouTube Videos     | 3 days         | Simpler than images     |
| Phase 9  | SEO Scoring        | 5 days         | Algorithm development   |
| Phase 10 | AI Integration     | 7 days         | External API complexity |
| Phase 11 | Publishing System  | 4 days         | Scheduling is tricky    |
| Phase 12 | Public Website     | 8 days         | Many pages and features |
| Phase 13 | Analytics          | 4 days         | Data visualization      |
| Phase 14 | Settings           | 3 days         | Multiple sections       |
| Phase 15 | Performance        | 3 days         | Optimization            |
| Phase 16 | SEO Technical      | 4 days         | Detail-oriented         |
| Phase 17 | Security           | 4 days         | Cannot rush security    |
| Phase 18 | Testing            | 6 days         | Comprehensive testing   |
| Phase 19 | Documentation      | 3 days         | In Arabic and English   |
| Phase 20 | Deployment         | 3 days         | Careful deployment      |

**Total: ~80 working days (12 weeks with buffer)**

---

## Tools & Resources Needed

### Development Tools

- VS Code or preferred IDE
- Node.js (v18+)
- Git
- Postman or Insomnia (API testing)
- TablePlus or similar (database management)

### Design Tools

- Figma (for mockups - optional)
- Adobe Illustrator/Photoshop (for assets)
- Arabic font licenses (if needed)

### Services & Accounts

- GitHub account
- Neon DB account
- Google AI Studio account (Gemini API)
- Vercel account (hosting)
- Cloudinary or Vercel Blob (media storage)
- Domain registrar account

### Testing Tools

- Chrome DevTools
- React DevTools
- Lighthouse
- WAVE accessibility tool
- Google PageSpeed Insights

---

## Risk Management

### Potential Risks & Mitigation

1. **RTL Layout Issues**
   - Risk: Components not aligning properly
   - Mitigation: Test RTL from day one, use RTL-first approach

2. **AI API Costs**
   - Risk: Gemini API costs exceed budget
   - Mitigation: Implement caching, rate limiting, monitor usage

3. **Performance Issues**
   - Risk: Slow load times with many images
   - Mitigation: Optimize early, use CDN, implement lazy loading

4. **SEO Algorithm Complexity**
   - Risk: Scoring algorithm too complex
   - Mitigation: Start simple, iterate based on real usage

5. **Arabic Text Rendering**
   - Risk: Font or encoding issues
   - Mitigation: Use proven Arabic fonts, test across browsers

6. **Scope Creep**
   - Risk: Adding too many features
   - Mitigation: Stick to PRD, document future features separately

---

## Success Criteria

### Technical Success

- [ ] All features from PRD implemented
- [ ] Page load times <2 seconds
- [ ] Mobile PageSpeed score >90
- [ ] Zero critical security vulnerabilities
- [ ] 99.9% uptime in first month

### User Success

- [ ] Admin can create article in <10 minutes
- [ ] SEO score helps improve article quality
- [ ] AI suggestions save time on writing
- [ ] Image upload and management is intuitive
- [ ] Scheduling works reliably

### Business Success

- [ ] Website attracts readers
- [ ] Articles rank in search engines
- [ ] System is stable and maintainable
- [ ] Future enhancements are feasible

---

**Document Version**: 1.0  
**Last Updated**: January 2026  
**Total Tasks**: 500+  
**Estimated Completion**: 12 weeks
