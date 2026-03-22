import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Fetch all categories with article counts
    const categories = await prisma.category.findMany({
      where: {
        articles: {
          some: {
            status: 'published',
            publishedAt: { lte: new Date() },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
      include: {
        _count: {
          select: {
            articles: {
              where: {
                status: 'published',
                publishedAt: { lte: new Date() },
              },
            },
          },
        },
      },
    });

    // Format response
    const formattedCategories = categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      articleCount: category._count.articles,
    }));

    return NextResponse.json({ categories: formattedCategories }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'خطأ في جلب التصنيفات' },
      { status: 500 }
    );
  }
}
