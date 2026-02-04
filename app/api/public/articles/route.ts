import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const ARTICLES_PER_PAGE = 12;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const categorySlug = searchParams.get('category');
    const tagSlug = searchParams.get('tag');
    const featured = searchParams.get('featured') === 'true';
    const search = searchParams.get('search');

    const skip = (page - 1) * ARTICLES_PER_PAGE;

    // Build where clause
    const where: any = {
      status: 'published',
      publishedAt: { lte: new Date() },
    };

    if (categorySlug) {
      where.categories = {
        some: {
          slug: categorySlug,
        },
      };
    }

    if (tagSlug) {
      where.tags = {
        some: {
          slug: tagSlug,
        },
      };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Fetch articles with relations
    const [articles, totalCount] = await Promise.all([
      prisma.article.findMany({
        where,
        skip,
        take: featured ? 1 : ARTICLES_PER_PAGE,
        orderBy: featured
          ? [{ isFeatured: 'desc' }, { publishedAt: 'desc' }]
          : { publishedAt: 'desc' },
        include: {
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
              altText: true,
            },
          },
          author: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.article.count({ where }),
    ]);

    // Format response
    const formattedArticles = articles.map((article) => ({
      id: article.id,
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      content: article.content,
      featuredImage: article.featuredImage?.url || null,
      publishedAt: article.publishedAt,
      readingTime: article.readingTime,
      isFeatured: article.isFeatured,
      author: article.author,
      categories: article.categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
      })),
      tags: article.tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
      })),
      metaTitle: article.metaTitle,
      metaDescription: article.metaDescription,
    }));

    return NextResponse.json({
      articles: formattedArticles,
      pagination: {
        page,
        pageSize: ARTICLES_PER_PAGE,
        totalCount,
        totalPages: Math.ceil(totalCount / ARTICLES_PER_PAGE),
        hasMore: skip + ARTICLES_PER_PAGE < totalCount,
      },
    });
  } catch (error) {
    console.error('Error fetching public articles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch articles' },
      { status: 500 }
    );
  }
}
