import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { createTagSchema } from '@/lib/validations/tag';
import { generateUniqueSlug, generateUniqueNameEn } from '@/lib/utils/slug';
import { translateToSlugWithEn } from '@/lib/ai/translate';

/**
 * GET /api/admin/tags
 * Get all tags with article counts
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const includeCount = searchParams.get('includeCount') !== 'false';
    const limit = searchParams.get('limit');

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { slug: { contains: search, mode: 'insensitive' as const } },
            { nameEn: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const tags = await prisma.tag.findMany({
      where,
      orderBy: { name: 'asc' },
      ...(limit && { take: parseInt(limit) }),
      ...(includeCount && {
        include: {
          _count: {
            select: {
              articles: true,
            },
          },
        },
      }),
    });

    return NextResponse.json({
      tags: tags.map(tag => ({
        id: tag.id,
        name: tag.name,
        nameEn: tag.nameEn,
        slug: tag.slug,
        description: tag.description,
        articleCount: includeCount ? (tag as typeof tag & { _count: { articles: number } })._count?.articles || 0 : undefined,
        createdAt: tag.createdAt,
        updatedAt: tag.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء جلب الوسوم' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/tags
 * Create a new tag
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const body = await request.json();
    const validation = createTagSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name } = validation.data;

    // Check for duplicate name
    const existingByName = await prisma.tag.findUnique({
      where: { name },
    });

    if (existingByName) {
      return NextResponse.json(
        { error: 'يوجد وسم بهذا الاسم بالفعل' },
        { status: 400 }
      );
    }

    // Translate Arabic name to English before generating slug
    const { slugBase, nameEn: translatedNameEn } = await translateToSlugWithEn(name);
    const slug = await generateUniqueSlug(slugBase, async (slug) => {
      const exists = await prisma.tag.findUnique({ where: { slug } });
      return !!exists;
    });

    // Determine nameEn: prefer explicit value from request, fall back to AI translation
    const rawNameEn = (validation.data.nameEn || undefined) ?? translatedNameEn ?? undefined;

    // Ensure nameEn is unique — append a numeric suffix if needed (e.g. "Egypt 2")
    let finalNameEn: string | undefined;
    if (rawNameEn) {
      finalNameEn = await generateUniqueNameEn(rawNameEn, async (candidate) => {
        const exists = await prisma.tag.findFirst({ where: { nameEn: candidate } });
        return !!exists;
      });
    }

    const tag = await prisma.tag.create({
      data: {
        name,
        slug,
        ...(finalNameEn !== undefined && { nameEn: finalNameEn }),
        ...(validation.data.description && { description: validation.data.description }),
      },
    });

    return NextResponse.json({ tag }, { status: 201 });
  } catch (error) {
    console.error('Error creating tag:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء إنشاء الوسم' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/tags (bulk delete)
 * Delete multiple unused tags
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unusedOnly = searchParams.get('unusedOnly') === 'true';

    if (unusedOnly) {
      // Delete tags with no articles
      const deletedCount = await prisma.tag.deleteMany({
        where: {
          articles: {
            none: {},
          },
        },
      });

      return NextResponse.json({
        success: true,
        deletedCount: deletedCount.count,
      });
    }

    return NextResponse.json(
      { error: 'يجب تحديد معايير الحذف' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error deleting tags:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء حذف الوسوم' },
      { status: 500 }
    );
  }
}
