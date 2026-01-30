import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';

/**
 * GET /api/admin/tags/search
 * Search tags for auto-suggest in article editor
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '10');
    const excludeIds = searchParams.get('exclude')?.split(',').filter(Boolean) || [];

    if (!query.trim()) {
      // Return most used tags if no query
      const popularTags = await prisma.tag.findMany({
        where: excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {},
        orderBy: {
          articles: {
            _count: 'desc',
          },
        },
        take: limit,
        select: {
          id: true,
          name: true,
          slug: true,
          _count: {
            select: { articles: true },
          },
        },
      });

      return NextResponse.json({
        tags: popularTags.map(tag => ({
          id: tag.id,
          name: tag.name,
          slug: tag.slug,
          articleCount: tag._count.articles,
        })),
      });
    }

    // Search by name (case-insensitive)
    const tags = await prisma.tag.findMany({
      where: {
        AND: [
          excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {},
          {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { slug: { contains: query, mode: 'insensitive' } },
            ],
          },
        ],
      },
      orderBy: [
        // Prioritize exact matches
        { name: 'asc' },
      ],
      take: limit,
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: { articles: true },
        },
      },
    });

    // Check if query matches exactly to any existing tag
    const exactMatch = tags.find(
      t => t.name.toLowerCase() === query.toLowerCase()
    );

    return NextResponse.json({
      tags: tags.map(tag => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        articleCount: tag._count.articles,
      })),
      // Include flag to show "create new tag" option
      canCreate: !exactMatch && query.trim().length > 0,
      query: query.trim(),
    });
  } catch (error) {
    console.error('Error searching tags:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء البحث' },
      { status: 500 }
    );
  }
}
