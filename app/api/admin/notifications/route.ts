import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import {
  getUserNotifications,
  getNotificationStats,
  markAllNotificationsRead,
  deleteReadNotifications,
} from "@/lib/notifications";

// GET /api/admin/notifications - Get notifications for current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const stats = searchParams.get("stats") === "true";
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : undefined;
    const unreadOnly = searchParams.get("unread") === "true";

    if (stats) {
      const recentLimit = searchParams.get("recent")
        ? parseInt(searchParams.get("recent")!)
        : undefined;
      const data = await getNotificationStats(session.user.id, {
        recentLimit,
      });
      return NextResponse.json(data);
    }

    const notifications = await getUserNotifications(session.user.id, {
      limit,
      includeRead: !unreadOnly,
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "فشل في جلب الإشعارات" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/notifications - Batch operations (mark all read, delete read)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === "markAllRead") {
      await markAllNotificationsRead(session.user.id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "إجراء غير صالح" }, { status: 400 });
  } catch (error) {
    console.error("Error updating notifications:", error);
    return NextResponse.json(
      { error: "فشل في تحديث الإشعارات" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/notifications - Delete read notifications
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    await deleteReadNotifications(session.user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting notifications:", error);
    return NextResponse.json(
      { error: "فشل في حذف الإشعارات" },
      { status: 500 }
    );
  }
}
