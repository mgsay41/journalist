import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { updateArticleSchema, deleteArticleSchema } from '@/lib/validations/article';
import { generateSlug } from '@/lib/utils/slug';

/**
 * GET /api/admin/articles/[id]
 * Get a single article by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { id } = await params;

    // Fetch article
    const article = await prisma.article.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        categories: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        tags: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        featuredImage: {
          select: {
            id: true,
            url: true,
            thumbnailUrl: true,
            mediumUrl: true,
            largeUrl: true,
            altText: true,
            caption: true,
          },
        },
        images: {
          select: {
            id: true,
            url: true,
            thumbnailUrl: true,
            altText: true,
          },
        },
        videos: true,
      },
    });

    if (!article) {
      return NextResponse.json(
        { error: 'المقال غير موجود' },
        { status: 404 }
      );
    }

    return NextResponse.json(article);
  } catch (error) {
    console.error('Error fetching article:', error);
    return NextResponse.json(
      { error: 'خطأ في جلب المقال' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/articles/[id]
 * Update an existing article
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Check if article exists
    const existingArticle = await prisma.article.findUnique({
      where: { id },
      select: { id: true, slug: true },
    });

    if (!existingArticle) {
      return NextResponse.json(
        { error: 'المقال غير موجود' },
        { status: 404 }
      );
    }

    // Validate input
    const validatedData = updateArticleSchema.safeParse({ ...body, id });
    if (!validatedData.success) {
      return NextResponse.json(
        { error: 'بيانات غير صالحة', details: validatedData.error.issues },
        { status: 400 }
      );
    }

    const {
      title,
      slug: customSlug,
      content,
      excerpt,
      featuredImageId,
      categoryIds,
      tagIds,
      status,
      publishedAt,
      scheduledAt,
      metaTitle,
      metaDescription,
      focusKeyword,
    } = validatedData.data;

    // Handle slug
    let slug = existingArticle.slug;
    if (customSlug && customSlug !== existingArticle.slug) {
      // Verify new slug is unique
      const slugExists = await prisma.article.findFirst({
        where: {
          slug: customSlug,
          id: { not: id },
        },
        select: { id: true },
      });

      if (slugExists) {
        return NextResponse.json(
          { error: 'رابط المقال مستخدم بالفعل' },
          { status: 409 }
        );
      }
      slug = customSlug;
    } else if (title && !customSlug) {
      // Generate new slug from title
      slug = generateSlug(title);

      // Check if new slug exists
      const slugExists = await prisma.article.findFirst({
        where: {
          slug,
          id: { not: id },
        },
        select: { id: true },
      });

      if (slugExists) {
        let suffix = 1;
        while (await prisma.article.findFirst({
          where: { slug: `${slug}-${suffix}`, id: { not: id } },
          select: { id: true },
        })) {
          suffix++;
        }
        slug = `${slug}-${suffix}`;
      }
    }

    // Handle published/scheduled dates
    let finalPublishedAt: Date | null | undefined = undefined;
    let finalScheduledAt: Date | null | undefined = undefined;

    if (status !== undefined) {
      if (status === 'published' && publishedAt) {
        finalPublishedAt = new Date(publishedAt);
        finalScheduledAt = null;
      } else if (status === 'published') {
        // If transitioning to published and no date provided, use now
        const currentArticle = await prisma.article.findUnique({
          where: { id },
          select: { publishedAt: true, status: true },
        });
        finalPublishedAt = currentArticle?.publishedAt || new Date();
        finalScheduledAt = null;
      } else if (status === 'scheduled' && scheduledAt) {
        finalScheduledAt = new Date(scheduledAt);
        finalPublishedAt = null;
      } else if (status === 'draft' || status === 'archived') {
        // Keep publishedAt if changing to draft/archived
        const currentArticle = await prisma.article.findUnique({
          where: { id },
          select: { publishedAt: true },
        });
        finalPublishedAt = currentArticle?.publishedAt || null;
        finalScheduledAt = null;
      }
    }

    // Disconnect existing categories and tags if provided
    const updateData: any = {
      ...(title !== undefined && { title }),
      ...(slug !== undefined && { slug }),
      ...(content !== undefined && { content }),
      ...(excerpt !== undefined && { excerpt }),
      ...(featuredImageId !== undefined && { featuredImageId }),
      ...(status !== undefined && { status }),
      ...(finalPublishedAt !== undefined && { publishedAt: finalPublishedAt }),
      ...(finalScheduledAt !== undefined && { scheduledAt: finalScheduledAt }),
      ...(metaTitle !== undefined && { metaTitle }),
      ...(metaDescription !== undefined && { metaDescription }),
      ...(focusKeyword !== undefined && { focusKeyword }),
    };

    // Update categories if provided
    if (categoryIds !== undefined && categoryIds !== null) {
      updateData.categories = {
        set: [],
        connect: categoryIds.map((id: string) => ({ id })),
      };
    }

    // Update tags if provided
    if (tagIds !== undefined && tagIds !== null) {
      updateData.tags = {
        set: [],
        connect: tagIds.map((id: string) => ({ id })),
      };
    }

    // Update article
    const article = await prisma.article.update({
      where: { id },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        categories: true,
        tags: true,
        featuredImage: {
          select: {
            id: true,
            url: true,
            thumbnailUrl: true,
            altText: true,
          },
        },
      },
    });

    return NextResponse.json(article);
  } catch (error) {
    console.error('Error updating article:', error);
    return NextResponse.json(
      { error: 'خطأ في تحديث المقال' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/articles/[id]
 * Delete an article (soft delete to archived, or permanent delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Validate input
    const validatedData = deleteArticleSchema.safeParse({ ...body, id });
    if (!validatedData.success) {
      return NextResponse.json(
        { error: 'بيانات غير صالحة', details: validatedData.error.issues },
        { status: 400 }
      );
    }

    // Check if article exists
    const existingArticle = await prisma.article.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!existingArticle) {
      return NextResponse.json(
        { error: 'المقال غير موجود' },
        { status: 404 }
      );
    }

    const { permanent } = validatedData.data;

    if (permanent) {
      // Permanent delete - only if already archived
      if (existingArticle.status !== 'archived') {
        return NextResponse.json(
          { error: 'لا يمكن الحذف الدائم إلا للمقالات المؤرشفة' },
          { status: 400 }
        );
      }

      await prisma.article.delete({
        where: { id },
      });

      return NextResponse.json({ message: 'تم حذف المقال نهائياً' });
    } else {
      // Soft delete - archive the article
      await prisma.article.update({
        where: { id },
        data: { status: 'archived' },
      });

      return NextResponse.json({ message: 'تم أرشفة المقال' });
    }
  } catch (error) {
    console.error('Error deleting article:', error);
    return NextResponse.json(
      { error: 'خطأ في حذف المقال' },
      { status: 500 }
    );
  }
}
