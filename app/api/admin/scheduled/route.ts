import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { getScheduledQueue } from "@/lib/publishing";

// GET /api/admin/scheduled - Get scheduled articles queue
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : 20;

    const queue = await getScheduledQueue(limit);

    return NextResponse.json(queue);
  } catch (error) {
    console.error("Error fetching scheduled queue:", error);
    return NextResponse.json(
      { error: "فشل في جلب قائمة الجدولة" },
      { status: 500 }
    );
  }
}
