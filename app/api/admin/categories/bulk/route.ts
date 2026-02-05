import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { z } from 'zod';

const bulkDeleteSchema = z.object({
  ids: z.array(z.string()).min(1),
  reassignTo: z.string().optional(),
});

const bulkUpdateSchema = z.object({
  ids: z.array(z.string()).min(1),
  updates: z.object({
    color: z.string().optional(),
    parentId: z.string().nullable().optional(),
  }),
});

/**
 * PUT /api/admin/categories/bulk
 * Bulk update categories
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const body = await request.json();
    const validation = bulkUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { ids, updates } = validation.data;

    // Validate parent if provided
    if (updates.parentId) {
      const parentExists = await prisma.category.findUnique({
        where: { id: updates.parentId },
      });
      if (!parentExists) {
        return NextResponse.json(
          { error: 'التصنيف الأب غير موجود' },
          { status: 400 }
        );
      }

      // Check for circular reference
      for (const id of ids) {
        if (updates.parentId === id) {
          return NextResponse.json(
            { error: 'لا يمكن للتصنيف أن يكون أبًا لنفسه' },
            { status: 400 }
          );
        }
        const isDescendant = await checkIsDescendant(updates.parentId, id);
        if (isDescendant) {
          return NextResponse.json(
            { error: 'لا يمكن تعيين تصنيف فرعي كأب' },
            { status: 400 }
          );
        }
      }
    }

    // Update all categories
    await prisma.category.updateMany({
      where: { id: { in: ids } },
      data: updates,
    });

    return NextResponse.json({ success: true, updatedCount: ids.length });
  } catch (error) {
    console.error('Error bulk updating categories:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء التحديث الجماعي' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/categories/bulk
 * Bulk delete categories
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const body = await request.json();
    const validation = bulkDeleteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { ids, reassignTo } = validation.data;

    // Verify all categories exist
    const categories = await prisma.category.findMany({
      where: { id: { in: ids } },
      include: {
        _count: {
          select: {
            articles: true,
            children: true,
          },
        },
      },
    });

    if (categories.length !== ids.length) {
      return NextResponse.json(
        { error: 'بعض التصنيفات غير موجودة' },
        { status: 404 }
      );
    }

    // Handle articles reassignment if specified
    if (reassignTo) {
      const targetCategory = await prisma.category.findUnique({
        where: { id: reassignTo },
      });
      if (!targetCategory) {
        return NextResponse.json(
          { error: 'التصنيف المستهدف للنقل غير موجود' },
          { status: 400 }
        );
      }

      for (const categoryId of ids) {
        const articlesWithCategory = await prisma.article.findMany({
          where: {
            categories: { some: { id: categoryId } },
          },
          select: { id: true },
        });

        for (const article of articlesWithCategory) {
          await prisma.article.update({
            where: { id: article.id },
            data: {
              categories: {
                disconnect: { id: categoryId },
                connect: { id: reassignTo },
              },
            },
          });
        }
      }
    }

    // Move children to parent of deleted categories
    for (const category of categories) {
      if (category._count.children > 0) {
        await prisma.category.updateMany({
          where: { parentId: category.id },
          data: { parentId: category.parentId },
        });
      }
    }

    // Delete all categories
    await prisma.category.deleteMany({
      where: { id: { in: ids } },
    });

    return NextResponse.json({ success: true, deletedCount: ids.length });
  } catch (error) {
    console.error('Error bulk deleting categories:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء الحذف الجماعي' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to check if a category is a descendant of another
 */
async function checkIsDescendant(categoryId: string, potentialAncestorId: string): Promise<boolean> {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { parentId: true },
  });

  if (!category || !category.parentId) {
    return false;
  }

  if (category.parentId === potentialAncestorId) {
    return true;
  }

  return checkIsDescendant(category.parentId, potentialAncestorId);
}
