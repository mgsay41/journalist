import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { updateTagSchema } from '@/lib/validations/tag';
import { generateUniqueSlug } from '@/lib/utils/slug';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/tags/[id]
 * Get a single tag by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { id } = await params;

    const tag = await prisma.tag.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            articles: true,
          },
        },
        articles: {
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
          },
          take: 10,
          orderBy: { updatedAt: 'desc' },
        },
      },
    });

    if (!tag) {
      return NextResponse.json(
        { error: 'الوسم غير موجود' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      tag: {
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        articleCount: tag._count.articles,
        articles: tag.articles,
        createdAt: tag.createdAt,
      },
    });
  } catch (error) {
    console.error('Error fetching tag:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء جلب الوسم' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/tags/[id]
 * Update a tag
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validation = updateTagSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    // Check if tag exists
    const existingTag = await prisma.tag.findUnique({
      where: { id },
    });

    if (!existingTag) {
      return NextResponse.json(
        { error: 'الوسم غير موجود' },
        { status: 404 }
      );
    }

    const { name, slug } = validation.data;
    const updateData: Record<string, unknown> = {};

    // Check for duplicate name if changing
    if (name && name !== existingTag.name) {
      const existingByName = await prisma.tag.findUnique({
        where: { name },
      });
      if (existingByName) {
        return NextResponse.json(
          { error: 'يوجد وسم بهذا الاسم بالفعل' },
          { status: 400 }
        );
      }
      updateData.name = name;

      // Generate new slug if name changes and no custom slug provided
      if (!slug) {
        updateData.slug = await generateUniqueSlug(name, async (newSlug) => {
          const exists = await prisma.tag.findFirst({
            where: { slug: newSlug, id: { not: id } },
          });
          return !!exists;
        });
      }
    }

    // Handle custom slug
    if (slug && slug !== existingTag.slug) {
      const existingBySlug = await prisma.tag.findFirst({
        where: { slug, id: { not: id } },
      });
      if (existingBySlug) {
        return NextResponse.json(
          { error: 'يوجد وسم بهذا الرابط بالفعل' },
          { status: 400 }
        );
      }
      updateData.slug = slug;
    }

    const tag = await prisma.tag.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ tag });
  } catch (error) {
    console.error('Error updating tag:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء تحديث الوسم' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/tags/[id]
 * Delete a tag
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { id } = await params;

    // Check if tag exists
    const tag = await prisma.tag.findUnique({
      where: { id },
    });

    if (!tag) {
      return NextResponse.json(
        { error: 'الوسم غير موجود' },
        { status: 404 }
      );
    }

    // Disconnect tag from all articles first (many-to-many relation)
    await prisma.article.updateMany({
      where: {
        tags: {
          some: { id },
        },
      },
      data: {},
    });

    // For many-to-many, we need to update each article
    const articlesWithTag = await prisma.article.findMany({
      where: {
        tags: {
          some: { id },
        },
      },
      select: { id: true },
    });

    for (const article of articlesWithTag) {
      await prisma.article.update({
        where: { id: article.id },
        data: {
          tags: {
            disconnect: { id },
          },
        },
      });
    }

    // Delete the tag
    await prisma.tag.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting tag:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء حذف الوسم' },
      { status: 500 }
    );
  }
}
