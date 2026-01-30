import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { generateSlug } from '@/lib/utils/slug';

/**
 * POST /api/admin/articles/[id]/duplicate
 * Duplicate an existing article
 */
export async function POST(
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

    // Fetch original article
    const originalArticle = await prisma.article.findUnique({
      where: { id },
      include: {
        categories: { select: { id: true } },
        tags: { select: { id: true } },
      },
    });

    if (!originalArticle) {
      return NextResponse.json(
        { error: 'المقال غير موجود' },
        { status: 404 }
      );
    }

    // Generate new unique slug
    const baseSlug = generateSlug(originalArticle.title);
    let newSlug = `${baseSlug}-copy`;
    let suffix = 1;

    // Ensure slug is unique
    while (await prisma.article.findUnique({ where: { slug: newSlug } })) {
      newSlug = `${baseSlug}-copy-${suffix}`;
      suffix++;
    }

    // Create duplicated article
    const duplicatedArticle = await prisma.article.create({
      data: {
        title: `${originalArticle.title} (نسخة)`,
        slug: newSlug,
        content: originalArticle.content,
        excerpt: originalArticle.excerpt,
        featuredImageId: originalArticle.featuredImageId,
        authorId: session.user.id, // New author is current user
        status: 'draft', // Always create as draft
        metaTitle: originalArticle.metaTitle,
        metaDescription: originalArticle.metaDescription,
        focusKeyword: originalArticle.focusKeyword,
        categories: originalArticle.categories.length > 0
          ? { connect: originalArticle.categories.map(c => ({ id: c.id })) }
          : undefined,
        tags: originalArticle.tags.length > 0
          ? { connect: originalArticle.tags.map(t => ({ id: t.id })) }
          : undefined,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
        categories: { select: { id: true, name: true, slug: true } },
        tags: { select: { id: true, name: true, slug: true } },
      },
    });

    return NextResponse.json(duplicatedArticle, { status: 201 });
  } catch (error) {
    console.error('Error duplicating article:', error);
    return NextResponse.json(
      { error: 'خطأ في نسخ المقال' },
      { status: 500 }
    );
  }
}
