import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { generatePreviewToken } from "@/lib/preview";

// POST /api/admin/articles/[id]/preview - Generate preview token
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { id } = await params;

    // Verify the user has access to this article
    const article = await prisma.article.findUnique({
      where: { id },
      select: { authorId: true },
    });

    if (!article) {
      return NextResponse.json({ error: "المقال غير موجود" }, { status: 404 });
    }

    // Only the author (or admin) can preview
    if (article.authorId !== session.user.id) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    // Generate preview token
    const token = await generatePreviewToken(id);

    // Return the preview URL
    const previewUrl = `/preview/${token}`;

    return NextResponse.json({
      success: true,
      previewUrl,
      token,
    });
  } catch (error) {
    console.error("Error generating preview token:", error);
    return NextResponse.json(
      { error: "فشل في إنشاء رابط المعاينة" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/articles/[id]/preview - Delete preview token
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { id } = await params;

    // Verify the user has access to this article
    const article = await prisma.article.findUnique({
      where: { id },
      select: { authorId: true },
    });

    if (!article) {
      return NextResponse.json({ error: "المقال غير موجود" }, { status: 404 });
    }

    // Only the author (or admin) can delete tokens
    if (article.authorId !== session.user.id) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    // Delete all preview tokens for this article
    await deleteArticlePreviewTokens(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting preview tokens:", error);
    return NextResponse.json(
      { error: "فشل في حذف روابط المعاينة" },
      { status: 500 }
    );
  }
}

// Import required functions
import { prisma } from "@/lib/prisma";
import { deleteArticlePreviewTokens } from "@/lib/preview";
