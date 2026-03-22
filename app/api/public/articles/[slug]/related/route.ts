import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const slugSchema = z.string().min(1).max(255).regex(/^[a-z0-9-]+$/, 'Invalid slug format');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Validate slug format before hitting the database
    const slugValidation = slugSchema.safeParse(slug);
    if (!slugValidation.success) {
      return NextResponse.json({ error: 'المقال غير موجود' }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '4');

    // Get the current article to find related ones
    const currentArticle = await prisma.article.findUnique({
      where: { slug },
      select: {
        id: true,
        categories: {
          select: {
            id: true,
          },
        },
        tags: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!currentArticle) {
      return NextResponse.json(
        { error: 'المقال غير موجود' },
        { status: 404 }
      );
    }

    const categoryIds = currentArticle.categories.map((c) => c.id);
    const tagIds = currentArticle.tags.map((t) => t.id);

    // Find related articles with matching categories or tags
    const relatedArticles = await prisma.article.findMany({
      where: {
        id: { not: currentArticle.id },
        status: 'published',
        publishedAt: { lte: new Date() },
        OR: [
          {
            categories: {
              some: {
                id: { in: categoryIds },
              },
            },
          },
          {
            tags: {
              some: {
                id: { in: tagIds },
              },
            },
          },
        ],
      },
      include: {
        categories: {
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
            altText: true,
          },
        },
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
    });

    // Format response
    const formattedArticles = relatedArticles.map((article) => ({
      id: article.id,
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      featuredImage: article.featuredImage?.url || null,
      publishedAt: article.publishedAt,
      readingTime: article.readingTime,
      categories: article.categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
      })),
    }));

    return NextResponse.json({ articles: formattedArticles }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (error) {
    console.error('Error fetching related articles:', error);
    return NextResponse.json(
      { error: 'خطأ في جلب المقالات ذات الصلة' },
      { status: 500 }
    );
  }
}
