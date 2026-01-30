import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { mergeTagsSchema } from '@/lib/validations/tag';

/**
 * POST /api/admin/tags/merge
 * Merge multiple tags into one target tag
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const body = await request.json();
    const validation = mergeTagsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { sourceTagIds, targetTagId } = validation.data;

    // Verify target tag exists
    const targetTag = await prisma.tag.findUnique({
      where: { id: targetTagId },
    });

    if (!targetTag) {
      return NextResponse.json(
        { error: 'الوسم الهدف غير موجود' },
        { status: 404 }
      );
    }

    // Verify all source tags exist
    const sourceTags = await prisma.tag.findMany({
      where: { id: { in: sourceTagIds } },
    });

    if (sourceTags.length !== sourceTagIds.length) {
      return NextResponse.json(
        { error: 'بعض الوسوم المصدر غير موجودة' },
        { status: 404 }
      );
    }

    // Cannot merge target tag into itself
    if (sourceTagIds.includes(targetTagId)) {
      return NextResponse.json(
        { error: 'لا يمكن دمج الوسم مع نفسه' },
        { status: 400 }
      );
    }

    // Get all articles that have any of the source tags
    const articlesWithSourceTags = await prisma.article.findMany({
      where: {
        tags: {
          some: {
            id: { in: sourceTagIds },
          },
        },
      },
      select: { id: true },
    });

    // For each article, add the target tag and remove source tags
    for (const article of articlesWithSourceTags) {
      await prisma.article.update({
        where: { id: article.id },
        data: {
          tags: {
            connect: { id: targetTagId },
            disconnect: sourceTagIds.map(id => ({ id })),
          },
        },
      });
    }

    // Delete the source tags
    await prisma.tag.deleteMany({
      where: { id: { in: sourceTagIds } },
    });

    // Get updated target tag
    const updatedTag = await prisma.tag.findUnique({
      where: { id: targetTagId },
      include: {
        _count: {
          select: { articles: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      mergedCount: sourceTagIds.length,
      affectedArticles: articlesWithSourceTags.length,
      targetTag: {
        ...updatedTag,
        articleCount: updatedTag?._count.articles || 0,
      },
    });
  } catch (error) {
    console.error('Error merging tags:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء دمج الوسوم' },
      { status: 500 }
    );
  }
}
