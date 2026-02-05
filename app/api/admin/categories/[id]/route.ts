import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { updateCategorySchema } from '@/lib/validations/category';
import { generateSlug, generateUniqueSlug } from '@/lib/utils/slug';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/categories/[id]
 * Get a single category by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { id } = await params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
          orderBy: { name: 'asc' },
        },
        _count: {
          select: {
            articles: true,
          },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'التصنيف غير موجود' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      category: {
        ...category,
        articleCount: category._count.articles,
      },
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء جلب التصنيف' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/categories/[id]
 * Update a category
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validation = updateCategorySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    // Check if category exists
    const existingCategory = await prisma.category.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'التصنيف غير موجود' },
        { status: 404 }
      );
    }

    const { name, slug, description, parentId } = validation.data;
    const updateData: Record<string, unknown> = {};

    // Handle color update
    if (body.color !== undefined) {
      updateData.color = body.color;
    }

    // Check for duplicate name if changing
    if (name && name !== existingCategory.name) {
      const existingByName = await prisma.category.findUnique({
        where: { name },
      });
      if (existingByName) {
        return NextResponse.json(
          { error: 'يوجد تصنيف بهذا الاسم بالفعل' },
          { status: 400 }
        );
      }
      updateData.name = name;

      // Generate new slug if name changes and no custom slug provided
      if (!slug) {
        updateData.slug = await generateUniqueSlug(name, async (newSlug) => {
          const exists = await prisma.category.findFirst({
            where: { slug: newSlug, id: { not: id } },
          });
          return !!exists;
        });
      }
    }

    // Handle custom slug
    if (slug && slug !== existingCategory.slug) {
      const existingBySlug = await prisma.category.findFirst({
        where: { slug, id: { not: id } },
      });
      if (existingBySlug) {
        return NextResponse.json(
          { error: 'يوجد تصنيف بهذا الرابط بالفعل' },
          { status: 400 }
        );
      }
      updateData.slug = slug;
    }

    // Update description
    if (description !== undefined) {
      updateData.description = description || null;
    }

    // Validate and update parent
    if (parentId !== undefined) {
      if (parentId === id) {
        return NextResponse.json(
          { error: 'لا يمكن للتصنيف أن يكون أبًا لنفسه' },
          { status: 400 }
        );
      }

      if (parentId) {
        const parentExists = await prisma.category.findUnique({
          where: { id: parentId },
        });
        if (!parentExists) {
          return NextResponse.json(
            { error: 'التصنيف الأب غير موجود' },
            { status: 400 }
          );
        }

        // Check for circular reference
        const isDescendant = await checkIsDescendant(parentId, id);
        if (isDescendant) {
          return NextResponse.json(
            { error: 'لا يمكن تعيين تصنيف فرعي كأب' },
            { status: 400 }
          );
        }
      }
      updateData.parentId = parentId || null;
    }

    const category = await prisma.category.update({
      where: { id },
      data: updateData,
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return NextResponse.json({ category });
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء تحديث التصنيف' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/categories/[id]
 * Delete a category
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const reassignTo = searchParams.get('reassignTo');

    // Check if category exists
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            articles: true,
            children: true,
          },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'التصنيف غير موجود' },
        { status: 404 }
      );
    }

    // Handle articles reassignment
    if (category._count.articles > 0) {
      if (reassignTo) {
        // Verify target category exists
        const targetCategory = await prisma.category.findUnique({
          where: { id: reassignTo },
        });
        if (!targetCategory) {
          return NextResponse.json(
            { error: 'التصنيف المستهدف للنقل غير موجود' },
            { status: 400 }
          );
        }

        // Reassign articles to the target category
        // Note: This is a many-to-many relationship, so we need to update the relation
        const articlesWithCategory = await prisma.article.findMany({
          where: {
            categories: {
              some: { id },
            },
          },
          select: { id: true },
        });

        for (const article of articlesWithCategory) {
          await prisma.article.update({
            where: { id: article.id },
            data: {
              categories: {
                disconnect: { id },
                connect: { id: reassignTo },
              },
            },
          });
        }
      } else {
        // Just disconnect articles from this category
        const articlesWithCategory = await prisma.article.findMany({
          where: {
            categories: {
              some: { id },
            },
          },
          select: { id: true },
        });

        for (const article of articlesWithCategory) {
          await prisma.article.update({
            where: { id: article.id },
            data: {
              categories: {
                disconnect: { id },
              },
            },
          });
        }
      }
    }

    // Handle children - move them to parent of deleted category
    if (category._count.children > 0) {
      await prisma.category.updateMany({
        where: { parentId: id },
        data: { parentId: category.parentId },
      });
    }

    // Delete the category
    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء حذف التصنيف' },
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
