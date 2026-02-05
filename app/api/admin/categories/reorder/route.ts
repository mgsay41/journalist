import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { z } from 'zod';

const reorderSchema = z.object({
  categories: z.array(z.object({
    id: z.string(),
    order: z.number(),
  })),
});

/**
 * POST /api/admin/categories/reorder
 * Update the order of categories
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const body = await request.json();
    const validation = reorderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { categories } = validation.data;

    // Update each category's order in a transaction
    await prisma.$transaction(
      categories.map(({ id, order }) =>
        prisma.category.update({
          where: { id },
          data: { order },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering categories:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء إعادة ترتيب التصنيفات' },
      { status: 500 }
    );
  }
}
