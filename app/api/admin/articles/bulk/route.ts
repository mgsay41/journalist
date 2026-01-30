import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { z } from 'zod';

const bulkActionSchema = z.object({
  action: z.enum(['delete', 'publish', 'draft', 'archive']),
  articleIds: z.array(z.string()).min(1, { message: 'يجب اختيار مقال واحد على الأقل' }),
});

/**
 * POST /api/admin/articles/bulk
 * Perform bulk actions on articles
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = bulkActionSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: 'بيانات غير صالحة', details: validatedData.error.issues },
        { status: 400 }
      );
    }

    const { action, articleIds } = validatedData.data;
    let result;

    switch (action) {
      case 'delete':
        // Soft delete articles (using archived status since there's no deletedAt field)
        result = await prisma.article.updateMany({
          where: { id: { in: articleIds } },
          data: {
            status: 'archived',
          },
        });
        break;

      case 'publish':
        // Publish articles
        result = await prisma.article.updateMany({
          where: { id: { in: articleIds } },
          data: {
            status: 'published',
            publishedAt: new Date(),
          },
        });
        break;

      case 'draft':
        // Set articles to draft
        result = await prisma.article.updateMany({
          where: { id: { in: articleIds } },
          data: {
            status: 'draft',
          },
        });
        break;

      case 'archive':
        // Archive articles
        result = await prisma.article.updateMany({
          where: { id: { in: articleIds } },
          data: {
            status: 'archived',
          },
        });
        break;

      default:
        return NextResponse.json(
          { error: 'إجراء غير معروف' },
          { status: 400 }
        );
    }

    const actionLabels = {
      delete: 'حذف',
      publish: 'نشر',
      draft: 'تحويل إلى مسودة',
      archive: 'أرشفة',
    };

    return NextResponse.json({
      success: true,
      message: `تم ${actionLabels[action]} ${result.count} مقال بنجاح`,
      count: result.count,
    });
  } catch (error) {
    console.error('Error performing bulk action:', error);
    return NextResponse.json(
      { error: 'خطأ في تنفيذ العملية' },
      { status: 500 }
    );
  }
}
