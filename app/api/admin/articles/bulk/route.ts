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

        // Phase 3 Backend Audit - Performance: Optimize bulk edit to avoid N+1 queries
        // Fetch all articles with their existing tags in a single query
        const articles = await prisma.article.findMany({
          where: { id: { in: articleIds } },
          select: { id: true, tags: { select: { id: true } } },
        });

        // Build update operations for all articles
        const updateOperations = articles.map(article => {
          const updateData: any = {};

          // Replace categories if provided
          if (categoryIds && categoryIds.length > 0) {
            updateData.categories = {
              set: categoryIds.map(id => ({ id })),
            };
          }

          // Append tags (merge existing with new)
          if (tagIds && tagIds.length > 0) {
            const existingTagIds = article.tags.map(t => t.id);
            const mergedTagIds = [...new Set([...existingTagIds, ...tagIds])];
            updateData.tags = {
              set: mergedTagIds.map(id => ({ id })),
            };
          }

          return prisma.article.update({
            where: { id: article.id },
            data: updateData,
          });
        });

        // Execute all updates in parallel
        await Promise.all(updateOperations);

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
