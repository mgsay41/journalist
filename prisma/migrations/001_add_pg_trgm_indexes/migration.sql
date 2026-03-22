-- Enable pg_trgm extension for trigram-based full-text search
-- This dramatically speeds up ILIKE '%search%' queries used by Prisma's
-- `contains: { mode: 'insensitive' }` on title, content, and excerpt fields.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN trigram index on article title (used by every search query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Article_title_trgm_idx"
  ON "Article" USING GIN (title gin_trgm_ops);

-- GIN trigram index on article content (large text field)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Article_content_trgm_idx"
  ON "Article" USING GIN (content gin_trgm_ops);

-- GIN trigram index on article excerpt
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Article_excerpt_trgm_idx"
  ON "Article" USING GIN (excerpt gin_trgm_ops);
