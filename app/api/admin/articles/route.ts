import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { createArticleSchema, listArticlesSchema } from '@/lib/validations/article';
import { generateSlug } from '@/lib/utils/slug';
import { Prisma } from '@prisma/client';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { sanitizeHtml } from '@/lib/security/sanitization';
import { withMonitoring } from '@/lib/monitoring/middleware';
import { recordQuery } from '@/lib/monitoring/performance';
import { withAuthCsrf } from '@/lib/security/middleware';

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
 * GET /api/admin/articles
 * List articles with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    // Rate limiting: 100 requests per minute for article listing
    const rateLimitResult = await checkRateLimit(request, {
      limit: 100,
      window: 60,
      identifier: `articles:list:${session.user.id}`,
    });

    if (rateLimitResult === null || !rateLimitResult.success) {
      return NextResponse.json(
        { error: 'طلبات كثيرة جداً. يرجى المحاولة مرة أخرى لاحقاً.' },
        { status: 429 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams);

    const validatedQuery = listArticlesSchema.safeParse(queryParams);
    if (!validatedQuery.success) {
      return NextResponse.json(
        { error: 'معاملات البحث غير صالحة', details: validatedQuery.error.issues },
        { status: 400 }
      );
    }

    const {
      page,
      limit,
      search,
      status,
      categoryId,
      tagId,
      dateFrom,
      dateTo,
      sortBy,
      sortOrder,
    } = validatedQuery.data;

    // Build where clause
    const where: Prisma.ArticleWhereInput = {};

    // Search in title and content
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Filter by status
    if (status) {
      where.status = status;
    }

    // Filter by category
    if (categoryId) {
      where.categories = {
        some: {
          id: categoryId,
        },
      };
    }

    // Filter by tag
    if (tagId) {
      where.tags = {
        some: {
          id: tagId,
        },
      };
    }

    // Filter by date range
    if (dateFrom || dateTo) {
      where.publishedAt = {};
      if (dateFrom) {
        where.publishedAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.publishedAt.lte = new Date(dateTo);
      }
    }

    // Count total matching articles
    const total = await prisma.article.count({ where });

    // Fetch articles with pagination — content excluded from list view (use single-article endpoint for full content)
    const articles = await prisma.article.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        status: true,
        publishedAt: true,
        scheduledAt: true,
        isFeatured: true,
        seoScore: true,
        readingTime: true,
        wordCount: true,
        views: true,
        createdAt: true,
        updatedAt: true,
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
            altText: true,
          },
        },
      },
    });

    return NextResponse.json({
      articles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching articles:', error);
    return NextResponse.json(
      { error: 'خطأ في جلب المقالات' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/articles
 * Create a new article
 * Phase 2 Frontend Audit - Added CSRF protection
 */
export const POST = withAuthCsrf(async (request: NextRequest) => {
  try {
    // Verify authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    // Rate limiting: 20 article creations per minute
    const rateLimitResult = await checkRateLimit(request, {
      limit: 20,
      window: 60,
      identifier: `articles:create:${session.user.id}`,
    });

    if (rateLimitResult === null || !rateLimitResult.success) {
      return NextResponse.json(
        { error: 'طلبات كثيرة جداً. يرجى المحاولة مرة أخرى لاحقاً.' },
        { status: 429 }
      );
    }

    const body = await request.json();

    // Validate input
    const validatedData = createArticleSchema.safeParse(body);
    if (!validatedData.success) {
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
    } = validatedData.data;

    // Sanitize HTML content to prevent XSS attacks
    const sanitizedContent = sanitizeHtml(content);
    const sanitizedExcerpt = excerpt ? sanitizeHtml(excerpt) : null;

    // Generate slug if not provided
    let slug = customSlug;
    if (!slug) {
      slug = generateSlug(title);

      // Check if slug exists and make it unique
      const existingArticle = await prisma.article.findUnique({
        where: { slug },
        select: { id: true },
      });

      if (existingArticle) {
        let suffix = 1;
        while (await prisma.article.findUnique({ where: { slug: `${slug}-${suffix}` } })) {
          suffix++;
        }
        slug = `${slug}-${suffix}`;
      }
    } else {
      // Verify custom slug is unique
      const existingArticle = await prisma.article.findUnique({
        where: { slug },
        select: { id: true },
      });

      if (existingArticle) {
        return NextResponse.json(
          { error: 'رابط المقال مستخدم بالفعل' },
          { status: 409 }
        );
      }
    }

    // Handle published/scheduled dates
    let finalPublishedAt: Date | null = null;
    let finalScheduledAt: Date | null = null;

    if (status === 'published' && publishedAt) {
      finalPublishedAt = new Date(publishedAt);
    } else if (status === 'published') {
      finalPublishedAt = new Date();
    } else if (status === 'scheduled' && scheduledAt) {
      finalScheduledAt = new Date(scheduledAt);
    }

    // Create article
    const article = await prisma.article.create({
      data: {
        title,
        slug,
        content: sanitizedContent,
        excerpt: sanitizedExcerpt,
        featuredImageId,
        authorId: session.user.id,
        status,
        publishedAt: finalPublishedAt,
        scheduledAt: finalScheduledAt,
        metaTitle,
        metaDescription,
        focusKeyword,
        wordCount: calculateWordCount(sanitizedContent),
        readingTime: Math.ceil(calculateWordCount(sanitizedContent) / 200), // ~200 words per minute
        categories: categoryIds && categoryIds.length > 0
          ? {
              connect: categoryIds.map(id => ({ id })),
            }
          : undefined,
        tags: tagIds && tagIds.length > 0
          ? {
              connect: tagIds.map(id => ({ id })),
            }
          : undefined,
      },
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

    return NextResponse.json(article, { status: 201 });
  } catch (error) {
    console.error('Error creating article:', error);
    return NextResponse.json(
      { error: 'خطأ في إنشاء المقال' },
      { status: 500 }
    );
  }
});
