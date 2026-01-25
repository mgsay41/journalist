# Development Tasks - Arabic Journalist CMS

## Project Overview

Complete task breakdown for developing an Arabic-first Content Management System with AI-powered features, SEO optimization, and media management.

**Total Estimated Timeline**: 12 weeks  
**Development Approach**: Iterative, phase-by-phase with testing at each stage

---

## Phase 1: Project Setup & Foundation (Week 1)

### 1.1 Environment Setup

- [ ] Initialize Next.js 14+ project with App Router
- [ ] Configure TypeScript with strict mode
- [ ] Set up Tailwind CSS with RTL support
- [ ] Configure Arabic web fonts (Cairo, Noto Sans Arabic, or Tajawal)
- [ ] Set up ESLint and Prettier for Arabic/RTL code
- [ ] Create `.env.example` file with all required variables
- [ ] Set up Git repository with proper `.gitignore`

### 1.2 Database Configuration

- [ ] Create Neon DB project and database
- [ ] Initialize Prisma in project
- [ ] Configure Prisma schema file
- [ ] Set up database connection string
- [ ] Create initial User model
- [ ] Run first migration
- [ ] Test database connection

### 1.3 Project Structure

- [ ] Create folder structure:
  - `/app` - Next.js app directory
  - `/components` - Reusable components
  - `/lib` - Utility functions and configs
  - `/prisma` - Database schema and migrations
  - `/public` - Static assets
  - `/styles` - Global styles
  - `/types` - TypeScript type definitions
- [ ] Set up component naming conventions
- [ ] Create base layout components
- [ ] Configure Next.js metadata for Arabic site

### 1.4 RTL Configuration

- [ ] Configure Tailwind for RTL support
- [ ] Create RTL utility classes
- [ ] Set up `dir="rtl"` and `lang="ar"` in root layout
- [ ] Test RTL layout with sample components
- [ ] Create RTL-specific CSS utilities

**Deliverables**: Working Next.js project with database connected and RTL configured

---

## Phase 2: Authentication System (Week 1-2)

### 2.1 Better Auth Setup

- [ ] Install Better Auth package
- [ ] Configure Better Auth with Prisma adapter
- [ ] Set up authentication routes
- [ ] Create auth configuration file
- [ ] Set up session management
- [ ] Configure security settings (CSRF, secure cookies)

### 2.2 Admin Login Page (`/admin/login`)

- [ ] Create login page route (hidden, no navigation links)
- [ ] Design RTL login form UI
- [ ] Create email input field with Arabic label
- [ ] Create password input field with Arabic label
- [ ] Add "Remember Me" checkbox with Arabic label
- [ ] Implement form validation (client-side)
- [ ] Add Arabic error messages
- [ ] Create loading state during authentication
- [ ] Implement redirect after successful login

### 2.3 Authentication Logic

- [ ] Create login API endpoint
- [ ] Implement password hashing verification
- [ ] Set up session creation
- [ ] Add failed login attempt throttling
- [ ] Create logout functionality
- [ ] Implement session persistence ("Remember Me")
- [ ] Add middleware for protected routes
- [ ] Create auth utility functions

### 2.4 Initial Admin Account

- [ ] Create database seed script
- [ ] Add initial admin user with hashed password
- [ ] Document admin credentials securely
- [ ] Test login with seed admin account

**Deliverables**: Fully functional authentication system with secure admin login

---

## Phase 3: Admin Dashboard Foundation (Week 2)

### 3.1 Dashboard Layout

- [ ] Create admin layout component
- [ ] Design RTL sidebar navigation (right-side)
- [ ] Create top navigation bar
- [ ] Add logo/site title area
- [ ] Implement responsive sidebar (mobile hamburger menu)
- [ ] Create navigation menu items structure
- [ ] Add active state styling for nav items
- [ ] Create footer component

### 3.2 Dashboard Home Page

- [ ] Create dashboard route (`/admin/dashboard`)
- [ ] Design welcome section with admin name
- [ ] Create stats cards component
- [ ] Add placeholder stats (will populate later):
  - Total articles
  - Published articles
  - Draft articles
  - Scheduled articles
  - Total images
  - Average SEO score
- [ ] Create recent articles list component (empty state)
- [ ] Add quick action buttons (New Article, View Site)
- [ ] Design empty state illustrations/messages

### 3.3 Navigation System

- [ ] Create navigation data structure
- [ ] Implement active route highlighting
- [ ] Add navigation icons (using Arabic-friendly icon library)
- [ ] Create nested menu support for sub-items
- [ ] Add breadcrumb component for deep pages
- [ ] Implement navigation permissions (future-proof)

### 3.4 Common Components

- [ ] Create Button component (primary, secondary, danger)
- [ ] Create Input field component (with RTL support)
- [ ] Create Textarea component
- [ ] Create Select/Dropdown component
- [ ] Create Modal component
- [ ] Create Alert/Toast notification component
- [ ] Create Loading spinner component
- [ ] Create Empty state component
- [ ] Create Card component

**Deliverables**: Complete admin dashboard layout with navigation and reusable components

---

## Phase 4: Database Models (Week 2-3)

### 4.1 Article Model

- [ ] Create Article schema in Prisma
- [ ] Add all required fields (title, slug, content, etc.)
- [ ] Set up relationships (author, categories, tags)
- [ ] Add indexes for performance (slug, status, publishedAt)
- [ ] Create article status enum
- [ ] Run migration

### 4.2 Category Model

- [ ] Create Category schema
- [ ] Implement self-referential relationship (parent/child)
- [ ] Add slug generation logic
- [ ] Set up article-category many-to-many relation
- [ ] Run migration

### 4.3 Tag Model

- [ ] Create Tag schema
- [ ] Set up article-tag many-to-many relation
- [ ] Add unique constraints
- [ ] Run migration

### 4.4 Image Model

- [ ] Create Image schema
- [ ] Add all metadata fields
- [ ] Set up article-image relationships
- [ ] Add featured image relation
- [ ] Run migration

### 4.5 Video Model

- [ ] Create Video schema
- [ ] Link to Article model
- [ ] Add YouTube-specific fields
- [ ] Run migration

### 4.6 SEO Analysis Model

- [ ] Create SeoAnalysis schema
- [ ] Link to Article (one-to-one)
- [ ] Add JSON fields for suggestions and criteria
- [ ] Run migration

### 4.7 Database Testing

- [ ] Test all model relationships
- [ ] Seed database with sample data
- [ ] Verify cascade deletes work correctly
- [ ] Test unique constraints
- [ ] Optimize queries with indexes

**Deliverables**: Complete database schema with all models and relationships

---

## Phase 5: Article Management - CRUD (Week 3-4)

### 5.1 Articles List Page

- [ ] Create articles list route (`/admin/articles`)
- [ ] Design articles table/grid view
- [ ] Display article data: title, status, date, categories
- [ ] Add status badges (draft, published, scheduled, archived)
- [ ] Implement pagination (20 articles per page)
- [ ] Add "New Article" button
- [ ] Create article actions menu (edit, delete, duplicate, view)
- [ ] Add bulk selection checkboxes
- [ ] Implement bulk actions (delete, change status)

### 5.2 Article Filtering & Search

- [ ] Create search bar for articles (full-text search)
- [ ] Add status filter dropdown (all, draft, published, etc.)
- [ ] Add category filter
- [ ] Add tag filter
- [ ] Add date range filter
- [ ] Implement sort options (date, title, views)
- [ ] Create "Clear filters" button
- [ ] Add results count display

### 5.3 New Article Page - Basic Structure

- [ ] Create new article route (`/admin/articles/new`)
- [ ] Design three-column layout (RTL)
- [ ] Create main content area
- [ ] Create right sidebar for metadata
- [ ] Create left sidebar for SEO/AI
- [ ] Add "Save Draft" button
- [ ] Add "Publish" button
- [ ] Add "Preview" button
- [ ] Implement auto-save functionality (every 30 seconds)
- [ ] Add auto-save indicator

### 5.4 Article Editor - Rich Text

- [ ] Research and choose RTL-compatible editor (TipTap recommended)
- [ ] Install and configure editor
- [ ] Set RTL as default direction
- [ ] Configure formatting toolbar:
  - [ ] Bold, italic, underline
  - [ ] Headers (H1-H6)
  - [ ] Ordered/unordered lists
  - [ ] Blockquotes
  - [ ] Code blocks
  - [ ] Links (with title and rel attributes)
  - [ ] Clear formatting
- [ ] Add character/word count display
- [ ] Add reading time calculator
- [ ] Implement paste handling (clean HTML)

### 5.5 Article Metadata Fields

- [ ] Create title input field (with character counter)
- [ ] Create slug field (auto-generate from title, editable)
- [ ] Implement slug validation (unique, URL-safe)
- [ ] Create excerpt textarea (character counter)
- [ ] Add featured image selector (connects to album)
- [ ] Create category multi-select dropdown
- [ ] Create tags input with auto-suggest
- [ ] Add author name field (default to admin)
- [ ] Create publication date/time picker
- [ ] Add status selector

### 5.6 Article Save Functionality

- [ ] Create save article API endpoint
- [ ] Implement validation logic
- [ ] Handle image associations
- [ ] Process and save content
- [ ] Generate slug if not provided
- [ ] Save to database
- [ ] Return success/error responses
- [ ] Handle optimistic UI updates

### 5.7 Edit Article Page

- [ ] Create edit article route (`/admin/articles/[id]/edit`)
- [ ] Fetch article data
- [ ] Populate all fields with existing data
- [ ] Load related categories and tags
- [ ] Load featured image if exists
- [ ] Implement update functionality
- [ ] Handle version history (save last 10 versions)
- [ ] Add "Restore version" feature

### 5.8 Delete Article

- [ ] Create delete confirmation modal
- [ ] Implement soft delete (change status to archived)
- [ ] Create permanent delete option (with warning)
- [ ] Handle related data cleanup
- [ ] Add undo option (for soft delete)

**Deliverables**: Complete article CRUD system with rich text editing

---

## Phase 6: Category & Tag Management (Week 4)

### 6.1 Categories Page

- [ ] Create categories route (`/admin/categories`)
- [ ] Design hierarchical category list view
- [ ] Display parent-child relationships visually
- [ ] Add category count (number of articles)
- [ ] Create "Add Category" button
- [ ] Add edit/delete actions per category
- [ ] Implement drag-and-drop reordering

### 6.2 Category CRUD

- [ ] Create add category modal
- [ ] Add category name field
- [ ] Implement slug auto-generation
- [ ] Add description textarea
- [ ] Create parent category selector
- [ ] Add featured category toggle
- [ ] Implement save category API
- [ ] Create edit category functionality
- [ ] Add delete category with reassignment option
- [ ] Validate unique category names/slugs

### 6.3 Tags Page

- [ ] Create tags route (`/admin/tags`)
- [ ] Design tags list view (table or grid)
- [ ] Display tag usage count
- [ ] Add "Create Tag" button
- [ ] Show articles using each tag
- [ ] Add edit/delete actions

### 6.4 Tag CRUD

- [ ] Create add tag modal
- [ ] Implement tag name field
- [ ] Add slug auto-generation
- [ ] Create save tag API
- [ ] Add edit tag functionality
- [ ] Implement merge tags feature
- [ ] Create delete tag with cleanup
- [ ] Add bulk delete unused tags

### 6.5 Tag Auto-Suggest

- [ ] Implement tag search API
- [ ] Create auto-suggest dropdown in article editor
- [ ] Add "Create new tag" inline option
- [ ] Handle tag selection/deselection
- [ ] Limit maximum tags per article (optional: 10)

**Deliverables**: Full category and tag management with hierarchical support

---

## Phase 7: Media Management - Images (Week 5)

### 7.1 Image Upload Infrastructure

- [ ] Choose image storage solution (Cloudinary/Vercel Blob)
- [ ] Set up storage API keys
- [ ] Create image upload API endpoint
- [ ] Implement file validation (type, size)
- [ ] Add image processing library (sharp)
- [ ] Configure image optimization settings

### 7.2 Image Processing

- [ ] Create thumbnail generation (150x150)
- [ ] Create medium size (800px width)
- [ ] Create large size (1200px width)
- [ ] Store original image
- [ ] Implement WebP conversion
- [ ] Add compression algorithm
- [ ] Extract image metadata (dimensions, size)
- [ ] Generate unique filenames

### 7.3 Image Album Page

- [ ] Create album route (`/admin/media/images`)
- [ ] Design grid layout for images
- [ ] Add thumbnail view
- [ ] Implement image upload dropzone
- [ ] Create multi-file upload support
- [ ] Add upload progress indicators
- [ ] Show upload success/error messages
- [ ] Display upload queue

### 7.4 Image Album Features

- [ ] Implement lazy loading for images
- [ ] Add pagination or infinite scroll
- [ ] Create search images functionality
- [ ] Add filter by upload date
- [ ] Create filter by usage (used/unused)
- [ ] Implement sort options (date, name, size)
- [ ] Add view toggle (grid/list)

### 7.5 Image Detail & Editing

- [ ] Create image preview modal
- [ ] Display full image with metadata
- [ ] Add alt text editor
- [ ] Add caption editor
- [ ] Show image dimensions and file size
- [ ] Display usage information (which articles)
- [ ] Add copy URL button
- [ ] Create delete image functionality
- [ ] Implement delete protection (warn if used)

### 7.6 Image Insertion in Editor

- [ ] Add image button to editor toolbar
- [ ] Create image picker modal
- [ ] Show album images in modal
- [ ] Add upload option in modal
- [ ] Implement image selection
- [ ] Insert image into content
- [ ] Add image caption field
- [ ] Set image alignment options (right, left, center)
- [ ] Make images responsive in content

### 7.7 Auto-Add to Album

- [ ] Detect new images in article content
- [ ] Auto-save to album if not exists
- [ ] Associate image with article
- [ ] Update image metadata

### 7.8 Bulk Image Operations

- [ ] Implement multi-select for images
- [ ] Add bulk delete functionality
- [ ] Create bulk download option
- [ ] Add bulk tag/categorize (optional)

**Deliverables**: Complete image management system with upload, processing, and album

---

## Phase 8: Media Management - YouTube Videos (Week 5)

### 8.1 YouTube Integration Setup

- [ ] Install YouTube API client library
- [ ] Create YouTube video parser utility
- [ ] Implement video ID extractor from URL
- [ ] Create thumbnail fetcher from YouTube

### 8.2 Video Management Page

- [ ] Create videos route (`/admin/media/videos`)
- [ ] Design videos list view
- [ ] Display video thumbnails
- [ ] Show video titles
- [ ] Display associated articles
- [ ] Add video actions (edit, remove)

### 8.3 Video Embedding in Editor

- [ ] Add video button to editor toolbar
- [ ] Create video insert modal
- [ ] Add YouTube URL input field
- [ ] Implement URL validation
- [ ] Fetch video preview on URL entry
- [ ] Show video title and thumbnail
- [ ] Add custom title override option
- [ ] Configure video player options:
  - [ ] Privacy-enhanced mode toggle
  - [ ] Autoplay option
  - [ ] Show related videos toggle
  - [ ] Start time input
- [ ] Insert video embed code into content

### 8.4 Video Display Component

- [ ] Create responsive YouTube embed component
- [ ] Implement lazy loading for videos
- [ ] Add play button overlay
- [ ] Ensure RTL compatibility
- [ ] Test on mobile devices

### 8.5 Video Management

- [ ] Save video data to database
- [ ] Link videos to articles
- [ ] Handle video removal from article
- [ ] Update video metadata
- [ ] Delete unused videos

**Deliverables**: YouTube video integration with embedding and management

---

## Phase 9: SEO Scoring System (Week 6)

### 9.1 SEO Criteria Engine

- [ ] Create SEO scoring algorithm
- [ ] Define scoring weights for each criterion
- [ ] Implement title length check (40-60 chars)
- [ ] Add meta description length check (120-160 chars)
- [ ] Create word count validator (min 300 words)
- [ ] Implement keyword density calculator
- [ ] Add header tags checker (H1, H2, H3)
- [ ] Create image alt text validator
- [ ] Implement internal links counter
- [ ] Add external links counter
- [ ] Create readability score calculator
- [ ] Validate unique slug
- [ ] Check featured image presence

### 9.2 SEO Score Display

- [ ] Create SEO score panel component
- [ ] Design score gauge (0-100)
- [ ] Add color coding (red/yellow/green)
- [ ] Display overall score prominently
- [ ] Create criteria checklist UI
- [ ] Add checkmark/X icons for each criterion
- [ ] Show detailed criterion breakdown

### 9.3 Real-Time SEO Analysis

- [ ] Implement content change listener
- [ ] Trigger analysis on title change
- [ ] Trigger analysis on content change
- [ ] Debounce analysis calls (1-2 seconds)
- [ ] Update score display in real-time
- [ ] Cache analysis results
- [ ] Add manual "Re-analyze" button

### 9.4 SEO Checklist Items

- [ ] Create expandable checklist sections
- [ ] Show passed criteria in green
- [ ] Show failed criteria in red
- [ ] Add warning criteria in yellow
- [ ] Display helpful tooltips for each item
- [ ] Link to relevant fields (e.g., click on "Add meta description" opens field)

### 9.5 SEO Score Persistence

- [ ] Save SEO score to database
- [ ] Store criteria status
- [ ] Track score history
- [ ] Create SEO score trend chart (optional)

**Deliverables**: Functional SEO scoring system with real-time analysis

---

## Phase 10: Google Gemini AI Integration (Week 6-7)

### 10.1 Gemini API Setup

- [ ] Sign up for Google AI Studio
- [ ] Generate Gemini API key
- [ ] Store API key securely in environment
- [ ] Install Gemini SDK
- [ ] Create Gemini client utility
- [ ] Implement rate limiting logic
- [ ] Add error handling for API failures
- [ ] Create fallback responses

### 10.2 SEO Suggestions with AI

- [ ] Create Gemini prompt template for SEO analysis
- [ ] Implement SEO suggestion API endpoint
- [ ] Send article content to Gemini
- [ ] Parse Gemini response (JSON format)
- [ ] Extract SEO suggestions
- [ ] Categorize suggestions (high/medium/low priority)
- [ ] Display suggestions in panel
- [ ] Add "Apply suggestion" quick action

### 10.3 Meta Generation

- [ ] Create meta title generation prompt
- [ ] Implement meta description generator
- [ ] Create API endpoint for meta generation
- [ ] Add "Generate with AI" buttons
- [ ] Display generated suggestions
- [ ] Allow one-click apply
- [ ] Enable regenerate option
- [ ] Keep user edits (don't override without permission)

### 10.4 Keyword Suggestions

- [ ] Create keyword extraction prompt
- [ ] Implement keyword analysis endpoint
- [ ] Extract relevant Arabic keywords
- [ ] Display keywords as tags/pills
- [ ] Allow copy to clipboard
- [ ] Add "Use keyword" button (adds to tags)
- [ ] Show keyword density for each

### 10.5 Content Assistance Features

- [ ] Create AI sidebar panel in editor
- [ ] Add "Expand paragraph" feature:
  - [ ] User selects text
  - [ ] AI generates expansion
  - [ ] Show in modal with accept/reject
- [ ] Add "Summarize section" feature
- [ ] Add "Rewrite in different tone":
  - [ ] Formal tone option
  - [ ] Casual tone option
  - [ ] Professional tone option
- [ ] Create "Generate introduction" feature
- [ ] Add "Generate conclusion" feature
- [ ] Implement "Suggest related topics"

### 10.6 Grammar & Spelling Check

- [ ] Create Arabic grammar check prompt
- [ ] Implement grammar API endpoint
- [ ] Highlight errors in editor
- [ ] Show correction suggestions
- [ ] Add "Apply all corrections" option
- [ ] Create custom dictionary for common terms

### 10.7 Image Alt Text Generation

- [ ] Create alt text generation prompt
- [ ] Analyze image context in article
- [ ] Generate descriptive alt text
- [ ] Add "Generate alt text" button in image settings
- [ ] Allow manual editing after generation

### 10.8 AI Features UX

- [ ] Create loading states for all AI features
- [ ] Add skeleton loaders
- [ ] Implement progress indicators
- [ ] Create error messages in Arabic
- [ ] Add retry logic for failed requests
- [ ] Show API usage warnings (approaching limits)
- [ ] Create "AI busy" indicators

### 10.9 AI Response Caching

- [ ] Implement response caching strategy
- [ ] Cache identical requests (24 hours)
- [ ] Clear cache on significant edits
- [ ] Reduce redundant API calls

**Deliverables**: Full AI integration with SEO, content assistance, and meta generation

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
