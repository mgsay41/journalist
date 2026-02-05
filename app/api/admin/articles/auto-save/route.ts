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

    const { articleId, title, content, excerpt, metaTitle, metaDescription } = validation.data;

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

      // Generate slug from title if not set
      const slug = title
        .trim()
        .toLowerCase()
        .replace(/[\s\Wa-z0-9]+/g, '-') // Replace non-Arabic/non-alphanumeric with hyphens
        .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
        .substring(0, 100);

      // Calculate word count
      const plainText = content.replace(/<[^>]*>/g, '').trim();
      const wordCount = plainText ? plainText.split(/\s+/).length : 0;
      const readingTime = Math.ceil(wordCount / 200);

      // Update the article
      const updatedArticle = await prisma.article.update({
        where: { id: articleId },
        data: {
          title: title.trim(),
          slug,
          content,
          excerpt: excerpt?.trim() || null,
          metaTitle: metaTitle?.trim() || null,
          metaDescription: metaDescription?.trim() || null,
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
    const slug = title
      .trim()
      .toLowerCase()
      .replace(/[\s\Wa-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100);

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
