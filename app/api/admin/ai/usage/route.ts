/**
 * AI Usage Statistics API Endpoint
 * GET /api/admin/ai/usage - Get current user's usage statistics
 * GET /api/admin/ai/usage?all=true - Get all users' statistics (admin only)
 *
 * Query parameters:
 * - all: boolean - If true, returns all users' stats
 * - startDate: string - ISO date string for filter start
 * - endDate: string - ISO date string for filter end
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { getUserUsageStats, getAllUsersStats, getRecentUsage } from "@/lib/ai";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: "غير مصرح بالوصول" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const showAll = searchParams.get("all") === "true";
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");
    const recent = searchParams.get("recent") === "true";
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    // Parse date filters
    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    // Validate dates
    if (startDate && isNaN(startDate.getTime())) {
      return NextResponse.json(
        { error: "تاريخ البداية غير صالح" },
        { status: 400 }
      );
    }
    if (endDate && isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: "تاريخ النهاية غير صالح" },
        { status: 400 }
      );
    }

    // Return recent usage records
    if (recent) {
      const recentUsage = await getRecentUsage(Math.min(limit, 500));
      return NextResponse.json({ recentUsage });
    }

    // Return all users' stats (for admin dashboard)
    if (showAll) {
      const allStats = await getAllUsersStats(startDate, endDate);
      return NextResponse.json(allStats);
    }

    // Return current user's stats
    const userStats = await getUserUsageStats(session.user.id, startDate, endDate);
    return NextResponse.json(userStats);
  } catch (error) {
    console.error("Usage stats error:", error);
    return NextResponse.json(
      { error: "حدث خطأ غير متوقع" },
      { status: 500 }
    );
  }
}
