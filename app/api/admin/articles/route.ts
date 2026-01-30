import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { createArticleSchema, listArticlesSchema } from '@/lib/validations/article';
import { generateSlug } from '@/lib/utils/slug';
import { Prisma } from '@prisma/client';

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

    // Fetch articles with pagination
    const articles = await prisma.article.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
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
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const body = await request.json();

    // Validate input
    const validatedData = createArticleSchema.safeParse(body);
    if (!validatedData.success) {
      return NextResponse.json(
        { error: 'بيانات غير صالحة', details: validatedData.error.issues },
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
        content,
        excerpt,
        featuredImageId,
        authorId: session.user.id,
        status,
        publishedAt: finalPublishedAt,
        scheduledAt: finalScheduledAt,
        metaTitle,
        metaDescription,
        focusKeyword,
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
}
