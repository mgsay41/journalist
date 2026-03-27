import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { updateArticleSchema, deleteArticleSchema } from '@/lib/validations/article';
import { generateSlug } from '@/lib/utils/slug';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { sanitizeHtml } from '@/lib/security/sanitization';
import { withAuthCsrf } from '@/lib/security/middleware';
import { generateAndCacheTts } from '@/lib/tts/service';
import { z } from 'zod';

const idSchema = z.string().cuid();

/**
 * Calculate word count from HTML content
 */
function calculateWordCount(content: string): number {
  // Strip HTML tags
  const text = content.replace(/<[^>]*>/g, '');
  // Split by whitespace and count
  const words = text.split(/\s+/).filter(w => w.length > 0);
  return words.length;
}

/**
 * Convert empty strings to undefined for proper validation with Zod partial()
 * This is needed because Zod's .partial() makes fields optional, but if a value
 * is provided (including empty string), it still must pass the original validation.
 *
 * Also sanitizes slugs that may contain invalid characters (e.g., Arabic text).
 */
function sanitizeRequestBody(body: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    // Convert empty strings to undefined so they're treated as "not provided"
    if (value === '') {
      sanitized[key] = undefined;
    } else if (key === 'slug' && typeof value === 'string') {
      // Sanitize slug: if it doesn't match the required format (lowercase letters, numbers, hyphens only),
      // regenerate it using the title or keep undefined to let the server generate it
      const isValidSlug = /^[a-z0-9-]+$/.test(value);
      if (isValidSlug) {
        sanitized[key] = value;
      } else {
        // Invalid slug - we'll let the server generate it from the title
        // Set to undefined so the server handles it
        sanitized[key] = undefined;
      }
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * GET /api/admin/articles/[id]
 * Get a single article by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { id } = await params;

    // Validate ID format
    if (!idSchema.safeParse(id).success) {
      return NextResponse.json({ error: 'المقال غير موجود' }, { status: 404 });
    }

    // Fetch article
    const article = await prisma.article.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        categories: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        tags: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        featuredImage: {
          select: {
            id: true,
            url: true,
            thumbnailUrl: true,
            mediumUrl: true,
            largeUrl: true,
            altText: true,
            caption: true,
          },
        },
        images: {
          select: {
            id: true,
            url: true,
            thumbnailUrl: true,
            altText: true,
          },
        },
        videos: true,
      },
    });

    if (!article) {
      return NextResponse.json(
        { error: 'المقال غير موجود' },
        { status: 404 }
      );
    }

    return NextResponse.json(article);
  } catch (error) {
    console.error('Error fetching article:', error);
    return NextResponse.json(
      { error: 'خطأ في جلب المقال' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/articles/[id]
 * Update an existing article
 * Phase 2 Frontend Audit - Added CSRF protection
 */
export const PUT = withAuthCsrf(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    // Verify authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    // Rate limiting: 30 article updates per minute
    const rateLimitResult = await checkRateLimit(request, {
      limit: 30,
      window: 60,
      identifier: `articles:update:${session.user.id}`,
    });

    if (rateLimitResult && !rateLimitResult.success) {
      return NextResponse.json(
        { error: 'طلبات كثيرة جداً. يرجى المحاولة مرة أخرى لاحقاً.' },
        { status: 429 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Sanitize request body - convert empty strings to undefined for proper validation
    const sanitizedBody = sanitizeRequestBody(body);

    // Check if article exists and belongs to the current user
    const existingArticle = await prisma.article.findUnique({
      where: { id },
      select: { id: true, slug: true, authorId: true, status: true, content: true },
    });

    if (!existingArticle) {
      return NextResponse.json(
        { error: 'المقال غير موجود' },
        { status: 404 }
      );
    }

    if (existingArticle.authorId !== session.user.id) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }

    // Validate input
    const validatedData = updateArticleSchema.safeParse({ ...sanitizedBody, id });
    if (!validatedData.success) {
      // Log detailed validation error for debugging
      console.error('Article update validation failed:', {
        body: JSON.stringify(sanitizedBody, null, 2),
        issues: validatedData.error.issues,
      });
      // Return the first specific validation error message
      const firstError = validatedData.error.issues[0]?.message || 'بيانات غير صالحة';
      return NextResponse.json(
        { error: firstError, details: validatedData.error.issues },
        { status: 400 }
      );
    }

    const {
      title,
      slug: customSlug,
      content,
      excerpt,
      featuredImageId,
      categoryIds,
      tagIds,
      status,
      publishedAt,
      scheduledAt,
      metaTitle,
      metaDescription,
      focusKeyword,
      conclusion,
    } = validatedData.data;

    // Sanitize HTML content if provided
    const sanitizedContent = content !== undefined ? sanitizeHtml(content) : undefined;
    const sanitizedExcerpt = excerpt !== undefined && excerpt !== null ? sanitizeHtml(excerpt) : undefined;

    // Handle aiCompletionData separately (not in validation schema)
    const aiCompletionData = body.aiCompletionData;

    // Handle slug
    let slug = existingArticle.slug;
    if (customSlug && customSlug !== existingArticle.slug) {
      // Verify new slug is unique
      const slugExists = await prisma.article.findFirst({
        where: {
          slug: customSlug,
          id: { not: id },
        },
        select: { id: true },
      });

      if (slugExists) {
        return NextResponse.json(
          { error: 'رابط المقال مستخدم بالفعل' },
          { status: 409 }
        );
      }
      slug = customSlug;
    } else if (title && !customSlug) {
      // Generate new slug from title
      slug = generateSlug(title);

      // Check if new slug exists
      const slugExists = await prisma.article.findFirst({
        where: {
          slug,
          id: { not: id },
        },
        select: { id: true },
      });

      if (slugExists) {
        let suffix = 1;
        while (await prisma.article.findFirst({
          where: { slug: `${slug}-${suffix}`, id: { not: id } },
          select: { id: true },
        })) {
          suffix++;
        }
        slug = `${slug}-${suffix}`;
      }
    }

    // Handle published/scheduled dates
    let finalPublishedAt: Date | null | undefined = undefined;
    let finalScheduledAt: Date | null | undefined = undefined;

    if (status !== undefined) {
      if (status === 'published' && publishedAt) {
        finalPublishedAt = new Date(publishedAt);
        finalScheduledAt = null;
      } else if (status === 'published') {
        // If transitioning to published and no date provided, use now
        const currentArticle = await prisma.article.findUnique({
          where: { id },
          select: { publishedAt: true, status: true },
        });
        finalPublishedAt = currentArticle?.publishedAt || new Date();
        finalScheduledAt = null;
      } else if (status === 'scheduled' && scheduledAt) {
        finalScheduledAt = new Date(scheduledAt);
        finalPublishedAt = null;
      } else if (status === 'draft' || status === 'archived') {
        // Keep publishedAt if changing to draft/archived
        const currentArticle = await prisma.article.findUnique({
          where: { id },
          select: { publishedAt: true },
        });
        finalPublishedAt = currentArticle?.publishedAt || null;
        finalScheduledAt = null;
      }
    }

    // Disconnect existing categories and tags if provided
    const updateData: Record<string, unknown> = {
      ...(title !== undefined && { title }),
      ...(slug !== undefined && { slug }),
      ...(sanitizedContent !== undefined && {
        content: sanitizedContent,
        // Recalculate word count and reading time when content changes
        wordCount: calculateWordCount(sanitizedContent),
        readingTime: Math.ceil(calculateWordCount(sanitizedContent) / 200), // ~200 words per minute
      }),
      ...(sanitizedExcerpt !== undefined && { excerpt: sanitizedExcerpt }),
      ...(featuredImageId !== undefined && { featuredImageId }),
      ...(status !== undefined && { status }),
      ...(finalPublishedAt !== undefined && { publishedAt: finalPublishedAt }),
      ...(finalScheduledAt !== undefined && { scheduledAt: finalScheduledAt }),
      ...(metaTitle !== undefined && { metaTitle }),
      ...(metaDescription !== undefined && { metaDescription }),
      ...(focusKeyword !== undefined && { focusKeyword }),
      ...(conclusion !== undefined && { conclusion: conclusion === null ? null : conclusion }),
      ...(aiCompletionData !== undefined && { aiCompletionData: aiCompletionData === null ? null : JSON.parse(JSON.stringify(aiCompletionData)) }),
    };

    // Update categories if provided
    if (categoryIds !== undefined && categoryIds !== null) {
      updateData.categories = {
        set: [],
        connect: categoryIds.map((id: string) => ({ id })),
      };
    }

    // Update tags if provided
    if (tagIds !== undefined && tagIds !== null) {
      updateData.tags = {
        set: [],
        connect: tagIds.map((id: string) => ({ id })),
      };
    }

    // Update article
    const article = await prisma.article.update({
      where: { id },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        categories: true,
        tags: true,
        featuredImage: {
          select: {
            id: true,
            url: true,
            thumbnailUrl: true,
            altText: true,
          },
        },
      },
    });

    // If article just transitioned to published, fire TTS in background
    if (status === 'published' && existingArticle.status !== 'published') {
      const ttsContent = sanitizedContent ?? existingArticle.content;
      if (ttsContent && article.slug) {
        generateAndCacheTts(article.slug, ttsContent).catch((err) => {
          console.error('TTS pre-generation failed:', err);
        });
      }
    }

    return NextResponse.json(article);
  } catch (error) {
    console.error('Error updating article:', error);
    return NextResponse.json(
      { error: 'خطأ في تحديث المقال' },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/admin/articles/[id]
 * Delete an article (soft delete to archived, or permanent delete)
 * Phase 2 Frontend Audit - Added CSRF protection
 */
export const DELETE = withAuthCsrf(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    // Verify authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Validate input
    const validatedData = deleteArticleSchema.safeParse({ ...body, id });
    if (!validatedData.success) {
      return NextResponse.json(
        { error: 'بيانات غير صالحة', details: validatedData.error.issues },
        { status: 400 }
      );
    }

    // Check if article exists and belongs to the current user
    const existingArticle = await prisma.article.findUnique({
      where: { id },
      select: { id: true, status: true, authorId: true },
    });

    if (!existingArticle) {
      return NextResponse.json(
        { error: 'المقال غير موجود' },
        { status: 404 }
      );
    }

    if (existingArticle.authorId !== session.user.id) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }

    const { permanent } = validatedData.data;

    if (permanent) {
      // Permanent delete - only if already archived
      if (existingArticle.status !== 'archived') {
        return NextResponse.json(
          { error: 'لا يمكن الحذف الدائم إلا للمقالات المؤرشفة' },
          { status: 400 }
        );
      }

      await prisma.article.delete({
        where: { id },
      });

      return NextResponse.json({ message: 'تم حذف المقال نهائياً' });
    } else {
      // Soft delete - archive the article
      await prisma.article.update({
        where: { id },
        data: { status: 'archived' },
      });

      return NextResponse.json({ message: 'تم أرشفة المقال' });
    }
  } catch (error) {
    console.error('Error deleting article:', error);
    return NextResponse.json(
      { error: 'خطأ في حذف المقال' },
      { status: 500 }
    );
  }
});
