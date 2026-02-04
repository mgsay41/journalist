import { NextRequest, NextResponse } from "next/server";
import { recordArticleView } from "@/lib/analytics";
import { cookies } from "next/headers";

// POST /api/articles/[slug]/view - Record article view
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Get or create session ID from cookie
    const cookieStore = await cookies();
    let sessionId = cookieStore.get("view_session")?.value;

    if (!sessionId) {
      // Generate a cryptographically secure session ID
      sessionId = crypto.randomUUID();
      cookieStore.set("view_session", sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }

    // Get article by slug
    const { prisma } = await import("@/lib/prisma");
    const article = await prisma.article.findUnique({
      where: { slug },
      select: { id: true, status: true },
    });

    if (!article) {
      return NextResponse.json({ error: "المقال غير موجود" }, { status: 404 });
    }

    // Only track views for published articles
    if (article.status !== "published") {
      return NextResponse.json({ error: "المقال غير منشور" }, { status: 403 });
    }

    // Record the view
    const result = await recordArticleView(article.id, sessionId);

    return NextResponse.json({
      success: result.success,
      views: result.views,
    });
  } catch (error) {
    console.error("Error recording article view:", error);
    return NextResponse.json(
      { error: "فشل في تسجيل المشاهدة" },
      { status: 500 }
    );
  }
}
