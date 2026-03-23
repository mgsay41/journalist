import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { createCategorySchema } from '@/lib/validations/category';
import { generateUniqueSlug } from '@/lib/utils/slug';

/**
 * GET /api/admin/categories
 * Get all categories with article counts and hierarchy
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeCount = searchParams.get('includeCount') === 'true';
    const flat = searchParams.get('flat') === 'true';

    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
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
        ...(includeCount && {
          _count: {
            select: {
              articles: true,
            },
          },
        }),
      },
    });

    // If flat is requested, return all categories as a flat list
    if (flat) {
      return NextResponse.json({
        categories: categories.map(cat => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          color: cat.color,
          parentId: cat.parentId,
          parent: cat.parent,
          children: cat.children,
          articleCount: includeCount ? (cat as typeof cat & { _count: { articles: number } })._count?.articles || 0 : undefined,
          createdAt: cat.createdAt,
          updatedAt: cat.updatedAt,
        })),
      });
    }

    // Build hierarchical tree structure (only root categories)
    const rootCategories = categories.filter(cat => !cat.parentId);

    const buildTree = (parentId: string | null): typeof categories => {
      return categories
        .filter(cat => cat.parentId === parentId)
        .map(cat => ({
          ...cat,
          children: buildTree(cat.id),
        }));
    };

    const tree = buildTree(null);

    return NextResponse.json({
      categories: tree.map(cat => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        color: cat.color,
        parentId: cat.parentId,
        parent: cat.parent,
        children: cat.children,
        articleCount: includeCount ? (cat as typeof cat & { _count: { articles: number } })._count?.articles || 0 : undefined,
        createdAt: cat.createdAt,
        updatedAt: cat.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء جلب التصنيفات' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/categories
 * Create a new category
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const body = await request.json();
    const validation = createCategorySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, description, parentId } = validation.data;

    // Check for duplicate name
    const existingByName = await prisma.category.findUnique({
      where: { name },
    });

    if (existingByName) {
      return NextResponse.json(
        { error: 'يوجد تصنيف بهذا الاسم بالفعل' },
        { status: 400 }
      );
    }

    // Generate unique slug
    const slug = await generateUniqueSlug(name, async (slug) => {
      const exists = await prisma.category.findUnique({ where: { slug } });
      return !!exists;
    });

    // Validate parent exists if provided
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
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description: description || null,
        color: (body as Record<string, unknown>).color as string || '#3b82f6',
        parentId: parentId || null,
      },
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

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء إنشاء التصنيف' },
      { status: 500 }
    );
  }
}
