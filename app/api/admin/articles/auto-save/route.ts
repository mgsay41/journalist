/**
 * Auto-save API Endpoint for Articles
 * POST /api/admin/articles/auto-save
 * Periodically saves draft articles to the database for data safety
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Validation schema for auto-save
const autoSaveSchema = z.object({
  articleId: z.string().optional(), // If provided, update existing; if not, create new
  title: z.string().min(1, "العنوان مطلوب"),
  content: z.string().min(1, "المحتوى مطلوب"),
  excerpt: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  featuredImageId: z.string().optional(),
  focusKeyword: z.string().optional(),
  slug: z.string().optional(),
  // Don't change status via auto-save - keep it as draft
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: "غير مصرح بالوصول" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = autoSaveSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { articleId, title, content, excerpt, metaTitle, metaDescription, featuredImageId, focusKeyword, slug: bodySlug } = validation.data;

    // If articleId is provided, update existing article
    if (articleId) {
      // Verify the user owns this article
      const existingArticle = await prisma.article.findFirst({
        where: {
          id: articleId,
          authorId: session.user.id,
        },
        select: {
          id: true,
          status: true,
        },
      });

      if (!existingArticle) {
        return NextResponse.json(
          { error: "المقال غير موجود" },
          { status: 404 }
        );
      }

      // Only auto-save drafts - don't overwrite published/scheduled articles
      if (existingArticle.status !== 'draft') {
        return NextResponse.json({
          success: true,
          message: "لا يمكن الحفظ التلقائي للمقالات المنشورة",
          articleId,
          skipped: true,
        });
      }

      // Calculate word count
      const plainText = content.replace(/<[^>]*>/g, '').trim();
      const wordCount = plainText ? plainText.split(/\s+/).length : 0;
      const readingTime = Math.ceil(wordCount / 200);

      // Update the article (do not regenerate slug - preserves existing URL)
      const updatedArticle = await prisma.article.update({
        where: { id: articleId },
        data: {
          title: title.trim(),
          content,
          excerpt: excerpt?.trim() || null,
          metaTitle: metaTitle?.trim() || null,
          metaDescription: metaDescription?.trim() || null,
          ...(featuredImageId !== undefined ? { featuredImageId } : {}),
          ...(focusKeyword !== undefined ? { focusKeyword: focusKeyword.trim() || null } : {}),
          wordCount,
          readingTime,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          title: true,
          slug: true,
          updatedAt: true,
        },
      });

      return NextResponse.json({
        success: true,
        article: updatedArticle,
        message: "تم الحفظ التلقائي",
      });
    }

    // Create a new draft article
    // Use provided slug if available, otherwise generate from title
    const baseSlug = title
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\u0600-\u06FFa-zA-Z0-9-]/g, '')
      .replace(/^-+|-+$/g, '')
      .substring(0, 80);
    const slug = bodySlug?.trim() || baseSlug || `draft-${Date.now()}`;

    // Calculate word count
    const plainText = content.replace(/<[^>]*>/g, '').trim();
    const wordCount = plainText ? plainText.split(/\s+/).length : 0;
    const readingTime = Math.ceil(wordCount / 200);

    // Create the article
    const newArticle = await prisma.article.create({
      data: {
        title: title.trim(),
        slug,
        content,
        excerpt: excerpt?.trim() || null,
        metaTitle: metaTitle?.trim() || null,
        metaDescription: metaDescription?.trim() || null,
        ...(featuredImageId ? { featuredImageId } : {}),
        ...(focusKeyword ? { focusKeyword: focusKeyword.trim() } : {}),
        status: 'draft',
        authorId: session.user.id,
        wordCount,
        readingTime,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      article: newArticle,
      message: "تم إنشاء المسودة",
    });
  } catch (error) {
    console.error("Auto-save error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء الحفظ التلقائي" },
      { status: 500 }
    );
  }
}
