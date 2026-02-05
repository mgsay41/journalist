import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { z } from 'zod';

const bulkActionSchema = z.object({
  action: z.enum(['delete', 'publish', 'draft', 'archive', 'edit']),
  articleIds: z.array(z.string()).min(1, { message: 'يجب اختيار مقال واحد على الأقل' }),
  categoryIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
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

    const { action, articleIds, categoryIds, tagIds } = validatedData.data;
    let result;

    switch (action) {
      case 'edit':
        // Bulk edit categories and/or tags
        if (!categoryIds && !tagIds) {
          return NextResponse.json(
            { error: 'يجب تحديد التصنيفات أو الوسوم' },
            { status: 400 }
          );
        }

        // Update articles with new categories and tags
        for (const articleId of articleIds) {
          // Disconnect existing categories if new ones provided
          if (categoryIds && categoryIds.length > 0) {
            await prisma.article.update({
              where: { id: articleId },
              data: {
                categories: {
                  set: categoryIds.map(id => ({ id })),
                },
              },
            });
          }

          // Add new tags (append, don't replace)
          if (tagIds && tagIds.length > 0) {
            const article = await prisma.article.findUnique({
              where: { id: articleId },
              select: { tags: { select: { id: true } } },
            });

            if (article) {
              const existingTagIds = article.tags.map(t => t.id);
              const newTagIds = [...new Set([...existingTagIds, ...tagIds])];

              await prisma.article.update({
                where: { id: articleId },
                data: {
                  tags: {
                    set: newTagIds.map(id => ({ id })),
                  },
                },
              });
            }
          }
        }

        result = { count: articleIds.length };
        break;

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
      edit: 'تعديل',
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
