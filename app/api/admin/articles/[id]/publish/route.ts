import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import {
  publishArticle,
  scheduleArticle,
  unscheduleArticle,
  archiveArticle,
} from "@/lib/publishing";

// POST /api/admin/articles/[id]/publish - Publish or schedule an article
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
    const body = await request.json();
    const { action, scheduledAt } = body;

    let result;

    switch (action) {
      case "publish":
        result = await publishArticle(id, session.user.id);
        break;
      case "schedule":
        if (!scheduledAt) {
          return NextResponse.json(
            { error: "تاريخ الجدولة مطلوب" },
            { status: 400 }
          );
        }
        const scheduleDate = new Date(scheduledAt);
        result = await scheduleArticle({ articleId: id, scheduledAt: scheduleDate });
        break;
      case "unschedule":
        result = await unscheduleArticle(id);
        break;
      case "archive":
        result = await archiveArticle(id);
        break;
      default:
        return NextResponse.json(
          { error: "إجراء غير صالح" },
          { status: 400 }
        );
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in publish API:", error);
    return NextResponse.json(
      { error: "فشل في تنفيذ العملية" },
      { status: 500 }
    );
  }
}
