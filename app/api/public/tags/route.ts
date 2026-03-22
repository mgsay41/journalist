import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Fetch popular tags (most used) with article counts
    const tags = await prisma.tag.findMany({
      where: {
        articles: {
          some: {
            status: 'published',
            publishedAt: { lte: new Date() },
          },
        },
      },
      orderBy: {
        articles: {
          _count: 'desc',
        },
      },
      take: 30,
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
    const formattedTags = tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      articleCount: tag._count.articles,
    }));

    return NextResponse.json({ tags: formattedTags }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    });
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json(
      { error: 'خطأ في جلب الوسوم' },
      { status: 500 }
    );
  }
}
